import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const DAY = 86_400_000;

/** A read-only class seeded for the public demo, so the cohort view can be
 *  shown without signing in. Creating and joining still need an account. */
export const DEMO_CLASS_ID = "22222222-2222-2222-2222-222222222222";

export interface ClassSummary {
  id: string;
  name: string;
  join_code: string | null; // only returned to the teacher
  is_teacher: boolean;
  member_count: number;
}

export interface RosterRow {
  student_id: string;
  name: string;
  mastered: number;
  fading: number;
  answered_7d: number;
  accuracy: number | null;
  readiness: number;
  last_active: string | null;
}

export interface TopicRow {
  concept_id: string;
  name: string;
  chapter_name: string;
  avg_mastery: number;
  mastered_count: number;
  accuracy: number | null;
  attempts: number;
}

export interface ItemFlag {
  question_id: string;
  question: string;
  concept_name: string;
  attempts: number;
  accuracy: number;
  flag: "too hard" | "too easy";
}

export interface Suggestion {
  kind: "reteach" | "nudge" | "review" | "item" | "unblock" | "advance";
  title: string;
  detail: string;
  students?: string[];
}

export interface ClassDashboard {
  class_id: string;
  class_name: string;
  join_code: string | null;
  students: RosterRow[];
  topics: TopicRow[];
  items: ItemFlag[];
  suggestions: Suggestion[];
  activity: { date: string; answers: number }[];
  coverage: { started: number; mastered: number; total: number };
  totals: { students: number; answered_7d: number; avg_readiness: number; inactive: number };
}

function recall(stability: number, last: string | null, now: number): number {
  if (!last) return 1;
  const days = (now - new Date(last).getTime()) / DAY;
  return Math.exp(-days / Math.max(0.1, stability));
}

/** Classes the signed-in user teaches, plus the ones they have joined. */
export const getMyClasses = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ isDemo: boolean; classes: ClassSummary[] }> => {
    const { resolveStudent } = await import("./session.server");
    const { supabase, studentId, userId, isDemo } = await resolveStudent();
    if (isDemo || !userId) {
      // Visitors see the seeded demo class read-only.
      const { data: demo } = await supabase
        .from("classes")
        .select("id, name")
        .eq("id", DEMO_CLASS_ID)
        .maybeSingle();
      if (!demo) return { isDemo: true, classes: [] };
      const { count } = await supabase
        .from("class_members")
        .select("student_id", { count: "exact", head: true })
        .eq("class_id", DEMO_CLASS_ID);
      return {
        isDemo: true,
        classes: [
          {
            id: demo.id,
            name: demo.name,
            join_code: null,
            is_teacher: false,
            member_count: count ?? 0,
          },
        ],
      };
    }

    const [ownedRes, memberRes] = await Promise.all([
      supabase
        .from("classes")
        .select("id, name, join_code")
        .eq("teacher_user_id", userId)
        .eq("archived", false),
      supabase
        .from("class_members")
        .select("class_id, classes(id, name)")
        .eq("student_id", studentId),
    ]);
    if (ownedRes.error) throw ownedRes.error;
    if (memberRes.error) throw memberRes.error;

    const ids = [
      ...(ownedRes.data ?? []).map((c) => c.id),
      ...(memberRes.data ?? []).map((m) => m.class_id),
    ];
    const counts = new Map<string, number>();
    if (ids.length > 0) {
      const { data: rows } = await supabase
        .from("class_members")
        .select("class_id")
        .in("class_id", ids);
      for (const r of rows ?? []) counts.set(r.class_id, (counts.get(r.class_id) ?? 0) + 1);
    }

    const classes: ClassSummary[] = [
      ...(ownedRes.data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        join_code: c.join_code,
        is_teacher: true,
        member_count: counts.get(c.id) ?? 0,
      })),
      ...(memberRes.data ?? []).flatMap((m): ClassSummary[] => {
        const c = m.classes as { id: string; name: string } | null;
        if (!c) return [];
        return [
          {
            id: c.id,
            name: c.name,
            join_code: null,
            is_teacher: false,
            member_count: counts.get(c.id) ?? 0,
          },
        ];
      }),
    ];
    return { isDemo: false, classes };
  },
);

