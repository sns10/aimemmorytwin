import { createServerFn } from "@tanstack/react-start";

export type TimelineKind = "quiz_answer" | "lesson_view" | "assignment_submit";

export interface TimelineEvent {
  id: string;
  created_at: string;
  event_kind: TimelineKind;
  concept_id: string;
  concept_name: string;
  subject: string;
  is_correct: boolean;
  response_time_ms: number;
  difficulty: number;
  pre_mastery: number | null;
  post_mastery: number | null;
  question_id: string | null;
  question_text: string | null;
  /** 1-based position of this question inside its concept bank, for "Q14"-style labels. */
  question_label: string | null;
}

export interface TimelineData {
  events: TimelineEvent[];
  concepts: { id: string; name: string }[];
  /** Per-concept mastery trajectory, oldest first. */
  trajectories: Record<string, number[]>;
  total: number;
}

export const getTimeline = createServerFn({ method: "GET" }).handler(
  async (): Promise<TimelineData> => {
    const { resolveStudent } = await import("./session.server");
    const { supabase, studentId } = await resolveStudent();

    const { data: rows, error } = await supabase
      .from("learning_events")
      .select(
        "id, created_at, event_kind, concept_id, is_correct, response_time_ms, difficulty, pre_mastery, post_mastery, question_id, concepts(name, subject), questions(question, sort_order)",
      )
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw error;

    const events: TimelineEvent[] = (rows ?? []).map((r) => {
      const concept = r.concepts as { name: string; subject: string } | null;
      const question = r.questions as { question: string; sort_order: number } | null;
      return {
        id: r.id,
        created_at: r.created_at,
        event_kind: (r.event_kind as TimelineKind) ?? "quiz_answer",
        concept_id: r.concept_id,
        concept_name: concept?.name ?? "Concept",
        subject: concept?.subject ?? "",
        is_correct: r.is_correct,
        response_time_ms: r.response_time_ms,
        difficulty: Number(r.difficulty),
        pre_mastery: r.pre_mastery === null ? null : Number(r.pre_mastery),
        post_mastery: r.post_mastery === null ? null : Number(r.post_mastery),
        question_id: r.question_id,
        question_text: question?.question ?? null,
        question_label: question ? `Q${question.sort_order + 1}` : null,
      };
    });

    const conceptMap = new Map<string, string>();
    for (const e of events) conceptMap.set(e.concept_id, e.concept_name);

    const trajectories: Record<string, number[]> = {};
    for (const e of [...events].reverse()) {
      if (e.post_mastery === null) continue;
      (trajectories[e.concept_id] ??= []).push(e.post_mastery);
    }

    return {
      events,
      concepts: [...conceptMap].map(([id, name]) => ({ id, name })).sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
      trajectories,
      total: events.length,
    };
  },
);