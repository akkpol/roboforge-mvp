"use client";

import { LockKeyhole, Mail, UserPlus } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type Mode = "sign-in" | "sign-up";

export function AuthForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const configured = useMemo(() => isSupabaseConfigured(), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const supabase = getBrowserSupabaseClient();
    if (!supabase) {
      setMessage("Add Supabase env vars first, then restart the dev server.");
      return;
    }

    setBusy(true);
    const credentials = { email, password };
    const result =
      mode === "sign-in"
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp({
            ...credentials,
            options: { data: { full_name: name } },
          });

    setBusy(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    if (mode === "sign-up" && !result.data.session) {
      setMessage("Account created. Check email confirmation if it is enabled.");
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
          Login
        </button>
        <button
          className={mode === "sign-up" ? "is-active" : ""}
          type="button"
          onClick={() => setMode("sign-up")}
        >
          Sign up
        </button>
      </div>

      <form onSubmit={submit}>
        {mode === "sign-up" ? (
          <label>
            Owner name
            <span>
              <UserPlus size={18} />
              <input
                autoComplete="name"
                name="name"
                onChange={(event) => setName(event.target.value)}
                placeholder="Akkapol"
                value={name}
              />
            </span>
          </label>
        ) : null}
        <label>
          Email
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
          Password
          <span>
            <LockKeyhole size={18} />
            <input
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              minLength={6}
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              required
              type="password"
              value={password}
            />
          </span>
        </label>

        <button className="button auth-submit" disabled={busy || !configured} type="submit">
          <LockKeyhole size={18} />
          {busy ? "Working..." : mode === "sign-in" ? "Login" : "Create account"}
        </button>
      </form>

      {!configured ? (
        <p className="form-message is-warning">
          Supabase is not connected yet. Add NEXT_PUBLIC_SUPABASE_URL and
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in `.env.local`.
        </p>
      ) : null}
      {message ? <p className="form-message">{message}</p> : null}
    </section>
  );
}
