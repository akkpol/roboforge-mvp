import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

type LoginPageProps = {
  searchParams: Promise<{
    redirect?: string | string[];
  }>;
};

function cleanRedirect(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirectTo = cleanRedirect(params.redirect);

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
        <AuthForm redirectTo={redirectTo} />
      </Suspense>
    </main>
  );
}
