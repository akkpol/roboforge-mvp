"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, LogOut, LogIn, Mail, Save, Upload, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Status } from "@/components/ui/status";
import { AppShell } from "@/features/shell/app-shell";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser";

export type ProfileScreenProps = {
  avatarPath?: string | null;
  avatarUrl?: string | null;
  displayName: string;
  email: string | null;
  isConnected: boolean;
  phoneNumber?: string | null;
  userId: string | null;
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

  const fieldShellClass = "mt-2 flex items-center rounded-2xl border border-slate-200 bg-white px-3 text-slate-500 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100";
  const inputClass = "w-full border-0 bg-transparent px-3 py-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 read-only:text-slate-500";

  return (
    <AppShell active="profile" isAuthenticated={isConnected}>
      <div className="mx-auto max-w-5xl">
        <header className="mb-6"><Status tone={isConnected ? "ready" : "muted"}>{isConnected ? "บัญชีพร้อม" : "Guest"}</Status><h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl" id="profile-title">โปรไฟล์ของคุณ</h1><p className="mt-2 text-sm leading-6 text-slate-600">บัญชีและหุ่นยนต์ของคุณอยู่ในที่เดียว</p></header>

        {!userId ? (
          <section aria-label="เข้าสู่ระบบเพื่อดูโปรไฟล์" className="grid min-h-96 place-items-center rounded-3xl border border-white/80 bg-white/95 p-8 text-center shadow-xl shadow-blue-950/5">
            <div className="max-w-md"><div className="mx-auto grid size-20 place-items-center rounded-3xl bg-blue-50 text-2xl font-bold text-blue-700">RF</div><h2 className="mt-5 text-2xl font-bold text-slate-950">กรุณาเข้าสู่ระบบ</h2><p className="mt-2 text-sm leading-6 text-slate-600">เข้าสู่ระบบเพื่อจัดการโปรไฟล์ รูปประจำตัว และ Rover ของคุณ</p><Button asChild className="mt-6"><Link href="/login?redirect=/profile&lang=th"><LogIn className="size-4" />เข้าสู่ระบบ</Link></Button></div>
          </section>
        ) : (
          <>
            <form className="grid gap-5 lg:grid-cols-3" onSubmit={handleSubmit}>
              <section aria-label="รูปโปรไฟล์" className="rounded-3xl border border-white/80 bg-white/95 p-6 shadow-xl shadow-blue-950/5">
              <button aria-label="เลือกรูปโปรไฟล์" className="group relative mx-auto grid size-40 place-items-center overflow-hidden rounded-3xl bg-blue-50 text-4xl font-bold text-blue-700 outline-none focus-visible:ring-4 focus-visible:ring-blue-200" disabled={isPreparingAvatar || isSaving} onClick={() => fileInputRef.current?.click()} type="button">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="" className="size-full object-cover" src={previewUrl} />
                ) : <span>{getInitials(name)}</span>}
                <span aria-hidden="true" className="absolute bottom-3 right-3 grid size-10 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg"><Camera className="size-5" /></span>
              </button>
              <h2 className="mt-5 text-center text-lg font-bold text-slate-950">รูปโปรไฟล์</h2><p className="mt-2 text-center text-xs leading-5 text-slate-500">JPG, PNG หรือ WebP ไม่เกิน 5MB ระบบจะย่อเป็น WebP ก่อนอัปโหลด</p>
              <Button className="mt-5 w-full" disabled={isPreparingAvatar || isSaving} onClick={() => fileInputRef.current?.click()} size="sm" type="button" variant="secondary"><Upload className="size-4" />{isPreparingAvatar ? "กำลังเตรียมรูป" : "อัปโหลดรูป"}</Button>
              <input accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleAvatarChange} ref={fileInputRef} type="file" />
            </section>

            <section aria-label="ข้อมูลบัญชี" className="rounded-3xl border border-white/80 bg-white/95 p-5 shadow-xl shadow-blue-950/5 sm:p-7 lg:col-span-2">
              <h2 className="text-xl font-bold text-slate-950">ข้อมูลบัญชี</h2>
              <div className="mt-5 grid gap-4">
                <label className="text-sm font-semibold text-slate-700">ชื่อที่แสดง<span className={fieldShellClass}><UserRound className="size-4" /><input autoComplete="name" className={inputClass} maxLength={80} onChange={(event) => setName(event.target.value)} placeholder="ชื่อของคุณ" required value={name} /></span></label>
                <label className="text-sm font-semibold text-slate-700">เบอร์โทร<span className={fieldShellClass}><UserRound className="size-4" /><input autoComplete="tel" className={inputClass} inputMode="tel" maxLength={32} onChange={(event) => setPhone(event.target.value)} placeholder="ไม่บังคับกรอก" type="tel" value={phone} /></span></label>
                <label className="text-sm font-semibold text-slate-700">อีเมล<span className={fieldShellClass}><Mail className="size-4" /><input className={inputClass} readOnly value={email ?? "ไม่มีอีเมล"} /></span></label>
              </div>
              {message ? <p className={messageTone === "error" ? "mt-5 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700" : "mt-5 flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700"} role="status">{messageTone === "success" ? <CheckCircle2 className="size-4" /> : null}{message}</p> : null}
              <div aria-label="Profile actions" className="mt-6 flex flex-wrap gap-3"><Button disabled={isSaving || isPreparingAvatar} type="submit"><Save className="size-4" />{isSaving ? "กำลังบันทึก" : "บันทึกโปรไฟล์"}</Button><Button form="profile-sign-out-form" type="submit" variant="ghost"><LogOut className="size-4" />ออกจากระบบ</Button></div>
              </section>
            </form>
            <form action="/auth/sign-out" id="profile-sign-out-form" method="post" />
          </>
        )}
      </div>
    </AppShell>
  );
}
