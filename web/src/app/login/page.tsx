import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    error_description?: string | string[];
    redirect?: string | string[];
  }>;
};

function cleanRedirect(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

function authMessage(params: { error?: string | string[]; error_description?: string | string[] }) {
  const rawError = Array.isArray(params.error) ? params.error[0] : params.error;
  const rawDescription = Array.isArray(params.error_description)
    ? params.error_description[0]
    : params.error_description;

  if (rawDescription) return decodeURIComponent(rawDescription);
  if (rawError === "oauth") {
    return "Google login returned to RoboForge, but the session code could not be exchanged. Check Supabase and Google OAuth callback settings.";
  }
  if (rawError) return `Login error: ${rawError}`;
  return "";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirectTo = cleanRedirect(params.redirect);
  const initialMessage = authMessage(params);

  return (
    <main className="auth-page">
      <section className="auth-copy">
        <span className="eyebrow">FOUNDER ACCESS</span>
        <h1>Login to your RoboForge garage.</h1>
        <p>
          This is the new SaaS entry point. Supabase handles identity now; the
          old localStorage demo stays separate in the existing Vite app.
        </p>
      </section>
      <Suspense fallback={<div className="auth-card">Loading auth...</div>}>
        <AuthForm initialMessage={initialMessage} redirectTo={redirectTo} />
      </Suspense>
    </main>
  );
}
