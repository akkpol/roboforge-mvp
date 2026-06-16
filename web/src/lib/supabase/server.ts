import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "@/lib/supabase/env";

export async function createServerSupabaseClient() {
  const { publishableKey, url } = getSupabaseEnv();

  if (!url || !publishableKey) return null;

  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, options, value }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot set cookies. Route handlers and proxy can.
        }
      },
    },
  });
}

export async function getCurrentUser() {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return { configured: false, user: null };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { configured: true, user };
}
