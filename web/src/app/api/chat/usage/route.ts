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
  const readonly: boolean = body?.readonly === true; // check only, don't deduct

  if (!userId || userId.length < 3) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const month = getMonth();
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ allowed: true, count: 0, remaining: 9, limit: MONTH_LIMIT, month, fallback: true });
  }

  try {
    const { data: row } = await supabase
      .from("lyra_usage")
      .select("count")
      .eq("user_id", userId)
      .eq("month", month)
      .maybeSingle();

    const currentCount = row?.count ?? 0;

    if (readonly) {
      // Read-only: just return current count, no deduction
      return NextResponse.json({
        allowed: currentCount < MONTH_LIMIT,
        count: currentCount,
        remaining: Math.max(0, MONTH_LIMIT - currentCount),
        limit: MONTH_LIMIT,
        month,
      });
    }

    // Deduct mode: increment if allowed
    const allowed = currentCount < MONTH_LIMIT;

    if (allowed) {
      if (row) {
        await supabase
          .from("lyra_usage")
          .update({ count: currentCount + 1, updated_at: new Date().toISOString() })
          .eq("user_id", userId)
          .eq("month", month);
      } else {
        await supabase.from("lyra_usage").insert({ user_id: userId, month, count: 1 });
      }
    }

    return NextResponse.json({
      allowed,
      count: currentCount + (allowed ? 1 : 0),
      remaining: Math.max(0, MONTH_LIMIT - currentCount - (allowed ? 1 : 0)),
      limit: MONTH_LIMIT,
      month,
    });
  } catch (err) {
    return NextResponse.json({ allowed: true, count: 0, remaining: 9, limit: MONTH_LIMIT, month, error: String(err) });
  }
}
