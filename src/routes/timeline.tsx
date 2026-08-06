import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Check, FileText, X, TrendingUp, TrendingDown } from "lucide-react";
import { getTimeline, type TimelineEvent } from "@/lib/timeline.functions";
import { DemoBanner } from "@/components/DemoBanner";

const timelineQuery = queryOptions({
  queryKey: ["timeline"],
  queryFn: () => getTimeline(),
  staleTime: 0,
});

export const Route = createFileRoute("/timeline")({
  ssr: false,
  loader: ({ context }) => context.queryClient.ensureQueryData(timelineQuery),
  component: TimelinePage,
  head: () => ({
    meta: [
      { title: "Learning Timeline · MemoryTwin" },
      {
        name: "description",
        content:
          "Every learning event with the exact mastery change it caused — the auditable trail behind your memory model.",
      },
      { property: "og:title", content: "Learning Timeline · MemoryTwin" },
      {
        property: "og:description",
        content: "Every learning event with the exact mastery change it caused.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  errorComponent: ({ error }: { error: Error }) => (
    <div className="p-10 text-sm text-destructive">Timeline failed: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-10">Not found</div>,
});

const KIND_LABEL: Record<string, string> = {
  quiz_answer: "Answered",
  lesson_view: "Watched lesson",
  assignment_submit: "Submitted assignment",
};

function dayHeading(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const key = (x: Date) => x.toISOString().slice(0, 10);
  const yesterday = new Date(today.getTime() - 86_400_000);
  if (key(d) === key(today)) return "Today";
  if (key(d) === key(yesterday)) return "Yesterday";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function TimelinePage() {
  const { data } = useSuspenseQuery(timelineQuery);
  const [conceptFilter, setConceptFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState("all");

  const filtered = useMemo(
    () =>
      data.events.filter(
        (e) =>
          (conceptFilter === "all" || e.concept_id === conceptFilter) &&
          (kindFilter === "all" || e.event_kind === kindFilter),
      ),
    [data.events, conceptFilter, kindFilter],
  );

  const groups = useMemo(() => {
    const out: { day: string; items: TimelineEvent[] }[] = [];
    for (const e of filtered) {
      const day = dayHeading(e.created_at);
      const last = out[out.length - 1];
      if (last && last.day === day) last.items.push(e);
      else out.push({ day, items: [e] });
    }
    return out;
  }, [filtered]);

  return (
    <div className="min-h-screen bg-secondary/60">
      <header className="border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
          </Link>
          <span className="font-serif text-sm font-bold">Learning Timeline</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
        <DemoBanner />

        <div className="border border-border bg-card p-4">
          <h1 className="font-serif text-2xl font-bold">Every event, every mastery change</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The immutable learning log with the before/after mastery each event produced. This is
            the evidence trail behind every recommendation.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <select
              value={conceptFilter}
              onChange={(e) => setConceptFilter(e.target.value)}
              className="border border-border bg-background px-3 py-1.5 text-xs"
            >
              <option value="all">All concepts</option>
              {data.concepts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value)}
              className="border border-border bg-background px-3 py-1.5 text-xs"
            >
              <option value="all">All event types</option>
              <option value="quiz_answer">Quiz answers</option>
              <option value="lesson_view">Lessons</option>
              <option value="assignment_submit">Assignments</option>
            </select>
            <span className="self-center font-mono text-[11px] text-muted-foreground">
              {filtered.length} of {data.total} events
            </span>
          </div>
        </div>

        {conceptFilter !== "all" && (data.trajectories[conceptFilter]?.length ?? 0) > 1 && (
          <div className="border border-border bg-card p-4">
            <div className="ink-caps text-muted-foreground">Mastery trajectory</div>
            <Sparkline values={data.trajectories[conceptFilter]!} />
          </div>
        )}

        {groups.length === 0 ? (
          <div className="border border-border bg-card p-10 text-center">
            <h2 className="font-serif text-xl font-bold">No events yet</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              Take the placement diagnostic to seed your memory model — every answer from then on
              lands here with its mastery delta.
            </p>
            <Link
              to="/placement"
              className="mt-4 inline-flex bg-primary px-4 py-2 text-xs font-medium uppercase tracking-widest text-primary-foreground hover:bg-foreground"
            >
              Start placement
            </Link>
          </div>
        ) : (
          groups.map((g) => (
            <section key={g.day} className="border border-border bg-card">
              <div className="border-b border-border px-4 py-2.5">
                <span className="ink-caps text-muted-foreground">{g.day}</span>
              </div>
              <ol className="divide-y divide-border">
                {g.items.map((e) => (
                  <EventRow key={e.id} event={e} />
                ))}
              </ol>
            </section>
          ))
        )}
      </main>
    </div>
  );
}

function EventRow({ event: e }: { event: TimelineEvent }) {
  const delta =
    e.pre_mastery !== null && e.post_mastery !== null ? e.post_mastery - e.pre_mastery : null;
  const Icon =
    e.event_kind === "lesson_view" ? BookOpen : e.event_kind === "assignment_submit" ? FileText : e.is_correct ? Check : X;
  const tone =
    e.event_kind !== "quiz_answer"
      ? "text-muted-foreground"
      : e.is_correct
        ? "text-primary"
        : "text-destructive";

  return (
    <li className="flex gap-3 px-4 py-3">
      <div className="flex flex-col items-center pt-0.5">
        <span className={"flex h-6 w-6 items-center justify-center rounded-full bg-secondary " + tone}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="mt-1 w-px flex-1 bg-border" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
          <span className="font-medium">
            {KIND_LABEL[e.event_kind] ?? "Event"}
            {e.question_label ? ` ${e.question_label}` : ""}
          </span>
          <Link
            to="/concept/$id"
            params={{ id: e.concept_id }}
            className="text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
          >
            {e.concept_name}
          </Link>
          {e.event_kind === "quiz_answer" && (
            <span className={tone + " text-xs font-medium uppercase tracking-widest"}>
              {e.is_correct ? "Correct" : "Incorrect"}
            </span>
          )}
          <span className="ml-auto font-mono text-[11px] text-muted-foreground">
            {new Date(e.created_at).toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {e.question_text && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{e.question_text}</p>
        )}

        {delta !== null && e.pre_mastery !== null && e.post_mastery !== null ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-2 font-mono text-xs">
            <span className="text-muted-foreground">Mastery</span>
            <span>{Math.round(e.pre_mastery * 100)}%</span>
            <span className="text-muted-foreground">→</span>
            <span className="font-semibold">{Math.round(e.post_mastery * 100)}%</span>
            <span
              className={
                "inline-flex items-center gap-1 " +
                (delta >= 0 ? "text-primary" : "text-destructive")
              }
            >
              {delta >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {delta >= 0 ? "+" : ""}
              {Math.round(delta * 100)}
            </span>
            <MasteryBar pre={e.pre_mastery} post={e.post_mastery} />
          </div>
        ) : (
          <div className="mt-1 font-mono text-[11px] text-muted-foreground">
            No mastery change recorded
          </div>
        )}

        <div className="mt-1 font-mono text-[11px] text-muted-foreground">
          difficulty {e.difficulty.toFixed(2)}
          {e.response_time_ms > 0 ? ` · ${(e.response_time_ms / 1000).toFixed(1)}s` : ""}
        </div>
      </div>
    </li>
  );
}

function MasteryBar({ pre, post }: { pre: number; post: number }) {
  const lo = Math.min(pre, post);
  const hi = Math.max(pre, post);
  const up = post >= pre;
  return (
    <span className="relative h-1.5 w-24 overflow-hidden bg-muted">
      <span
        className="absolute inset-y-0 bg-foreground/25"
        style={{ left: 0, width: `${lo * 100}%` }}
      />
      <span
        className={"absolute inset-y-0 " + (up ? "bg-primary" : "bg-destructive")}
        style={{ left: `${lo * 100}%`, width: `${(hi - lo) * 100}%` }}
      />
    </span>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const w = 640;
  const h = 60;
  const pts = values
    .map((v, i) => `${(i / Math.max(1, values.length - 1)) * w},${h - v * h}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 h-16 w-full" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke="var(--primary)" strokeWidth={2} />
    </svg>
  );
}