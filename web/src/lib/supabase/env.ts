function cleanPublicUrl(value: string | undefined) {
  const raw = value?.trim();
  if (!raw) return "";

  try {
    const url = new URL(raw);
    url.pathname = url.pathname.replace(/\/+$/, "");
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function cleanPublicKey(value: string | undefined) {
  const raw = value?.trim() ?? "";
  if (!raw || raw.includes("...")) return "";
  return raw;
}

export function getSupabaseEnv() {
  return {
    appUrl: cleanPublicUrl(process.env.NEXT_PUBLIC_APP_URL),
    publishableKey:
      cleanPublicKey(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
      cleanPublicKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "",
    url: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "",
  };
}

export function isSupabaseConfigured() {
  const { publishableKey, url } = getSupabaseEnv();
  return Boolean(url && publishableKey);
}
