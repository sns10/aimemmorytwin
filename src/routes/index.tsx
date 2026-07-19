import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Brain, ArrowRight, AlertCircle, BookOpen, History } from "lucide-react";
import {
  getStudentOverview,
  generateDailyBriefing,
  type ConceptWithState,
} from "@/lib/memorytwin.functions";
import { getCourseTree } from "@/lib/course.functions";
import { RetentionChart } from "@/components/RetentionChart";
import { StageBadge } from "@/components/StageBadge";
import { nextActionFor, stageBlurb } from "@/lib/stage";

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

  const dueConcepts = data.concepts
    .filter((c) => new Date(c.state.next_revision_at).getTime() <= Date.now())
    .slice(0, 3);

  // Continue-learning pick: earliest unfinished topic in course order.
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <span className="font-serif text-lg font-semibold">MemoryTwin AI</span>
          </div>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link to="/course" className="inline-flex items-center gap-1 hover:text-foreground">
              <BookOpen className="h-4 w-4" /> Course
            </Link>
            <Link to="/history" className="inline-flex items-center gap-1 hover:text-foreground">
              <History className="h-4 w-4" /> Activity
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-sm text-muted-foreground">
          Hi {data.student.name}, welcome back.
        </p>
        <h1 className="mt-1 font-serif text-4xl font-semibold sm:text-5xl">
          Today's plan for your brain
        </h1>

        {/* Briefing card */}
        <section className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">
              Your AI briefing
            </span>
          </div>
          <p className="mt-3 font-serif text-2xl leading-snug text-foreground">
            {briefingQ.isLoading
              ? "Reading your memory twin…"
              : (briefingQ.data?.briefing ?? data.student.daily_briefing ??
                "Let's build your first study session.")}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            {nextTopic && nextAction ? (
              <Link
                to={nextAction.href as "/topic/$id"}
                params={{ id: nextTopic.id }}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow transition hover:opacity-90"
              >
                {nextAction.label}: {nextTopic.name}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                to="/quiz"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow transition hover:opacity-90"
              >
                Start today's session <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            <span className="text-xs text-muted-foreground">
              {data.dueCount > 0
                ? `${data.dueCount} concept${data.dueCount === 1 ? "" : "s"} due for review`
                : "Nothing overdue — great work"}
            </span>
          </div>
          {dueConcepts.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {dueConcepts.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1 rounded-full bg-accent/40 px-3 py-1 text-xs text-accent-foreground"
                >
                  <AlertCircle className="h-3 w-3" />
                  {c.name}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Course progress */}
        <section className="mt-12">
          <div className="flex items-baseline justify-between">
            <div>
              <h2 className="font-serif text-2xl font-semibold">Your course</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Learn → Practice → Apply → Master. Progress is driven by your actual memory, not just checkboxes.
              </p>
            </div>
            <Link to="/course" className="text-sm text-primary hover:underline">
              Open course →
            </Link>
          </div>
          <div className="mt-6 space-y-4">
            {subjects.flatMap((s) => s.chapters).map((ch) => (
              <div key={ch.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-baseline justify-between">
                  <h3 className="font-serif text-lg font-semibold">{ch.name}</h3>
                  <span className="text-xs text-muted-foreground">{Math.round(ch.progress * 100)}%</span>
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.max(3, ch.progress * 100)}%` }}
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {ch.topics.map((t) => (
                    <Link
                      key={t.id}
                      to="/topic/$id"
                      params={{ id: t.id }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs hover:border-primary/60"
                      title={stageBlurb(t.stage)}
                    >
                      {t.name}
                      <StageBadge stage={t.stage} />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Knowledge grid */}
        <section className="mt-12">
          <RetentionChart concepts={data.concepts} />
        </section>

        <section className="mt-12">
          <h2 className="font-serif text-2xl font-semibold">Your knowledge twin</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Live mastery estimated from your quiz history using Bayesian Knowledge
            Tracing and the forgetting curve.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.concepts.map((c) => (
              <ConceptCard key={c.id} concept={c} />
            ))}
          </div>
        </section>

        <footer className="mt-16 border-t border-border pt-6 text-xs text-muted-foreground">
          Anonymous demo student · your responses shape the twin in real time.
        </footer>
      </main>
    </div>
  );
}

function ConceptCard({ concept }: { concept: ConceptWithState }) {
  const pct = Math.round(concept.state.mastery_probability * 100);
  const due = new Date(concept.state.next_revision_at).getTime() <= Date.now();
  const nextDate = new Date(concept.state.next_revision_at);
  return (
    <Link
      to="/concept/$id"
      params={{ id: concept.id }}
      className="block rounded-xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/60 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-serif text-lg font-semibold leading-tight">{concept.name}</h3>
        {due && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
            Due
          </span>
        )}
      </div>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${Math.max(4, pct)}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{pct}% mastered</span>
        <span>
          {due
            ? "Review now"
            : `Next review ${nextDate.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}`}
        </span>
      </div>
    </Link>
  );
}

