import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  Brain,
  Play,
  BookText,
  Sparkles,
  CheckCircle2,
  XCircle,
  BarChart3,
  BookOpen,
  Dumbbell,
  Feather,
  Trophy,
  Save,
} from "lucide-react";
import {
  getTopicWorkspace,
  markLessonViewed,
  submitAssignment,
  type TopicWorkspace,
} from "@/lib/course.functions";
import {
  submitEvent,
  explainMisconception,
} from "@/lib/memorytwin.functions";
import { StageBadge } from "@/components/StageBadge";
import { stageBlurb } from "@/lib/stage";
import type { QuestionRow } from "@/lib/course.functions";

const workspaceQuery = (id: string) =>
  queryOptions({
    queryKey: ["topic-ws", id],
    queryFn: () => getTopicWorkspace({ data: { topic_id: id } }),
    staleTime: 0,
  });

export const Route = createFileRoute("/topic/$id")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(workspaceQuery(params.id)),
  component: TopicPage,
  errorComponent: ({ error }: { error: Error }) => (
    <div className="p-10 text-sm text-destructive">Topic failed: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-10">Topic not found</div>,
});

type Tab = "learn" | "practice" | "apply";

function TopicPage() {
  const { id } = Route.useParams();
  const { data: ws } = useSuspenseQuery(workspaceQuery(id));
  const qc = useQueryClient();
  const navigate = useNavigate();
  const suggested: Tab =
    ws.stage === "learn"
      ? "learn"
      : ws.stage === "apply" || ws.stage === "master"
        ? "apply"
        : "practice";
  const [tab, setTab] = useState<Tab>(suggested);

  const markViewed = useServerFn(markLessonViewed);

  const onOpenLesson = () => {
    if (!ws.lessons[0]?.viewed) {
      markViewed({ data: { topic_id: id } })
        .then(() => qc.invalidateQueries({ queryKey: ["topic-ws", id] }))
        .catch(console.error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link to="/course" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Course
          </Link>
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <span className="font-serif text-sm font-semibold">Topic</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {ws.topic.subject} · {ws.topic.chapter_name}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-4xl font-semibold">{ws.topic.name}</h1>
          <StageBadge stage={ws.stage} />
        </div>
        {ws.topic.learning_objectives && (
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {ws.topic.learning_objectives}
          </p>
        )}

        {/* Progress rail */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <StatCard label="Mastery" value={`${Math.round(ws.state.mastery * 100)}%`} />
          <StatCard label="Memory stability" value={`${ws.state.stability.toFixed(1)} d`} />
          <StatCard
            label="Best assignment"
            value={
              ws.submissions[0]
                ? `${Math.round(ws.submissions[0].ai_score * 100)}%`
                : "—"
            }
          />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{stageBlurb(ws.stage)}</p>
        {ws.topic.prerequisite_name && (
          <p className="mt-1 text-xs text-muted-foreground">
            Builds on <span className="font-medium text-foreground">{ws.topic.prerequisite_name}</span>.
          </p>
        )}
        {ws.topic.concept_tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {ws.topic.concept_tags.map((t) => (
              <span
                key={t}
                className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Stage checkpoints — independent lanes */}
        <StageCheckpoints ws={ws} active={tab} onPick={setTab} />

        {/* Tabs */}
        <div className="mt-8 flex gap-2 rounded-full border border-border bg-card p-1 text-sm">
          {(["learn", "practice", "apply"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                "flex-1 rounded-full px-3 py-1.5 transition " +
                (tab === t
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              {t === "learn" ? "Learn" : t === "practice" ? "Practice" : "Apply"}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "learn" && (
            <LearnPanel ws={ws} onOpenLesson={onOpenLesson} onDone={() => setTab("practice")} />
          )}
          {tab === "practice" && <PracticePanel ws={ws} topicId={id} />}
          {tab === "apply" && <ApplyPanel ws={ws} topicId={id} />}
        </div>

        <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
          <Save className="h-3.5 w-3.5" />
          You can leave any time — each lane saves independently, so you don't
          have to finish Learn, Practice, and Apply in one go.
        </p>

        <div className="mt-10 border-t border-border pt-6">
          <Link
            to="/concept/$id"
            params={{ id }}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <BarChart3 className="h-4 w-4" /> Full memory stats & event log
          </Link>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-serif text-2xl font-semibold">{value}</div>
    </div>
  );
}

function LearnPanel({
  ws,
  onOpenLesson,
  onDone,
}: {
  ws: TopicWorkspace;
  onOpenLesson: () => void;
  onDone: () => void;
}) {
  return (
    <div className="space-y-6">
      {ws.lessons.map((l) => (
        <div key={l.id} className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {l.kind === "video" ? (
              <Play className="h-3.5 w-3.5" />
            ) : (
              <BookText className="h-3.5 w-3.5" />
            )}
            <span className="uppercase tracking-wide">{l.kind}</span>
            <span>· {l.duration_min} min</span>
          </div>
          <h3 className="mt-2 font-serif text-xl font-semibold">{l.title}</h3>

          {l.kind === "video" && l.url && (
            <div className="mt-4 aspect-video overflow-hidden rounded-xl border border-border">
              <iframe
                src={l.url}
                title={l.title}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                onLoad={onOpenLesson}
              />
            </div>
          )}
          {l.kind !== "video" && l.body && (
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {l.body}
            </p>
          )}
        </div>
      ))}

      <button
        onClick={() => {
          onOpenLesson();
          onDone();
        }}
        className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
      >
        Mark lesson done → Practice
      </button>
    </div>
  );
}

function PracticePanel({
  ws,
  topicId,
}: {
  ws: TopicWorkspace;
  topicId: string;
}) {
  const qc = useQueryClient();
  const submit = useServerFn(submitEvent);
  const explain = useServerFn(explainMisconception);
  const [selected, setSelected] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [qIdx, setQIdx] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const startRef = useRef<number>(Date.now());

  // Prefer the questions bank; fall back to the single concept-level question.
  const bank: QuestionRow[] =
    ws.questions.length > 0
      ? ws.questions
      : [
          {
            id: ws.topic.id,
            question: ws.topic.question,
            options: ws.topic.options,
            correct_index: ws.topic.correct_index,
            difficulty: ws.topic.difficulty,
            tags: [],
            prerequisite_concept_ids: [],
            explanation: null,
            sort_order: 0,
          },
        ];
  const q = bank[qIdx % bank.length];
  const isCorrect = selected === q.correct_index;
  const isFromBank = ws.questions.length > 0;

  const onSelect = (choice: number) => {
    if (locked) return;
    setSelected(choice);
    setLocked(true);
    const correct = choice === q.correct_index;
    const elapsed = Date.now() - startRef.current;
    setAnswered((n) => n + 1);
    if (correct) setCorrectCount((n) => n + 1);
    submit({
      data: {
        concept_id: topicId,
        is_correct: correct,
        response_time_ms: elapsed,
        ...(isFromBank ? { question_id: q.id } : {}),
      },
    })
      .then(() => {
        qc.invalidateQueries({ queryKey: ["topic-ws", topicId] });
        qc.invalidateQueries({ queryKey: ["course-tree"] });
        qc.invalidateQueries({ queryKey: ["overview"] });
      })
      .catch(console.error);
    if (!correct) {
      setExplaining(true);
      explain({ data: { concept_id: topicId, chosen_index: choice } })
        .then((r) => setExplanation(r.explanation))
        .catch(() => setExplanation("Couldn't fetch an explanation just now."))
        .finally(() => setExplaining(false));
    }
  };

  const nextQuestion = () => {
    setSelected(null);
    setLocked(false);
    setExplanation(null);
    startRef.current = Date.now();
    setQIdx((i) => (i + 1) % bank.length);
  };

  const retry = () => {
    setSelected(null);
    setLocked(false);
    setExplanation(null);
    startRef.current = Date.now();
  };

  const difficultyLabel =
    q.difficulty < 0.35 ? "Easy" : q.difficulty < 0.6 ? "Medium" : q.difficulty < 0.8 ? "Hard" : "Expert";
  const difficultyClass =
    q.difficulty < 0.35
      ? "bg-emerald-100 text-emerald-800"
      : q.difficulty < 0.6
        ? "bg-amber-100 text-amber-800"
        : q.difficulty < 0.8
          ? "bg-orange-100 text-orange-800"
          : "bg-rose-100 text-rose-800";

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-primary">
          Practice · {qIdx + 1}/{bank.length}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${difficultyClass}`}
        >
          {difficultyLabel} · {q.difficulty.toFixed(2)}
        </span>
        {q.tags.map((t) => (
          <span
            key={t}
            className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground"
          >
            #{t}
          </span>
        ))}
        {q.prerequisite_concept_ids.length > 0 && (
          <span className="rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[10px] uppercase tracking-wide text-primary">
            needs prerequisite
          </span>
        )}
      </div>
      <h3 className="mt-2 font-serif text-2xl font-semibold leading-snug">{q.question}</h3>
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
                    ? "border-primary bg-primary/10"
                    : "border-destructive/40 bg-destructive/10"
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
        <div className="mt-6 space-y-4">
          {!isCorrect && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                <span className="text-[11px] font-medium uppercase tracking-wide">
                  Why you missed it
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed">
                {explaining ? "Thinking through your answer…" : (explanation ?? "…")}
              </p>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {isCorrect
                ? "Nice — this concept just got more stable."
                : "Marked as struggling. We'll bring it back sooner."}
              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">
                Session {correctCount}/{answered}
              </span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={retry}
                className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Try again
              </button>
              <button
                onClick={nextQuestion}
                className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Next question →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ApplyPanel({
  ws,
  topicId,
}: {
  ws: TopicWorkspace;
  topicId: string;
}) {
  const qc = useQueryClient();
  const submit = useServerFn(submitAssignment);
  const [response, setResponse] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ score: number; feedback: string } | null>(null);

  if (!ws.assignment) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
        No assignment for this topic.
      </div>
    );
  }

  const gated = ws.stage === "learn" || ws.stage === "practice";

  const onSubmit = async () => {
    if (!ws.assignment) return;
    if (response.trim().length < 10) return;
    setBusy(true);
    try {
      const r = await submit({
        data: { assignment_id: ws.assignment.id, response: response.trim() },
      });
      setResult(r);
      qc.invalidateQueries({ queryKey: ["topic-ws", topicId] });
      qc.invalidateQueries({ queryKey: ["course-tree"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <span className="text-[11px] font-medium uppercase tracking-wide text-primary">
          Assignment · AI graded
        </span>
        <h3 className="mt-2 font-serif text-2xl font-semibold">{ws.assignment.title}</h3>
        <p className="mt-2 text-sm leading-relaxed">{ws.assignment.prompt}</p>
        <p className="mt-3 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
          Rubric: {ws.assignment.rubric}
        </p>

        {gated ? (
          <p className="mt-4 rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
            Complete practice to at least 65% mastery before submitting an assignment.
          </p>
        ) : (
          <>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={6}
              placeholder="Write your answer in your own words…"
              className="mt-4 w-full rounded-xl border border-border bg-background p-3 text-sm focus:border-primary focus:outline-none"
            />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {response.trim().length} chars · min 10
              </span>
              <button
                onClick={onSubmit}
                disabled={busy || response.trim().length < 10}
                className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {busy ? "Grading…" : "Submit for AI grading"}
              </button>
            </div>
          </>
        )}
      </div>

      {result && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-4 w-4" />
            <span className="text-[11px] font-medium uppercase tracking-wide">
              AI feedback · {Math.round(result.score * 100)}%
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed">{result.feedback}</p>
        </div>
      )}

      {ws.submissions.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h4 className="font-serif text-lg font-semibold">Past submissions</h4>
          <ul className="mt-4 space-y-4">
            {ws.submissions.map((s) => (
              <li key={s.id} className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{new Date(s.created_at).toLocaleString()}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5">
                    {Math.round(s.ai_score * 100)}%
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm">{s.response}</p>
                {s.ai_feedback && (
                  <p className="mt-2 text-xs italic text-muted-foreground">
                    {s.ai_feedback}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}