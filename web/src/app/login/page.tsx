import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Bot } from "lucide-react";
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
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
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
    fallback: "Loading auth...",
    eyebrow: "RoboForge ID",
    status: "RoboForge is ready",
    title: "Welcome back to RoboForge",
    body:
      "Sign in to return to the RoboForge home screen, connection tools, and your builder profile.",
  },
  th: {
    fallback: "กำลังโหลดระบบเข้าสู่ระบบ...",
    eyebrow: "RoboForge ID",
    status: "หน้า RoboForge พร้อมใช้งาน",
    title: "กลับเข้าสู่ RoboForge",
    body:
      "เข้าสู่ระบบเพื่อกลับไปยังหน้า RoboForge เครื่องมือเชื่อมต่อ และโปรไฟล์ของคุณ",
  },
} as const;

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirectTo = cleanRedirect(params.redirect);
  const locale = loginLocale(params.lang);
  const initialMessage = authMessage(params, locale);
  const copy = loginCopy[locale];

  return (
    <main className="relative isolate min-h-dvh overflow-hidden px-4 py-6 sm:px-6 lg:grid lg:place-items-center lg:px-8">
      <Image alt="" className="-z-20 object-cover opacity-30" fill priority sizes="100vw" src="/assets/lumina/garage-background-wide.png" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-white/95 via-sky-50/90 to-violet-50/95" />
      <div className="mx-auto w-full max-w-6xl">
        <Link aria-label="กลับหน้าหลัก RoboForge" className="inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-slate-700 hover:bg-white/70" href="/"><ArrowLeft className="size-4" /><span className="grid size-8 place-items-center rounded-xl bg-blue-600 text-white"><Bot className="size-4" /></span>ROBOFORGE</Link>
        <div className="mt-5 grid items-center gap-8 lg:grid-cols-5 lg:gap-14">
          <section className="relative min-h-72 overflow-hidden rounded-3xl border border-white/80 bg-white/70 p-7 sm:p-10 lg:col-span-3 lg:min-h-96">
            <p className="text-sm font-semibold text-blue-700">{copy.eyebrow}</p>
            <h1 className="mt-3 max-w-xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">{copy.title}</h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-slate-600">{copy.body}</p>
            <Image alt="Lyra ผู้ช่วย RoboForge" className="absolute bottom-0 right-0 h-72 w-auto object-contain object-bottom sm:h-96" height={420} priority sizes="(min-width: 1024px) 24rem, 16rem" src="/assets/lumina/lyra-guide-thigh-up.png" width={320} />
            <p className="absolute bottom-5 left-6 rounded-2xl bg-white/90 px-4 py-3 text-sm font-semibold text-slate-700 shadow-lg sm:bottom-8 sm:left-8">{copy.status}</p>
          </section>
          <div className="lg:col-span-2"><Suspense fallback={<div className="rounded-3xl bg-white p-8 text-sm text-slate-500">{copy.fallback}</div>}><AuthForm initialMessage={initialMessage} locale={locale} redirectTo={redirectTo} /></Suspense></div>
        </div>
      </div>
    </main>
  );
}