export const createClass = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ name: z.string().min(2).max(80) }).parse(input))
  .handler(async ({ data }): Promise<{ id: string; join_code: string }> => {
    const { resolveStudent } = await import("./session.server");
    const { supabase, userId } = await resolveStudent();
    if (!userId) throw new Error("Sign in to create a class");

    const { data: code, error: codeError } = await supabase.rpc("generate_join_code");
    if (codeError) throw codeError;

    const { data: row, error } = await supabase
      .from("classes")
      .insert({ name: data.name, teacher_user_id: userId, join_code: code as string })
      .select("id, join_code")
      .single();
    if (error || !row) throw error ?? new Error("Could not create the class");
    return { id: row.id, join_code: row.join_code };
  });

export const joinClass = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ code: z.string().min(4).max(12) }).parse(input))
  .handler(async ({ data }): Promise<{ class_id: string }> => {
    const { resolveStudent } = await import("./session.server");
    const { supabase, isDemo } = await resolveStudent();
    if (isDemo) throw new Error("Sign in to join a class");

    const { data: id, error } = await supabase.rpc("join_class_by_code", { _code: data.code });
    if (error) throw error;
    return { class_id: id as string };
  });

/** The cohort view: per student, per topic, and per question. */
export const getClassDashboard = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ class_id: z.string().uuid() }).parse(input))
  .handler(async ({ data }): Promise<ClassDashboard> => {
    const { resolveStudent } = await import("./session.server");
    const { supabase, userId } = await resolveStudent();
    const now = Date.now();

    const { data: klass, error: classError } = await supabase
      .from("classes")
      .select("id, name, join_code, teacher_user_id")
      .eq("id", data.class_id)
      .maybeSingle();
    if (classError) throw classError;
    if (!klass) throw new Error("Class not found");
    // The seeded demo class is shown in teacher mode so visitors can see the
    // cohort view; its join code stays hidden.
    const isTeacher = klass.teacher_user_id === userId || klass.id === DEMO_CLASS_ID;
    const showCode = klass.teacher_user_id === userId;

    const { data: members, error: memberError } = await supabase
      .from("class_members")
      .select("student_id, students(id, name)")
      .eq("class_id", data.class_id);
    if (memberError) throw memberError;

    const studentIds = (members ?? []).map((m) => m.student_id);
    const names = new Map<string, string>();
    for (const m of members ?? []) {
      const s = m.students as { id: string; name: string } | null;
      if (s) names.set(s.id, s.name);
    }

    if (studentIds.length === 0) {
      return {
        class_id: klass.id,
        class_name: klass.name,
        join_code: showCode ? klass.join_code : null,
        students: [],
        topics: [],
        items: [],
        suggestions: [],
        activity: [],
        coverage: { started: 0, mastered: 0, total: 0 },
        totals: { students: 0, answered_7d: 0, avg_readiness: 0, inactive: 0 },
      };
    }

    const [conceptsRes, statesRes, eventsRes, questionsRes] = await Promise.all([
      supabase
        .from("concepts")
        .select("id, name, chapter_id, prerequisite_id, chapters(name)")
        .order("sort_order"),
      supabase
        .from("knowledge_states")
        .select("student_id, concept_id, mastery_probability, memory_stability, last_reviewed_at")
        .in("student_id", studentIds),
      supabase
        .from("learning_events")
        .select("student_id, concept_id, question_id, is_correct, created_at, event_kind")
        .in("student_id", studentIds)
        .gte("created_at", new Date(now - 21 * DAY).toISOString()),
      supabase.from("questions").select("id, question, concept_id"),
    ]);
    for (const r of [conceptsRes, statesRes, eventsRes, questionsRes]) if (r.error) throw r.error;

    const concepts = conceptsRes.data ?? [];
    const chapterOf = new Map<string, string>();
    for (const c of concepts) {
      const ch = c.chapters as { name: string } | null;
      chapterOf.set(c.id, ch?.name ?? "");
    }
    const allAnswers = (eventsRes.data ?? []).filter((e) => e.event_kind === "quiz_answer");
    const conceptNameById = new Map(concepts.map((c) => [c.id, c.name]));
    const answers = allAnswers.filter((a) => new Date(a.created_at).getTime() >= now - 7 * DAY);

    // ------------------------------------------------------------- roster
    const students: RosterRow[] = studentIds.map((sid) => {
      const own = (statesRes.data ?? []).filter((s) => s.student_id === sid);
      const mine = answers.filter((a) => a.student_id === sid);
      const correct = mine.filter((a) => a.is_correct).length;
      let mastered = 0;
      let fading = 0;
      let readinessSum = 0;
      for (const st of own) {
        const m = Number(st.mastery_probability);
        const r = recall(Number(st.memory_stability), st.last_reviewed_at, now);
        if (m >= 0.85) mastered += 1;
        if (st.last_reviewed_at && r < 0.8) fading += 1;
        readinessSum += m * (st.last_reviewed_at ? r : 1);
      }
      const last = mine
        .map((a) => a.created_at)
        .sort()
        .at(-1);
      return {
        student_id: sid,
        name: names.get(sid) ?? "Learner",
        mastered,
        fading,
        answered_7d: mine.length,
        accuracy: mine.length > 0 ? correct / mine.length : null,
        readiness: own.length > 0 ? readinessSum / own.length : 0,
        last_active: last ?? null,
      };
    });
    students.sort((a, b) => a.readiness - b.readiness);

    // ------------------------------------------------------------- topics
    const topics: TopicRow[] = concepts.map((c) => {
      const states = (statesRes.data ?? []).filter((s) => s.concept_id === c.id);
      const attempts = answers.filter((a) => a.concept_id === c.id);
      const correct = attempts.filter((a) => a.is_correct).length;
      const avg =
        states.length > 0
          ? states.reduce((sum, s) => sum + Number(s.mastery_probability), 0) / states.length
          : 0;
      return {
        concept_id: c.id,
        name: c.name,
        chapter_name: chapterOf.get(c.id) ?? "",
        avg_mastery: avg,
        mastered_count: states.filter((s) => Number(s.mastery_probability) >= 0.85).length,
        accuracy: attempts.length > 0 ? correct / attempts.length : null,
        attempts: attempts.length,
      };
    });
    topics.sort((a, b) => a.avg_mastery - b.avg_mastery);

    // -------------------------------------------------------------- items
    const perQuestion = new Map<string, { n: number; correct: number }>();
    for (const a of answers) {
      if (!a.question_id) continue;
      const row = perQuestion.get(a.question_id) ?? { n: 0, correct: 0 };
      row.n += 1;
      if (a.is_correct) row.correct += 1;
      perQuestion.set(a.question_id, row);
    }
    const questionText = new Map(
      (questionsRes.data ?? []).map((q) => [q.id, { q: q.question, concept_id: q.concept_id }]),
    );
    const conceptName = conceptNameById;
    const items: ItemFlag[] = [];
    for (const [qid, row] of perQuestion) {
      if (row.n < 4) continue; // too few attempts to judge
      const acc = row.correct / row.n;
      if (acc > 0.95 || acc < 0.3) {
        const meta = questionText.get(qid);
        items.push({
          question_id: qid,
          question: meta?.q ?? "",
          concept_name: meta ? (conceptName.get(meta.concept_id) ?? "") : "",
          attempts: row.n,
          accuracy: acc,
          flag: acc < 0.3 ? "too hard" : "too easy",
        });
      }
    }
    items.sort((a, b) => a.accuracy - b.accuracy);

    // --------------------------------------------------- activity trend
    const activity: { date: string; answers: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const key = new Date(now - i * DAY).toISOString().slice(0, 10);
      activity.push({
        date: key,
        answers: allAnswers.filter((a) => a.created_at.slice(0, 10) === key).length,
      });
    }

    // ------------------------------------------------------- coverage
    const perTopicStarted = new Set(
      (statesRes.data ?? [])
        .filter((st) => st.last_reviewed_at !== null)
        .map((st) => st.concept_id),
    );
    const topicFullyMastered = topics.filter(
      (t) => studentIds.length > 0 && t.mastered_count / studentIds.length >= 0.8,
    );

    // ---------------------------------------------------- suggestions
    // Plain rules over the same numbers, so every suggestion can be traced
    // back to a column the teacher can see on this page.
    const suggestions: Suggestion[] = [];

    const reteach = topics
      .filter((t) => t.attempts >= 6 && (t.accuracy ?? 1) < 0.55)
      .sort((a, b) => (a.accuracy ?? 1) - (b.accuracy ?? 1))[0];
    if (reteach) {
      suggestions.push({
        kind: "reteach",
        title: `Reteach ${reteach.name}`,
        detail: `The class is answering ${Math.round((reteach.accuracy ?? 0) * 100)}% correct across ${reteach.attempts} attempts, and only ${reteach.mastered_count} of ${studentIds.length} have mastered it.`,
      });
    }

    const inactive = students.filter((s) => s.answered_7d === 0);
    if (inactive.length > 0) {
      suggestions.push({
        kind: "nudge",
        title:
          inactive.length === 1
            ? `${inactive[0].name} has stopped practising`
            : `${inactive.length} students have stopped practising`,
        detail:
          "No answers in the last 7 days. Their mastery still looks fine on paper, but predicted recall keeps falling while they are away.",
        students: inactive.map((s) => s.name),
      });
    }

    const dueNow = concepts.filter((c) => {
      const states = (statesRes.data ?? []).filter(
        (st) => st.concept_id === c.id && st.last_reviewed_at !== null,
      );
      if (states.length < Math.max(2, Math.ceil(studentIds.length / 2))) return false;
      const fading = states.filter(
        (st) => recall(Number(st.memory_stability), st.last_reviewed_at, now) < 0.8,
      ).length;
      return fading / states.length >= 0.6;
    });
    if (dueNow.length > 0) {
      suggestions.push({
        kind: "review",
        title: `Run a revision session on ${dueNow.length} topic${dueNow.length === 1 ? "" : "s"}`,
        detail: `Most of the class has dropped below the 80% recall threshold on: ${dueNow
          .slice(0, 4)
          .map((c) => c.name)
          .join(", ")}${dueNow.length > 4 ? ", and others" : ""}.`,
      });
    }

    const worstItem = items[0];
    if (worstItem && worstItem.flag === "too hard" && worstItem.accuracy <= 0.2) {
      suggestions.push({
        kind: "item",
        title: "Check one question before the next test",
        detail: `"${worstItem.question.slice(0, 90)}" is answered correctly ${Math.round(worstItem.accuracy * 100)}% of the time over ${worstItem.attempts} attempts — usually a sign of unclear wording or a wrong answer key.`,
      });
    }

    const blocked = concepts
      .map((c) => {
        if (!c.prerequisite_id) return null;
        const prereqStates = (statesRes.data ?? []).filter(
          (st) => st.concept_id === c.prerequisite_id,
        );
        const ready = prereqStates.filter((st) => Number(st.mastery_probability) >= 0.6).length;
        if (prereqStates.length === 0 || ready / prereqStates.length > 0.4) return null;
        const prereqName = conceptNameById.get(c.prerequisite_id) ?? "its prerequisite";
        return { name: c.name, prereqName, ready, total: prereqStates.length };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    if (blocked.length > 0) {
      const b = blocked[0];
      suggestions.push({
        kind: "unblock",
        title: `${b.prereqName} is holding the class back`,
        detail: `Only ${b.ready} of ${b.total} students are solid on ${b.prereqName}, which gates ${blocked.length} later topic${blocked.length === 1 ? "" : "s"} including ${b.name}. Fix the prerequisite before moving on.`,
      });
    }

    if (topicFullyMastered.length > 0) {
      suggestions.push({
        kind: "advance",
        title: `${topicFullyMastered.length} topic${topicFullyMastered.length === 1 ? " is" : "s are"} ready to move past`,
        detail: `At least 80% of the class has mastered: ${topicFullyMastered
          .slice(0, 4)
          .map((t) => t.name)
          .join(", ")}. Spend class time elsewhere.`,
      });
    }

    return {
      class_id: klass.id,
      class_name: klass.name,
      join_code: showCode ? klass.join_code : null,
      students,
      topics,
      items: items.slice(0, 10),
      suggestions,
      activity,
      coverage: {
        started: perTopicStarted.size,
        mastered: topicFullyMastered.length,
        total: concepts.length,
      },
      totals: {
        students: studentIds.length,
        answered_7d: answers.length,
        avg_readiness:
          students.length > 0
            ? students.reduce((sum, s) => sum + s.readiness, 0) / students.length
            : 0,
        inactive: inactive.length,
      },
    };
  });
