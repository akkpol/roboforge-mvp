"use client";

import { LockKeyhole, Mail, UserPlus } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser";
import { getSupabaseEnv, isSupabaseConfigured } from "@/lib/supabase/env";

type Mode = "sign-in" | "sign-up";
type BusyAction = "email" | "google" | null;
type AuthLocale = "en" | "th";
const oauthNextCookieName = "roboforge_oauth_next";

const authCopy = {
  en: {
    configuredWarning:
      "Supabase is not connected yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in `.env.local`.",
    createAccount: "Create account",
    email: "Email",
    emailAccess: "Email access",
    envMissing: "Add Supabase env vars first, then restart the dev server.",
    google: "Continue with Google",
    googleBusy: "Opening Google...",
    login: "Login",
    name: "Your name",
    namePlaceholder: "Akkapol",
    password: "Password",
    passwordPlaceholder: "At least 6 characters",
    routeNote: "After login, you return to `/`: the Lumina Garden Garage home screen.",
    signUp: "Sign up",
    signupNeedsConfirmation:
      "Account created. Check email confirmation if it is enabled.",
    working: "Working...",
  },
  th: {
    configuredWarning:
      "Supabase ยังไม่เชื่อมต่อ ต้องตั้งค่า NEXT_PUBLIC_SUPABASE_URL และ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ใน `.env.local` ก่อน",
    createAccount: "สร้างบัญชี",
    email: "อีเมล",
    emailAccess: "เข้าด้วยอีเมล",
    envMissing: "ตั้งค่าตัวแปร Supabase ก่อน แล้ว restart dev server",
    google: "เข้าสู่ระบบด้วย Google",
    googleBusy: "กำลังเปิด Google...",
    login: "เข้าสู่ระบบ",
    name: "ชื่อของคุณ",
    namePlaceholder: "Akkapol",
    password: "รหัสผ่าน",
    passwordPlaceholder: "อย่างน้อย 6 ตัวอักษร",
    routeNote: "หลังเข้าสู่ระบบสำเร็จ ระบบจะกลับไปที่ `/` คือหน้า Lumina Garden Garage หลัก",
    signUp: "สมัครบัญชี",
    signupNeedsConfirmation:
      "สร้างบัญชีแล้ว ถ้าเปิดการยืนยันอีเมลไว้ ให้เช็คกล่องอีเมลก่อนเข้าใช้งาน",
    working: "กำลังทำงาน...",
  },
} as const;

function cleanRedirectTarget(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function rememberOAuthRedirect(value: string) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${oauthNextCookieName}=${encodeURIComponent(
    cleanRedirectTarget(value),
  )}; Max-Age=600; Path=/; SameSite=Lax${secure}`;
}

function resolveOAuthOrigin(appUrl: string) {
  const currentOrigin = window.location.origin;
  const currentHost = window.location.hostname;

  if (currentHost === "localhost" || currentHost === "127.0.0.1") {
    return currentOrigin;
  }

  return appUrl || currentOrigin;
}

function GoogleMark() {
  return (
    <svg
      aria-hidden="true"
      className="google-mark"
      focusable="false"
      viewBox="0 0 24 24"
    >
      <path
        d="M23.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.29h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3h3.89c2.27-2.09 3.54-5.18 3.54-8.64z"
        fill="#4285F4"
      />
      <path
        d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.89-3c-1.08.72-2.46 1.14-4.06 1.14-3.13 0-5.78-2.11-6.72-4.95H1.26v3.09C3.24 21.3 7.3 24 12 24z"
        fill="#34A853"
      />
      <path
        d="M5.28 14.29c-.24-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.26A11.96 11.96 0 0 0 0 12c0 1.94.46 3.77 1.26 5.38l4.02-3.09z"
        fill="#FBBC05"
      />
      <path
        d="M12 4.76c1.76 0 3.34.6 4.58 1.8l3.45-3.45C17.95 1.18 15.24 0 12 0 7.3 0 3.24 2.7 1.26 6.62l4.02 3.09C6.22 6.87 8.87 4.76 12 4.76z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function AuthForm({
  initialMessage = "",
  locale = "en",
  redirectTo,
}: {
  initialMessage?: string;
  locale?: AuthLocale;
  redirectTo: string;
}) {
  const router = useRouter();
  const copy = authCopy[locale];
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState(initialMessage);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const configured = useMemo(() => isSupabaseConfigured(), []);
  const busy = busyAction !== null;

  async function continueWithGoogle() {
    setMessage("");

    const supabase = getBrowserSupabaseClient();
    if (!supabase) {
      setMessage(copy.envMissing);
      return;
    }

    setBusyAction("google");
    rememberOAuthRedirect(redirectTo);
    const { appUrl } = getSupabaseEnv();
    const callbackUrl = new URL("/auth/callback", resolveOAuthOrigin(appUrl));

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl.toString(),
      },
    });

    if (error) {
      setBusyAction(null);
      setMessage(error.message);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const supabase = getBrowserSupabaseClient();
    if (!supabase) {
      setMessage(copy.envMissing);
      return;
    }

    setBusyAction("email");
    const credentials = { email, password };
    const result =
      mode === "sign-in"
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp({
            ...credentials,
            options: { data: { full_name: name } },
          });

    setBusyAction(null);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    if (mode === "sign-up" && !result.data.session) {
      setMessage(copy.signupNeedsConfirmation);
      return;
    }

    router.replace(redirectTo);
    router.refresh();
  }

  return (
    <section className="auth-card">
      <div className="mode-tabs" role="tablist" aria-label="Auth mode">
        <button
          className={mode === "sign-in" ? "is-active" : ""}
          type="button"
          onClick={() => setMode("sign-in")}
        >
          {copy.login}
        </button>
        <button
          className={mode === "sign-up" ? "is-active" : ""}
          type="button"
          onClick={() => setMode("sign-up")}
        >
          {copy.signUp}
        </button>
      </div>

      <p className="login-route-note">{copy.routeNote}</p>

      <div className="oauth-panel">
        <Button
          className="auth-submit oauth-button"
          disabled={busy || !configured}
          onClick={continueWithGoogle}
          type="button"
          variant="secondary"
        >
          <GoogleMark />
          {busyAction === "google" ? copy.googleBusy : copy.google}
        </Button>
        <div className="auth-divider">
          <span>{copy.emailAccess}</span>
        </div>
      </div>

      <form onSubmit={submit}>
        {mode === "sign-up" ? (
          <label>
            {copy.name}
            <span>
              <UserPlus size={18} />
              <input
                autoComplete="name"
                name="name"
                onChange={(event) => setName(event.target.value)}
                placeholder={copy.namePlaceholder}
                value={name}
              />
            </span>
          </label>
        ) : null}
        <label>
          {copy.email}
          <span>
            <Mail size={18} />
            <input
              autoComplete="email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
          </span>
        </label>
        <label>
          {copy.password}
          <span>
            <LockKeyhole size={18} />
            <input
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              minLength={6}
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder={copy.passwordPlaceholder}
              required
              type="password"
              value={password}
            />
          </span>
        </label>

        <Button className="auth-submit" disabled={busy || !configured} type="submit">
          <LockKeyhole data-icon="inline-start" />
          {busyAction === "email"
            ? copy.working
            : mode === "sign-in"
              ? copy.login
              : copy.createAccount}
        </Button>
      </form>

      {!configured ? (
        <p className="form-message is-warning">{copy.configuredWarning}</p>
      ) : null}
      {message ? <p className="form-message">{message}</p> : null}
    </section>
  );
}
