import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Users,
  AlertTriangle,
  Flame,
  Gauge,
  Lightbulb,
  RotateCcw,
  BellRing,
  GraduationCap,
  Link2,
} from "lucide-react";
import { getClassDashboard, type Suggestion } from "@/lib/class.functions";

const dashQuery = (id: string) =>
  queryOptions({
    queryKey: ["class-dashboard", id],
    queryFn: () => getClassDashboard({ data: { class_id: id } }),
    staleTime: 0,
  });

export const Route = createFileRoute("/class/$id")({
  ssr: false,
  loader: ({ context, params }) => context.queryClient.ensureQueryData(dashQuery(params.id)),
  component: ClassPage,
  errorComponent: ({ error }: { error: Error }) => (
    <div className="p-10 text-sm text-destructive">Class failed: {error.message}</div>
  ),
  head: () => ({ meta: [{ title: "Class dashboard — MemoryTwin AI" }] }),
});

const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);

function Bar({ value, tone = "primary" }: { value: number; tone?: "primary" | "warn" }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={tone === "warn" ? "h-full bg-destructive" : "h-full bg-primary"}
        style={{ width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%` }}
      />
    </div>
  );
}

const SUGGESTION_ICON: Record<Suggestion["kind"], React.ComponentType<{ className?: string }>> = {
  reteach: GraduationCap,
  nudge: BellRing,
  review: RotateCcw,
  item: Gauge,
  unblock: Link2,
  advance: Flame,
};

function Sparkline({ data }: { data: { date: string; answers: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.answers));
  return (
    <div className="flex h-12 items-end gap-1">
      {data.map((d) => (
        <div
          key={d.date}
          title={`${d.date}: ${d.answers} answers`}
          className="flex-1 rounded-t bg-primary/70"
          style={{ height: `${Math.max(2, (d.answers / max) * 48)}px` }}
        />
      ))}
    </div>
  );
}

function ClassPage() {
  const { id } = Route.useParams();
  const { data: d } = useSuspenseQuery(dashQuery(id));
  const weakest = d.topics.filter((t) => t.attempts > 0).slice(0, 6);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            to="/classes"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Classes
          </Link>
          <div className="inline-flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-primary" /> {d.class_name}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl">{d.class_name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {d.totals.students} student{d.totals.students === 1 ? "" : "s"} ·{" "}
              {d.totals.answered_7d} answers in the last 7 days · average readiness{" "}
              {pct(d.totals.avg_readiness)}
            </p>
          </div>
          {d.join_code && (
            <div className="rounded-md border border-border px-3 py-2 text-center">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Join code
              </div>
              <div className="font-mono text-lg tracking-widest">{d.join_code}</div>
            </div>
          )}
        </div>

        {d.totals.students === 0 && (
          <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
            No students yet. Share the join code above.
          </p>
        )}

        {d.totals.students > 0 && (
          <>
            {/* what a teacher should do next, derived from the tables below */}
            {d.suggestions.length > 0 && (
              <section className="rounded-lg border border-primary/40 bg-primary/5 p-4">
                <h2 className="inline-flex items-center gap-1.5 text-sm">
                  <Lightbulb className="h-4 w-4 text-primary" /> Suggested next actions
                </h2>
                <ul className="mt-3 space-y-3">
                  {d.suggestions.map((sg, i) => {
                    const Icon = SUGGESTION_ICON[sg.kind];
                    return (
                      <li key={i} className="flex items-start gap-3">
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <div>
                          <p className="text-sm font-medium">{sg.title}</p>
                          <p className="text-xs text-muted-foreground">{sg.detail}</p>
                          {sg.students && (
                            <p className="mt-1 text-xs text-foreground">{sg.students.join(", ")}</p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">
                  Each suggestion comes from the same numbers shown below — nothing here is a guess.
                </p>
              </section>
            )}

            {/* class-level shape: activity and coverage */}
            <section className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-card p-4 sm:col-span-2">
                <h2 className="text-sm">Class activity, last 14 days</h2>
                <div className="mt-3">
                  <Sparkline data={d.activity} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {d.totals.answered_7d} answers in the last 7 days · {d.totals.inactive} student
                  {d.totals.inactive === 1 ? "" : "s"} inactive
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <h2 className="text-sm">Syllabus coverage</h2>
                <p className="mt-2 font-mono text-2xl">
                  {d.coverage.started}/{d.coverage.total}
                </p>
                <p className="text-xs text-muted-foreground">topics the class has started</p>
                <p className="mt-2 font-mono text-lg">{d.coverage.mastered}</p>
                <p className="text-xs text-muted-foreground">
                  mastered by 80% or more of the class
                </p>
              </div>
            </section>
            {/* at-risk students first: the reason a teacher opens this page */}
            <section className="rounded-lg border border-border bg-card p-4">
              <h2 className="inline-flex items-center gap-1.5 text-sm">
                <AlertTriangle className="h-4 w-4 text-destructive" /> Students who need attention
              </h2>
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="pb-1 text-left font-normal">Student</th>
                    <th className="pb-1 text-center font-normal">Readiness</th>
                    <th className="pb-1 text-center font-normal">Mastered</th>
                    <th className="pb-1 text-center font-normal">Fading</th>
                    <th className="pb-1 text-center font-normal">7-day answers</th>
                    <th className="pb-1 text-center font-normal">Accuracy</th>
                    <th className="pb-1 text-left font-normal">Last active</th>
                  </tr>
                </thead>
                <tbody>
                  {d.students.map((s) => (
                    <tr key={s.student_id} className="border-t border-border">
                      <td className="py-2 pr-3">{s.name}</td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <Bar value={s.readiness} tone={s.readiness < 0.4 ? "warn" : "primary"} />
                          <span className="w-9 shrink-0 text-right font-mono text-[11px]">
                            {pct(s.readiness)}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 text-center font-mono text-xs">{s.mastered}</td>
                      <td className="py-2 text-center font-mono text-xs">{s.fading || "—"}</td>
                      <td className="py-2 text-center font-mono text-xs">
                        {s.answered_7d || <span className="text-destructive">0</span>}
                      </td>
                      <td className="py-2 text-center font-mono text-xs">{pct(s.accuracy)}</td>
                      <td className="py-2 text-xs text-muted-foreground">
                        {s.last_active
                          ? new Date(s.last_active).toLocaleDateString("en-IN")
                          : "never"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-muted-foreground">
                Sorted by readiness (mastery weighted by predicted recall), weakest first. A zero in
                the 7-day column means the student has stopped practising.
              </p>
            </section>

            {/* where the class as a whole is struggling */}
            <section className="rounded-lg border border-border bg-card p-4">
              <h2 className="inline-flex items-center gap-1.5 text-sm">
                <Flame className="h-4 w-4 text-primary" /> Topics the class is weakest on
              </h2>
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="pb-1 text-left font-normal">Topic</th>
                    <th className="pb-1 text-left font-normal">Chapter</th>
                    <th className="pb-1 text-center font-normal">Mastered</th>
                    <th className="pb-1 text-center font-normal">Accuracy</th>
                    <th className="pb-1 text-left font-normal">Average mastery</th>
                  </tr>
                </thead>
                <tbody>
                  {weakest.map((t) => (
                    <tr key={t.concept_id} className="border-t border-border">
                      <td className="py-2 pr-3">{t.name}</td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">{t.chapter_name}</td>
                      <td className="py-2 text-center font-mono text-xs">
                        {t.mastered_count}/{d.totals.students}
                      </td>
                      <td className="py-2 text-center font-mono text-xs">{pct(t.accuracy)}</td>
                      <td className="py-2 w-40">
                        <div className="flex items-center gap-2">
                          <Bar value={t.avg_mastery} />
                          <span className="w-9 shrink-0 text-right font-mono text-[11px] text-muted-foreground">
                            {pct(t.avg_mastery)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-muted-foreground">
                Only topics the class has actually attempted this week are listed — teach these
                next.
              </p>
            </section>

            {/* question quality */}
            <section className="rounded-lg border border-border bg-card p-4">
              <h2 className="inline-flex items-center gap-1.5 text-sm">
                <Gauge className="h-4 w-4 text-primary" /> Questions worth reviewing
              </h2>
              {d.items.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  No question has enough attempts yet to judge it.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {d.items.map((q) => (
                    <li
                      key={q.question_id}
                      className="flex items-start gap-3 border-t border-border pt-2"
                    >
                      <span
                        className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] ${
                          q.flag === "too hard"
                            ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                            : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                        }`}
                      >
                        {q.flag}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">{q.question}</p>
                        <p className="text-xs text-muted-foreground">
                          {q.concept_name} · {q.attempts} attempts · {pct(q.accuracy)} correct
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                Flagged after 4 or more attempts: under 30% correct usually means the wording is
                unclear; over 95% means the question is no longer testing anything.
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
