"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, LogOut, Mail, Save, Upload, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser";
import { BottomNav } from "./bottom-nav";
import { TopBar } from "./top-bar";

export type ProfileScreenProps = {
  avatarPath?: string | null;
  avatarUrl?: string | null;
  displayName: string;
  email: string | null;
  isConnected: boolean;
  phoneNumber?: string | null;
  userId: string;
};

const AVATAR_BUCKET = "profile-avatars";
const AVATAR_SOURCE_LIMIT_BYTES = 5 * 1024 * 1024;
const AVATAR_UPLOAD_LIMIT_BYTES = 512 * 1024;
const AVATAR_TARGET_SIZE = 512;
const AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "RF";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("โหลดรูปไม่สำเร็จ"));
    };
    image.src = url;
  });
}

function canvasToWebp(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("แปลงรูปเป็น WebP ไม่สำเร็จ"));
          return;
        }
        resolve(blob);
      },
      "image/webp",
      0.82,
    );
  });
}

async function resizeAvatar(file: File) {
  const image = await loadImage(file);
  const scale = Math.min(1, AVATAR_TARGET_SIZE / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { alpha: true });

  if (!context) {
    throw new Error("browser นี้ยัง resize รูปไม่ได้");
  }

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);
  return canvasToWebp(canvas);
}

function normalizePhone(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized : null;
}

