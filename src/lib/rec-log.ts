import { supabase } from "@/integrations/supabase/client";

export type RecEvent = {
  concept_id: string;
  kind: "impression" | "click";
  lane: "learn" | "practice" | "apply" | "review";
  explanation_mode: "tailored" | "characteristic";
  persuasive_type?: "authority" | "commitment" | "peer" | null;
  profile_cluster?: string | null;
};

/**
 * Fire-and-forget recommendation analytics.
 * Uses `keepalive` so a click that triggers navigation is not aborted
 * (an aborted server-fn call surfaced as a 500 / blank screen).
 */
export async function logRecEvent(event: RecEvent): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    await fetch("/api/rec-event", {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(event),
    });
  } catch {
    // ignore
  }
}
