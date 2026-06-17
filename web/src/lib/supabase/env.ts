export function getSupabaseEnv() {
  return {
    adminEmails: process.env.ROBOFORGE_ADMIN_EMAILS?.trim() ?? "",
    publishableKey:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "",
    url: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "",
  };
}

export function isSupabaseConfigured() {
  const { publishableKey, url } = getSupabaseEnv();
  return Boolean(url && publishableKey);
}
