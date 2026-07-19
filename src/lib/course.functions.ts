import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { DEMO_STUDENT_ID } from "./memorytwin.functions";
import { computeStage, type Stage } from "./stage";

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

export type TopicNode = {
  id: string;
  name: string;
  sort_order: number;
  mastery: number;
  stability: number;
  next_revision_at: string;
  last_reviewed_at: string | null;
  stage: Stage;
  best_assignment_score: number | null;
  has_viewed_lesson: boolean;
};

export type ChapterNode = {
  id: string;
  name: string;
  summary: string | null;
  sort_order: number;
  topics: TopicNode[];
  progress: number; // 0..1 (fraction of topics mastered)
};

export type SubjectTree = {
  id: string;
  name: string;
  description: string | null;
  chapters: ChapterNode[];
  progress: number;
};

export const getCourseTree = createServerFn({ method: "GET" }).handler(
  async (): Promise<SubjectTree[]> => {
    const supabase = makeClient();
    const [subjectsRes, chaptersRes, topicsRes, statesRes, viewsRes, subsRes] =
      await Promise.all([
        supabase.from("subjects").select("id, name, description, sort_order").order("sort_order"),
        supabase.from("chapters").select("id, subject_id, name, summary, sort_order").order("sort_order"),
        supabase
          .from("concepts")
          .select("id, name, sort_order, chapter_id")
          .order("sort_order"),
        supabase
          .from("knowledge_states")
          .select("concept_id, mastery_probability, memory_stability, last_reviewed_at, next_revision_at")
          .eq("student_id", DEMO_STUDENT_ID),
        supabase
          .from("learning_events")
          .select("concept_id")
          .eq("student_id", DEMO_STUDENT_ID)
          .eq("event_kind", "lesson_view"),
        supabase
          .from("assignment_submissions")
          .select("concept_id, ai_score")
          .eq("student_id", DEMO_STUDENT_ID),
      ]);
    if (subjectsRes.error) throw subjectsRes.error;
    if (chaptersRes.error) throw chaptersRes.error;
    if (topicsRes.error) throw topicsRes.error;
    if (statesRes.error) throw statesRes.error;
    if (viewsRes.error) throw viewsRes.error;
    if (subsRes.error) throw subsRes.error;

    const stateById = new Map(
      (statesRes.data ?? []).map((s) => [s.concept_id, s]),
    );
    const viewedSet = new Set((viewsRes.data ?? []).map((v) => v.concept_id));
    const bestScore = new Map<string, number>();
    for (const s of subsRes.data ?? []) {
      const cur = bestScore.get(s.concept_id) ?? 0;
      const val = Number(s.ai_score);
      if (val > cur) bestScore.set(s.concept_id, val);
    }

    return (subjectsRes.data ?? []).map((subj) => {
      const chapters: ChapterNode[] = (chaptersRes.data ?? [])
        .filter((c) => c.subject_id === subj.id)
        .map((ch) => {
          const topics = (topicsRes.data ?? [])
            .filter((t) => t.chapter_id === ch.id)
            .map((t): TopicNode => {
              const st = stateById.get(t.id);
              const mastery = Number(st?.mastery_probability ?? 0.15);
              const stability = Number(st?.memory_stability ?? 1);
              const nextRev = st?.next_revision_at ?? new Date().toISOString();
              const lastRev = st?.last_reviewed_at ?? null;
              const best = bestScore.get(t.id) ?? null;
              const stage = computeStage({
                mastery,
                stability,
                lastReviewedAt: lastRev,
                nextRevisionAt: nextRev,
                hasViewedLesson: viewedSet.has(t.id),
                bestAssignmentScore: best,
              });
              return {
                id: t.id,
                name: t.name,
                sort_order: t.sort_order,
                mastery,
                stability,
                next_revision_at: nextRev,
                last_reviewed_at: lastRev,
                stage,
                best_assignment_score: best,
                has_viewed_lesson: viewedSet.has(t.id),
              };
            });
          const mastered = topics.filter((t) => t.stage === "master" || t.stage === "review").length;
          return {
            id: ch.id,
            name: ch.name,
            summary: ch.summary,
            sort_order: ch.sort_order,
            topics,
            progress: topics.length ? mastered / topics.length : 0,
          };
        });
      const allTopics = chapters.flatMap((c) => c.topics);
      const masteredAll = allTopics.filter((t) => t.stage === "master" || t.stage === "review").length;
      return {
        id: subj.id,
        name: subj.name,
        description: subj.description,
        chapters,
        progress: allTopics.length ? masteredAll / allTopics.length : 0,
      };
    });
  },
);

