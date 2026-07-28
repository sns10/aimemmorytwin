import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { ArrowLeft, Check, Flame, X, CalendarClock, Sparkles } from "lucide-react";
import { getReviewQueue, type ReviewItem } from "@/lib/review.functions";
import { submitEvent, explainMisconception } from "@/lib/memorytwin.functions";

const reviewQuery = queryOptions({
  queryKey: ["review-queue"],
  queryFn: () => getReviewQueue(),
  staleTime: 0,
});

export const Route = createFileRoute("/review")({
  loader: ({ context }) => context.queryClient.ensureQueryData(reviewQuery),
  component: ReviewPage,
  head: () => ({
    meta: [
      { title: "Review Queue · MemoryTwin" },
      {
        name: "description",
        content:
          "Your spaced-repetition inbox: concepts due today, ranked by fading memory, with streak tracking.",
      },
      { property: "og:title", content: "Review Queue · MemoryTwin" },
      {
        property: "og:description",
        content: "Concepts due today, ranked by fading memory, with streak tracking.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  errorComponent: ({ error }) => (
    <div className="p-10 text-sm text-destructive">Review queue failed: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-10">Not found</div>,
});

function ReviewPage() {
  const { data } = useSuspenseQuery(reviewQuery);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState<{ correct: number; total: number }>({ correct: 0, total: 0 });

  const item = data.due[index] ?? null;
  const finished = !item;

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
          <span className="font-serif text-sm font-bold">Review Queue</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
        <StreakPanel streak={data.streak} dueCount={data.due.length} />

        {finished ? (
          <div className="border border-border bg-card p-8 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Check className="h-5 w-5 text-primary" />
            </div>
            <h2 className="mt-3 font-serif text-2xl font-bold">
              {done.total > 0 ? "Queue cleared" : "Nothing due right now"}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {done.total > 0
                ? `${done.correct}/${done.total} recalled correctly. Each answer pushed the next review further out.`
                : "Your memory model says every studied concept is still above the retention threshold. Come back when something starts fading."}
            </p>
            <Link
              to="/"
              className="mt-5 inline-flex items-center gap-2 bg-primary px-4 py-2 text-xs font-medium uppercase tracking-widest text-primary-foreground hover:bg-foreground"
            >
              Back to dashboard
            </Link>
          </div>
        ) : (
          <ReviewCard
            key={item.concept_id + index}
            item={item}
            position={index + 1}
            total={data.due.length}
            onNext={(wasCorrect) => {
              setDone((d) => ({ correct: d.correct + (wasCorrect ? 1 : 0), total: d.total + 1 }));
              setIndex((i) => i + 1);
            }}
          />
        )}

        {data.upcoming.length > 0 && (
          <div className="border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
              <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="ink-caps text-muted-foreground">Scheduled next</span>
            </div>
            <div className="divide-y divide-border">
              {data.upcoming.map((u) => (
                <Link
                  key={u.concept_id}
                  to="/concept/$id"
                  params={{ id: u.concept_id }}
                  className="flex items-center justify-between px-4 py-2.5 text-xs hover:bg-secondary/60"
                >
                  <span className="font-medium">{u.concept_name}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    in {relativeDays(u.next_revision_at)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function relativeDays(iso: string): string {
  const d = (new Date(iso).getTime() - Date.now()) / 86_400_000;
  if (d < 1) return "< 1 day";
  if (d < 2) return "1 day";
  return `${Math.round(d)} days`;
}

function StreakPanel({
  streak,
  dueCount,
}: {
  streak: {
    current_streak: number;
    longest_streak: number;
    reviews_today: number;
    active_days_30: number;
    heatmap: { day: string; count: number }[];
  };
  dueCount: number;
}) {
  const max = Math.max(1, ...streak.heatmap.map((h) => h.count));
  return (
    <div className="border border-border bg-card p-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <Flame
            className={
              "h-6 w-6 " + (streak.current_streak > 0 ? "text-primary" : "text-muted-foreground")
            }
          />
          <div>
            <div className="font-serif text-2xl font-bold leading-none">
              {streak.current_streak} day{streak.current_streak === 1 ? "" : "s"}
            </div>
            <div className="ink-caps mt-1 text-muted-foreground">Current streak</div>
          </div>
        </div>
        <Stat label="Due now" value={String(dueCount)} />
        <Stat label="Answered today" value={String(streak.reviews_today)} />
        <Stat label="Longest" value={`${streak.longest_streak}d`} />
        <Stat label="Active / 30d" value={`${streak.active_days_30}`} />
      </div>
      <div className="mt-4 flex items-end gap-[3px]">
        {streak.heatmap.map((h) => (
          <div
            key={h.day}
            title={`${h.day}: ${h.count} answers`}
            className="h-6 flex-1 bg-muted"
            style={
              h.count > 0
                ? { backgroundColor: "hsl(var(--primary))", opacity: 0.25 + 0.75 * (h.count / max) }
                : undefined
            }
          />
        ))}
      </div>
      <div className="ink-caps mt-1.5 text-muted-foreground">Last 30 days</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-lg font-semibold leading-none">{value}</div>
      <div className="ink-caps mt-1 text-muted-foreground">{label}</div>
    </div>
  );
}

function ReviewCard({
  item,
  position,
  total,
  onNext,
}: {
  item: ReviewItem;
  position: number;
  total: number;
  onNext: (wasCorrect: boolean) => void;
}) {
  const submit = useServerFn(submitEvent);
  const explain = useServerFn(explainMisconception);
  const queryClient = useQueryClient();
  const router = useRouter();
  const [picked, setPicked] = useState<number | null>(null);
  const [result, setResult] = useState<{
    correct: boolean;
    next_revision_at: string;
    mastery: number;
  } | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const startedAt = useMemo(() => Date.now(), [item.concept_id]);

  async function answer(i: number) {
    if (result || busy) return;
    setBusy(true);
    setPicked(i);
    const correct = i === item.correct_index;
    try {
      const res = await submit({
        data: {
          concept_id: item.concept_id,
          is_correct: correct,
          response_time_ms: Math.min(600_000, Date.now() - startedAt),
          ...(item.question_id ? { question_id: item.question_id } : {}),
        },
      });
      setResult({
        correct,
        next_revision_at: res.next_revision_at,
        mastery: res.mastery_probability,
      });
      void queryClient.invalidateQueries({ queryKey: ["overview"] });
      void queryClient.invalidateQueries({ queryKey: ["course-tree"] });
      if (!correct) {
        explain({
          data: {
            concept_id: item.concept_id,
            chosen_index: i,
            ...(item.question_id ? { question_id: item.question_id } : {}),
          },
        })
          .then((r) => setExplanation(r.explanation))
          .catch(() => {});
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
        <div>
          <div className="ink-caps text-muted-foreground">
            Card {position} of {total} · {item.subject}
          </div>
          <div className="mt-0.5 font-serif text-lg font-semibold">{item.concept_name}</div>
        </div>
        <div className="flex items-center gap-4 text-right">
          <Metric label="Recall" value={`${Math.round(item.retrievability * 100)}%`} danger={item.retrievability < 0.5} />
          <Metric label="Mastery" value={`${Math.round(item.mastery * 100)}%`} />
          <Metric label="Stability" value={`${item.stability.toFixed(1)}d`} />
          <Metric
            label="Overdue"
            value={item.overdue_days >= 1 ? `${Math.round(item.overdue_days)}d` : "due"}
            danger={item.overdue_days >= 1}
          />
        </div>
      </div>

      <div className="p-5">
        <p className="font-serif text-xl leading-snug">{item.question}</p>
        <div className="mt-4 grid gap-2">
          {item.options.map((opt, i) => {
            const isCorrect = i === item.correct_index;
            const isPicked = i === picked;
            const cls = !result
              ? "border-border hover:border-foreground/50"
              : isCorrect
                ? "border-primary bg-primary/5"
                : isPicked
                  ? "border-destructive bg-destructive/5"
                  : "border-border opacity-60";
            return (
              <button
                key={i}
                disabled={!!result || busy}
                onClick={() => void answer(i)}
                className={"flex items-center justify-between border px-4 py-3 text-left text-sm transition " + cls}
              >
                <span>{opt}</span>
                {result && isCorrect && <Check className="h-4 w-4 text-primary" />}
                {result && isPicked && !isCorrect && <X className="h-4 w-4 text-destructive" />}
              </button>
            );
          })}
        </div>

        {result && (
          <div className="mt-4 space-y-3">
            <div className="border-l-2 border-primary bg-secondary/60 px-4 py-3 text-sm">
              <span className="font-medium">
                {result.correct ? "Recalled." : "Missed."}
              </span>{" "}
              Mastery now {Math.round(result.mastery * 100)}% · next review{" "}
              {relativeDays(result.next_revision_at)}.
            </div>
            {!result.correct && (
              <div className="border border-border bg-card px-4 py-3 text-sm">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="ink-caps text-primary">Why you missed it</span>
                </div>
                <p className="mt-2 leading-relaxed text-muted-foreground">
                  {explanation ?? "Reading your answer…"}
                </p>
              </div>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  void router.invalidate();
                  onNext(result.correct);
                }}
                className="bg-primary px-4 py-2 text-xs font-medium uppercase tracking-widest text-primary-foreground hover:bg-foreground"
              >
                {position < total ? "Next card" : "Finish"}
              </button>
              <Link
                to="/concept/$id"
                params={{ id: item.concept_id }}
                className="text-xs font-medium uppercase tracking-widest text-muted-foreground hover:text-primary"
              >
                Concept detail
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div>
      <div className={"font-mono text-sm font-semibold " + (danger ? "text-destructive" : "")}>
        {value}
      </div>
      <div className="ink-caps text-muted-foreground">{label}</div>
    </div>
  );
}
