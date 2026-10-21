import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type ActivityKind = "flashcard" | "cloze" | "match";

export interface FlashcardPayload {
  front: string;
  back: string;
  why?: string;
}

export interface ClozePayload {
  text: string;
  answer: string;
  options: string[];
}

export interface MatchPayload {
  pairs: [string, string][];
}

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  payload: FlashcardPayload | ClozePayload | MatchPayload;
  sort_order: number;
}

export interface ActivitySet {
  concept_id: string;
  concept_name: string;
  chapter_name: string;
  mastery: number;
  flashcards: ActivityItem[];
  cloze: ActivityItem[];
  match: ActivityItem[];
}

export const getActivitySet = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ concept_id: z.string().uuid() }).parse(input))
  .handler(async ({ data }): Promise<ActivitySet> => {
    const { resolveStudent } = await import("./session.server");
    const { supabase, studentId } = await resolveStudent();

    const [conceptRes, actsRes, stateRes] = await Promise.all([
      supabase
        .from("concepts")
        .select("id, name, chapters(name)")
        .eq("id", data.concept_id)
        .maybeSingle(),
      supabase
        .from("topic_activities")
        .select("id, kind, payload, sort_order")
        .eq("concept_id", data.concept_id)
        .order("sort_order"),
      supabase
        .from("knowledge_states")
        .select("mastery_probability")
        .eq("student_id", studentId)
        .eq("concept_id", data.concept_id)
        .maybeSingle(),
    ]);
    if (conceptRes.error) throw conceptRes.error;
    if (actsRes.error) throw actsRes.error;
    if (!conceptRes.data) throw new Error("Unknown topic");

    const rows = (actsRes.data ?? []) as unknown as ActivityItem[];
    const chapter = conceptRes.data.chapters as { name: string } | null;

    return {
      concept_id: conceptRes.data.id,
      concept_name: conceptRes.data.name,
      chapter_name: chapter?.name ?? "",
      mastery: Number(stateRes.data?.mastery_probability ?? 0.15),
      flashcards: rows.filter((r) => r.kind === "flashcard").slice(0, 6),
      cloze: rows.filter((r) => r.kind === "cloze"),
      match: rows.filter((r) => r.kind === "match"),
    };
  });
