import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    error_description?: string | string[];
    lang?: string | string[];
    redirect?: string | string[];
  }>;
};

type LoginLocale = "en" | "th";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function loginLocale(value: string | string[] | undefined): LoginLocale {
  return firstParam(value)?.toLowerCase() === "th" ? "th" : "en";
}

function cleanRedirect(value: string | string[] | undefined) {
  const raw = firstParam(value);
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

function authMessage(
  params: { error?: string | string[]; error_description?: string | string[] },
  locale: LoginLocale,
) {
  const rawError = firstParam(params.error);
  const rawDescription = firstParam(params.error_description);

  if (rawDescription) return rawDescription;
  if (rawError === "oauth") {
    if (locale === "th") {
      return "Google ส่งกลับมาที่ RoboForge แล้ว แต่ระบบยังสร้าง session ไม่สำเร็จ ให้เช็คการตั้งค่า Supabase และ Google OAuth callback";
    }
    return "Google login returned to RoboForge, but the session code could not be exchanged. Check Supabase and Google OAuth callback settings.";
  }
  if (rawError) {
    return locale === "th"
      ? `เข้าสู่ระบบมีปัญหา: ${rawError}`
      : `Login error: ${rawError}`;
  }
  return "";
}

const loginCopy = {
  en: {
    eyebrow: "FOUNDER ACCESS",
    fallback: "Loading auth...",
    title: "Login to your RoboForge garage.",
    body:
      "This is the new SaaS entry point. Supabase handles identity now; the old localStorage demo stays separate in the existing Vite app.",
  },
  th: {
    eyebrow: "ทางเข้า Web Garage",
    fallback: "กำลังโหลดระบบเข้าสู่ระบบ...",
    title: "เข้าสู่ Web Garage ของคุณ",
    body:
      "เข้าสู่ RoboForge เพื่อเพิ่มชุดเบต้า ดูความคืบหน้าของหุ่น และกลับมาใช้งานต่อได้จากที่เดียว ส่วนเดโมยังแยกไว้ให้ลองเล่นโดยไม่ต้องเข้าสู่ระบบ",
  },
} as const;

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirectTo = cleanRedirect(params.redirect);
  const locale = loginLocale(params.lang);
  const initialMessage = authMessage(params, locale);
  const copy = loginCopy[locale];

  return (
    <main className="auth-page">
      <section className="auth-copy">
        <span className="eyebrow">{copy.eyebrow}</span>
        <h1>{copy.title}</h1>
        <p>{copy.body}</p>
      </section>
      <Suspense fallback={<div className="auth-card">{copy.fallback}</div>}>
        <AuthForm
          initialMessage={initialMessage}
          locale={locale}
          redirectTo={redirectTo}
        />
      </Suspense>
    </main>
  );
}
