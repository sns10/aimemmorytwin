import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Brain, ChevronRight } from "lucide-react";
import { getCourseTree } from "@/lib/course.functions";
import { StageBadge } from "@/components/StageBadge";
import { nextActionFor, stageBlurb } from "@/lib/stage";

const treeQuery = queryOptions({
  queryKey: ["course-tree"],
  queryFn: () => getCourseTree(),
  staleTime: 0,
});

export const Route = createFileRoute("/course")({
  loader: ({ context }) => context.queryClient.ensureQueryData(treeQuery),
  component: CoursePage,
  errorComponent: ({ error }: { error: Error }) => (
    <div className="p-10 text-sm text-destructive">Course failed: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-10">Not found</div>,
  head: () => ({
    meta: [
      { title: "Course — MemoryTwin AI" },
      { name: "description", content: "Your structured Class 10 Chemistry course from atoms to reactions." },
    ],
  }),
});

function CoursePage() {
  const { data: subjects } = useSuspenseQuery(treeQuery);
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <span className="font-serif text-sm font-semibold">Course</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {subjects.map((subj) => (
          <section key={subj.id} className="mb-14">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <h1 className="font-serif text-4xl font-semibold">{subj.name}</h1>
                {subj.description && (
                  <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subj.description}</p>
                )}
              </div>
              <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                {Math.round(subj.progress * 100)}% mastered
              </span>
            </div>

            <div className="mt-8 space-y-6">
              {subj.chapters.map((ch, idx) => (
                <div
                  key={ch.id}
                  className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
                >
                  <div className="border-b border-border p-6">
                    <div className="flex items-baseline justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-primary">
                          Chapter {idx + 1}
                        </p>
                        <h2 className="mt-1 font-serif text-2xl font-semibold">{ch.name}</h2>
                        {ch.summary && (
                          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                            {ch.summary}
                          </p>
                        )}
                      </div>
                      <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground whitespace-nowrap">
                        {Math.round(ch.progress * 100)}%
                      </span>
                    </div>
                    <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.max(3, ch.progress * 100)}%` }}
                      />
                    </div>
                  </div>
                  <ul className="divide-y divide-border">
                    {ch.topics.map((t) => {
                      const action = nextActionFor(t.stage, t.id);
                      return (
                        <li key={t.id}>
                          <Link
                            to="/topic/$id"
                            params={{ id: t.id }}
                            className="flex items-center justify-between gap-3 px-6 py-4 transition hover:bg-accent/30"
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-serif text-lg font-semibold">{t.name}</h3>
                                <StageBadge stage={t.stage} />
                              </div>
                              <p className="mt-1 truncate text-xs text-muted-foreground">
                                {stageBlurb(t.stage)} · {Math.round(t.mastery * 100)}% mastered
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                              <span className="hidden sm:inline">{action.label}</span>
                              <ChevronRight className="h-4 w-4" />
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <Link
                to="/quiz"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
              >
                Mixed practice session <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}