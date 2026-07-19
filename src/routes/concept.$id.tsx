import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, XCircle, Brain } from "lucide-react";
import { getConceptDetail } from "@/lib/memorytwin.functions";

const conceptDetailQuery = (id: string) =>
  queryOptions({
    queryKey: ["concept", id],
    queryFn: () => getConceptDetail({ data: { concept_id: id } }),
    staleTime: 0,
  });

export const Route = createFileRoute("/concept/$id")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(conceptDetailQuery(params.id)),
  component: ConceptDetail,
  errorComponent: ({ error }: { error: Error }) => (
    <div className="p-10 text-sm text-destructive">
      Couldn't load concept: {error.message}
    </div>
  ),
  notFoundComponent: () => (
    <div className="p-10 text-sm text-muted-foreground">Concept not found.</div>
  ),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `${loaderData.concept.name} — MemoryTwin`
          : "Concept — MemoryTwin",
      },
      {
        name: "description",
        content:
          "Your memory twin's estimate of mastery, memory stability, and review history for this concept.",
      },
    ],
  }),
});

function ConceptDetail() {
  const { id } = Route.useParams();
  const router = useRouter();
  const { data } = useSuspenseQuery(conceptDetailQuery(id));
  const { concept, state, events } = data;

  const now = Date.now();
  const pct = Math.round(state.mastery_probability * 100);
  const stability = state.memory_stability;
  const last = state.last_reviewed_at ? new Date(state.last_reviewed_at) : null;
  const nextDate = new Date(state.next_revision_at);
  const due = nextDate.getTime() <= now;
  const elapsedDays = last ? (now - last.getTime()) / 86_400_000 : null;
  const R =
    elapsedDays === null
      ? null
      : Math.exp(-elapsedDays / Math.max(0.1, stability));

  const totalAttempts = events.length;
  const totalCorrect = events.filter((e) => e.is_correct).length;
  const accuracy = totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <span className="font-serif text-sm font-semibold">Concept detail</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-xs font-medium uppercase tracking-wide text-primary">
          {concept.subject}
        </p>
        <h1 className="mt-1 font-serif text-4xl font-semibold">{concept.name}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Difficulty {Math.round(concept.difficulty * 100)}% ·{" "}
          {due ? "Due for review now" : `Next review ${nextDate.toLocaleString()}`}
        </p>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <Metric label="Mastery" value={`${pct}%`} hint="Bayesian estimate" />
          <Metric
            label="Memory stability"
            value={`${stability.toFixed(1)}d`}
            hint="Half-life of recall"
          />
          <Metric
            label="Recall now"
            value={R === null ? "—" : `${Math.round(R * 100)}%`}
            hint={
              elapsedDays === null
                ? "Not yet studied"
                : `${elapsedDays.toFixed(1)} days since review`
            }
          />
        </section>

        <section className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-serif text-xl font-semibold">Sample question</h2>
          <p className="mt-2 text-sm text-foreground">{concept.question}</p>
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            {concept.options.map((o, i) => (
              <li key={i} className={i === concept.correct_index ? "text-foreground" : ""}>
                {i === concept.correct_index ? "✓ " : "· "}
                {o}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8">
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-xl font-semibold">Event log</h2>
            <span className="text-xs text-muted-foreground">
              {totalAttempts} attempts · {accuracy}% correct
            </span>
          </div>
          {events.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No attempts yet. Start a session from the dashboard.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border rounded-xl border border-border bg-card">
              {events.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between px-4 py-3 text-sm"
                >
                  <span className="flex items-center gap-2">
                    {e.is_correct ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span className="font-medium">
                      {e.is_correct ? "Correct" : "Missed"}
                    </span>
                    <span className="text-muted-foreground">
                      · {(e.response_time_ms / 1000).toFixed(1)}s
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(e.created_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mt-10">
          <button
            onClick={() => router.invalidate()}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Refresh
          </button>
        </div>
      </main>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-serif text-3xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}