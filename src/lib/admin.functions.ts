import { createServerFn } from "@tanstack/react-start";

export interface AdminSubject {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  chapter_count: number;
}

export interface AdminChapter {
  id: string;
  subject_id: string;
  name: string;
  summary: string | null;
  sort_order: number;
  concept_count: number;
}

export interface AdminConcept {
  id: string;
  chapter_id: string | null;
  name: string;
  subject: string;
  difficulty: number;
  prerequisite_id: string | null;
  learning_objectives: string | null;
  video_url: string | null;
  concept_tags: string[];
  p_init: number;
  p_learn: number;
  p_guess: number;
  p_slip: number;
  question: string;
  options: string[];
  correct_index: number;
  sort_order: number;
  question_count: number;
  lesson_count: number;
}

export interface AdminQuestion {
  id: string;
  concept_id: string;
  question: string;
  options: string[];
  correct_index: number;
  difficulty: number;
  tags: string[];
  explanation: string | null;
  sort_order: number;
}

export interface AdminCatalog {
  isAdmin: boolean;
  subjects: AdminSubject[];
  chapters: AdminChapter[];
  concepts: AdminConcept[];
  questions: AdminQuestion[];
}

function toStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x));
  return [];
}

/** Resolve the caller and verify the admin role server-side. Throws otherwise. */
async function requireAdmin() {
  const { resolveStudent } = await import("./session.server");
  const ctx = await resolveStudent();
  if (!ctx.userId) throw new Error("Sign in required");
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw error;
  if (!data) throw new Error("Admin access required");
  return ctx;
}

export const checkAdmin = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ isAdmin: boolean }> => {
    const { resolveStudent } = await import("./session.server");
    const { supabase, userId } = await resolveStudent();
    if (!userId) return { isAdmin: false };
    const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    return { isAdmin: Boolean(data) };
  },
);

export const getAdminCatalog = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminCatalog> => {
    const { resolveStudent } = await import("./session.server");
    const { supabase, userId } = await resolveStudent();
    let isAdmin = false;
    if (userId) {
      const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
      isAdmin = Boolean(data);
    }
    if (!isAdmin) {
      return { isAdmin: false, subjects: [], chapters: [], concepts: [], questions: [] };
    }

    const [subjRes, chapRes, conRes, qRes, lessonRes] = await Promise.all([
      supabase.from("subjects").select("*").order("sort_order"),
      supabase.from("chapters").select("*").order("sort_order"),
      supabase.from("concepts").select("*").order("sort_order"),
      supabase.from("questions").select("*").order("sort_order"),
      supabase.from("lesson_content").select("concept_id"),
    ]);
    for (const r of [subjRes, chapRes, conRes, qRes, lessonRes]) {
      if (r.error) throw r.error;
    }

    const questions = (qRes.data ?? []).map((q) => ({
      id: q.id,
      concept_id: q.concept_id,
      question: q.question,
      options: toStringArray(q.options),
      correct_index: q.correct_index,
      difficulty: Number(q.difficulty),
      tags: q.tags ?? [],
      explanation: q.explanation,
      sort_order: q.sort_order,
    }));

    const qCount = new Map<string, number>();
    for (const q of questions) qCount.set(q.concept_id, (qCount.get(q.concept_id) ?? 0) + 1);
    const lCount = new Map<string, number>();
    for (const l of lessonRes.data ?? [])
      lCount.set(l.concept_id, (lCount.get(l.concept_id) ?? 0) + 1);

    const concepts: AdminConcept[] = (conRes.data ?? []).map((c) => ({
      id: c.id,
      chapter_id: c.chapter_id,
      name: c.name,
      subject: c.subject,
      difficulty: Number(c.difficulty),
      prerequisite_id: c.prerequisite_id,
      learning_objectives: c.learning_objectives,
      video_url: c.video_url,
      concept_tags: c.concept_tags ?? [],
      p_init: Number(c.p_init),
      p_learn: Number(c.p_learn),
      p_guess: Number(c.p_guess),
      p_slip: Number(c.p_slip),
      question: c.question,
      options: toStringArray(c.options),
      correct_index: c.correct_index,
      sort_order: c.sort_order,
      question_count: qCount.get(c.id) ?? 0,
      lesson_count: lCount.get(c.id) ?? 0,
    }));

    const conceptCount = new Map<string, number>();
    for (const c of conRes.data ?? []) {
      if (c.chapter_id) conceptCount.set(c.chapter_id, (conceptCount.get(c.chapter_id) ?? 0) + 1);
    }
    const chapters: AdminChapter[] = (chapRes.data ?? []).map((ch) => ({
      id: ch.id,
      subject_id: ch.subject_id,
      name: ch.name,
      summary: ch.summary,
      sort_order: ch.sort_order,
      concept_count: conceptCount.get(ch.id) ?? 0,
    }));

    const chapCount = new Map<string, number>();
    for (const ch of chapRes.data ?? [])
      chapCount.set(ch.subject_id, (chapCount.get(ch.subject_id) ?? 0) + 1);
    const subjects: AdminSubject[] = (subjRes.data ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      sort_order: s.sort_order,
      chapter_count: chapCount.get(s.id) ?? 0,
    }));

    return { isAdmin: true, subjects, chapters, concepts, questions };
  },
);

/* ---------------- Subjects ---------------- */

export interface SubjectInput {
  id?: string;
  name: string;
  description?: string | null;
  sort_order?: number;
}

export const saveSubject = createServerFn({ method: "POST" })
  .inputValidator((d: SubjectInput) => d)
  .handler(async ({ data }) => {
    const { supabase } = await requireAdmin();
    const row = {
      name: data.name.trim(),
      description: data.description?.trim() || null,
      sort_order: data.sort_order ?? 0,
    };
    if (!row.name) throw new Error("Name is required");
    const res = data.id
      ? await supabase.from("subjects").update(row).eq("id", data.id)
      : await supabase.from("subjects").insert(row);
    if (res.error) throw res.error;
    return { ok: true };
  });

