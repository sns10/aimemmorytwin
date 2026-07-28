import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { assignCluster, type Cluster } from "./personality";


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
    const { resolveStudent } = await import("./session.server");
    const { supabase, studentId } = await resolveStudent();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [profileRes, cohortRes, eventsRes] = await Promise.all([
      supabase
        .from("personality_profiles")
        .select(
          "cluster, tailored_enabled, openness, conscientiousness, extraversion, agreeableness, neuroticism, math_confidence",
        )
        .eq("student_id", studentId)
        .maybeSingle(),
      supabase
        .from("cohort_topic_stats")
        .select("concept_id, peers_completed, top_achievers_completed, cohort_size"),
      supabase
        .from("learning_events")
        .select("id")
        .eq("student_id", studentId)
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
    const { resolveStudent } = await import("./session.server");
    const { supabase, studentId } = await resolveStudent();
    const { error } = await supabase.from("personality_profiles").upsert(
      {
        student_id: studentId,
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
    const { resolveStudent } = await import("./session.server");
    const { supabase, studentId } = await resolveStudent();
    const { error } = await supabase
      .from("personality_profiles")
      .update({ tailored_enabled: data.enabled })
      .eq("student_id", studentId);
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
    const { resolveStudent } = await import("./session.server");
    const { supabase, studentId } = await resolveStudent();
    const { error } = await supabase.from("recommendation_events").insert({
      student_id: studentId,
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
    const { resolveStudent } = await import("./session.server");
    const { supabase, studentId } = await resolveStudent();
    const { data, error } = await supabase
      .from("recommendation_events")
      .select("kind, explanation_mode")
      .eq("student_id", studentId)
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