import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { NextResponse } from "next/server";

export async function GET() {
  const { url, serviceRoleKey } = getSupabaseEnv();
  if (!url || !serviceRoleKey) {
    return NextResponse.json({ error: "Missing Supabase config" }, { status: 500 });
  }

  const sql = `
    create table if not exists public.lyra_usage (
      id uuid not null default gen_random_uuid() primary key,
      user_id text not null,
      month text not null,
      count int not null default 0,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint unique_user_month unique (user_id, month)
    );
    grant all on table public.lyra_usage to service_role;
  `;

  try {
    const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
    const { error } = await supabase.rpc("exec_sql", { query: sql });
    if (error) {
      // Fallback: create table via rest API
      const res = await fetch(`${url}/rest/v1/rpc/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({}),
      });
      return NextResponse.json({ fallback: res.status, text: await res.text() });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