/* ---------------- Chapters ---------------- */

export interface ChapterInput {
  id?: string;
  subject_id: string;
  name: string;
  summary?: string | null;
  sort_order?: number;
}

export const saveChapter = createServerFn({ method: "POST" })
  .inputValidator((d: ChapterInput) => d)
  .handler(async ({ data }) => {
    const { supabase } = await requireAdmin();
    const row = {
      subject_id: data.subject_id,
      name: data.name.trim(),
      summary: data.summary?.trim() || null,
      sort_order: data.sort_order ?? 0,
    };
    if (!row.name) throw new Error("Name is required");
    if (!row.subject_id) throw new Error("Subject is required");
    const res = data.id
      ? await supabase.from("chapters").update(row).eq("id", data.id)
      : await supabase.from("chapters").insert(row);
    if (res.error) throw res.error;
    return { ok: true };
  });

/* ---------------- Concepts ---------------- */

export interface ConceptInput {
  id?: string;
  name: string;
  subject: string;
  chapter_id: string | null;
  difficulty: number;
  prerequisite_id: string | null;
  learning_objectives?: string | null;
  video_url?: string | null;
  concept_tags?: string[];
  p_init: number;
  p_learn: number;
  p_guess: number;
  p_slip: number;
  question: string;
  options: string[];
  correct_index: number;
  sort_order?: number;
}

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : lo));

export const saveConcept = createServerFn({ method: "POST" })
  .inputValidator((d: ConceptInput) => d)
  .handler(async ({ data }) => {
    const { supabase } = await requireAdmin();
    if (!data.name.trim()) throw new Error("Name is required");
    if (data.id && data.prerequisite_id === data.id)
      throw new Error("A concept cannot be its own prerequisite");

    // Cycle guard: walk the prerequisite chain and reject if it loops back.
    if (data.id && data.prerequisite_id) {
      const { data: all } = await supabase.from("concepts").select("id, prerequisite_id");
      const map = new Map((all ?? []).map((c) => [c.id, c.prerequisite_id]));
      let cursor: string | null | undefined = data.prerequisite_id;
      let hops = 0;
      while (cursor && hops++ < 100) {
        if (cursor === data.id) throw new Error("That prerequisite creates a cycle");
        cursor = map.get(cursor) ?? null;
      }
    }

    const row = {
      name: data.name.trim(),
      subject: data.subject.trim() || "Chemistry",
      chapter_id: data.chapter_id,
      difficulty: clamp(data.difficulty, 0, 1),
      prerequisite_id: data.prerequisite_id,
      learning_objectives: data.learning_objectives?.trim() || null,
      video_url: data.video_url?.trim() || null,
      concept_tags: data.concept_tags ?? [],
      p_init: clamp(data.p_init, 0.01, 0.99),
      p_learn: clamp(data.p_learn, 0.01, 0.99),
      p_guess: clamp(data.p_guess, 0.01, 0.5),
      p_slip: clamp(data.p_slip, 0.01, 0.5),
      question: data.question.trim() || data.name.trim(),
      options: data.options.filter((o) => o.trim().length > 0),
      correct_index: data.correct_index,
      sort_order: data.sort_order ?? 0,
    };
    const res = data.id
      ? await supabase.from("concepts").update(row).eq("id", data.id)
      : await supabase.from("concepts").insert(row);
    if (res.error) throw res.error;
    return { ok: true };
  });

/* ---------------- Questions ---------------- */

export interface QuestionInput {
  id?: string;
  concept_id: string;
  question: string;
  options: string[];
  correct_index: number;
  difficulty: number;
  tags?: string[];
  explanation?: string | null;
  sort_order?: number;
}

export const saveQuestion = createServerFn({ method: "POST" })
  .inputValidator((d: QuestionInput) => d)
  .handler(async ({ data }) => {
    const { supabase } = await requireAdmin();
    const options = data.options.map((o) => o.trim()).filter((o) => o.length > 0);
    if (!data.concept_id) throw new Error("Concept is required");
    if (!data.question.trim()) throw new Error("Question text is required");
    if (options.length < 2) throw new Error("At least two options are required");
    if (data.correct_index < 0 || data.correct_index >= options.length)
      throw new Error("Pick a valid correct answer");

    const row = {
      concept_id: data.concept_id,
      question: data.question.trim(),
      options,
      correct_index: data.correct_index,
      difficulty: clamp(data.difficulty, 0, 1),
      tags: data.tags ?? [],
      explanation: data.explanation?.trim() || null,
      sort_order: data.sort_order ?? 0,
    };
    const res = data.id
      ? await supabase.from("questions").update(row).eq("id", data.id)
      : await supabase.from("questions").insert(row);
    if (res.error) throw res.error;
    return { ok: true };
  });

/* ---------------- Delete ---------------- */

export type AdminTable = "subjects" | "chapters" | "concepts" | "questions";

export const deleteRow = createServerFn({ method: "POST" })
  .inputValidator((d: { table: AdminTable; id: string }) => d)
  .handler(async ({ data }) => {
    const { supabase } = await requireAdmin();
    const allowed: AdminTable[] = ["subjects", "chapters", "concepts", "questions"];
    if (!allowed.includes(data.table)) throw new Error("Unsupported table");
    const res = await supabase.from(data.table).delete().eq("id", data.id);
    if (res.error) {
      throw new Error(
        res.error.message.includes("foreign key")
          ? "Cannot delete — other records still reference this item."
          : res.error.message,
      );
    }
    return { ok: true };
  });