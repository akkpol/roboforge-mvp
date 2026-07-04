import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { NextResponse } from "next/server";

export async function GET() {
  const { url, serviceRoleKey } = getSupabaseEnv();
  if (!url || !serviceRoleKey) return NextResponse.json({ error: "Missing config" });

  const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });

  // Try to query — if table exists, we're done
  const { error: testErr } = await supabase.from("lyra_usage").select("id").limit(1);
  if (!testErr) return NextResponse.json({ ok: true, message: "Table already exists" });

  // Create the table using exec_sql from pg_net
  const { error } = await supabase.rpc("exec_sql", {
    sql_text: `
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
      grant usage on schema public to service_role;
    `,
  });

  if (error) {
    // Try via management API — direct PostgREST
    const createRes = await fetch(`${url}/rest/v1/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Prefer": "return=headers-only",
      },
      body: JSON.stringify({
        // Can't create table via PostgREST, need SQL
      }),
    });

    return NextResponse.json({
      error: error.message,
      hint: "Create table manually in Supabase Dashboard > SQL Editor with the migration SQL",
      sql: `
create table if not exists public.lyra_usage (
  id uuid not null default gen_random_uuid() primary key,
  user_id text not null,
  month text not null,
  count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unique_user_month unique (user_id, month)
);
alter table public.lyra_usage enable row level security;
grant all on table public.lyra_usage to service_role;
      `.trim(),
    }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
