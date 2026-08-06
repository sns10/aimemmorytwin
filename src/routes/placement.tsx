import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { getPlacementSet, submitPlacement } from "@/lib/placement.functions";
import { pickQuestionIndex, difficultyFitLabel } from "@/lib/adaptive";

export const Route = createFileRoute("/placement")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Placement check — MemoryTwin AI" },
      {
        name: "description",
        content:
          "A short adaptive placement check that seeds your MemoryTwin memory model with real Bayesian mastery estimates before you start studying.",
      },
      { property: "og:title", content: "Placement check — MemoryTwin AI" },
      {
        property: "og:description",
        content:
          "Answer a few adaptive questions so MemoryTwin can seed your memory model with real mastery estimates.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlacementPage,
  errorComponent: ({ error }) => (
    <div className="p-10 text-sm text-destructive">Something went wrong: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-10">Not found</div>,
});

interface Answer {
  concept_id: string;
  question_id: string;
  is_correct: boolean;
  difficulty: number;
  response_time_ms: number;
}

function PlacementPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const submit = useServerFn(submitPlacement);
  const { data, isLoading } = useQuery({
    queryKey: ["placement-set"],
    queryFn: () => getPlacementSet(),
    staleTime: 60_000,
  });

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [choice, setChoice] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const shownAt = useRef<number>(Date.now());

  const steps = data?.steps ?? [];
  // Running ability estimate drives which item difficulty we serve next.
  const ability = useMemo(() => {
    if (answers.length === 0) return 0.45;
    const correct = answers.filter((a) => a.is_correct).length;
    return Math.min(0.95, Math.max(0.05, correct / answers.length));
  }, [answers]);

  const current = steps[step];
  const question = useMemo(() => {
    if (!current) return null;
    const bank = current.candidates.map((c, i) => ({ difficulty: c.difficulty, sort_order: i }));
    return current.candidates[pickQuestionIndex(bank, ability, [])] ?? current.candidates[0];
  }, [current, ability]);

  async function finish(all: Answer[], skipped: boolean) {
    setBusy(true);
    try {
      await submit({ data: { answers: all, skipped } });
      await qc.invalidateQueries();
      navigate({ to: "/", replace: true });
    } finally {
      setBusy(false);
    }
  }

  function next() {
    if (choice === null || !current || !question) return;
    const answer: Answer = {
      concept_id: current.concept_id,
      question_id: question.question_id,
      is_correct: choice === question.correct_index,
      difficulty: question.difficulty,
      response_time_ms: Math.min(3_600_000, Date.now() - shownAt.current),
    };
    const all = [...answers, answer];
    setAnswers(all);
    setChoice(null);
    shownAt.current = Date.now();
    if (step + 1 >= steps.length) void finish(all, false);
    else setStep(step + 1);
  }

  if (isLoading) {
    return <div className="p-10 font-mono text-xs text-muted-foreground">Preparing your placement check…</div>;
  }

  if (data?.isDemo) {
    return (
      <div className="mx-auto max-w-xl p-10 text-sm">
        <h1 className="font-serif text-2xl font-bold">Placement is for signed-in learners</h1>
        <p className="mt-3 text-muted-foreground">
          The demo learner already has a seeded memory model. Sign in to build your own.
        </p>
        <button
          onClick={() => navigate({ to: "/auth" })}
          className="mt-6 rounded-md bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-primary-foreground"
        >
          Sign in
        </button>
      </div>
    );
  }

  if (!current || !question) {
    return (
      <div className="mx-auto max-w-xl p-10 text-sm">
        <p className="text-muted-foreground">No placement questions available.</p>
        <button
          onClick={() => void finish([], true)}
          className="mt-6 rounded-md bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-primary-foreground"
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/60 py-14">
      <main className="mx-auto max-w-2xl px-6">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Placement check · {step + 1} of {steps.length}
        </div>
        <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight">
          Let's find your starting point
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A few adaptive questions — one per chapter. Every answer runs through the same
          Bayesian model the app uses later, so your memory map starts from evidence
          instead of a flat guess.
        </p>

        <div className="mt-8 rounded-2xl border border-border bg-background p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>
              {current.chapter_name} · {current.concept_name}
            </span>
            <span className="rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-primary">
              {difficultyFitLabel(question.difficulty, ability)}
            </span>
          </div>
          <p className="mt-4 text-base font-medium">{question.question}</p>
          <div className="mt-4 grid gap-2">
            {question.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => setChoice(i)}
                className={`rounded-lg border px-4 py-3 text-left text-sm transition ${
                  choice === i
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/40 hover:bg-accent"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => void finish(answers, answers.length === 0)}
              disabled={busy}
              className="text-xs font-medium uppercase tracking-widest text-muted-foreground hover:text-primary disabled:opacity-50"
            >
              Skip placement
            </button>
            <button
              onClick={next}
              disabled={choice === null || busy}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-primary-foreground disabled:opacity-40"
            >
              {step + 1 >= steps.length ? "Finish" : "Next"}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Skipping seeds every topic at its Bayesian prior instead.
        </p>
      </main>
    </div>
  );
}