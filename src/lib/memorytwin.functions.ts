import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

export const DEMO_STUDENT_ID = "11111111-1111-1111-1111-111111111111";

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

export type ConceptRow = {
  id: string;
  name: string;
  subject: string;
  difficulty: number;
  question: string;
  options: string[];
  correct_index: number;
  sort_order: number;
};

export type KnowledgeRow = {
  concept_id: string;
  mastery_probability: number;
  memory_stability: number;
  last_reviewed_at: string | null;
  next_revision_at: string;
};

export type ConceptWithState = ConceptRow & { state: KnowledgeRow };

export const getStudentOverview = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    student: { id: string; name: string; daily_briefing: string | null };
    concepts: ConceptWithState[];
    dueCount: number;
  }> => {
    const supabase = makeClient();
    const [studentRes, conceptsRes, statesRes] = await Promise.all([
      supabase
        .from("students")
        .select("id, name, daily_briefing")
        .eq("id", DEMO_STUDENT_ID)
        .maybeSingle(),
      supabase
        .from("concepts")
        .select("id, name, subject, difficulty, question, options, correct_index, sort_order")
        .order("sort_order"),
      supabase
        .from("knowledge_states")
        .select("concept_id, mastery_probability, memory_stability, last_reviewed_at, next_revision_at")
        .eq("student_id", DEMO_STUDENT_ID),
    ]);
    if (studentRes.error) throw studentRes.error;
    if (conceptsRes.error) throw conceptsRes.error;
    if (statesRes.error) throw statesRes.error;

    const stateByConcept = new Map(
      (statesRes.data ?? []).map((s) => [s.concept_id, s as KnowledgeRow]),
    );
    const now = Date.now();
    const concepts: ConceptWithState[] = (conceptsRes.data ?? []).map((c) => {
      const state =
        stateByConcept.get(c.id) ??
        ({
          concept_id: c.id,
          mastery_probability: 0.15,
          memory_stability: 1,
          last_reviewed_at: null,
          next_revision_at: new Date().toISOString(),
        } as KnowledgeRow);
      return {
        id: c.id,
        name: c.name,
        subject: c.subject,
        difficulty: Number(c.difficulty),
        question: c.question,
        options: c.options as string[],
        correct_index: c.correct_index,
        sort_order: c.sort_order,
        state: {
          ...state,
          mastery_probability: Number(state.mastery_probability),
          memory_stability: Number(state.memory_stability),
        },
      };
    });

    const dueCount = concepts.filter(
      (c) => new Date(c.state.next_revision_at).getTime() <= now,
    ).length;

    return {
      student: studentRes.data ?? { id: DEMO_STUDENT_ID, name: "Alex", daily_briefing: null },
      concepts,
      dueCount,
    };
  },
);

export const getRecommendations = createServerFn({ method: "GET" }).handler(
  async (): Promise<ConceptWithState[]> => {
    const supabase = makeClient();
    const { data: states, error } = await supabase
      .from("knowledge_states")
      .select(
        "concept_id, mastery_probability, memory_stability, last_reviewed_at, next_revision_at",
      )
      .eq("student_id", DEMO_STUDENT_ID);
    if (error) throw error;
    const { data: concepts, error: cErr } = await supabase
      .from("concepts")
      .select("id, name, subject, difficulty, question, options, correct_index, sort_order")
      .order("sort_order");
    if (cErr) throw cErr;

    const now = new Date();
    const scored = (concepts ?? []).map((c) => {
      const s = (states ?? []).find((x) => x.concept_id === c.id);
      const stability = Number(s?.memory_stability ?? 1);
      const last = s?.last_reviewed_at ? new Date(s.last_reviewed_at) : null;
      const days = last ? (now.getTime() - last.getTime()) / 86_400_000 : 999;
      const R = last ? Math.exp(-days / Math.max(0.1, stability)) : 0.5;
      const due =
        new Date(s?.next_revision_at ?? now.toISOString()).getTime() <= now.getTime();
      const state: KnowledgeRow = {
        concept_id: c.id,
        mastery_probability: Number(s?.mastery_probability ?? 0.15),
        memory_stability: stability,
        last_reviewed_at: s?.last_reviewed_at ?? null,
        next_revision_at: s?.next_revision_at ?? now.toISOString(),
      };
      return {
        concept: {
          id: c.id,
          name: c.name,
          subject: c.subject,
          difficulty: Number(c.difficulty),
          question: c.question,
          options: c.options as string[],
          correct_index: c.correct_index,
          sort_order: c.sort_order,
        } as ConceptRow,
        state,
        R,
        due,
      };
    });

    scored.sort((a, b) => (a.due === b.due ? a.R - b.R : a.due ? -1 : 1));
    return scored.slice(0, 5).map((s) => ({ ...s.concept, state: s.state }));
  },
);

