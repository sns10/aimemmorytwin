import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getRequest } from "@tanstack/react-start/server";
import type { Database } from "@/integrations/supabase/types";

export const DEMO_STUDENT_ID_VALUE = "11111111-1111-1111-1111-111111111111";

type Client = SupabaseClient<Database>;

function baseClient(token?: string): Client {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (
          (key.startsWith("sb_publishable_") || key.startsWith("sb_secret_")) &&
          h.get("Authorization") === `Bearer ${key}`
        ) {
          h.delete("Authorization");
        }
        if (token) h.set("Authorization", `Bearer ${token}`);
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

function bearerToken(): string | null {
  try {
    const request = getRequest();
    const header = request?.headers?.get("authorization") ?? null;
    if (!header || !header.startsWith("Bearer ")) return null;
    const token = header.slice(7).trim();
    if (!token || token.split(".").length !== 3) return null;
    return token;
  } catch {
    return null;
  }
}

export interface ResolvedStudent {
  supabase: Client;
  studentId: string;
  userId: string | null;
  isDemo: boolean;
}

/**
 * Resolve the learner behind the current request.
 * Signed-in users get their own `students` row (created on first request);
 * anonymous visitors fall back to the shared demo learner.
 */
export async function resolveStudent(): Promise<ResolvedStudent> {
  const token = bearerToken();
  if (!token) {
    return {
      supabase: baseClient(),
      studentId: DEMO_STUDENT_ID_VALUE,
      userId: null,
      isDemo: true,
    };
  }

  const supabase = baseClient(token);
  const { data: claims, error } = await supabase.auth.getClaims(token);
  const userId = !error && claims?.claims?.sub ? String(claims.claims.sub) : null;
  if (!userId) {
    return {
      supabase: baseClient(),
      studentId: DEMO_STUDENT_ID_VALUE,
      userId: null,
      isDemo: true,
    };
  }

  const { data: existing } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing?.id) {
    return { supabase, studentId: existing.id, userId, isDemo: false };
  }

  const email =
    (claims?.claims as Record<string, unknown> | undefined)?.email as string | undefined;
  const name = email ? email.split("@")[0] : "Learner";

  const { data: created, error: insertError } = await supabase
    .from("students")
    .insert({ name, user_id: userId })
    .select("id")
    .single();

  if (insertError || !created) {
    // Could not provision a record — fall back to demo so the app stays usable.
    return {
      supabase: baseClient(),
      studentId: DEMO_STUDENT_ID_VALUE,
      userId,
      isDemo: true,
    };
  }

  return { supabase, studentId: created.id, userId, isDemo: false };
}
