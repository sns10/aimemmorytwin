import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Sparkles, ArrowRight, BookOpen, History, ChevronRight } from "lucide-react";
import {
  getStudentOverview,
  generateDailyBriefing,
} from "@/lib/memorytwin.functions";
import { getCourseTree } from "@/lib/course.functions";
import { BrainVisualization } from "@/components/BrainVisualization";
import { RetentionChart } from "@/components/RetentionChart";
import { StudyPlan } from "@/components/StudyPlan";
import { nextActionFor } from "@/lib/stage";

const overviewQuery = queryOptions({
  queryKey: ["overview"],
  queryFn: () => getStudentOverview(),
  staleTime: 0,
});

const courseQuery = queryOptions({
  queryKey: ["course-tree"],
  queryFn: () => getCourseTree(),
  staleTime: 0,
});

export const Route = createFileRoute("/")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(overviewQuery);
    context.queryClient.ensureQueryData(courseQuery);
  },
  component: Dashboard,
  errorComponent: ErrBoundary,
  notFoundComponent: () => <div className="p-10">Not found</div>,
});

function ErrBoundary({ error }: { error: Error }) {
  return (
    <div className="p-10 text-sm text-destructive">
      Something went wrong: {error.message}
    </div>
  );
}

function Dashboard() {
  const { data } = useSuspenseQuery(overviewQuery);
  const { data: subjects } = useSuspenseQuery(courseQuery);
  const briefingFn = useServerFn(generateDailyBriefing);
  const briefingQ = useQuery({
    queryKey: ["briefing"],
    queryFn: () => briefingFn(),
    staleTime: 60_000,
  });
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [today, setToday] = useState<string>("");
  const [greet, setGreet] = useState<string>("hi");
  useEffect(() => {
    setToday(new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" }));
    const h = new Date().getHours();
    setGreet(h < 5 ? "night" : h < 12 ? "morning" : h < 18 ? "afternoon" : "evening");
  }, []);

  const allTopics = subjects.flatMap((s) => s.chapters.flatMap((c) => c.topics));
  const priority: Record<string, number> = {
    review: 0, learn: 1, practice: 2, apply: 3, master: 9,
  };
  const nextTopic = [...allTopics].sort(
    (a, b) =>
      (priority[a.stage] - priority[b.stage]) ||
      (a.sort_order - b.sort_order),
  )[0];
  const nextAction = nextTopic ? nextActionFor(nextTopic.stage, nextTopic.id) : null;

  const now = Date.now();
  const atRisk = data.concepts
    .map((c) => {
      const last = c.state.last_reviewed_at ? new Date(c.state.last_reviewed_at).getTime() : null;
      const days = last ? Math.max(0, (now - last) / 86400000) : 0;
      const R = last ? Math.exp(-days / Math.max(0.25, c.state.memory_stability)) : 0.5;
      return { c, R };
    })
    .sort((a, b) => a.R - b.R)
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-secondary/60">
      <header className="border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-8 py-4">
          <div className="flex items-baseline gap-3">
            <span className="font-serif text-lg font-bold tracking-tight">MemoryTwin</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Cognitive Instrument · v4.2
            </span>
          </div>
          <nav className="flex items-center gap-6 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            <Link to="/course" className="inline-flex items-center gap-1.5 hover:text-primary">
              <BookOpen className="h-3.5 w-3.5" /> Course
            </Link>
            <Link to="/history" className="inline-flex items-center gap-1.5 hover:text-primary">
              <History className="h-3.5 w-3.5" /> Activity
            </Link>
            <span className="rounded-sm border border-border bg-background px-2 py-1 text-primary">
              {data.student.name}
            </span>
          </nav>
        </div>
      </header>

      {/* Split-screen instrument: brain | briefing + plan */}
      <main className="mx-auto max-w-[1400px] p-4 sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          {/* LEFT — 3D brain instrument */}
          <section className="relative min-h-[560px] overflow-hidden rounded-sm border border-border bg-card shadow-sm lg:h-[calc(100vh-6.5rem)]">
            <BrainVisualization
              concepts={data.concepts}
              activeId={hoverId}
              onHover={setHoverId}
            />
          </section>

          {/* RIGHT — briefing, plan */}
          <section className="flex flex-col gap-4 lg:h-[calc(100vh-6.5rem)] lg:overflow-y-auto lg:pr-1">
            <div>
              <div className="ink-caps text-muted-foreground">Daily Synapse{today ? ` · ${today}` : ""}</div>
              <h1 className="mt-1.5 font-serif text-3xl font-bold leading-tight sm:text-4xl">
                Good {greet}, {data.student.name.split(" ")[0]}.
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {data.dueCount > 0
                  ? `${data.dueCount} concept${data.dueCount === 1 ? "" : "s"} slipping — plan below.`
                  : "Memory looks stable across the board."}
              </p>
            </div>

            {/* AI Briefing */}
            <div className="relative border-l-2 border-primary bg-card p-5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="ink-caps text-primary">Twin Briefing</span>
              </div>
              <p className="mt-3 text-sm italic leading-relaxed text-foreground">
                “{briefingQ.isLoading
                  ? "Reading your memory twin…"
                  : (briefingQ.data?.briefing ?? data.student.daily_briefing ??
                    "Let's build your first study session.")}”
              </p>
              <div className="mt-4 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="ink-caps text-muted-foreground">BKT · FSRS · Protocol v4.2</span>
              </div>
            </div>

            {/* Primary CTA */}
            {nextTopic && nextAction && (
              <Link
                to={nextAction.href as "/topic/$id"}
                params={{ id: nextTopic.id }}
                className="group flex items-center justify-between border border-border bg-primary px-5 py-4 text-primary-foreground transition hover:bg-foreground"
              >
                <div>
                  <div className="ink-caps text-primary-foreground/70">Continue · {nextAction.label}</div>
                  <div className="mt-1 font-serif text-lg font-semibold">{nextTopic.name}</div>
                </div>
                <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
              </Link>
            )}

            {/* At-risk concepts (hover-syncs with brain) */}
            {atRisk.length > 0 && (
              <div>
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="ink-caps text-muted-foreground">Fading fastest</span>
                  <span className="text-[10px] text-muted-foreground">hover to locate on brain</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {atRisk.map(({ c, R }) => (
                    <Link
                      key={c.id}
                      to="/concept/$id"
                      params={{ id: c.id }}
                      onMouseEnter={() => setHoverId(c.id)}
                      onMouseLeave={() => setHoverId(null)}
                      className={
                        "flex items-center justify-between border bg-card px-3 py-2 text-xs transition " +
                        (hoverId === c.id
                          ? "border-primary shadow-sm"
                          : "border-border hover:border-foreground/40")
                      }
                    >
                      <span className="truncate font-medium">{c.name}</span>
                      <span className={"ml-2 shrink-0 font-mono " + (R < 0.5 ? "text-destructive" : "text-muted-foreground")}>
                        {Math.round(R * 100)}%
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Study plan lanes — compact */}
            <StudyPlan subjects={subjects} />

            {/* Course quick nav */}
            <div className="border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <span className="ink-caps text-muted-foreground">Course</span>
                <Link to="/course" className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-widest text-primary hover:underline">
                  Open <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="divide-y divide-border">
                {subjects.flatMap((s) => s.chapters).map((ch) => (
                  <div key={ch.id} className="px-4 py-3">
                    <div className="flex items-baseline justify-between">
                      <span className="font-serif text-sm font-semibold">{ch.name}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{Math.round(ch.progress * 100)}%</span>
                    </div>
                    <div className="mt-1.5 h-[3px] w-full overflow-hidden bg-muted">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${Math.max(2, ch.progress * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Retention chart, tucked at the bottom */}
            <div className="border border-border bg-card p-4">
              <RetentionChart concepts={data.concepts} />
            </div>

            <footer className="pb-6 pt-2 text-[10px] uppercase tracking-widest text-muted-foreground">
              Anonymous demo · responses reshape the twin in real time.
            </footer>
          </section>
        </div>
      </main>
    </div>
  );
}


