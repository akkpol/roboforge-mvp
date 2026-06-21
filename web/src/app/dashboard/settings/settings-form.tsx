"use client";

import {
  Award,
  Building2,
  CheckCircle,
  Globe,
  ImageUp,
  PencilLine,
  Save,
  Sparkles,
  User,
} from "lucide-react";
import { type FormEvent, useState, useTransition } from "react";
import { updateProfile, type ProfilePatch } from "@/app/dashboard/actions";
import type { OwnerProfile } from "@/lib/supabase/server";

type SettingsLocale = "en" | "th";

const copy = {
  en: {
    avatar: "Avatar URL",
    avatarPlaceholder: "https://example.com/avatar.jpg",
    developer: "Developer",
    displayName: "Display name",
    displayNamePlaceholder: "Your name",
    done: "Saved",
    doneMessage: "Profile saved.",
    educator: "Educator",
    enthusiast: "Enthusiast",
    error: "Error",
    intro: "RoboForge uses this to personalise your Garage and missions.",
    language: "Language",
    loading: "Saving...",
    maker: "Maker",
    onboarding: "Onboarding done",
    onboardingTip: "Mark completed when you finish the first Connection Quest.",
    orgName: "Organization",
    orgPlaceholder: "Optional — school, company, or workshop name",
    other: "Other",
    parent: "Parent / Guardian",
    roleType: "Role",
    save: "Save profile",
    skillAdvanced: "Advanced",
    skillBeginner: "Beginner",
    skillExpert: "Expert",
    skillIntermediate: "Intermediate",
    skillLevel: "Skill level",
    title: "Profile Settings",
    workspaceError: "Supabase is not configured.",
  },
  th: {
    avatar: "URL รูปโปรไฟล์",
    avatarPlaceholder: "https://example.com/avatar.jpg",
    developer: "นักพัฒนา",
    displayName: "ชื่อที่แสดง",
    displayNamePlaceholder: "ชื่อของคุณ",
    done: "บันทึกแล้ว",
    doneMessage: "โปรไฟล์ถูกบันทึกแล้ว",
    educator: "ครู/อาจารย์",
    enthusiast: "ผู้สนใจ",
    error: "ผิดพลาด",
    intro: "RoboForge ใช้ข้อมูลนี้ในการปรับแต่ง Garage และภารกิจของคุณ",
    language: "ภาษา",
    loading: "กำลังบันทึก...",
    maker: "นักสร้าง",
    onboarding: "ผ่าน onboarding แล้ว",
    onboardingTip: "กดติ๊กถูกเมื่อคุณทำ Connection Quest ครั้งแรกเสร็จ",
    orgName: "องค์กร",
    orgPlaceholder: "ไม่บังคับ — ชื่อโรงเรียน บริษัท หรือเวิร์กช็อป",
    other: "อื่น ๆ",
    parent: "ผู้ปกครอง",
    roleType: "บทบาท",
    save: "บันทึกโปรไฟล์",
    skillAdvanced: "ขั้นสูง",
    skillBeginner: "มือใหม่",
    skillExpert: "เชี่ยวชาญ",
    skillIntermediate: "ปานกลาง",
    skillLevel: "ระดับความชำนาญ",
    title: "ตั้งค่าโปรไฟล์",
    workspaceError: "ยังไม่ได้เชื่อมต่อ Supabase",
  },
} as const;

const roleOptions: Array<{ label: { en: string; th: string }; value: string }> =
  [
    { label: { en: "Maker", th: "นักสร้าง" }, value: "maker" },
    { label: { en: "Educator", th: "ครู/อาจารย์" }, value: "educator" },
    { label: { en: "Enthusiast", th: "ผู้สนใจ" }, value: "enthusiast" },
    { label: { en: "Parent / Guardian", th: "ผู้ปกครอง" }, value: "parent" },
    { label: { en: "Developer", th: "นักพัฒนา" }, value: "developer" },
    { label: { en: "Other", th: "อื่น ๆ" }, value: "other" },
  ];

const skillOptions: Array<{
  label: { en: string; th: string };
  value: string;
}> = [
  { label: { en: "Beginner", th: "มือใหม่" }, value: "beginner" },
  {
    label: { en: "Intermediate", th: "ปานกลาง" },
    value: "intermediate",
  },
  { label: { en: "Advanced", th: "ขั้นสูง" }, value: "advanced" },
  { label: { en: "Expert", th: "เชี่ยวชาญ" }, value: "expert" },
];