const SubmitEventInput = z.object({
  concept_id: z.string().uuid(),
  is_correct: z.boolean(),
  response_time_ms: z.number().int().min(0).max(600_000),
  question_id: z.string().uuid().optional(),
});

export const submitEvent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SubmitEventInput.parse(input))
  .handler(async ({ data }) => {
    const { updateMasteryBKT, updateStabilityFSRS, nextRevisionDate } = await import(
      "./bkt.server"
    );
    const supabase = makeClient();

    const [conceptRes, stateRes, questionRes] = await Promise.all([
      supabase
        .from("concepts")
        .select(
          "id, difficulty, prerequisite_id, p_init, p_learn, p_guess, p_slip",
        )
        .eq("id", data.concept_id)
        .maybeSingle(),
      supabase
        .from("knowledge_states")
        .select("mastery_probability, memory_stability")
        .eq("student_id", DEMO_STUDENT_ID)
        .eq("concept_id", data.concept_id)
        .maybeSingle(),
      data.question_id
        ? supabase
            .from("questions")
            .select("id, difficulty")
            .eq("id", data.question_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null } as const),
    ]);
    if (conceptRes.error) throw conceptRes.error;
    if (stateRes.error) throw stateRes.error;
    if (questionRes.error) throw questionRes.error;
    const concept = conceptRes.data;
    if (!concept) throw new Error("Unknown concept");
    const state = stateRes.data;
    const question = questionRes.data;

    // Prerequisite mastery for gated learning rate
    let prereqMastery = 1;
    if (concept.prerequisite_id) {
      const { data: pre } = await supabase
        .from("knowledge_states")
        .select("mastery_probability")
        .eq("student_id", DEMO_STUDENT_ID)
        .eq("concept_id", concept.prerequisite_id)
        .maybeSingle();
      prereqMastery = Number(pre?.mastery_probability ?? 0.15);
    }

    const priorMastery = Number(state?.mastery_probability ?? Number(concept.p_init));
    const priorStability = Number(state?.memory_stability ?? 1);
    const itemDifficulty = Number(question?.difficulty ?? concept.difficulty);

    const newMastery = updateMasteryBKT(priorMastery, data.is_correct, {
      itemDifficulty,
      prereqMastery,
      params: {
        pInit: Number(concept.p_init),
        pLearn: Number(concept.p_learn),
        pGuess: Number(concept.p_guess),
        pSlip: Number(concept.p_slip),
      },
    });
    const newStability = updateStabilityFSRS(
      priorStability,
      itemDifficulty,
      data.is_correct,
    );
    const now = new Date();
    const nextDate = nextRevisionDate(newStability, now);

    const [{ error: evErr }, { error: upErr }] = await Promise.all([
      supabase.from("learning_events").insert({
        student_id: DEMO_STUDENT_ID,
        concept_id: data.concept_id,
        is_correct: data.is_correct,
        response_time_ms: data.response_time_ms,
        difficulty: itemDifficulty,
        question_id: data.question_id ?? null,
        pre_mastery: priorMastery,
        post_mastery: newMastery,
      }),
      supabase.from("knowledge_states").upsert(
        {
          student_id: DEMO_STUDENT_ID,
          concept_id: data.concept_id,
          mastery_probability: newMastery,
          memory_stability: newStability,
          last_reviewed_at: now.toISOString(),
          next_revision_at: nextDate.toISOString(),
          updated_at: now.toISOString(),
        },
        { onConflict: "student_id,concept_id" },
      ),
    ]);
    if (evErr) throw evErr;
    if (upErr) throw upErr;

    // Invalidate briefing so the dashboard regenerates on next visit.
    await supabase
      .from("students")
      .update({ briefing_generated_at: null })
      .eq("id", DEMO_STUDENT_ID);

    return {
      mastery_probability: newMastery,
      memory_stability: newStability,
      next_revision_at: nextDate.toISOString(),
    };
  });

