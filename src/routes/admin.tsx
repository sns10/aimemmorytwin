import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { ArrowLeft, Plus, Pencil, Trash2, AlertTriangle, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import {
  getAdminCatalog,
  saveSubject,
  saveChapter,
  saveConcept,
  saveQuestion,
  deleteRow,
  type AdminCatalog,
  type AdminConcept,
  type AdminQuestion,
} from "@/lib/admin.functions";

const catalogQuery = queryOptions({
  queryKey: ["admin-catalog"],
  queryFn: () => getAdminCatalog(),
  staleTime: 0,
});

export const Route = createFileRoute("/admin")({
  ssr: false,
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery),
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Curriculum Admin · MemoryTwin" },
      {
        name: "description",
        content:
          "Author subjects, chapters, concepts and the question bank that power the MemoryTwin knowledge engine.",
      },
      { property: "og:title", content: "Curriculum Admin · MemoryTwin" },
      {
        property: "og:description",
        content: "Author the subjects, concepts and questions behind the knowledge engine.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  errorComponent: ({ error }: { error: Error }) => (
    <div className="p-10 text-sm text-destructive">Admin failed: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-10">Not found</div>,
});

type Tab = "subjects" | "chapters" | "concepts" | "questions";

function AdminPage() {
  const { data } = useSuspenseQuery(catalogQuery);
  const [tab, setTab] = useState<Tab>("subjects");

  if (!data.isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary/60 p-6">
        <div className="max-w-md border border-border bg-card p-8 text-center">
          <ShieldOff className="mx-auto h-6 w-6 text-muted-foreground" />
          <h1 className="mt-3 font-serif text-2xl font-bold">Admin access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Curriculum authoring is limited to accounts with the admin role. Sign in with an admin
            account to continue.
          </p>
          <Link
            to="/"
            className="mt-5 inline-flex bg-primary px-4 py-2 text-xs font-medium uppercase tracking-widest text-primary-foreground hover:bg-foreground"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "subjects", label: "Subjects", count: data.subjects.length },
    { id: "chapters", label: "Chapters", count: data.chapters.length },
    { id: "concepts", label: "Concepts", count: data.concepts.length },
    { id: "questions", label: "Questions", count: data.questions.length },
  ];

  const orphanConcepts = data.concepts.filter(
    (c) => c.question_count === 0 && c.lesson_count === 0,
  );

  return (
    <div className="min-h-screen bg-secondary/60">
      <header className="border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
          </Link>
          <span className="font-serif text-sm font-bold">Curriculum Admin</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
        {orphanConcepts.length > 0 && (
          <div className="flex items-start gap-2 border border-border bg-card px-4 py-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
            <span>
              <span className="font-medium">{orphanConcepts.length} concept(s)</span> have no lesson
              and no questions — the engine has nothing to serve for them:{" "}
              <span className="text-muted-foreground">
                {orphanConcepts.map((c) => c.name).join(", ")}
              </span>
            </span>
          </div>
        )}

        <nav className="flex flex-wrap gap-1 border border-border bg-card p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={
                "px-4 py-2 text-xs font-medium uppercase tracking-widest transition " +
                (tab === t.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              {t.label} <span className="font-mono opacity-70">{t.count}</span>
            </button>
          ))}
        </nav>

        {tab === "subjects" && <SubjectsPanel data={data} />}
        {tab === "chapters" && <ChaptersPanel data={data} />}
        {tab === "concepts" && <ConceptsPanel data={data} />}
        {tab === "questions" && <QuestionsPanel data={data} />}
      </main>
    </div>
  );
}

/* ---------- shared bits ---------- */

function useRefresh() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["admin-catalog"] });
    void qc.invalidateQueries({ queryKey: ["course-tree"] });
    void qc.invalidateQueries({ queryKey: ["overview"] });
  };
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="ink-caps text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </label>
  );
}

const inputCls =
  "w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground";

function Panel({
  title,
  subtitle,
  onNew,
  children,
}: {
  title: string;
  subtitle: string;
  onNew: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <h2 className="font-serif text-lg font-bold">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <button
          onClick={onNew}
          className="inline-flex items-center gap-1.5 bg-primary px-3 py-2 text-xs font-medium uppercase tracking-widest text-primary-foreground hover:bg-foreground"
        >
          <Plus className="h-3.5 w-3.5" /> New
        </button>
      </div>
      {children}
    </div>
  );
}

function RowActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button onClick={onEdit} className="p-1.5 text-muted-foreground hover:text-foreground">
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button onClick={onDelete} className="p-1.5 text-muted-foreground hover:text-destructive">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function useDelete() {
  const del = useServerFn(deleteRow);
  const refresh = useRefresh();
  return async (table: "subjects" | "chapters" | "concepts" | "questions", id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await del({ data: { table, id } });
      toast.success("Deleted");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };
}

/* ---------- subjects ---------- */

function SubjectsPanel({ data }: { data: AdminCatalog }) {
  const save = useServerFn(saveSubject);
  const refresh = useRefresh();
  const remove = useDelete();
  const [form, setForm] = useState<{
    id?: string;
    name: string;
    description: string;
    sort_order: number;
  } | null>(null);

  async function submit() {
    if (!form) return;
    try {
      await save({
        data: {
          ...(form.id ? { id: form.id } : {}),
          name: form.name,
          description: form.description,
          sort_order: form.sort_order,
        },
      });
      toast.success("Subject saved");
      setForm(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <Panel
      title="Subjects"
      subtitle="Top level of the curriculum tree."
      onNew={() => setForm({ name: "", description: "", sort_order: data.subjects.length })}
    >
      {form && (
        <div className="grid gap-3 border-b border-border bg-secondary/40 p-4 sm:grid-cols-3">
          <Field label="Name">
            <input
              className={inputCls}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Description">
            <input
              className={inputCls}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <Field label="Order">
            <input
              type="number"
              className={inputCls}
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
            />
          </Field>
          <FormActions onCancel={() => setForm(null)} onSave={submit} />
        </div>
      )}
      <div className="divide-y divide-border">
        {data.subjects.map((s) => (
          <div key={s.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <div className="font-medium">{s.name}</div>
              <div className="text-xs text-muted-foreground">
                {s.chapter_count} chapter(s){s.description ? ` · ${s.description}` : ""}
              </div>
            </div>
            <RowActions
              onEdit={() =>
                setForm({
                  id: s.id,
                  name: s.name,
                  description: s.description ?? "",
                  sort_order: s.sort_order,
                })
              }
              onDelete={() => void remove("subjects", s.id, s.name)}
            />
          </div>
        ))}
      </div>
    </Panel>
  );
}

function FormActions({ onCancel, onSave }: { onCancel: () => void; onSave: () => void }) {
  return (
    <div className="flex items-end gap-2 sm:col-span-full">
      <button
        onClick={onSave}
        className="bg-primary px-4 py-2 text-xs font-medium uppercase tracking-widest text-primary-foreground hover:bg-foreground"
      >
        Save
      </button>
      <button
        onClick={onCancel}
        className="px-4 py-2 text-xs font-medium uppercase tracking-widest text-muted-foreground hover:text-foreground"
      >
        Cancel
      </button>
    </div>
  );
}

/* ---------- chapters ---------- */

function ChaptersPanel({ data }: { data: AdminCatalog }) {
  const save = useServerFn(saveChapter);
  const refresh = useRefresh();
  const remove = useDelete();
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [form, setForm] = useState<{
    id?: string;
    subject_id: string;
    name: string;
    summary: string;
    sort_order: number;
  } | null>(null);

  const rows = data.chapters.filter(
    (c) => subjectFilter === "all" || c.subject_id === subjectFilter,
  );

  async function submit() {
    if (!form) return;
    try {
      await save({
        data: {
          ...(form.id ? { id: form.id } : {}),
          subject_id: form.subject_id,
          name: form.name,
          summary: form.summary,
          sort_order: form.sort_order,
        },
      });
      toast.success("Chapter saved");
      setForm(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <Panel
      title="Chapters"
      subtitle="Groups of concepts inside a subject."
      onNew={() =>
        setForm({
          subject_id: data.subjects[0]?.id ?? "",
          name: "",
          summary: "",
          sort_order: data.chapters.length,
        })
      }
    >
      <div className="border-b border-border px-4 py-2">
        <select
          className="border border-border bg-background px-3 py-1.5 text-xs"
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
        >
          <option value="all">All subjects</option>
          {data.subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {form && (
        <div className="grid gap-3 border-b border-border bg-secondary/40 p-4 sm:grid-cols-4">
          <Field label="Subject">
            <select
              className={inputCls}
              value={form.subject_id}
              onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
            >
              {data.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Name">
            <input
              className={inputCls}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Summary">
            <input
              className={inputCls}
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
            />
          </Field>
          <Field label="Order">
            <input
              type="number"
              className={inputCls}
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
            />
          </Field>
          <FormActions onCancel={() => setForm(null)} onSave={submit} />
        </div>
      )}

      <div className="divide-y divide-border">
        {rows.map((c) => (
          <div key={c.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <div className="font-medium">{c.name}</div>
              <div className="text-xs text-muted-foreground">
                {data.subjects.find((s) => s.id === c.subject_id)?.name ?? "—"} ·{" "}
                {c.concept_count} concept(s)
              </div>
            </div>
            <RowActions
              onEdit={() =>
                setForm({
                  id: c.id,
                  subject_id: c.subject_id,
                  name: c.name,
                  summary: c.summary ?? "",
                  sort_order: c.sort_order,
                })
              }
              onDelete={() => void remove("chapters", c.id, c.name)}
            />
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ---------- concepts ---------- */

type ConceptForm = {
  id?: string;
  name: string;
  subject: string;
  chapter_id: string;
  difficulty: number;
  prerequisite_id: string;
  learning_objectives: string;
  video_url: string;
  tags: string;
  p_init: number;
  p_learn: number;
  p_guess: number;
  p_slip: number;
  question: string;
  options: string[];
  correct_index: number;
  sort_order: number;
};

function blankConcept(data: AdminCatalog): ConceptForm {
  return {
    name: "",
    subject: data.subjects[0]?.name ?? "Chemistry",
    chapter_id: data.chapters[0]?.id ?? "",
    difficulty: 0.5,
    prerequisite_id: "",
    learning_objectives: "",
    video_url: "",
    tags: "",
    p_init: 0.15,
    p_learn: 0.1,
    p_guess: 0.2,
    p_slip: 0.1,
    question: "",
    options: ["", "", "", ""],
    correct_index: 0,
    sort_order: data.concepts.length,
  };
}

function fromConcept(c: AdminConcept): ConceptForm {
  return {
    id: c.id,
    name: c.name,
    subject: c.subject,
    chapter_id: c.chapter_id ?? "",
    difficulty: c.difficulty,
    prerequisite_id: c.prerequisite_id ?? "",
    learning_objectives: c.learning_objectives ?? "",
    video_url: c.video_url ?? "",
    tags: c.concept_tags.join(", "),
    p_init: c.p_init,
    p_learn: c.p_learn,
    p_guess: c.p_guess,
    p_slip: c.p_slip,
    question: c.question,
    options: [0, 1, 2, 3].map((i) => c.options[i] ?? ""),
    correct_index: c.correct_index,
    sort_order: c.sort_order,
  };
}

function ConceptsPanel({ data }: { data: AdminCatalog }) {
  const save = useServerFn(saveConcept);
  const refresh = useRefresh();
  const remove = useDelete();
  const [chapterFilter, setChapterFilter] = useState("all");
  const [form, setForm] = useState<ConceptForm | null>(null);

  const rows = data.concepts.filter(
    (c) => chapterFilter === "all" || c.chapter_id === chapterFilter,
  );

  async function submit() {
    if (!form) return;
    try {
      await save({
        data: {
          ...(form.id ? { id: form.id } : {}),
          name: form.name,
          subject: form.subject,
          chapter_id: form.chapter_id || null,
          difficulty: form.difficulty,
          prerequisite_id: form.prerequisite_id || null,
          learning_objectives: form.learning_objectives,
          video_url: form.video_url,
          concept_tags: form.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          p_init: form.p_init,
          p_learn: form.p_learn,
          p_guess: form.p_guess,
          p_slip: form.p_slip,
          question: form.question,
          options: form.options,
          correct_index: form.correct_index,
          sort_order: form.sort_order,
        },
      });
      toast.success("Concept saved");
      setForm(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <Panel
      title="Concepts"
      subtitle="The atomic learning unit — difficulty, prerequisite and BKT parameters feed the engine directly."
      onNew={() => setForm(blankConcept(data))}
    >
      <div className="border-b border-border px-4 py-2">
        <select
          className="border border-border bg-background px-3 py-1.5 text-xs"
          value={chapterFilter}
          onChange={(e) => setChapterFilter(e.target.value)}
        >
          <option value="all">All chapters</option>
          {data.chapters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {form && (
        <div className="space-y-3 border-b border-border bg-secondary/40 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Name">
              <input
                className={inputCls}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Subject label">
              <input
                className={inputCls}
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              />
            </Field>
            <Field label="Chapter">
              <select
                className={inputCls}
                value={form.chapter_id}
                onChange={(e) => setForm({ ...form, chapter_id: e.target.value })}
              >
                <option value="">— none —</option>
                {data.chapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Learning objectives">
            <textarea
              rows={2}
              className={inputCls}
              value={form.learning_objectives}
              onChange={(e) => setForm({ ...form, learning_objectives: e.target.value })}
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={`Difficulty ${form.difficulty.toFixed(2)}`}>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                className="w-full"
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: Number(e.target.value) })}
              />
            </Field>
            <Field label="Prerequisite">
              <select
                className={inputCls}
                value={form.prerequisite_id}
                onChange={(e) => setForm({ ...form, prerequisite_id: e.target.value })}
              >
                <option value="">— none —</option>
                {data.concepts
                  .filter((c) => c.id !== form.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Video URL">
              <input
                className={inputCls}
                value={form.video_url}
                onChange={(e) => setForm({ ...form, video_url: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Tags" hint="Comma separated, e.g. bonding, ionic">
            <input
              className={inputCls}
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-4">
            {(
              [
                ["p_init", "P(L₀) prior"],
                ["p_learn", "P(T) learn"],
                ["p_guess", "P(G) guess"],
                ["p_slip", "P(S) slip"],
              ] as const
            ).map(([key, label]) => (
              <Field key={key} label={label}>
                <input
                  type="number"
                  step={0.01}
                  min={0.01}
                  max={0.99}
                  className={inputCls}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
                />
              </Field>
            ))}
          </div>

          <Field label="Anchor question" hint="Shown when the question bank is empty.">
            <input
              className={inputCls}
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
            />
          </Field>
          <OptionsEditor
            options={form.options}
            correctIndex={form.correct_index}
            onChange={(options, correct_index) => setForm({ ...form, options, correct_index })}
          />

          <FormActions onCancel={() => setForm(null)} onSave={submit} />
        </div>
      )}

      <div className="divide-y divide-border">
        {rows.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <div className="min-w-0">
              <div className="font-medium">{c.name}</div>
              <div className="font-mono text-[11px] text-muted-foreground">
                d={c.difficulty.toFixed(2)} · {c.question_count} question(s) · {c.lesson_count}{" "}
                lesson(s)
                {c.prerequisite_id
                  ? ` · after ${data.concepts.find((p) => p.id === c.prerequisite_id)?.name ?? "?"}`
                  : ""}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {c.question_count === 0 && c.lesson_count === 0 && (
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
              )}
              <RowActions
                onEdit={() => setForm(fromConcept(c))}
                onDelete={() => void remove("concepts", c.id, c.name)}
              />
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function OptionsEditor({
  options,
  correctIndex,
  onChange,
}: {
  options: string[];
  correctIndex: number;
  onChange: (options: string[], correctIndex: number) => void;
}) {
  return (
    <div>
      <span className="ink-caps text-muted-foreground">Options — select the correct one</span>
      <div className="mt-1 grid gap-2 sm:grid-cols-2">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="radio"
              checked={correctIndex === i}
              onChange={() => onChange(options, i)}
              aria-label={`Option ${i + 1} is correct`}
            />
            <input
              className={inputCls}
              value={opt}
              placeholder={`Option ${i + 1}`}
              onChange={(e) => {
                const next = [...options];
                next[i] = e.target.value;
                onChange(next, correctIndex);
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- questions ---------- */

type QuestionForm = {
  id?: string;
  concept_id: string;
  question: string;
  options: string[];
  correct_index: number;
  difficulty: number;
  tags: string;
  explanation: string;
  sort_order: number;
};

function fromQuestion(q: AdminQuestion): QuestionForm {
  return {
    id: q.id,
    concept_id: q.concept_id,
    question: q.question,
    options: [0, 1, 2, 3].map((i) => q.options[i] ?? ""),
    correct_index: q.correct_index,
    difficulty: q.difficulty,
    tags: q.tags.join(", "),
    explanation: q.explanation ?? "",
    sort_order: q.sort_order,
  };
}

function QuestionsPanel({ data }: { data: AdminCatalog }) {
  const save = useServerFn(saveQuestion);
  const refresh = useRefresh();
  const remove = useDelete();
  const [conceptFilter, setConceptFilter] = useState(data.concepts[0]?.id ?? "all");
  const [form, setForm] = useState<QuestionForm | null>(null);

  const rows = useMemo(
    () =>
      data.questions.filter((q) => conceptFilter === "all" || q.concept_id === conceptFilter),
    [data.questions, conceptFilter],
  );

  async function submit() {
    if (!form) return;
    try {
      await save({
        data: {
          ...(form.id ? { id: form.id } : {}),
          concept_id: form.concept_id,
          question: form.question,
          options: form.options,
          correct_index: form.correct_index,
          difficulty: form.difficulty,
          tags: form.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          explanation: form.explanation,
          sort_order: form.sort_order,
        },
      });
      toast.success("Question saved");
      setForm(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <Panel
      title="Question bank"
      subtitle="Adaptive selection picks from here by difficulty — aim for a spread from easy to hard per concept."
      onNew={() =>
        setForm({
          concept_id: conceptFilter !== "all" ? conceptFilter : (data.concepts[0]?.id ?? ""),
          question: "",
          options: ["", "", "", ""],
          correct_index: 0,
          difficulty: 0.5,
          tags: "",
          explanation: "",
          sort_order: rows.length,
        })
      }
    >
      <div className="border-b border-border px-4 py-2">
        <select
          className="border border-border bg-background px-3 py-1.5 text-xs"
          value={conceptFilter}
          onChange={(e) => setConceptFilter(e.target.value)}
        >
          <option value="all">All concepts</option>
          {data.concepts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.question_count})
            </option>
          ))}
        </select>
      </div>

      {form && (
        <div className="space-y-3 border-b border-border bg-secondary/40 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Concept">
              <select
                className={inputCls}
                value={form.concept_id}
                onChange={(e) => setForm({ ...form, concept_id: e.target.value })}
              >
                {data.concepts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={`Difficulty ${form.difficulty.toFixed(2)}`}>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                className="w-full"
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: Number(e.target.value) })}
              />
            </Field>
            <Field label="Order">
              <input
                type="number"
                className={inputCls}
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              />
            </Field>
          </div>

          <Field label="Question">
            <textarea
              rows={2}
              className={inputCls}
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
            />
          </Field>

          <OptionsEditor
            options={form.options}
            correctIndex={form.correct_index}
            onChange={(options, correct_index) => setForm({ ...form, options, correct_index })}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tags" hint="Comma separated">
              <input
                className={inputCls}
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
              />
            </Field>
            <Field label="Explanation">
              <input
                className={inputCls}
                value={form.explanation}
                onChange={(e) => setForm({ ...form, explanation: e.target.value })}
              />
            </Field>
          </div>

          <FormActions onCancel={() => setForm(null)} onSave={submit} />
        </div>
      )}

      <div className="divide-y divide-border">
        {rows.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            No questions yet for this concept.
          </p>
        )}
        {rows.map((q) => (
          <div key={q.id} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
            <div className="min-w-0">
              <div className="font-medium">{q.question}</div>
              <div className="font-mono text-[11px] text-muted-foreground">
                d={q.difficulty.toFixed(2)} · answer: {q.options[q.correct_index] ?? "—"}
                {q.tags.length > 0 ? ` · ${q.tags.join(", ")}` : ""}
              </div>
            </div>
            <RowActions
              onEdit={() => setForm(fromQuestion(q))}
              onDelete={() => void remove("questions", q.id, q.question.slice(0, 40))}
            />
          </div>
        ))}
      </div>
    </Panel>
  );
}