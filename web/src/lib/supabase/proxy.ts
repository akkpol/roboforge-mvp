import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

function cleanRedirect(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

export async function updateSession(request: NextRequest) {
  const { publishableKey, url } = getSupabaseEnv();
  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;

  if (!url || !publishableKey) {
    return response;
  }

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, options, value }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();
  const user = error ? null : data?.claims;

  if (pathname === "/login" && user) {
    const redirectTarget = cleanRedirect(request.nextUrl.searchParams.get("redirect"));
    return NextResponse.redirect(new URL(redirectTarget, request.url));
  }

  return response;
}
