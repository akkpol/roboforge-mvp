import Link from "next/link";
import { getSupabaseEnv } from "@/lib/supabase/env";

function projectHost(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return "not configured";
  }
}

export default function AuthDiagnosticsPage() {
  const { appUrl, publishableKey, url } = getSupabaseEnv();
  const siteUrl = appUrl || "browser origin";
  const callbackUrl = appUrl
    ? `${appUrl}/auth/callback`
    : "http://localhost:3000/auth/callback";

  return (
    <main className="auth-page">
      <section className="auth-copy">
        <span className="eyebrow">AUTH DIAGNOSTICS</span>
        <h1>Google login setup check.</h1>
        <p>
          Use this page to compare the app callback URL with Supabase and Google
          Cloud settings. It shows only public configuration, not secrets.
        </p>
        <Link className="button button-secondary" href="/login">
          Back to login
        </Link>
      </section>

      <section className="auth-card">
        <div className="ops-list">
          <span>
            <strong>app url</strong>
            <small>{siteUrl}</small>
          </span>
          <span>
            <strong>callback url</strong>
            <small>{callbackUrl}</small>
          </span>
          <span>
            <strong>supabase host</strong>
            <small>{projectHost(url)}</small>
          </span>
          <span>
            <strong>publishable key</strong>
            <small>{publishableKey ? "configured" : "missing"}</small>
          </span>
        </div>

        <div className="ops-feed">
          <span>
            <strong>Supabase Redirect URLs</strong>
            <p>Production: https://roboforge-saas.vercel.app/auth/callback</p>
            <p>Local: http://localhost:3000/auth/callback</p>
          </span>
          <span>
            <strong>Google Cloud Redirect URI</strong>
            <p>https://ufvsuzwlziokayoauyxh.supabase.co/auth/v1/callback</p>
          </span>
        </div>
      </section>
    </main>
  );
}