export function ProfileScreen({
  avatarPath = null,
  avatarUrl = null,
  displayName,
  email,
  isConnected,
  phoneNumber = null,
  userId,
}: ProfileScreenProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(displayName);
  const [phone, setPhone] = useState(phoneNumber ?? "");
  const [pendingAvatar, setPendingAvatar] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(avatarUrl);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"error" | "success">("success");
  const [isPreparingAvatar, setIsPreparingAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function setStatus(nextMessage: string, tone: "error" | "success" = "success") {
    setMessage(nextMessage);
    setMessageTone(tone);
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!AVATAR_TYPES.has(file.type)) {
      setStatus("ใช้ไฟล์ JPG, PNG หรือ WebP เท่านั้น", "error");
      return;
    }

    if (file.size > AVATAR_SOURCE_LIMIT_BYTES) {
      setStatus("รูปต้นฉบับต้องไม่เกิน 5MB", "error");
      return;
    }

    setIsPreparingAvatar(true);
    setStatus("");

    try {
      const resized = await resizeAvatar(file);
      if (resized.size > AVATAR_UPLOAD_LIMIT_BYTES) {
        setStatus("หลังย่อรูปแล้วยังเกิน 512KB ลองเลือกรูปที่เล็กลง", "error");
        return;
      }

      const nextPreviewUrl = URL.createObjectURL(resized);
      setPendingAvatar(resized);
      setPreviewUrl((current) => {
        if (current?.startsWith("blob:")) {
          URL.revokeObjectURL(current);
        }
        return nextPreviewUrl;
      });
      setStatus("เตรียมรูปโปรไฟล์แล้ว กดบันทึกเพื่ออัปเดต", "success");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "เตรียมรูปโปรไฟล์ไม่สำเร็จ", "error");
    } finally {
      setIsPreparingAvatar(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = name.trim();

    if (nextName.length < 2) {
      setStatus("กรอกชื่อที่แสดงอย่างน้อย 2 ตัวอักษร", "error");
      return;
    }

    const nextPhone = normalizePhone(phone);
    if (nextPhone && nextPhone.length > 32) {
      setStatus("เบอร์โทรยาวเกินไป", "error");
      return;
    }

    const supabase = getBrowserSupabaseClient();
    if (!supabase) {
      setStatus("ยังไม่ได้ตั้งค่า Supabase env สำหรับบันทึกโปรไฟล์", "error");
      return;
    }

    setIsSaving(true);
    setStatus("");

    try {
      let nextAvatarPath = avatarPath;

      if (pendingAvatar) {
        nextAvatarPath = `${userId}/avatar.webp`;
        const { error: uploadError } = await supabase.storage
          .from(AVATAR_BUCKET)
          .upload(nextAvatarPath, pendingAvatar, {
            cacheControl: "3600",
            contentType: "image/webp",
            upsert: true,
          });

        if (uploadError) {
          throw uploadError;
        }
      }

      const { error: profileError } = await supabase.from("owner_profiles").upsert(
        {
          avatar_url: nextAvatarPath,
          display_name: nextName,
          id: userId,
          phone_number: nextPhone,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );

      if (profileError) {
        throw profileError;
      }

      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: nextName },
      });

      if (authError) {
        throw authError;
      }

      setPendingAvatar(null);
      setStatus("บันทึกโปรไฟล์แล้ว", "success");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "บันทึกโปรไฟล์ไม่สำเร็จ", "error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="lumina-shell profile-shell">
      <TopBar isConnected={isConnected} />
      <div className="profile-content">
        <section className="profile-hero" aria-labelledby="profile-title">
          <div className="profile-hero-copy">
            <h1 id="profile-title">โปรไฟล์ของคุณ</h1>
            <p>จัดการข้อมูลพื้นฐานของบัญชี RoboForge นี้เท่านั้น</p>
          </div>
        </section>

        <form className="profile-form-card" onSubmit={handleSubmit}>
          <section className="profile-avatar-panel" aria-label="รูปโปรไฟล์">
            <button
              aria-label="เลือกรูปโปรไฟล์"
              className="profile-avatar-button"
              disabled={isPreparingAvatar || isSaving}
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="" src={previewUrl} />
              ) : (
                <span>{getInitials(name)}</span>
              )}
              <i aria-hidden="true">
                <Camera data-icon="inline-start" />
              </i>
            </button>
            <div className="profile-avatar-copy">
              <h2>รูปโปรไฟล์</h2>
              <p>ใช้ JPG, PNG หรือ WebP ไม่เกิน 5MB ระบบจะย่อเป็น WebP ไม่เกิน 512KB ก่อนอัปโหลด</p>
              <Button
                disabled={isPreparingAvatar || isSaving}
                onClick={() => fileInputRef.current?.click()}
                size="sm"
                type="button"
                variant="secondary"
              >
                <Upload data-icon="inline-start" />
                {isPreparingAvatar ? "กำลังเตรียมรูป" : "อัปโหลดรูป"}
              </Button>
              <input
                accept="image/jpeg,image/png,image/webp"
                className="profile-file-input"
                onChange={handleAvatarChange}
                ref={fileInputRef}
                type="file"
              />
            </div>
          </section>

          <section className="profile-field-list" aria-label="ข้อมูลบัญชี">
            <label className="profile-field">
              <span>ชื่อที่แสดง</span>
              <div>
                <UserRound data-icon="inline-start" />
                <input
                  autoComplete="name"
                  maxLength={80}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="ชื่อของคุณ"
                  required
                  value={name}
                />
              </div>
            </label>

            <label className="profile-field">
              <span>เบอร์โทร</span>
              <div>
                <UserRound data-icon="inline-start" />
                <input
                  autoComplete="tel"
                  inputMode="tel"
                  maxLength={32}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="ไม่บังคับกรอก"
                  type="tel"
                  value={phone}
                />
              </div>
            </label>

            <label className="profile-field is-readonly">
              <span>อีเมล</span>
              <div>
                <Mail data-icon="inline-start" />
                <input readOnly value={email ?? "ไม่มีอีเมล"} />
              </div>
            </label>
          </section>

          {message ? (
            <p className={messageTone === "error" ? "profile-message is-error" : "profile-message"}>
              {messageTone === "success" ? <CheckCircle2 data-icon="inline-start" /> : null}
              {message}
            </p>
          ) : null}

          <section className="profile-actions" aria-label="Profile actions">
            <Button disabled={isSaving || isPreparingAvatar} size="default" type="submit" variant="primary">
              <Save data-icon="inline-start" />
              {isSaving ? "กำลังบันทึก" : "บันทึกโปรไฟล์"}
            </Button>
            <Button asChild size="default" variant="ghost">
              <Link href="/auth/sign-out">
                <LogOut data-icon="inline-start" />
                ออกจากระบบ
              </Link>
            </Button>
          </section>
        </form>
      </div>
      <BottomNav active="profile" />
    </main>
  );
}
