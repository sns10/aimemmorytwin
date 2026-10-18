import { createServerFn } from "@tanstack/react-start";
import { computeStage, type Stage } from "./stage";

/** One row of the per-chapter table on the report card. */
export interface ChapterReport {
  id: string;
  name: string;
  topics: number;
  mastered: number;
  fading: number;
  notStarted: number;
  accuracy: number | null; // 0..1 over answered questions in this chapter
  averageMastery: number; // 0..1
}

export interface TopicRisk {
  id: string;
  name: string;
  mastery: number;
  recall: number; // 0..1 predicted recall right now
  daysSinceReview: number | null;
  stage: Stage;
}

export interface WeekActivity {
  /** Last 7 days, oldest first. */
  days: { date: string; answered: number; correct: number; minutes: number }[];
  answered: number;
  correct: number;
  minutes: number;
  activeDays: number;
  previousAnswered: number; // the 7 days before that, for the trend line
}

export interface ReportCard {
  studentName: string;
  generatedAt: string;
  totals: {
    topics: number;
    mastered: number;
    inProgress: number;
    notStarted: number;
    fading: number;
    lessonsViewed: number;
    assignmentsSubmitted: number;
  };
  accuracyAll: number | null;
  week: WeekActivity;
  chapters: ChapterReport[];
  strongest: ChapterReport | null;
  weakest: ChapterReport | null;
  atRisk: TopicRisk[];
  /** 0..1 — average predicted recall across all topics, i.e. what would survive to an exam today. */
  examReadiness: number;
  streakDays: number;
}

const DAY = 86_400_000;

function recallNow(stability: number, lastReviewedAt: string | null, now: number): number {
  if (!lastReviewedAt) return 0;
  const days = (now - new Date(lastReviewedAt).getTime()) / DAY;
  return Math.exp(-days / Math.max(0.1, stability));
}

function dayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export const getReportCard = createServerFn({ method: "GET" }).handler(
  async (): Promise<ReportCard> => {
    const { resolveStudent } = await import("./session.server");
    const { supabase, studentId } = await resolveStudent();
    const now = Date.now();

    const [studentRes, chaptersRes, conceptsRes, statesRes, eventsRes, subsRes] = await Promise.all(
      [
        supabase.from("students").select("name").eq("id", studentId).maybeSingle(),
        supabase.from("chapters").select("id, name, sort_order").order("sort_order"),
        supabase.from("concepts").select("id, name, chapter_id, sort_order").order("sort_order"),
        supabase
          .from("knowledge_states")
          .select(
            "concept_id, mastery_probability, memory_stability, last_reviewed_at, next_revision_at",
          )
          .eq("student_id", studentId),
        supabase
          .from("learning_events")
          .select("concept_id, event_kind, is_correct, response_time_ms, created_at")
          .eq("student_id", studentId)
          .gte("created_at", new Date(now - 14 * DAY).toISOString()),
        supabase
          .from("assignment_submissions")
          .select("concept_id, ai_score")
          .eq("student_id", studentId),
      ],
    );

    for (const res of [chaptersRes, conceptsRes, statesRes, eventsRes, subsRes]) {
      if (res.error) throw res.error;
    }

    const concepts = conceptsRes.data ?? [];
    const states = new Map(
      (statesRes.data ?? []).map((s) => [
        s.concept_id,
        {
          mastery: Number(s.mastery_probability),
          stability: Number(s.memory_stability),
          lastReviewedAt: s.last_reviewed_at as string | null,
          nextRevisionAt: s.next_revision_at as string,
        },
      ]),
    );
    const events = eventsRes.data ?? [];
    const bestScore = new Map<string, number>();
    for (const s of subsRes.data ?? []) {
      if (s.ai_score === null) continue;
      const score = Number(s.ai_score);
      bestScore.set(s.concept_id, Math.max(bestScore.get(s.concept_id) ?? 0, score));
    }

    // Lesson views are needed for the stage, and they can be older than 14 days.
    const viewsRes = await supabase
      .from("learning_events")
      .select("concept_id")
      .eq("student_id", studentId)
      .eq("event_kind", "lesson_view");
    if (viewsRes.error) throw viewsRes.error;
    const viewed = new Set((viewsRes.data ?? []).map((v) => v.concept_id));

    // ----------------------------------------------------------- per topic
    const stageOf = new Map<string, Stage>();
    const recallOf = new Map<string, number>();
    for (const c of concepts) {
      const st = states.get(c.id);
      if (!st) continue;
      stageOf.set(
        c.id,
        computeStage({
          mastery: st.mastery,
          stability: st.stability,
          lastReviewedAt: st.lastReviewedAt,
          nextRevisionAt: st.nextRevisionAt,
          hasViewedLesson: viewed.has(c.id),
          bestAssignmentScore: bestScore.get(c.id) ?? null,
        }),
      );
      recallOf.set(c.id, recallNow(st.stability, st.lastReviewedAt, now));
    }

    const answers = events.filter((e) => e.event_kind === "quiz_answer");
    const perConceptAnswers = new Map<string, { n: number; correct: number }>();
    for (const a of answers) {
      const row = perConceptAnswers.get(a.concept_id) ?? { n: 0, correct: 0 };
      row.n += 1;
      if (a.is_correct) row.correct += 1;
      perConceptAnswers.set(a.concept_id, row);
    }

    // --------------------------------------------------------- per chapter
    const chapters: ChapterReport[] = (chaptersRes.data ?? []).map((ch) => {
      const topics = concepts.filter((c) => c.chapter_id === ch.id);
      let mastered = 0;
      let fading = 0;
      let notStarted = 0;
      let masterySum = 0;
      let n = 0;
      let correct = 0;
      for (const t of topics) {
        const stage = stageOf.get(t.id);
        const st = states.get(t.id);
        masterySum += st?.mastery ?? 0;
        if (stage === "master") mastered += 1;
        if (stage === "review") fading += 1;
        if (!viewed.has(t.id) && !perConceptAnswers.has(t.id)) notStarted += 1;
        const a = perConceptAnswers.get(t.id);
        if (a) {
          n += a.n;
          correct += a.correct;
        }
      }
      return {
        id: ch.id,
        name: ch.name,
        topics: topics.length,
        mastered,
        fading,
        notStarted,
        accuracy: n > 0 ? correct / n : null,
        averageMastery: topics.length > 0 ? masterySum / topics.length : 0,
      };
    });

    const scored = chapters.filter((c) => c.topics > 0);
    const byMastery = [...scored].sort((a, b) => b.averageMastery - a.averageMastery);

    // ------------------------------------------------------------- weekly
    const days: WeekActivity["days"] = [];
    for (let i = 6; i >= 0; i--) {
      days.push({ date: dayKey(now - i * DAY), answered: 0, correct: 0, minutes: 0 });
    }
    const dayIndex = new Map(days.map((d, i) => [d.date, i]));
    let weekAnswered = 0;
    let weekCorrect = 0;
    let weekMs = 0;
    let previousAnswered = 0;
    for (const e of events) {
      const t = new Date(e.created_at).getTime();
      const idx = dayIndex.get(dayKey(t));
      if (idx === undefined) {
        if (t < now - 7 * DAY && e.event_kind === "quiz_answer") previousAnswered += 1;
        continue;
      }
      const ms = Number(e.response_time_ms ?? 0);
      days[idx].minutes += ms / 60_000;
      weekMs += ms;
      if (e.event_kind === "quiz_answer") {
        days[idx].answered += 1;
        weekAnswered += 1;
        if (e.is_correct) {
          days[idx].correct += 1;
          weekCorrect += 1;
        }
      }
    }
    for (const d of days) d.minutes = Math.round(d.minutes * 10) / 10;

    let streakDays = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].answered > 0) streakDays += 1;
      else break;
    }

    // ------------------------------------------------------------- at risk
    const atRisk: TopicRisk[] = concepts
      .filter((c) => {
        const stage = stageOf.get(c.id);
        return stage === "review" || (recallOf.get(c.id) ?? 1) < 0.7;
      })
      .filter((c) => viewed.has(c.id) || perConceptAnswers.has(c.id))
      .map((c) => {
        const st = states.get(c.id)!;
        return {
          id: c.id,
          name: c.name,
          mastery: st.mastery,
          recall: recallOf.get(c.id) ?? 0,
          daysSinceReview: st.lastReviewedAt
            ? Math.round((now - new Date(st.lastReviewedAt).getTime()) / DAY)
            : null,
          stage: stageOf.get(c.id) ?? "practice",
        };
      })
      .sort((a, b) => a.recall - b.recall)
      .slice(0, 8);

    const started = concepts.filter((c) => viewed.has(c.id) || perConceptAnswers.has(c.id));
    const mastered = concepts.filter((c) => stageOf.get(c.id) === "master").length;
    const fading = concepts.filter((c) => stageOf.get(c.id) === "review").length;

    // Readiness: how much of the course would survive to an exam taken today —
    // mastery weighted by predicted recall, averaged over every topic.
    const readiness =
      concepts.length === 0
        ? 0
        : concepts.reduce((sum, c) => {
            const st = states.get(c.id);
            if (!st) return sum;
            const r = st.lastReviewedAt ? recallOf.get(c.id)! : 1; // never reviewed: no decay applied yet
            return sum + st.mastery * r;
          }, 0) / concepts.length;

    const totalAnswers = answers.length;
    const totalCorrect = answers.filter((a) => a.is_correct).length;

    return {
      studentName: studentRes.data?.name ?? "Student",
      generatedAt: new Date(now).toISOString(),
      totals: {
        topics: concepts.length,
        mastered,
        inProgress: started.length - mastered,
        notStarted: concepts.length - started.length,
        fading,
        lessonsViewed: viewed.size,
        assignmentsSubmitted: (subsRes.data ?? []).length,
      },
      accuracyAll: totalAnswers > 0 ? totalCorrect / totalAnswers : null,
      week: {
        days,
        answered: weekAnswered,
        correct: weekCorrect,
        minutes: Math.round((weekMs / 60_000) * 10) / 10,
        activeDays: days.filter((d) => d.answered > 0).length,
        previousAnswered,
      },
      chapters,
      strongest: byMastery[0] ?? null,
      weakest: byMastery.length > 1 ? byMastery[byMastery.length - 1] : null,
      atRisk,
      examReadiness: readiness,
      streakDays,
    };
  },
);
