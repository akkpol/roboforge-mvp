"use client";

import { KeyRound, LockKeyhole, Mail, UserPlus } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
    name: "Owner name",
    namePlaceholder: "Akkapol",
    password: "Password",
    passwordPlaceholder: "At least 6 characters",
    signUp: "Sign up",
    signupNeedsConfirmation:
      "Account created. Check email confirmation if it is enabled.",
    working: "Working...",
  },
  th: {
    configuredWarning:
      "Supabase ยังไม่เชื่อมต่อ ต้องตั้ง NEXT_PUBLIC_SUPABASE_URL และ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ใน `.env.local` ก่อน",
    createAccount: "สร้างบัญชี",
    email: "อีเมล",
    emailAccess: "เข้าด้วยอีเมล",
    envMissing: "เพิ่ม Supabase env vars ก่อน แล้ว restart dev server",
    google: "เข้าสู่ระบบด้วย Google",
    googleBusy: "กำลังเปิด Google...",
    login: "เข้าสู่ระบบ",
    name: "ชื่อเจ้าของ",
    namePlaceholder: "Akkapol",
    password: "รหัสผ่าน",
    passwordPlaceholder: "อย่างน้อย 6 ตัวอักษร",
    signUp: "สมัครบัญชี",
    signupNeedsConfirmation:
      "สร้างบัญชีแล้ว ถ้าเปิดยืนยันอีเมลไว้ ให้เช็คกล่องอีเมลก่อนเข้าใช้งาน",
    working: "กำลังทำงาน...",
  },
} as const;

function cleanRedirectTarget(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

function rememberOAuthRedirect(value: string) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${oauthNextCookieName}=${encodeURIComponent(
    cleanRedirectTarget(value),
  )}; Max-Age=600; Path=/; SameSite=Lax${secure}`;
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
    const callbackUrl = new URL(
      "/auth/callback",
      appUrl || window.location.origin,
    );

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

      <div className="oauth-panel">
        <button
          className="button auth-submit oauth-button"
          disabled={busy || !configured}
          onClick={continueWithGoogle}
          type="button"
        >
          <KeyRound size={18} />
          {busyAction === "google" ? copy.googleBusy : copy.google}
        </button>
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

        <button className="button auth-submit" disabled={busy || !configured} type="submit">
          <LockKeyhole size={18} />
          {busyAction === "email"
            ? copy.working
            : mode === "sign-in"
              ? copy.login
              : copy.createAccount}
        </button>
      </form>

      {!configured ? (
        <p className="form-message is-warning">{copy.configuredWarning}</p>
      ) : null}
      {message ? <p className="form-message">{message}</p> : null}
    </section>
  );
}
