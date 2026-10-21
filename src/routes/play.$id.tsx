import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState } from "react";
import { ArrowLeft, Brain, Check, X, RotateCcw, Trophy, Zap, Timer } from "lucide-react";
import {
  getActivitySet,
  type ActivityItem,
  type ClozePayload,
  type FlashcardPayload,
  type MatchPayload,
} from "@/lib/activities.functions";
import { submitEvent } from "@/lib/memorytwin.functions";

const setQuery = (id: string) =>
  queryOptions({
    queryKey: ["activity-set", id],
    queryFn: () => getActivitySet({ data: { concept_id: id } }),
    staleTime: 0,
  });

export const Route = createFileRoute("/play/$id")({
  ssr: false,
  loader: ({ context, params }) => context.queryClient.ensureQueryData(setQuery(params.id)),
  component: PlayPage,
  errorComponent: ({ error }: { error: Error }) => (
    <div className="p-10 text-sm text-destructive">Practice failed: {error.message}</div>
  ),
  head: () => ({ meta: [{ title: "Practice arcade — MemoryTwin AI" }] }),
});

type Mode = "flashcard" | "cloze" | "match";

const MODES: { key: Mode; label: string; blurb: string }[] = [
  { key: "flashcard", label: "Recall cards", blurb: "Flip, then say whether you knew it." },
  { key: "cloze", label: "Fill the blank", blurb: "One word missing. Pick the right one." },
  {
    key: "match",
    label: "Match pairs",
    blurb: "Pair each term with its meaning, against the clock.",
  },
];

function Pill({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "good" | "bad";
}) {
  const cls =
    tone === "good"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : tone === "bad"
        ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
        : "bg-muted text-muted-foreground";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>{children}</span>
  );
}