const ExplainInput = z.object({
  concept_id: z.string().uuid(),
  chosen_index: z.number().int().min(0).max(10),
  question_id: z.string().uuid().optional(),
});

export const explainMisconception = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ExplainInput.parse(input))
  .handler(async ({ data }): Promise<{ explanation: string }> => {
    const supabase = makeClient();
    const [{ data: concept, error }, qRes] = await Promise.all([
      supabase
        .from("concepts")
        .select("name, subject, question, options, correct_index")
        .eq("id", data.concept_id)
        .maybeSingle(),
      data.question_id
        ? supabase
            .from("questions")
            .select("question, options, correct_index, explanation")
            .eq("id", data.question_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null } as const),
    ]);
    if (error) throw error;
    if (qRes.error) throw qRes.error;
    if (!concept) throw new Error("Unknown concept");

    const item = qRes.data ?? {
      question: concept.question,
      options: concept.options,
      correct_index: concept.correct_index,
      explanation: null as string | null,
    };
    const options = item.options as string[];
    const chosen = options[data.chosen_index] ?? "(no answer)";
    const correct = options[item.correct_index] ?? "(unknown)";

    const fallback =
      item.explanation ??
      `The correct answer is "${correct}". Review ${concept.name} and how it differs from "${chosen}".`;

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { explanation: fallback };

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "You are a warm 10th-grade Chemistry tutor. In exactly 2 short sentences: (1) name the specific misconception behind the student's wrong choice, (2) give the key fact that fixes it. Do not restate the question. Do not say 'correct answer'.",
            },
            {
              role: "user",
              content: `Concept: ${concept.name}
Question: ${item.question}
Student picked: "${chosen}"
Actually correct: "${correct}"`,
            },
          ],
        }),
      });
      if (!res.ok) {
        console.error("Explain AI failed:", res.status, await res.text());
        return { explanation: fallback };
      }
      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = json.choices?.[0]?.message?.content?.trim();
      return { explanation: text || fallback };
    } catch (err) {
      console.error("Explain AI error:", err);
      return { explanation: fallback };
    }
  });

const ConceptDetailInput = z.object({ concept_id: z.string().uuid() });

export type LearningEventRow = {
  id: string;
  is_correct: boolean;
  response_time_ms: number;
  created_at: string;
};

