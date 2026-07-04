"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type MiniSession = { user: { id: string } } | null;

export function useSupabaseSession(): MiniSession {
  const [session, setSession] = useState<MiniSession>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = createClient();
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }: { data: { session: MiniSession } }) => {
      setSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event: string, s: MiniSession) => {
        setSession(s);
      },
    );

    return () => { listener?.subscription.unsubscribe(); };
  }, []);

  return session;
}