export function SettingsForm({
  locale,
  profile,
  workspaceError,
}: {
  locale: SettingsLocale;
  profile: OwnerProfile | null;
  workspaceError: string | null;
}) {
  const t = copy[locale];
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setOk(false);

    const form = new FormData(event.currentTarget);
    const patch: ProfilePatch = {
      display_name: (form.get("display_name") as string)?.trim() || null,
      avatar_url: (form.get("avatar_url") as string)?.trim() || null,
      organization_name:
        (form.get("organization_name") as string)?.trim() || null,
      preferred_language: form.get("preferred_language") as string,
      role_type: form.get("role_type") as string,
      skill_level: form.get("skill_level") as string,
      onboarding_completed: form.get("onboarding_completed") === "on",
    };

    startTransition(async () => {
      const result = await updateProfile(patch);
      if (result.error) {
        setMessage(result.error);
      } else {
        setOk(true);
        setMessage(t.doneMessage);
      }
    });
  }

  if (workspaceError) {
    return (
      <main className="settings-page">
        <p className="form-message is-warning">{t.workspaceError}</p>
      </main>
    );
  }

  return (
    <main className="settings-page">
      <div className="settings-head">
        <Sparkles size={20} />
        <h1 className="settings-title">{t.title}</h1>
      </div>
      <p className="settings-intro">{t.intro}</p>

      <form className="settings-form" onSubmit={submit}>
        {/* Display name */}
        <label>
          <span className="field-icon">
            <User size={18} />
            {t.displayName}
          </span>
          <input
            autoComplete="name"
            defaultValue={profile?.display_name ?? ""}
            name="display_name"
            placeholder={t.displayNamePlaceholder}
          />
        </label>

        {/* Avatar URL */}
        <label>
          <span className="field-icon">
            <ImageUp size={18} />
            {t.avatar}
          </span>
          <input
            defaultValue={profile?.avatar_url ?? ""}
            name="avatar_url"
            placeholder={t.avatarPlaceholder}
            type="url"
          />
        </label>

        {/* Role type */}
        <label>
          <span className="field-icon">
            <Award size={18} />
            {t.roleType}
          </span>
          <select defaultValue={profile?.role_type ?? "enthusiast"} name="role_type">
            {roleOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label[locale]}
              </option>
            ))}
          </select>
        </label>

        {/* Skill level */}
        <label>
          <span className="field-icon">
            <PencilLine size={18} />
            {t.skillLevel}
          </span>
          <select
            defaultValue={profile?.skill_level ?? "beginner"}
            name="skill_level"
          >
            {skillOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label[locale]}
              </option>
            ))}
          </select>
        </label>

        {/* Language */}
        <label>
          <span className="field-icon">
            <Globe size={18} />
            {t.language}
          </span>
          <select
            defaultValue={profile?.preferred_language ?? "en"}
            name="preferred_language"
          >
            <option value="en">English</option>
            <option value="th">ไทย</option>
          </select>
        </label>

        {/* Organization */}
        <label>
          <span className="field-icon">
            <Building2 size={18} />
            {t.orgName}
          </span>
          <input
            defaultValue={profile?.organization_name ?? ""}
            name="organization_name"
            placeholder={t.orgPlaceholder}
          />
        </label>

        {/* Onboarding checkbox */}
        <label className="checkbox-field">
          <input
            defaultChecked={profile?.onboarding_completed ?? false}
            name="onboarding_completed"
            type="checkbox"
          />
          <span>
            <strong>{t.onboarding}</strong>
            <small>{t.onboardingTip}</small>
          </span>
        </label>

        <button
          className="button settings-submit"
          disabled={pending}
          type="submit"
        >
          {pending ? (
            <>{t.loading}</>
          ) : ok ? (
            <>
              <CheckCircle size={18} /> {t.done}
            </>
          ) : (
            <>
              <Save size={18} /> {t.save}
            </>
          )}
        </button>

        {message ? (
          <p className={`form-message ${ok ? "is-success" : ""}`}>
            {!ok ? <strong>{t.error}:</strong> : null} {message}
          </p>
        ) : null}
      </form>
    </main>
  );
}
