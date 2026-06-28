import { type NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

const oauthNextCookieName = "roboforge_oauth_next";

function cleanNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

function getStoredNext(request: NextRequest) {
  const value = request.cookies.get(oauthNextCookieName)?.value;
  if (!value) return null;

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function resolveAppOrigin(request: NextRequest, appUrl: string) {
  const hostname = request.nextUrl.hostname;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return request.nextUrl.origin;
  }

  if (appUrl) {
    return appUrl;
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return request.nextUrl.origin;
}

function redirectAndClearOAuthCookie(request: NextRequest, location: string | URL) {
  const response = NextResponse.redirect(location);
  response.cookies.set(oauthNextCookieName, "", {
    expires: new Date(0),
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
  });
  return response;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const providerError =
    url.searchParams.get("error_description") ?? url.searchParams.get("error");
  const next = cleanNext(url.searchParams.get("next") ?? getStoredNext(request));
  const { appUrl } = getSupabaseEnv();
  const appOrigin = resolveAppOrigin(request, appUrl);

  if (!code || providerError) {
    const errorUrl = new URL("/login", appOrigin);
    errorUrl.searchParams.set("error", "oauth");
    errorUrl.searchParams.set(
      "error_description",
      providerError ??
        "Google did not return an auth code. Check the Supabase redirect URL and Google OAuth client settings.",
    );
    errorUrl.searchParams.set("redirect", next);
    return redirectAndClearOAuthCookie(request, errorUrl);
  }

  const supabase = await createServerSupabaseClient();
  const { error } =
    (await supabase?.auth.exchangeCodeForSession(code)) ?? { error: null };

  if (error) {
    const errorUrl = new URL("/login", appOrigin);
    errorUrl.searchParams.set("error", "oauth");
    errorUrl.searchParams.set("error_description", error.message);
    errorUrl.searchParams.set("redirect", next);
    return redirectAndClearOAuthCookie(request, errorUrl);
  }

  return redirectAndClearOAuthCookie(request, new URL(next, appOrigin));
}
