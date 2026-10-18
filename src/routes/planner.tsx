import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  GraduationCap,
  RotateCcw,
  Target,
  TriangleAlert,
} from "lucide-react";
import { getCourseTree } from "@/lib/course.functions";
import {
  buildExamPlan,
  EXAM_RECALL_TARGET,
  type PlanAction,
  type PlanStatus,
} from "@/lib/examplan";
import { DemoBanner } from "@/components/DemoBanner";

const courseQuery = queryOptions({
  queryKey: ["course-tree"],
  queryFn: () => getCourseTree(),
  staleTime: 0,
});

const STORAGE_KEY = "memorytwin:exam-plan";

export const Route = createFileRoute("/planner")({
  ssr: false,
  loader: ({ context }) => context.queryClient.ensureQueryData(courseQuery),
  component: PlannerPage,
  head: () => ({
    meta: [
      { title: "Exam Planner · MemoryTwin" },
      {
        name: "description",
        content:
          "Pick your exam date and chapters. MemoryTwin back-schedules learning, practice and spaced reviews so every concept peaks on the day of the test.",
      },
      { property: "og:title", content: "Exam Planner · MemoryTwin" },
      {
        property: "og:description",
        content:
          "A back-scheduled study agenda timed so your memory peaks on exam day, not before it.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  errorComponent: ({ error }) => (
    <div className="p-10 text-sm text-destructive">Planner failed: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-10">Not found</div>,
});

function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function defaultExamISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function loadStored(): { examDateISO: string; chapterIds: string[] } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { examDateISO?: string; chapterIds?: string[] };
    if (!parsed.examDateISO || !Array.isArray(parsed.chapterIds)) return null;
    return { examDateISO: parsed.examDateISO, chapterIds: parsed.chapterIds };
  } catch {
    return null;
  }
}

function PlannerPage() {
  const { data: subjects } = useSuspenseQuery(courseQuery);

  const allChapters = useMemo(
    () =>
      subjects.flatMap((s) =>
        s.chapters.map((c) => ({
          id: c.id,
          name: c.name,
          subject: s.name,
          topics: c.topics.length,
        })),
      ),
    [subjects],
  );

  const [examDate, setExamDate] = useState<string>(defaultExamISO);
  const [chapterIds, setChapterIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Restore the saved date + chapter selection once, on mount.
  useEffect(() => {
    const stored = loadStored();
    const validIds = new Set(allChapters.map((c) => c.id));
    if (stored) {
      if (stored.examDateISO >= todayISO()) setExamDate(stored.examDateISO);
      const keep = stored.chapterIds.filter((id) => validIds.has(id));
      setChapterIds(keep.length ? keep : allChapters.map((c) => c.id));
    } else {
      setChapterIds(allChapters.map((c) => c.id));
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist whenever the learner changes the inputs.
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ examDateISO: examDate, chapterIds }),
      );
    } catch {
      /* storage unavailable — plan still works for this session */
    }
  }, [hydrated, examDate, chapterIds]);

  const plan = useMemo(
    () => buildExamPlan(subjects, { examDateISO: examDate, chapterIds }),
    [subjects, examDate, chapterIds],
  );

  const toggleChapter = (id: string) =>
    setChapterIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const selectAll = () => setChapterIds(allChapters.map((c) => c.id));
  const selectNone = () => setChapterIds([]);

  const sortedConcepts = useMemo(() => {
    const rank: Record<PlanStatus, number> = { "at-risk": 0, close: 1, ready: 2 };
    return [...plan.concepts].sort(
      (a, b) => rank[a.status] - rank[b.status] || a.projectedRecall - b.projectedRecall,
    );
  }, [plan.concepts]);

  const hasPlan = !plan.emptyReason && plan.days.length > 0;

  return (
    <div className="min-h-screen bg-secondary/60">
      <header className="border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
          </Link>
          <span className="inline-flex items-center gap-1.5 font-serif text-sm font-bold">
            <GraduationCap className="h-4 w-4" /> Exam Planner
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
        <DemoBanner />

        {/* Intro */}
        <div className="border-l-2 border-primary bg-card p-5">
          <div className="ink-caps text-primary">Peak on the day, not before it</div>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Set a date and the chapters it covers. The planner works backwards from the exam —
            learning first, practice to lift mastery, then spaced reviews at expanding intervals —
            so each concept&rsquo;s projected recall lands above{" "}
            {Math.round(EXAM_RECALL_TARGET * 100)}% on exam day. Projections use the same
            forgetting-curve <code className="font-mono text-xs">R(t) = e^(−Δt/S)</code> as your
            twin and assume you pass each scheduled session — a guide, not a guarantee.
          </p>
        </div>

        {/* Setup */}
        <div className="border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
            <Target className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="ink-caps text-muted-foreground">Plan setup</span>
          </div>
          <div className="grid gap-5 p-4 sm:grid-cols-[220px_1fr]">
            <div>
              <label htmlFor="exam-date" className="ink-caps block text-muted-foreground">
                Exam date
              </label>
              <input
                id="exam-date"
                type="date"
                value={examDate}
                min={todayISO()}
                onChange={(e) => setExamDate(e.target.value)}
                className="mt-1.5 w-full border border-input bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
              />
              <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
                {plan.daysToExam > 0
                  ? `${plan.daysToExam} day${plan.daysToExam === 1 ? "" : "s"} to prepare`
                  : "pick a future date"}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <span className="ink-caps text-muted-foreground">Chapters</span>
                <div className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-widest">
                  <button onClick={selectAll} className="text-primary hover:underline">
                    All
                  </button>
                  <button onClick={selectNone} className="text-muted-foreground hover:underline">
                    None
                  </button>
                </div>
              </div>
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {allChapters.map((c) => {
                  const on = chapterIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggleChapter(c.id)}
                      className={
                        "flex items-center justify-between border px-3 py-2 text-left text-xs transition " +
                        (on
                          ? "border-primary bg-primary/5"
                          : "border-border opacity-70 hover:opacity-100")
                      }
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={
                            "flex h-3.5 w-3.5 items-center justify-center border " +
                            (on
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-input")
                          }
                        >
                          {on && <Check className="h-2.5 w-2.5" />}
                        </span>
                        <span className="font-medium">{c.name}</span>
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {c.topics}t
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {plan.emptyReason ? (
          <div className="border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
            {plan.emptyReason}
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="border border-border bg-card p-4">
              <div className="flex flex-wrap items-end gap-6">
                <Stat label="Concepts" value={String(plan.conceptCount)} />
                <Stat label="Sessions" value={String(plan.totalSessions)} />
                <Stat label="Est. time" value={`~${plan.estMinutes}m`} />
                <Stat
                  label={`Proj. recall on ${new Date(plan.examDateISO).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
                  value={`${Math.round(plan.projectedAvgRecall * 100)}%`}
                  strong
                />
                <Stat label="Exam-ready" value={`${plan.readyCount}/${plan.conceptCount}`} />
                {plan.tight && (
                  <span className="inline-flex items-center gap-1.5 border border-destructive/40 bg-destructive/5 px-2 py-1 text-[11px] font-medium text-destructive">
                    <TriangleAlert className="h-3.5 w-3.5" /> Tight schedule — consider an earlier
                    start or fewer chapters
                  </span>
                )}
              </div>
            </div>

            {/* Per-concept projection */}
            <div className="border border-border bg-card">
              <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
                <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="ink-caps text-muted-foreground">Projected exam-day recall</span>
              </div>
              <div className="divide-y divide-border">
                {sortedConcepts.map((c) => (
                  <div
                    key={c.conceptId}
                    className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-2.5 sm:grid-cols-[1.4fr_auto_140px_auto]"
                  >
                    <div className="min-w-0">
                      <Link
                        to="/topic/$id"
                        params={{ id: c.conceptId }}
                        className="truncate text-sm font-medium hover:text-primary"
                      >
                        {c.name}
                      </Link>
                      <div className="ink-caps truncate text-muted-foreground">{c.chapterName}</div>
                    </div>
                    <div className="hidden text-right font-mono text-[11px] text-muted-foreground sm:block">
                      now {Math.round(c.startMastery * 100)}%m · {Math.round(c.startRecall * 100)}%r
                    </div>
                    <div className="hidden items-center gap-2 sm:flex">
                      <div className="h-1.5 flex-1 overflow-hidden bg-muted">
                        <div
                          className={
                            "h-full " + (c.status === "at-risk" ? "bg-destructive" : "bg-primary")
                          }
                          style={{ width: `${Math.max(3, c.projectedRecall * 100)}%` }}
                        />
                      </div>
                      <span className="w-9 shrink-0 text-right font-mono text-[11px]">
                        {Math.round(c.projectedRecall * 100)}%
                      </span>
                    </div>
                    <StatusChip status={c.status} />
                  </div>
                ))}
              </div>
            </div>

            {/* Agenda */}
            <div className="space-y-3">
              <div className="ink-caps px-1 text-muted-foreground">
                Study agenda · {plan.days.length} active day
                {plan.days.length === 1 ? "" : "s"}
              </div>
              {hasPlan ? (
                plan.days.map((day) => (
                  <div key={day.dateISO} className="border border-border bg-card">
                    <div className="flex items-baseline justify-between border-b border-border px-4 py-2.5">
                      <span className="font-serif text-sm font-bold">{day.label}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {day.weekday} · {day.items.length} item
                        {day.items.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="divide-y divide-border">
                      {day.items.map((it, i) => (
                        <Link
                          key={day.dateISO + it.conceptId + it.action + i}
                          to="/topic/$id"
                          params={{ id: it.conceptId }}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-secondary/60"
                        >
                          <ActionPill action={it.action} />
                          <span className="min-w-0 flex-1">
                            <span className="font-medium">{it.conceptName}</span>
                            <span className="ml-2 text-[11px] text-muted-foreground">
                              {it.chapterName}
                            </span>
                            <span className="mt-0.5 block text-[11px] text-muted-foreground">
                              {it.reason}
                            </span>
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </Link>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
                  Nothing to schedule — every selected concept already projects above the exam-day
                  target. Keep your streak alive with a light review.
                </div>
              )}
            </div>

            <p className="flex items-center gap-1.5 pb-6 text-[11px] text-muted-foreground">
              <RotateCcw className="h-3 w-3" />
              Recompute anytime — the plan updates live as your twin changes. Your date and chapter
              picks are saved on this device.
            </p>
          </>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <div className={"font-mono font-semibold leading-none " + (strong ? "text-xl" : "text-lg")}>
        {value}
      </div>
      <div className="ink-caps mt-1 text-muted-foreground">{label}</div>
    </div>
  );
}

function StatusChip({ status }: { status: PlanStatus }) {
  const map: Record<PlanStatus, { label: string; cls: string }> = {
    ready: { label: "Ready", cls: "border-primary/40 bg-primary/5 text-primary" },
    close: { label: "Close", cls: "border-border bg-secondary text-muted-foreground" },
    "at-risk": {
      label: "At risk",
      cls: "border-destructive/40 bg-destructive/5 text-destructive",
    },
  };
  const s = map[status];
  return (
    <span
      className={
        "justify-self-end border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest " +
        s.cls
      }
    >
      {s.label}
    </span>
  );
}

function ActionPill({ action }: { action: PlanAction }) {
  const map: Record<PlanAction, { label: string; cls: string }> = {
    learn: { label: "Learn", cls: "border-border bg-secondary text-foreground" },
    practice: { label: "Practice", cls: "border-primary/30 bg-primary/5 text-primary" },
    review: { label: "Review", cls: "border-foreground/20 bg-foreground/5 text-foreground" },
  };
  const a = map[action];
  return (
    <span
      className={
        "w-[76px] shrink-0 border px-1.5 py-0.5 text-center text-[10px] font-semibold uppercase tracking-wide " +
        a.cls
      }
    >
      {a.label}
    </span>
  );
}