const TopicWsInput = z.object({ topic_id: z.string().uuid() });

export type LessonRow = {
  id: string;
  kind: "video" | "reading" | "summary";
  title: string;
  body: string | null;
  url: string | null;
  duration_min: number;
  sort_order: number;
  viewed: boolean;
};

export type AssignmentRow = {
  id: string;
  title: string;
  prompt: string;
  rubric: string;
  difficulty: number;
};

export type SubmissionRow = {
  id: string;
  response: string;
  ai_score: number;
  ai_feedback: string | null;
  created_at: string;
};

export type TopicWorkspace = {
  topic: {
    id: string;
    name: string;
    subject: string;
    chapter_name: string;
    learning_objectives: string | null;
    question: string;
    options: string[];
    correct_index: number;
    difficulty: number;
  };
  lessons: LessonRow[];
  assignment: AssignmentRow | null;
  submissions: SubmissionRow[];
  state: {
    mastery: number;
    stability: number;
    last_reviewed_at: string | null;
    next_revision_at: string;
  };
  stage: Stage;
};

export const getTopicWorkspace = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => TopicWsInput.parse(input))
  .handler(async ({ data }): Promise<TopicWorkspace> => {
    const supabase = makeClient();
    const [tRes, lRes, aRes, sRes, subsRes, viewRes, stRes] = await Promise.all([
      supabase
        .from("concepts")
        .select(
          "id, name, subject, difficulty, question, options, correct_index, learning_objectives, chapter_id",
        )
        .eq("id", data.topic_id)
        .maybeSingle(),
      supabase
        .from("lesson_content")
        .select("id, kind, title, body, url, duration_min, sort_order")
        .eq("concept_id", data.topic_id)
        .order("sort_order"),
      supabase
        .from("assignments")
        .select("id, title, prompt, rubric, difficulty")
        .eq("concept_id", data.topic_id)
        .order("created_at")
        .limit(1)
        .maybeSingle(),
      supabase
        .from("knowledge_states")
        .select("mastery_probability, memory_stability, last_reviewed_at, next_revision_at")
        .eq("student_id", DEMO_STUDENT_ID)
        .eq("concept_id", data.topic_id)
        .maybeSingle(),
      supabase
        .from("assignment_submissions")
        .select("id, response, ai_score, ai_feedback, created_at")
        .eq("student_id", DEMO_STUDENT_ID)
        .eq("concept_id", data.topic_id)
        .order("created_at", { ascending: false }),
      supabase
        .from("learning_events")
        .select("id")
        .eq("student_id", DEMO_STUDENT_ID)
        .eq("concept_id", data.topic_id)
        .eq("event_kind", "lesson_view")
        .limit(1),
      supabase.from("chapters").select("id, name"),
    ]);
    if (tRes.error) throw tRes.error;
    if (lRes.error) throw lRes.error;
    if (aRes.error) throw aRes.error;
    if (sRes.error) throw sRes.error;
    if (subsRes.error) throw subsRes.error;
    if (viewRes.error) throw viewRes.error;
    if (stRes.error) throw stRes.error;
    if (!tRes.data) throw new Error("Topic not found");

    const t = tRes.data;
    const chapterName =
      (stRes.data ?? []).find((c) => c.id === t.chapter_id)?.name ?? "";

    const mastery = Number(sRes.data?.mastery_probability ?? 0.15);
    const stability = Number(sRes.data?.memory_stability ?? 1);
    const nextRev = sRes.data?.next_revision_at ?? new Date().toISOString();
    const lastRev = sRes.data?.last_reviewed_at ?? null;
    const bestScore =
      (subsRes.data ?? []).reduce(
        (acc, r) => Math.max(acc, Number(r.ai_score)),
        0,
      ) || null;
    const hasViewedLesson = (viewRes.data ?? []).length > 0;
    const stage = computeStage({
      mastery,
      stability,
      lastReviewedAt: lastRev,
      nextRevisionAt: nextRev,
      hasViewedLesson,
      bestAssignmentScore: bestScore,
    });

    // Mark lesson as viewed for each returned lesson entry so UI can highlight.
    // (We only recorded a single lesson_view event per topic, not per lesson,
    // so treat "viewed" as: this topic has any lesson_view event.)
    const lessons: LessonRow[] = (lRes.data ?? []).map((l) => ({
      id: l.id,
      kind: l.kind as "video" | "reading" | "summary",
      title: l.title,
      body: l.body,
      url: l.url,
      duration_min: l.duration_min,
      sort_order: l.sort_order,
      viewed: hasViewedLesson,
    }));

    return {
      topic: {
        id: t.id,
        name: t.name,
        subject: t.subject,
        chapter_name: chapterName,
        learning_objectives: t.learning_objectives,
        question: t.question,
        options: t.options as string[],
        correct_index: t.correct_index,
        difficulty: Number(t.difficulty),
      },
      lessons,
      assignment: aRes.data
        ? {
            id: aRes.data.id,
            title: aRes.data.title,
            prompt: aRes.data.prompt,
            rubric: aRes.data.rubric,
            difficulty: Number(aRes.data.difficulty),
          }
        : null,
      submissions: (subsRes.data ?? []).map((s) => ({
        id: s.id,
        response: s.response,
        ai_score: Number(s.ai_score),
        ai_feedback: s.ai_feedback,
        created_at: s.created_at,
      })),
      state: {
        mastery,
        stability,
        last_reviewed_at: lastRev,
        next_revision_at: nextRev,
      },
      stage,
    };
  });

