import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Brain, TrendingUp, TrendingDown, Flame, Clock, Target } from "lucide-react";
import { getReportCard, type ChapterReport } from "@/lib/report.functions";
import { DemoBanner } from "@/components/DemoBanner";
import { StageBadge } from "@/components/StageBadge";

const reportQuery = queryOptions({
  queryKey: ["report-card"],
  queryFn: () => getReportCard(),
  staleTime: 0,
});

export const Route = createFileRoute("/report")({
  ssr: false,
  loader: ({ context }) => context.queryClient.ensureQueryData(reportQuery),
  component: ReportPage,
  errorComponent: ({ error }: { error: Error }) => (
    <div className="p-10 text-sm text-destructive">Report failed: {error.message}</div>
  ),
  head: () => ({
    meta: [
      { title: "Report card — MemoryTwin AI" },
      {
        name: "description",
        content: "What you have learned, what is fading, and how ready you are for an exam today.",
      },
    ],
  }),
});

const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);

function Stat({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1 font-mono text-2xl">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

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

function ChapterRow({ c }: { c: ChapterReport }) {
  return (
    <tr className="border-t border-border">
      <td className="py-2 pr-3">{c.name}</td>
      <td className="py-2 pr-3 text-center font-mono text-xs">
        {c.mastered}/{c.topics}
      </td>
      <td className="py-2 pr-3 text-center font-mono text-xs">{c.fading || "—"}</td>
      <td className="py-2 pr-3 text-center font-mono text-xs">{pct(c.accuracy)}</td>
      <td className="py-2 w-32">
        <div className="flex items-center gap-2">
          <Bar value={c.averageMastery} />
          <span className="w-9 shrink-0 text-right font-mono text-[11px] text-muted-foreground">
            {pct(c.averageMastery)}
          </span>
        </div>
      </td>
    </tr>
  );
}

function ReportPage() {
  const { data: r } = useSuspenseQuery(reportQuery);
  const maxDay = Math.max(1, ...r.week.days.map((d) => d.answered));
  const trend = r.week.answered - r.week.previousAnswered;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <div className="inline-flex items-center gap-2 text-sm">
            <Brain className="h-4 w-4 text-primary" /> Report card
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 p-6">
        <DemoBanner />

        <div>
          <h1 className="text-xl">{r.studentName}&rsquo;s learning report</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Generated {new Date(r.generatedAt).toLocaleString("en-IN")} — built from your own answer
            history, not a guess.
          </p>
        </div>

        {/* headline numbers */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            icon={Target}
            label="Exam readiness"
            value={pct(r.examReadiness)}
            sub="mastery x predicted recall, today"
          />
          <Stat
            icon={Brain}
            label="Topics mastered"
            value={`${r.totals.mastered}/${r.totals.topics}`}
            sub={`${r.totals.inProgress} in progress, ${r.totals.notStarted} not started`}
          />
          <Stat
            icon={Flame}
            label="Fading now"
            value={String(r.totals.fading)}
            sub={r.totals.fading > 0 ? "due for a quick review" : "nothing slipping"}
          />
          <Stat
            icon={Clock}
            label="This week"
            value={`${r.week.answered} questions`}
            sub={`${r.week.minutes} min over ${r.week.activeDays} day${r.week.activeDays === 1 ? "" : "s"}`}
          />
        </div>

        {/* week bars */}
        <section className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm">Last 7 days</h2>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              {trend >= 0 ? (
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-destructive" />
              )}
              {trend >= 0 ? "+" : ""}
              {trend} vs the week before
            </span>
          </div>
          <div className="mt-4 flex h-28 items-end gap-2">
            {r.week.days.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <span className="font-mono text-[10px] text-muted-foreground">
                  {d.answered || ""}
                </span>
                <div
                  className="w-full rounded-t bg-primary/80"
                  style={{
                    height: `${(d.answered / maxDay) * 72}px`,
                    minHeight: d.answered ? 4 : 1,
                  }}
                  title={`${d.answered} answered, ${d.correct} correct, ${d.minutes} min`}
                />
                <span className="text-[10px] text-muted-foreground">
                  {new Date(d.date).toLocaleDateString("en-IN", { weekday: "short" })}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Accuracy this week: {pct(r.week.answered ? r.week.correct / r.week.answered : null)} ·
            overall {pct(r.accuracyAll)} · current streak {r.streakDays} day
            {r.streakDays === 1 ? "" : "s"}
          </p>
        </section>

        {/* chapters */}
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm">Chapter by chapter</h2>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="pb-1 text-left font-normal">Chapter</th>
                <th className="pb-1 text-center font-normal">Mastered</th>
                <th className="pb-1 text-center font-normal">Fading</th>
                <th className="pb-1 text-center font-normal">Accuracy</th>
                <th className="pb-1 text-left font-normal">Average mastery</th>
              </tr>
            </thead>
            <tbody>
              {r.chapters.map((c) => (
                <ChapterRow key={c.id} c={c} />
              ))}
            </tbody>
          </table>
          {r.strongest && r.weakest && r.strongest.id !== r.weakest.id && (
            <p className="mt-3 text-xs text-muted-foreground">
              Strongest chapter: <span className="text-foreground">{r.strongest.name}</span> (
              {pct(r.strongest.averageMastery)}). Weakest:{" "}
              <span className="text-foreground">{r.weakest.name}</span> (
              {pct(r.weakest.averageMastery)}) — start there.
            </p>
          )}
        </section>

        {/* at risk */}
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm">Slipping fastest</h2>
          {r.atRisk.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Nothing is fading yet. Answer a few questions and this list fills in.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {r.atRisk.map((t) => (
                <li key={t.id} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        to="/topic/$id"
                        params={{ id: t.id }}
                        className="truncate text-sm hover:text-primary"
                      >
                        {t.name}
                      </Link>
                      <StageBadge stage={t.stage} />
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <Bar value={t.recall} tone="warn" />
                      <span className="w-28 shrink-0 text-right font-mono text-[11px] text-muted-foreground">
                        recall {pct(t.recall)}
                      </span>
                    </div>
                  </div>
                  <span className="w-24 shrink-0 text-right text-[11px] text-muted-foreground">
                    {t.daysSinceReview === null ? "never reviewed" : `${t.daysSinceReview}d ago`}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Recall is predicted from your memory model: R = exp(-days since review / stability).
            Below 70% the topic is queued for review.
          </p>
        </section>
      </main>
    </div>
  );
}
