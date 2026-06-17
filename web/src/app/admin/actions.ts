"use server";

import QRCode from "qrcode";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ClaimKitState = {
  error: string | null;
  kit: {
    claimCode: string;
    claimUrl: string;
    expiresAt: string | null;
    qrDataUrl: string;
    robotId: string;
    unitCode: string;
  } | null;
  ok: boolean;
};

const initialClaimKitState: ClaimKitState = {
  error: null,
  kit: null,
  ok: false,
};

function actionErrorMessage(message: string) {
  if (message.includes("admin_required")) return "This account is not in app_admins yet.";
  if (message.includes("duplicate_unit_code")) return "This unit code already has a claim kit.";
  if (message.includes("invalid_robot_type")) return "Choose a supported robot type.";
  if (message.includes("invalid_unit_code")) return "Enter a unit code such as RF-RV-0001.";
  if (message.includes("login_required")) return "Login is required.";
  return message;
}

async function getBaseUrl() {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";

  if (!host) return "http://localhost:3000";
  return `${protocol}://${host}`;
}

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function createClaimKitAction(
  _previousState: ClaimKitState,
  formData: FormData,
): Promise<ClaimKitState> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return {
      ...initialClaimKitState,
      error: "Supabase is not configured.",
    };
  }

  const expiresAtValue = formValue(formData, "expiresAt");
  const expiresAtDate = expiresAtValue ? new Date(expiresAtValue) : null;

  if (expiresAtDate && Number.isNaN(expiresAtDate.getTime())) {
    return {
      ...initialClaimKitState,
      error: "Choose a valid expiry date.",
    };
  }

  const expiresAt = expiresAtDate ? expiresAtDate.toISOString() : null;

  const { data, error } = await supabase.rpc("create_robot_claim_kit", {
    input_board_type: formValue(formData, "boardType") || "esp32",
    input_display_name: formValue(formData, "displayName") || null,
    input_expires_at: expiresAt,
    input_firmware_version: formValue(formData, "firmwareVersion") || null,
    input_robot_type: formValue(formData, "robotType") || "rover",
    input_unit_code: formValue(formData, "unitCode"),
  });

  if (error) {
    return {
      ...initialClaimKitState,
      error: actionErrorMessage(error.message),
    };
  }

  const kit = data as {
    claimCode: string;
    expiresAt: string | null;
    robotId: string;
    unitCode: string;
  };
  const claimUrl = `${await getBaseUrl()}/dashboard?claim=${encodeURIComponent(
    kit.claimCode,
  )}`;
  const qrDataUrl = await QRCode.toDataURL(claimUrl, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 320,
  });

  revalidatePath("/admin");

  return {
    error: null,
    kit: {
      ...kit,
      claimUrl,
      qrDataUrl,
    },
    ok: true,
  };
}