function PlayPage() {
  const { id } = Route.useParams();
  const { data: set } = useSuspenseQuery(setQuery(id));
  const qc = useQueryClient();
  const send = useServerFn(submitEvent);

  const [mode, setMode] = useState<Mode>("flashcard");
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState({ right: 0, wrong: 0, streak: 0, best: 0 });
  const [done, setDone] = useState(false);
  const shownAt = useRef(Date.now());

  const items: ActivityItem[] =
    mode === "flashcard" ? set.flashcards : mode === "cloze" ? set.cloze : set.match;
  const current = items[index];

  // Match mode state
  const matchPairs = useMemo(() => {
    if (mode !== "match" || !current) return [];
    return (current.payload as MatchPayload).pairs;
  }, [mode, current]);
  const [shuffled, setShuffled] = useState<string[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const [solved, setSolved] = useState<string[]>([]);

  function startMode(next: Mode) {
    setMode(next);
    setIndex(0);
    setFlipped(false);
    setPicked(null);
    setDone(false);
    setSolved([]);
    setSelectedTerm(null);
    setScore({ right: 0, wrong: 0, streak: 0, best: 0 });
    shownAt.current = Date.now();
    if (next === "match") {
      const first = (set.match[0]?.payload as MatchPayload | undefined)?.pairs ?? [];
      setShuffled([...first.map((p) => p[1])].sort(() => Math.random() - 0.5));
    }
  }

  function record(isCorrect: boolean) {
    setScore((s) => {
      const streak = isCorrect ? s.streak + 1 : 0;
      return {
        right: s.right + (isCorrect ? 1 : 0),
        wrong: s.wrong + (isCorrect ? 0 : 1),
        streak,
        best: Math.max(s.best, streak),
      };
    });
    // Every activity answer is real evidence: it updates the same BKT state the
    // quiz updates, so the knowledge map moves while you play.
    void send({
      data: {
        concept_id: set.concept_id,
        is_correct: isCorrect,
        response_time_ms: Math.min(600_000, Date.now() - shownAt.current),
      },
    }).then(() => {
      void qc.invalidateQueries({ queryKey: ["activity-set", id] });
    });
    shownAt.current = Date.now();
  }

  function next() {
    setFlipped(false);
    setPicked(null);
    if (index + 1 >= items.length) setDone(true);
    else setIndex(index + 1);
  }

  function pickMeaning(meaning: string) {
    if (!selectedTerm) return;
    const pair = matchPairs.find((p) => p[0] === selectedTerm);
    const correct = pair?.[1] === meaning;
    record(correct);
    if (correct) {
      const nextSolved = [...solved, selectedTerm];
      setSolved(nextSolved);
      if (nextSolved.length === matchPairs.length) setDone(true);
    }
    setSelectedTerm(null);
  }

  const total = items.length;
  const accuracy = score.right + score.wrong > 0 ? score.right / (score.right + score.wrong) : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link
            to="/topic/$id"
            params={{ id }}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> {set.concept_name}
          </Link>
          <div className="inline-flex items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Zap className="h-3.5 w-3.5" /> streak {score.streak}
            </span>
            <span className="inline-flex items-center gap-1">
              <Brain className="h-4 w-4 text-primary" /> {Math.round(set.mastery * 100)}%
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 p-6">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {set.chapter_name}
          </p>
          <h1 className="text-xl">Practice arcade</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Three ways to drill {set.concept_name}. Everything you answer here updates your memory
            model, exactly like the quiz does.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {MODES.map((m) => {
            const count =
              m.key === "flashcard"
                ? set.flashcards.length
                : m.key === "cloze"
                  ? set.cloze.length
                  : set.match.length;
            return (
              <button
                key={m.key}
                type="button"
                disabled={count === 0}
                onClick={() => startMode(m.key)}
                className={`rounded-md border px-3 py-2 text-left text-xs disabled:opacity-40 ${
                  mode === m.key ? "border-primary bg-primary/10" : "border-border"
                }`}
              >
                <div className="font-medium">{m.label}</div>
                <div className="text-muted-foreground">{m.blurb}</div>
              </button>
            );
          })}
        </div>

        {total === 0 && (
          <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
            No activities loaded for this topic yet.
          </p>
        )}

        {done && (
          <section className="rounded-lg border border-border bg-card p-6 text-center">
            <Trophy className="mx-auto h-8 w-8 text-primary" />
            <h2 className="mt-2 text-lg">Round complete</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {score.right} right · {score.wrong} wrong
              {accuracy !== null && ` · ${Math.round(accuracy * 100)}% accuracy`} · best streak{" "}
              {score.best}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Mastery for {set.concept_name} is now {Math.round(set.mastery * 100)}%.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => startMode(mode)}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Play again
              </button>
              <Link
                to="/topic/$id"
                params={{ id }}
                className="rounded-md border border-border px-3 py-1.5 text-xs"
              >
                Back to the topic
              </Link>
            </div>
          </section>
        )}

        {!done && current && mode === "flashcard" && (
          <section className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Card {index + 1} of {total}
              </span>
              <Pill>{flipped ? "answer" : "recall it first"}</Pill>
            </div>
            <button
              type="button"
              onClick={() => setFlipped(true)}
              className="mt-4 w-full rounded-lg border border-border p-8 text-center"
            >
              <p className="text-base">{(current.payload as FlashcardPayload).front}</p>
              {flipped ? (
                <>
                  <p className="mt-4 text-lg text-primary">
                    {(current.payload as FlashcardPayload).back}
                  </p>
                  {(current.payload as FlashcardPayload).why && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {(current.payload as FlashcardPayload).why}
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-4 text-xs text-muted-foreground">Tap to flip</p>
              )}
            </button>
            {flipped && (
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    record(false);
                    next();
                  }}
                  className="flex-1 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs"
                >
                  <X className="mr-1 inline h-3.5 w-3.5" /> Didn&rsquo;t know it
                </button>
                <button
                  type="button"
                  onClick={() => {
                    record(true);
                    next();
                  }}
                  className="flex-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs"
                >
                  <Check className="mr-1 inline h-3.5 w-3.5" /> Knew it
                </button>
              </div>
            )}
          </section>
        )}

        {!done && current && mode === "cloze" && (
          <section className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Blank {index + 1} of {total}
              </span>
              <Pill
                tone={
                  picked === null
                    ? "muted"
                    : picked === (current.payload as ClozePayload).answer
                      ? "good"
                      : "bad"
                }
              >
                {picked === null
                  ? "pick one"
                  : picked === (current.payload as ClozePayload).answer
                    ? "correct"
                    : "not quite"}
              </Pill>
            </div>
            <p className="mt-4 text-base leading-relaxed">
              {(current.payload as ClozePayload).text.split("___").map((part, i, arr) => (
                <span key={i}>
                  {part}
                  {i < arr.length - 1 && (
                    <span className="mx-1 inline-block min-w-24 border-b-2 border-dashed border-primary px-2 text-center text-primary">
                      {picked ?? " "}
                    </span>
                  )}
                </span>
              ))}
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {(current.payload as ClozePayload).options.map((opt) => {
                const answer = (current.payload as ClozePayload).answer;
                const state =
                  picked === null
                    ? "idle"
                    : opt === answer
                      ? "right"
                      : opt === picked
                        ? "wrong"
                        : "dim";
                return (
                  <button
                    key={opt}
                    type="button"
                    disabled={picked !== null}
                    onClick={() => {
                      setPicked(opt);
                      record(opt === answer);
                    }}
                    className={`rounded-md border px-3 py-2 text-left text-sm transition ${
                      state === "right"
                        ? "border-emerald-500/50 bg-emerald-500/10"
                        : state === "wrong"
                          ? "border-rose-500/50 bg-rose-500/10"
                          : state === "dim"
                            ? "border-border opacity-50"
                            : "border-border hover:border-primary"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {picked !== null && (
              <button
                type="button"
                onClick={next}
                className="mt-4 w-full rounded-md bg-primary px-3 py-2 text-xs text-primary-foreground"
              >
                {index + 1 >= total ? "Finish" : "Next blank"}
              </button>
            )}
          </section>
        )}

        {!done && mode === "match" && matchPairs.length > 0 && (
          <section className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                <Timer className="mr-1 inline h-3.5 w-3.5" />
                {solved.length} of {matchPairs.length} paired
              </span>
              <Pill>{selectedTerm ? "now pick its meaning" : "pick a term"}</Pill>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                {matchPairs.map(([term]) => (
                  <button
                    key={term}
                    type="button"
                    disabled={solved.includes(term)}
                    onClick={() => setSelectedTerm(term)}
                    className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                      solved.includes(term)
                        ? "border-emerald-500/40 bg-emerald-500/10 opacity-60"
                        : selectedTerm === term
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary"
                    }`}
                  >
                    {term}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                {shuffled.map((meaning) => {
                  const isSolved = matchPairs.some(([t, m]) => m === meaning && solved.includes(t));
                  return (
                    <button
                      key={meaning}
                      type="button"
                      disabled={isSolved || !selectedTerm}
                      onClick={() => pickMeaning(meaning)}
                      className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                        isSolved
                          ? "border-emerald-500/40 bg-emerald-500/10 opacity-60"
                          : "border-border hover:border-primary disabled:opacity-50"
                      }`}
                    >
                      {meaning}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        <p className="text-xs text-muted-foreground">
          Right answers raise mastery and lengthen the review interval; wrong ones shorten it. Open
          the knowledge map after a round to see the node change.
        </p>
      </main>
    </div>
  );
}