export const getConceptDetail = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => ConceptDetailInput.parse(input))
  .handler(
    async ({
      data,
    }): Promise<{
      concept: ConceptRow;
      state: KnowledgeRow;
      events: LearningEventRow[];
    }> => {
      const supabase = makeClient();
      const [cRes, sRes, eRes] = await Promise.all([
        supabase
          .from("concepts")
          .select("id, name, subject, difficulty, question, options, correct_index, sort_order")
          .eq("id", data.concept_id)
          .maybeSingle(),
        supabase
          .from("knowledge_states")
          .select("concept_id, mastery_probability, memory_stability, last_reviewed_at, next_revision_at")
          .eq("student_id", DEMO_STUDENT_ID)
          .eq("concept_id", data.concept_id)
          .maybeSingle(),
        supabase
          .from("learning_events")
          .select("id, is_correct, response_time_ms, created_at")
          .eq("student_id", DEMO_STUDENT_ID)
          .eq("concept_id", data.concept_id)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      if (cRes.error) throw cRes.error;
      if (sRes.error) throw sRes.error;
      if (eRes.error) throw eRes.error;
      if (!cRes.data) throw new Error("Concept not found");

      const c = cRes.data;
      const now = new Date().toISOString();
      const state: KnowledgeRow = sRes.data
        ? {
            concept_id: sRes.data.concept_id,
            mastery_probability: Number(sRes.data.mastery_probability),
            memory_stability: Number(sRes.data.memory_stability),
            last_reviewed_at: sRes.data.last_reviewed_at,
            next_revision_at: sRes.data.next_revision_at,
          }
        : {
            concept_id: c.id,
            mastery_probability: 0.15,
            memory_stability: 1,
            last_reviewed_at: null,
            next_revision_at: now,
          };

      return {
        concept: {
          id: c.id,
          name: c.name,
          subject: c.subject,
          difficulty: Number(c.difficulty),
          question: c.question,
          options: c.options as string[],
          correct_index: c.correct_index,
          sort_order: c.sort_order,
        },
        state,
        events: (eRes.data ?? []) as LearningEventRow[],
      };
    },
  );

export const generateDailyBriefing = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ briefing: string; cached: boolean }> => {
    const supabase = makeClient();
    const { data: student } = await supabase
      .from("students")
      .select("id, name, daily_briefing, briefing_generated_at")
      .eq("id", DEMO_STUDENT_ID)
      .maybeSingle();

    const generatedAt = student?.briefing_generated_at
      ? new Date(student.briefing_generated_at)
      : null;
    const isFreshToday =
      generatedAt &&
      Date.now() - generatedAt.getTime() < 6 * 60 * 60 * 1000 &&
      !!student?.daily_briefing;
    if (isFreshToday) {
      return { briefing: student!.daily_briefing!, cached: true };
    }

    const { data: rows } = await supabase
      .from("knowledge_states")
      .select(
        "mastery_probability, memory_stability, last_reviewed_at, next_revision_at, concepts(name)",
      )
      .eq("student_id", DEMO_STUDENT_ID);

    const now = Date.now();
    const mastered: string[] = [];
    const atRisk: string[] = [];
    for (const r of rows ?? []) {
      const name = (r.concepts as { name: string } | null)?.name;
      if (!name) continue;
      const mastery = Number(r.mastery_probability);
      const due = new Date(r.next_revision_at).getTime() <= now;
      const stability = Number(r.memory_stability);
      const last = r.last_reviewed_at ? new Date(r.last_reviewed_at) : null;
      const days = last ? (now - last.getTime()) / 86_400_000 : 999;
      const R = last ? Math.exp(-days / Math.max(0.1, stability)) : 0.5;
      if (mastery > 0.9 && !due) mastered.push(`${name} (${Math.round(mastery * 100)}%)`);
      else if (due || R < 0.8)
        atRisk.push(`${name} (retention ~${Math.round(R * 100)}%)`);
    }

    const apiKey = process.env.LOVABLE_API_KEY;
    let briefing =
      atRisk.length === 0
        ? `Nice work, ${student?.name ?? "Alex"} — nothing is fading yet. Do a light review to keep your streak strong.`
        : `Hey ${student?.name ?? "Alex"}, your memory of ${atRisk[0]} is slipping — let's do a quick 5-minute review before it fades.`;

    if (apiKey) {
      try {
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content:
                  "You are a warm, expert AI tutor. Give the student a 2-sentence daily briefing based on their memory data. Never mention BKT, retrievability, or stability. Be conversational, specific, and encouraging. Name the exact concepts.",
              },
              {
                role: "user",
                content: `Student Name: ${student?.name ?? "Alex"}
Mastered Concepts (skip): ${mastered.length ? mastered.join(", ") : "none yet"}
At-Risk Concepts (study today): ${atRisk.length ? atRisk.join(", ") : "none"}`,
              },
            ],
          }),
        });
        if (res.ok) {
          const json = (await res.json()) as {
            choices?: { message?: { content?: string } }[];
          };
          const text = json.choices?.[0]?.message?.content?.trim();
          if (text) briefing = text;
        } else {
          console.error("Lovable AI briefing failed:", res.status, await res.text());
        }
      } catch (err) {
        console.error("Lovable AI briefing error:", err);
      }
    }

    await supabase
      .from("students")
      .update({
        daily_briefing: briefing,
        briefing_generated_at: new Date().toISOString(),
      })
      .eq("id", DEMO_STUDENT_ID);

    return { briefing, cached: false };
  },
);