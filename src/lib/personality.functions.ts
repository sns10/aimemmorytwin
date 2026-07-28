import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { DEMO_STUDENT_ID } from "./memorytwin.functions";
import { assignCluster, type Cluster } from "./personality";

function makeClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (
          (key.startsWith("sb_publishable_") || key.startsWith("sb_secret_")) &&
          h.get("Authorization") === `Bearer ${key}`
        ) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export type CohortStat = {
  concept_id: string;
  peers_completed: number;
  top_achievers_completed: number;
  cohort_size: number;
};

export type PersonalityContext = {
  profile: {
    cluster: Cluster;
    tailored_enabled: boolean;
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
    math_confidence: number;
  } | null;
  cohort: CohortStat[];
  recsUsedToday: number;
};

/** Everything the explanation layer needs, in one round trip. */
export const getPersonalityContext = createServerFn({ method: "GET" }).handler(
  async (): Promise<PersonalityContext> => {
    const supabase = makeClient();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [profileRes, cohortRes, eventsRes] = await Promise.all([
      supabase
        .from("personality_profiles")
        .select(
          "cluster, tailored_enabled, openness, conscientiousness, extraversion, agreeableness, neuroticism, math_confidence",
        )
        .eq("student_id", DEMO_STUDENT_ID)
        .maybeSingle(),
      supabase
        .from("cohort_topic_stats")
        .select("concept_id, peers_completed, top_achievers_completed, cohort_size"),
      supabase
        .from("learning_events")
        .select("id")
        .eq("student_id", DEMO_STUDENT_ID)
        .gte("created_at", startOfDay.toISOString()),
    ]);
    if (profileRes.error) throw profileRes.error;
    if (cohortRes.error) throw cohortRes.error;
    if (eventsRes.error) throw eventsRes.error;

    const p = profileRes.data;
    return {
      profile: p
        ? {
            cluster: p.cluster as Cluster,
            tailored_enabled: p.tailored_enabled,
            openness: Number(p.openness),
            conscientiousness: Number(p.conscientiousness),
            extraversion: Number(p.extraversion),
            agreeableness: Number(p.agreeableness),
            neuroticism: Number(p.neuroticism),
            math_confidence: Number(p.math_confidence),
          }
        : null,
      cohort: (cohortRes.data ?? []).map((c) => ({
        concept_id: c.concept_id,
        peers_completed: c.peers_completed,
        top_achievers_completed: c.top_achievers_completed,
        cohort_size: c.cohort_size,
      })),
      recsUsedToday: (eventsRes.data ?? []).length,
    };
  },
);

const SaveProfileInput = z.object({
  openness: z.number().min(1).max(7),
  conscientiousness: z.number().min(1).max(7),
  extraversion: z.number().min(1).max(7),
  agreeableness: z.number().min(1).max(7),
  neuroticism: z.number().min(1).max(7),
  math_confidence: z.number().min(1).max(5),
});

export const savePersonalityProfile = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SaveProfileInput.parse(input))
  .handler(async ({ data }) => {
    const { cluster, distances } = assignCluster(data);
    const supabase = makeClient();
    const { error } = await supabase.from("personality_profiles").upsert(
      {
        student_id: DEMO_STUDENT_ID,
        ...data,
        cluster,
        tailored_enabled: true,
        assessed_at: new Date().toISOString(),
      },
      { onConflict: "student_id" },
    );
    if (error) throw error;
    return { cluster, distances };
  });

export const setTailoredEnabled = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ enabled: z.boolean() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = makeClient();
    const { error } = await supabase
      .from("personality_profiles")
      .update({ tailored_enabled: data.enabled })
      .eq("student_id", DEMO_STUDENT_ID);
    if (error) throw error;
    return { ok: true };
  });

const LogRecInput = z.object({
  concept_id: z.string().uuid(),
  kind: z.enum(["impression", "click"]),
  lane: z.enum(["learn", "practice", "apply", "review"]),
  explanation_mode: z.enum(["tailored", "characteristic"]),
  persuasive_type: z.enum(["authority", "commitment", "peer"]).nullable().optional(),
  profile_cluster: z.string().nullable().optional(),
});

/** Engagement logging — the paper's outcome measure (rec usage / CVR). */
export const logRecommendationEvent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => LogRecInput.parse(input))
  .handler(async ({ data }) => {
    const supabase = makeClient();
    const { error } = await supabase.from("recommendation_events").insert({
      student_id: DEMO_STUDENT_ID,
      concept_id: data.concept_id,
      kind: data.kind,
      lane: data.lane,
      explanation_mode: data.explanation_mode,
      persuasive_type: data.persuasive_type ?? null,
      profile_cluster: data.profile_cluster ?? null,
    });
    if (error) throw error;
    return { ok: true };
  });

export type EngagementStats = {
  mode: "tailored" | "characteristic";
  impressions: number;
  clicks: number;
  cvr: number;
}[];

export const getEngagementStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<EngagementStats> => {
    const supabase = makeClient();
    const { data, error } = await supabase
      .from("recommendation_events")
      .select("kind, explanation_mode")
      .eq("student_id", DEMO_STUDENT_ID)
      .limit(5000);
    if (error) throw error;

    const modes: ("tailored" | "characteristic")[] = ["tailored", "characteristic"];
    return modes.map((mode) => {
      const rows = (data ?? []).filter((r) => r.explanation_mode === mode);
      const impressions = rows.filter((r) => r.kind === "impression").length;
      const clicks = rows.filter((r) => r.kind === "click").length;
      return {
        mode,
        impressions,
        clicks,
        cvr: impressions > 0 ? clicks / impressions : 0,
      };
    });
  },
);