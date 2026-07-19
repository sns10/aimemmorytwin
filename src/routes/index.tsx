import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Brain, ArrowRight, AlertCircle } from "lucide-react";
import {
  getStudentOverview,
  generateDailyBriefing,
  type ConceptWithState,
} from "@/lib/memorytwin.functions";

const overviewQuery = queryOptions({
  queryKey: ["overview"],
  queryFn: () => getStudentOverview(),
  staleTime: 0,
});

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(overviewQuery),
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
  const briefingFn = useServerFn(generateDailyBriefing);
  const briefingQ = useQuery({
    queryKey: ["briefing"],
    queryFn: () => briefingFn(),
    staleTime: 60_000,
  });

  const dueConcepts = data.concepts
    .filter((c) => new Date(c.state.next_revision_at).getTime() <= Date.now())
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <span className="font-serif text-lg font-semibold">MemoryTwin AI</span>
          </div>
          <span className="text-xs text-muted-foreground">
            Class 10 · Chemistry · Demo
          </span>
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
            <Link
              to="/quiz"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow transition hover:opacity-90"
            >
              Start today's 10-minute session
              <ArrowRight className="h-4 w-4" />
            </Link>
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

        {/* Knowledge grid */}
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
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
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
    </div>
  );
}

// Silence unused import warning when router not needed here.
void useRouter;
