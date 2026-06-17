import { type NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

function cleanNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = cleanNext(url.searchParams.get("next"));
  const { appUrl } = getSupabaseEnv();

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } =
      (await supabase?.auth.exchangeCodeForSession(code)) ?? { error: null };

    if (error) {
      return NextResponse.redirect(new URL("/login?error=oauth", appUrl || request.url));
    }
  }

  if (appUrl) {
    return NextResponse.redirect(new URL(next, appUrl));
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";

  if (forwardedHost) {
    return NextResponse.redirect(`${forwardedProto}://${forwardedHost}${next}`);
  }

  return NextResponse.redirect(new URL(next, request.url));
}
