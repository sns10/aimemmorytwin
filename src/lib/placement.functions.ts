import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface PlacementCandidate {
  question_id: string;
  question: string;
  options: string[];
  correct_index: number;
  difficulty: number;
}

export interface PlacementStep {
  chapter_id: string;
  chapter_name: string;
  concept_id: string;
  concept_name: string;
  candidates: PlacementCandidate[];
}

/**
 * One diagnostic concept per chapter, with its whole question bank attached so
 * the client can pick the item closest to the learner's running ability
 * (same learning-zone selector used during practice).
 */
export const getPlacementSet = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ isDemo: boolean; steps: PlacementStep[] }> => {
    const { resolveStudent } = await import("./session.server");
    const { supabase, isDemo } = await resolveStudent();

    const [chaptersRes, conceptsRes, questionsRes] = await Promise.all([
      supabase.from("chapters").select("id, name, sort_order").order("sort_order"),
      supabase.from("concepts").select("id, name, chapter_id, sort_order").order("sort_order"),
      supabase
        .from("questions")
        .select("id, concept_id, question, options, correct_index, difficulty, sort_order")
        .order("sort_order"),
    ]);
    if (chaptersRes.error) throw chaptersRes.error;
    if (conceptsRes.error) throw conceptsRes.error;
    if (questionsRes.error) throw questionsRes.error;

    const steps: PlacementStep[] = [];
    for (const ch of chaptersRes.data ?? []) {
      const topics = (conceptsRes.data ?? []).filter((c) => c.chapter_id === ch.id);
      if (topics.length === 0) continue;
      const ordered = [...topics].sort((a, b) => a.sort_order - b.sort_order);
      const withBank = ordered.filter((t) =>
        (questionsRes.data ?? []).some((q) => q.concept_id === t.id),
      );
      const pool = withBank.length > 0 ? withBank : ordered;
      const target = pool[Math.floor(pool.length / 2)];
      const candidates = (questionsRes.data ?? [])
        .filter((q) => q.concept_id === target.id)
        .slice(0, 8)
        .map((q) => ({
          question_id: q.id,
          question: q.question,
          options: (q.options as unknown as string[]) ?? [],
          correct_index: q.correct_index,
          difficulty: Number(q.difficulty),
        }));
      if (candidates.length === 0) continue;
      steps.push({
        chapter_id: ch.id,
        chapter_name: ch.name,
        concept_id: target.id,
        concept_name: target.name,
        candidates,
      });
    }
    return { isDemo, steps: steps.slice(0, 8) };
  },
);

const AnswerSchema = z.object({
  concept_id: z.string().uuid(),
  question_id: z.string().uuid(),
  is_correct: z.boolean(),
  difficulty: z.number().min(0).max(1),
  response_time_ms: z.number().int().min(0).max(3_600_000),
});

const SubmitSchema = z.object({
  answers: z.array(AnswerSchema).max(20),
  skipped: z.boolean().optional(),
});

export interface PlacementResult {
  seeded: number;
  tested: number;
  averageMastery: number;
}

/**
 * Seed the learner's whole memory model from placement evidence.
 * Tested concepts get a genuine BKT posterior; untested concepts start from
 * their own p_init pulled toward their chapter's placement result, scaled by
 * how well their prerequisite scored.
 */