const MarkViewedInput = z.object({ topic_id: z.string().uuid() });

export const markLessonViewed = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => MarkViewedInput.parse(input))
  .handler(async ({ data }) => {
    const supabase = makeClient();
    // Only record one lesson_view per topic to avoid noise.
    const { data: existing } = await supabase
      .from("learning_events")
      .select("id")
      .eq("student_id", DEMO_STUDENT_ID)
      .eq("concept_id", data.topic_id)
      .eq("event_kind", "lesson_view")
      .limit(1);
    if (!existing || existing.length === 0) {
      const { data: c } = await supabase
        .from("concepts")
        .select("difficulty")
        .eq("id", data.topic_id)
        .maybeSingle();
      await supabase.from("learning_events").insert({
        student_id: DEMO_STUDENT_ID,
        concept_id: data.topic_id,
        is_correct: true,
        response_time_ms: 0,
        difficulty: Number(c?.difficulty ?? 0.5),
        event_kind: "lesson_view",
      });
    }
    return { ok: true };
  });

const SubmitAssignmentInput = z.object({
  assignment_id: z.string().uuid(),
  response: z.string().min(10).max(4000),
});

export const submitAssignment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SubmitAssignmentInput.parse(input))
  .handler(async ({ data }): Promise<{ score: number; feedback: string }> => {
    const supabase = makeClient();
    const { data: a, error } = await supabase
      .from("assignments")
      .select("id, concept_id, title, prompt, rubric, difficulty, concepts(name, subject)")
      .eq("id", data.assignment_id)
      .maybeSingle();
    if (error) throw error;
    if (!a) throw new Error("Unknown assignment");
    const concept = a.concepts as { name: string; subject: string } | null;

    // AI grade with fallback
    let score = 0.5;
    let feedback =
      "We couldn't reach the AI grader — your submission was saved and marked as partial credit.";
    const apiKey = process.env.LOVABLE_API_KEY;
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
                  "You are a warm 10th-grade tutor grading a short answer. Return ONLY JSON of the form {\"score\": number between 0 and 1, \"feedback\": string of 2 short sentences}. Score 1.0 = fully correct with a good example, 0.7 = mostly correct, 0.4 = partial, 0.0 = wrong. Feedback should name the strongest part and the single most important thing to improve. No preamble, no markdown, JSON only.",
              },
              {
                role: "user",
                content: `Subject: ${concept?.subject ?? ""}
Topic: ${concept?.name ?? ""}
Prompt: ${a.prompt}
Rubric: ${a.rubric}

Student response:
"""
${data.response}
"""`,
              },
            ],
          }),
        });
        if (res.ok) {
          const json = (await res.json()) as {
            choices?: { message?: { content?: string } }[];
          };
          const raw = json.choices?.[0]?.message?.content?.trim() ?? "";
          const cleaned = raw.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
          const parsed = JSON.parse(cleaned) as { score?: number; feedback?: string };
          if (typeof parsed.score === "number") score = Math.max(0, Math.min(1, parsed.score));
          if (typeof parsed.feedback === "string" && parsed.feedback) feedback = parsed.feedback;
        } else {
          console.error("Assignment grader failed:", res.status, await res.text());
        }
      } catch (err) {
        console.error("Assignment grader error:", err);
      }
    }

    const isCorrect = score >= 0.7;
    const now = new Date();

    // BKT/FSRS update using assignment as a graded event
    const { updateMasteryBKT, updateStabilityFSRS, nextRevisionDate } = await import(
      "./bkt.server"
    );
    const { data: prior } = await supabase
      .from("knowledge_states")
      .select("mastery_probability, memory_stability")
      .eq("student_id", DEMO_STUDENT_ID)
      .eq("concept_id", a.concept_id)
      .maybeSingle();
    const priorM = Number(prior?.mastery_probability ?? 0.15);
    const priorS = Number(prior?.memory_stability ?? 1);
    const newMastery = updateMasteryBKT(priorM, isCorrect);
    const newStability = updateStabilityFSRS(priorS, Number(a.difficulty), isCorrect);
    const nextDate = nextRevisionDate(newStability, now);

    await Promise.all([
      supabase.from("assignment_submissions").insert({
        student_id: DEMO_STUDENT_ID,
        assignment_id: a.id,
        concept_id: a.concept_id,
        response: data.response,
        ai_score: score,
        ai_feedback: feedback,
      }),
      supabase.from("learning_events").insert({
        student_id: DEMO_STUDENT_ID,
        concept_id: a.concept_id,
        is_correct: isCorrect,
        response_time_ms: 0,
        difficulty: Number(a.difficulty),
        event_kind: "assignment_submit",
      }),
      supabase.from("knowledge_states").upsert(
        {
          student_id: DEMO_STUDENT_ID,
          concept_id: a.concept_id,
          mastery_probability: newMastery,
          memory_stability: newStability,
          last_reviewed_at: now.toISOString(),
          next_revision_at: nextDate.toISOString(),
          updated_at: now.toISOString(),
        },
        { onConflict: "student_id,concept_id" },
      ),
      supabase
        .from("students")
        .update({ briefing_generated_at: null })
        .eq("id", DEMO_STUDENT_ID),
    ]);

    return { score, feedback };
  });

export type HistoryRow = {
  id: string;
  created_at: string;
  event_kind: "quiz_answer" | "lesson_view" | "assignment_submit";
  is_correct: boolean;
  concept_id: string;
  concept_name: string;
};

export const getHistory = createServerFn({ method: "GET" }).handler(
  async (): Promise<HistoryRow[]> => {
    const supabase = makeClient();
    const { data, error } = await supabase
      .from("learning_events")
      .select("id, created_at, event_kind, is_correct, concept_id, concepts(name)")
      .eq("student_id", DEMO_STUDENT_ID)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id,
      created_at: r.created_at,
      event_kind: r.event_kind as HistoryRow["event_kind"],
      is_correct: r.is_correct,
      concept_id: r.concept_id,
      concept_name: (r.concepts as { name: string } | null)?.name ?? "Unknown",
    }));
  },
);