import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

const MONTH_LIMIT = 10;

function getMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getServiceClient() {
  const { url, serviceRoleKey } = getSupabaseEnv();
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const userId: string | null = body?.userId?.trim() || null;

  if (!userId || userId.length < 3) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const month = getMonth();
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server config error" }, { status: 500 });
  }

  // Get current count
  const { data: row } = await supabase
    .from("lyra_usage")
    .select("count")
    .eq("user_id", userId)
    .eq("month", month)
    .maybeSingle();

  const currentCount = row?.count ?? 0;
  const remaining = Math.max(0, MONTH_LIMIT - currentCount);
  const allowed = currentCount < MONTH_LIMIT;

  // Increment if allowed
  if (allowed) {
    if (row) {
      await supabase
        .from("lyra_usage")
        .update({ count: currentCount + 1, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("month", month);
    } else {
      await supabase
        .from("lyra_usage")
        .insert({ user_id: userId, month, count: 1 });
    }
  }

  return NextResponse.json({
    allowed,
    count: currentCount + (allowed ? 1 : 0),
    remaining: remaining - (allowed ? 1 : 0),
    limit: MONTH_LIMIT,
    month,
  });
}
