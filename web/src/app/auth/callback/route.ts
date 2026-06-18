import { type NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

const oauthNextCookieName = "roboforge_oauth_next";

function cleanNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
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

function redirectAndClearOAuthCookie(location: string | URL) {
  const response = NextResponse.redirect(location);
  response.cookies.set(oauthNextCookieName, "", {
    maxAge: 0,
    path: "/",
  });
  return response;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = cleanNext(url.searchParams.get("next") ?? getStoredNext(request));
  const { appUrl } = getSupabaseEnv();

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } =
      (await supabase?.auth.exchangeCodeForSession(code)) ?? { error: null };

    if (error) {
      const errorUrl = new URL("/login", appUrl || request.url);
      errorUrl.searchParams.set("error", "oauth");
      errorUrl.searchParams.set("error_description", error.message);
      errorUrl.searchParams.set("redirect", next);
      return redirectAndClearOAuthCookie(errorUrl);
    }
  }

  if (appUrl) {
    return redirectAndClearOAuthCookie(new URL(next, appUrl));
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";

  if (forwardedHost) {
    return redirectAndClearOAuthCookie(`${forwardedProto}://${forwardedHost}${next}`);
  }

  return redirectAndClearOAuthCookie(new URL(next, request.url));
}
