"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/env";

type BrowserClient = ReturnType<typeof createBrowserClient>;

let client: BrowserClient | null = null;

export function getBrowserSupabaseClient() {
  const { publishableKey, url } = getSupabaseEnv();

  if (!url || !publishableKey) return null;
  client ??= createBrowserClient(url, publishableKey);

  return client;
}
