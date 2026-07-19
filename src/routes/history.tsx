import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Brain, BookOpen, CheckCircle2, XCircle, Feather } from "lucide-react";
import { getHistory, type HistoryRow } from "@/lib/course.functions";

const historyQuery = queryOptions({
  queryKey: ["history"],
  queryFn: () => getHistory(),
  staleTime: 0,
});

export const Route = createFileRoute("/history")({
  loader: ({ context }) => context.queryClient.ensureQueryData(historyQuery),
  component: HistoryPage,
  errorComponent: ({ error }: { error: Error }) => (
    <div className="p-10 text-sm text-destructive">History failed: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-10">Not found</div>,
  head: () => ({
    meta: [
      { title: "Activity — MemoryTwin AI" },
      { name: "description", content: "Your full learning timeline: lessons, quizzes, and assignments." },
    ],
  }),
});

function HistoryPage() {
  const { data: rows } = useSuspenseQuery(historyQuery);
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <span className="font-serif text-sm font-semibold">Activity</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="font-serif text-4xl font-semibold">Learning timeline</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every lesson, quiz answer, and assignment — most recent first.
        </p>

        {rows.length === 0 ? (
          <p className="mt-8 text-sm text-muted-foreground">
            No activity yet. Start with a lesson from the course.
          </p>
        ) : (
          <ul className="mt-8 space-y-2">
            {rows.map((r) => (
              <li key={r.id}>
                <Link
                  to="/topic/$id"
                  params={{ id: r.concept_id }}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm transition hover:border-primary/60"
                >
                  <div className="flex items-center gap-3">
                    <EventIcon row={r} />
                    <div>
                      <div className="font-medium">{r.concept_name}</div>
                      <div className="text-xs text-muted-foreground">{eventLabel(r)}</div>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function EventIcon({ row }: { row: HistoryRow }) {
  if (row.event_kind === "lesson_view")
    return <BookOpen className="h-4 w-4 text-muted-foreground" />;
  if (row.event_kind === "assignment_submit")
    return <Feather className="h-4 w-4 text-amber-500" />;
  return row.is_correct ? (
    <CheckCircle2 className="h-4 w-4 text-primary" />
  ) : (
    <XCircle className="h-4 w-4 text-destructive" />
  );
}

function eventLabel(r: HistoryRow): string {
  switch (r.event_kind) {
    case "lesson_view": return "Viewed lesson";
    case "quiz_answer": return r.is_correct ? "Quiz — correct" : "Quiz — incorrect";
    case "assignment_submit": return r.is_correct ? "Assignment passed" : "Assignment attempted";
  }
}