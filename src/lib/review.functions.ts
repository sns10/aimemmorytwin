import { createServerFn } from "@tanstack/react-start";

export interface ReviewItem {
  concept_id: string;
  concept_name: string;
  subject: string;
  mastery: number;
  stability: number;
  retrievability: number;
  last_reviewed_at: string | null;
  next_revision_at: string;
  overdue_days: number;
  question_id: string | null;
  question: string;
  options: string[];
  correct_index: number;
  difficulty: number;
}

export interface StreakStats {
  current_streak: number;
  longest_streak: number;
  reviews_today: number;
  active_days_30: number;
  /** Last 30 days, oldest first: ISO day + number of answers. */
  heatmap: { day: string; count: number }[];
}

export interface ReviewQueue {
  due: ReviewItem[];
  upcoming: { concept_id: string; concept_name: string; next_revision_at: string }[];
  streak: StreakStats;
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export const getReviewQueue = createServerFn({ method: "GET" }).handler(
  async (): Promise<ReviewQueue> => {
    const { resolveStudent } = await import("./session.server");
    const { targetDifficulty } = await import("./adaptive");
    const { supabase, studentId } = await resolveStudent();

    const since = new Date(Date.now() - 29 * 86_400_000);
    const [statesRes, eventsRes] = await Promise.all([
      supabase
        .from("knowledge_states")
        .select(
          "concept_id, mastery_probability, memory_stability, last_reviewed_at, next_revision_at, concepts(id, name, subject, difficulty, question, options, correct_index)",
        )
        .eq("student_id", studentId),
      supabase
        .from("learning_events")
        .select("created_at")
        .eq("student_id", studentId)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: true }),
    ]);
    if (statesRes.error) throw statesRes.error;
    if (eventsRes.error) throw eventsRes.error;

    const now = Date.now();
    const rows = (statesRes.data ?? []).filter((r) => r.concepts);

    const dueRows = rows
      .map((r) => {
        const c = r.concepts as unknown as {
          id: string;
          name: string;
          subject: string;
          difficulty: number;
          question: string;
          options: string[];
          correct_index: number;
        };
        const stability = Math.max(0.1, Number(r.memory_stability));
        const last = r.last_reviewed_at ? new Date(r.last_reviewed_at).getTime() : null;
        const days = last ? Math.max(0, (now - last) / 86_400_000) : 999;
        const R = last ? Math.exp(-days / stability) : 0.5;
        const nextTs = new Date(r.next_revision_at).getTime();
        return {
          c,
          mastery: Number(r.mastery_probability),
          stability,
          R,
          last_reviewed_at: r.last_reviewed_at,
          next_revision_at: r.next_revision_at,
          overdue_days: Math.max(0, (now - nextTs) / 86_400_000),
          due: nextTs <= now || R < 0.8,
        };
      })
      // Only surface concepts the learner has actually studied.
      .filter((r) => r.last_reviewed_at !== null);

    const dueSorted = dueRows.filter((r) => r.due).sort((a, b) => a.R - b.R).slice(0, 20);

    // Pull one in-zone question per due concept.
    const conceptIds = dueSorted.map((r) => r.c.id);
    const bankByConcept = new Map<
      string,
      { id: string; question: string; options: string[]; correct_index: number; difficulty: number; sort_order: number }[]
    >();
    if (conceptIds.length > 0) {
      const { data: qs, error: qErr } = await supabase
        .from("questions")
        .select("id, concept_id, question, options, correct_index, difficulty, sort_order")
        .in("concept_id", conceptIds)
        .order("sort_order");
      if (qErr) throw qErr;
      for (const q of qs ?? []) {
        const list = bankByConcept.get(q.concept_id) ?? [];
        list.push({
          id: q.id,
          question: q.question,
          options: q.options as string[],
          correct_index: q.correct_index,
          difficulty: Number(q.difficulty),
          sort_order: q.sort_order,
        });
        bankByConcept.set(q.concept_id, list);
      }
    }

    const due: ReviewItem[] = dueSorted.map((r) => {
      const bank = bankByConcept.get(r.c.id) ?? [];
      const target = targetDifficulty(r.mastery);
      let pick = bank[0];
      let gap = Infinity;
      for (const q of bank) {
        const g = Math.abs(q.difficulty - target);
        if (g < gap) {
          gap = g;
          pick = q;
        }
      }
      return {
        concept_id: r.c.id,
        concept_name: r.c.name,
        subject: r.c.subject,
        mastery: r.mastery,
        stability: r.stability,
        retrievability: r.R,
        last_reviewed_at: r.last_reviewed_at,
        next_revision_at: r.next_revision_at,
        overdue_days: r.overdue_days,
        question_id: pick?.id ?? null,
        question: pick?.question ?? r.c.question,
        options: pick ? pick.options : (r.c.options as string[]),
        correct_index: pick ? pick.correct_index : r.c.correct_index,
        difficulty: pick ? pick.difficulty : Number(r.c.difficulty),
      };
    });

    const upcoming = dueRows
      .filter((r) => !r.due)
      .sort(
        (a, b) =>
          new Date(a.next_revision_at).getTime() - new Date(b.next_revision_at).getTime(),
      )
      .slice(0, 6)
      .map((r) => ({
        concept_id: r.c.id,
        concept_name: r.c.name,
        next_revision_at: r.next_revision_at,
      }));

    // --- Streak maths over the last 30 days of learning events ---
    const counts = new Map<string, number>();
    for (const e of eventsRes.data ?? []) {
      const k = dayKey(new Date(e.created_at));
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    const heatmap: { day: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const k = dayKey(new Date(now - i * 86_400_000));
      heatmap.push({ day: k, count: counts.get(k) ?? 0 });
    }
    const todayKey = dayKey(new Date(now));
    const yesterdayKey = dayKey(new Date(now - 86_400_000));

    let current = 0;
    // A streak stays alive if you studied today, or last studied yesterday.
    const anchor = counts.has(todayKey) ? 0 : counts.has(yesterdayKey) ? 1 : -1;
    if (anchor >= 0) {
      for (let i = anchor; i < 400; i++) {
        const k = dayKey(new Date(now - i * 86_400_000));
        if ((counts.get(k) ?? 0) > 0) current++;
        else break;
      }
    }
    let longest = 0;
    let run = 0;
    for (const h of heatmap) {
      if (h.count > 0) {
        run++;
        longest = Math.max(longest, run);
      } else run = 0;
    }

    return {
      due,
      upcoming,
      streak: {
        current_streak: current,
        longest_streak: Math.max(longest, current),
        reviews_today: counts.get(todayKey) ?? 0,
        active_days_30: heatmap.filter((h) => h.count > 0).length,
        heatmap,
      },
    };
  },
);