export const submitPlacement = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => SubmitSchema.parse(data))
  .handler(async ({ data }): Promise<PlacementResult> => {
    const { resolveStudent } = await import("./session.server");
    const { supabase, studentId, isDemo } = await resolveStudent();
    if (isDemo) return { seeded: 0, tested: 0, averageMastery: 0 };

    const {
      updateMasteryBKT,
      updateStabilityFSRS,
      nextRevisionDate,
      clamp01,
    } = await import("./bkt.server");

    const { data: concepts, error } = await supabase
      .from("concepts")
      .select("id, chapter_id, prerequisite_id, p_init, p_learn, p_guess, p_slip, difficulty");
    if (error) throw error;

    const answers = data.skipped ? [] : data.answers;
    const answerByConcept = new Map(answers.map((a) => [a.concept_id, a]));
    const now = new Date();

    // 1. Real BKT posterior for every tested concept.
    const mastery = new Map<string, number>();
    for (const c of concepts ?? []) {
      const pInit = Number(c.p_init ?? 0.15);
      const a = answerByConcept.get(c.id);
      if (!a) continue;
      mastery.set(
        c.id,
        updateMasteryBKT(pInit, a.is_correct, {
          itemDifficulty: a.difficulty,
          params: {
            pInit,
            pLearn: Number(c.p_learn ?? 0.1),
            pGuess: Number(c.p_guess ?? 0.2),
            pSlip: Number(c.p_slip ?? 0.1),
          },
        }),
      );
    }

    // 2. Chapter-level signal from the tested concepts.
    const chapterScores = new Map<string, number[]>();
    for (const c of concepts ?? []) {
      const m = mastery.get(c.id);
      if (m === undefined || !c.chapter_id) continue;
      const list = chapterScores.get(c.chapter_id) ?? [];
      list.push(m);
      chapterScores.set(c.chapter_id, list);
    }
    const chapterMastery = new Map<string, number>();
    for (const [chapterId, list] of chapterScores) {
      chapterMastery.set(chapterId, list.reduce((a, b) => a + b, 0) / list.length);
    }

    // 3. Untested concepts: prior pulled toward the chapter result, prereq-scaled.
    const byId = new Map((concepts ?? []).map((c) => [c.id, c]));
    function seedFor(conceptId: string, depth = 0): number {
      const known = mastery.get(conceptId);
      if (known !== undefined) return known;
      const c = byId.get(conceptId);
      if (!c) return 0.15;
      const pInit = Number(c.p_init ?? 0.15);
      const chapter = c.chapter_id ? chapterMastery.get(c.chapter_id) : undefined;
      if (chapter === undefined) return clamp01(pInit);
      const prereqM =
        c.prerequisite_id && depth < 4 ? seedFor(c.prerequisite_id, depth + 1) : 1;
      // Prereq strength decides how much of the chapter signal transfers.
      const transfer = 0.5 * (0.5 + 0.5 * Math.min(1, Math.max(0, prereqM)));
      return clamp01(pInit + (chapter - pInit) * transfer);
    }

    const rows = (concepts ?? []).map((c) => {
      const m = seedFor(c.id);
      const tested = mastery.has(c.id);
      const stability = tested
        ? updateStabilityFSRS(1, Number(c.difficulty ?? 0.5), answerByConcept.get(c.id)!.is_correct)
        : 1;
      return {
        student_id: studentId,
        concept_id: c.id,
        mastery_probability: Number(m.toFixed(4)),
        memory_stability: Number(stability.toFixed(4)),
        last_reviewed_at: tested ? now.toISOString() : null,
        next_revision_at: nextRevisionDate(stability, now).toISOString(),
        updated_at: now.toISOString(),
      };
    });

    if (rows.length > 0) {
      const { error: upsertError } = await supabase
        .from("knowledge_states")
        .upsert(rows, { onConflict: "student_id,concept_id" });
      if (upsertError) throw upsertError;
    }

    if (answers.length > 0) {
      await supabase.from("learning_events").insert(
        answers.map((a) => ({
          student_id: studentId,
          concept_id: a.concept_id,
          question_id: a.question_id,
          is_correct: a.is_correct,
          response_time_ms: a.response_time_ms,
          difficulty: a.difficulty,
          event_kind: "placement",
          pre_mastery: Number(byId.get(a.concept_id)?.p_init ?? 0.15),
          post_mastery: mastery.get(a.concept_id) ?? null,
        })),
      );
    }

    await supabase
      .from("students")
      .update({ placement_completed_at: now.toISOString() })
      .eq("id", studentId);

    const avg =
      rows.length > 0 ? rows.reduce((s, r) => s + r.mastery_probability, 0) / rows.length : 0;
    return { seeded: rows.length, tested: answers.length, averageMastery: avg };
  });