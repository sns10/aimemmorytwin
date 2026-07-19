import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, XCircle, Brain, Sparkles } from "lucide-react";
import {
  getRecommendations,
  submitEvent,
  explainMisconception,
  type ConceptWithState,
} from "@/lib/memorytwin.functions";

const recsQuery = queryOptions({
  queryKey: ["recommendations"],
  queryFn: () => getRecommendations(),
  staleTime: 0,
});

export const Route = createFileRoute("/quiz")({
  loader: ({ context }) => context.queryClient.ensureQueryData(recsQuery),
  component: Quiz,
  errorComponent: ({ error }: { error: Error }) => (
    <div className="p-10 text-sm text-destructive">Quiz failed: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-10">Not found</div>,
  head: () => ({
    meta: [
      { title: "Today's Session — MemoryTwin AI" },
      {
        name: "description",
        content: "A quick memory-personalized quiz session tuned to your forgetting curve.",
      },
    ],
  }),
});

type LocalConcept = ConceptWithState & { _optimisticMastery: number };

function Quiz() {
  const { data: recs } = useSuspenseQuery(recsQuery);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const submit = useServerFn(submitEvent);
  const explain = useServerFn(explainMisconception);

  const questions = useMemo<LocalConcept[]>(
    () => recs.map((c) => ({ ...c, _optimisticMastery: c.state.mastery_probability })),
    [recs],
  );

  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [optimistic, setOptimistic] = useState<number[]>(
    () => questions.map((q) => q.state.mastery_probability),
  );
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);
  const startRef = useRef<number>(Date.now());

  if (questions.length === 0) {
    return (
      <EmptyState
        onBack={() => navigate({ to: "/" })}
      />
    );
  }

  const done = idx >= questions.length;
  if (done) {
    return (
      <Summary
        total={questions.length}
        correct={correctCount}
        onBack={() => {
          queryClient.invalidateQueries({ queryKey: ["overview"] });
          queryClient.invalidateQueries({ queryKey: ["briefing"] });
          navigate({ to: "/" });
        }}
      />
    );
  }

  const q = questions[idx];
  const progressPct = Math.round((idx / questions.length) * 100);

  const onSelect = (choice: number) => {
    if (locked) return;
    setSelected(choice);
    setLocked(true);
    const isCorrect = choice === q.correct_index;
    const elapsed = Date.now() - startRef.current;

    // Optimistic mastery bump
    setOptimistic((prev) => {
      const copy = [...prev];
      copy[idx] = Math.max(0, Math.min(1, copy[idx] + (isCorrect ? 0.05 : -0.05)));
      return copy;
    });
    if (isCorrect) setCorrectCount((c) => c + 1);

    // Fire-and-forget; the twin recalibrates silently.
    submit({
      data: {
        concept_id: q.id,
        is_correct: isCorrect,
        response_time_ms: elapsed,
      },
    }).catch((err) => console.error("submitEvent failed", err));

    if (!isCorrect) {
      setExplaining(true);
      setExplanation(null);
      explain({ data: { concept_id: q.id, chosen_index: choice } })
        .then((r) => setExplanation(r.explanation))
        .catch((err) => {
          console.error("explain failed", err);
          setExplanation("Couldn't fetch an explanation just now.");
        })
        .finally(() => setExplaining(false));
    }
  };

  const next = () => {
    setIdx((i) => i + 1);
    setSelected(null);
    setLocked(false);
    setExplanation(null);
    setExplaining(false);
    startRef.current = Date.now();
  };

  const isCorrect = selected === q.correct_index;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <span className="font-serif text-sm font-semibold">MemoryTwin session</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 pt-4">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Question {idx + 1} of {questions.length} · {q.name}
        </p>
      </div>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <span className="text-xs font-medium uppercase tracking-wide text-primary">
            {q.subject}
          </span>
          <h2 className="mt-2 font-serif text-2xl font-semibold leading-snug sm:text-3xl">
            {q.question}
          </h2>

          <div className="mt-6 space-y-3">
            {q.options.map((opt, i) => {
              const isSel = selected === i;
              const isRight = i === q.correct_index;
              const showState = locked && (isSel || isRight);
              return (
                <button
                  key={i}
                  onClick={() => onSelect(i)}
                  disabled={locked}
                  className={
                    "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition " +
                    (showState
                      ? isRight
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-destructive/40 bg-destructive/10 text-foreground"
                      : "border-border bg-background hover:border-primary/60 hover:bg-accent/30")
                  }
                >
                  <span>{opt}</span>
                  {showState &&
                    (isRight ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : isSel ? (
                      <XCircle className="h-4 w-4 text-destructive" />
                    ) : null)}
                </button>
              );
            })}
          </div>

          {locked && (
            <>
            {!isCorrect && (
              <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="text-[11px] font-medium uppercase tracking-wide">
                    Why you missed it
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-foreground">
                  {explaining
                    ? "Thinking through your answer…"
                    : (explanation ?? "…")}
                </p>
              </div>
            )}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {isCorrect
                  ? "Nice — your memory of this just got more stable."
                  : "Marked as struggling. We'll revisit this one sooner."}
                <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">
                  Mastery {Math.round(optimistic[idx] * 100)}%
                </span>
              </p>
              <button
                onClick={next}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                {idx + 1 === questions.length ? "See summary" : "Next question"}
              </button>
            </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function EmptyState({ onBack }: { onBack: () => void }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
      <Brain className="h-8 w-8 text-primary" />
      <h2 className="mt-4 font-serif text-3xl font-semibold">All caught up</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Nothing is fading right now. Come back later — we'll ping you when a
        concept starts slipping.
      </p>
      <button
        onClick={onBack}
        className="mt-6 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
      >
        Back to dashboard
      </button>
    </div>
  );
}

function Summary({
  total,
  correct,
  onBack,
}: {
  total: number;
  correct: number;
  onBack: () => void;
}) {
  const pct = Math.round((correct / total) * 100);
  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
      <Brain className="h-8 w-8 text-primary" />
      <h2 className="mt-4 font-serif text-4xl font-semibold">Session complete</h2>
      <p className="mt-3 text-lg text-muted-foreground">
        You got <span className="font-semibold text-foreground">{correct}/{total}</span>{" "}
        ({pct}%). Your memory twin is being recalibrated.
      </p>
      <button
        onClick={onBack}
        className="mt-8 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
      >
        Back to dashboard
      </button>
    </div>
  );
}