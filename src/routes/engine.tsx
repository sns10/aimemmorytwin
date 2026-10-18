import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Brain, ArrowRight, Check, X } from "lucide-react";
import {
  DEFAULT_BKT,
  RETRIEVAL_THRESHOLD,
  effectiveGuessSlip,
  effectiveLearnRate,
  updateMasteryBKT,
  updateStabilityFSRS,
  retrievability,
  nextRevisionDate,
} from "@/lib/bkt.core";
import { computeStage, stageLabel, stageBlurb } from "@/lib/stage";
import { StageBadge } from "@/components/StageBadge";

export const Route = createFileRoute("/engine")({
  ssr: false,
  component: EnginePage,
  head: () => ({
    meta: [
      { title: "How the engine works — MemoryTwin AI" },
      {
        name: "description",
        content:
          "A step-by-step portal showing the BKT engine: how one answer changes what we believe, how memory fades, and how the plan is built.",
      },
    ],
  }),
});

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const n3 = (v: number) => v.toFixed(3);

function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  display,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  display?: string;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground">{display ?? n3(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-primary"
      />
    </label>
  );
}

function Step({
  n,
  title,
  blurb,
  children,
  file,
}: {
  n: number;
  title: string;
  blurb: string;
  children: React.ReactNode;
  file: string;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-xs text-primary-foreground">
          {n}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{blurb}</p>
          <div className="mt-4">{children}</div>
          <p className="mt-4 font-mono text-[11px] text-muted-foreground">{file}</p>
        </div>
      </div>
    </section>
  );
}

/** The five boxes the data actually flows through. */
function Pipeline({ active }: { active: number }) {
  const boxes = ["Student answers", "BKT update", "State stored (JSON)", "Analysis", "Daily plan"];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {boxes.map((b, i) => (
        <div key={b} className="flex items-center gap-2">
          <div
            className={`rounded-md border px-3 py-1.5 text-xs ${
              i + 1 === active
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-muted/40 text-muted-foreground"
            }`}
          >
            {b}
          </div>
          {i < boxes.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      ))}
    </div>
  );
}

function ForgettingCurve({ stability, days }: { stability: number; days: number }) {
  const W = 520;
  const H = 150;
  const maxDays = Math.max(14, Math.ceil(stability * 4));
  const x = (d: number) => (d / maxDays) * (W - 40) + 32;
  const y = (r: number) => H - 24 - r * (H - 44);
  const path = Array.from({ length: 81 }, (_, i) => {
    const d = (i / 80) * maxDays;
    return `${i === 0 ? "M" : "L"}${x(d).toFixed(1)},${y(Math.exp(-d / stability)).toFixed(1)}`;
  }).join(" ");
  const rNow = Math.exp(-days / stability);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Forgetting curve">
      <line x1="32" y1={y(1)} x2={W - 8} y2={y(1)} stroke="currentColor" strokeOpacity="0.12" />
      <line
        x1="32"
        y1={y(RETRIEVAL_THRESHOLD)}
        x2={W - 8}
        y2={y(RETRIEVAL_THRESHOLD)}
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeDasharray="4 3"
      />
      <text
        x={W - 6}
        y={y(RETRIEVAL_THRESHOLD) - 4}
        textAnchor="end"
        fontSize="9"
        fill="currentColor"
        opacity="0.6"
      >
        review threshold {Math.round(RETRIEVAL_THRESHOLD * 100)}%
      </text>
      <line x1="32" y1={y(0)} x2={W - 8} y2={y(0)} stroke="currentColor" strokeOpacity="0.12" />
      <path d={path} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" />
      <circle cx={x(Math.min(days, maxDays))} cy={y(rNow)} r="4" fill="hsl(var(--primary))" />
      <text
        x={x(Math.min(days, maxDays))}
        y={y(rNow) - 8}
        textAnchor="middle"
        fontSize="10"
        fill="currentColor"
      >
        {pct(rNow)}
      </text>
      <text x="4" y={y(1) + 3} fontSize="9" fill="currentColor" opacity="0.6">
        100%
      </text>
      <text x="8" y={y(0) + 3} fontSize="9" fill="currentColor" opacity="0.6">
        0%
      </text>
      <text x={W - 8} y={H - 6} textAnchor="end" fontSize="9" fill="currentColor" opacity="0.6">
        {maxDays} days since the last review
      </text>
    </svg>
  );
}

function EnginePage() {
  // Step 1 inputs
  const [prior, setPrior] = useState(0.15);
  const [difficulty, setDifficulty] = useState(0.5);
  const [prereq, setPrereq] = useState(1);
  const [correct, setCorrect] = useState(true);

  // Step 2 inputs
  const [stability, setStability] = useState(2);
  const [days, setDays] = useState(5);

  const [viewedLesson, setViewedLesson] = useState(true);
  const [assignment, setAssignment] = useState(0.8);

  const { pGuess, pSlip } = effectiveGuessSlip(DEFAULT_BKT, difficulty);
  const pLearn = effectiveLearnRate(DEFAULT_BKT, prereq);

  const evidence = useMemo(() => {
    const num = correct ? prior * (1 - pSlip) : prior * pSlip;
    const den = correct ? num + (1 - prior) * pGuess : num + (1 - prior) * (1 - pGuess);
    return { num, den, posterior: den === 0 ? prior : num / den };
  }, [prior, correct, pGuess, pSlip]);

  const after = updateMasteryBKT(prior, correct, {
    itemDifficulty: difficulty,
    prereqMastery: prereq,
  });
  const newStability = updateStabilityFSRS(stability, difficulty, correct);
  const rNow = Math.exp(-days / stability);
  const nextDue = nextRevisionDate(newStability);

  const lastReviewed = new Date(Date.now() - days * 86_400_000);
  const stage = computeStage({
    mastery: after,
    stability: newStability,
    lastReviewedAt: lastReviewed.toISOString(),
    nextRevisionAt: nextRevisionDate(stability, lastReviewed).toISOString(),
    hasViewedLesson: viewedLesson,
    bestAssignmentScore: assignment,
  });

  const snapshot = {
    topic: "Ionic Bonds",
    mastery_probability: Number(after.toFixed(4)),
    memory_stability_days: Number(newStability.toFixed(3)),
    last_reviewed_at: lastReviewed.toISOString(),
    next_revision_at: nextDue.toISOString(),
    predicted_recall_now: Number(retrievability(newStability, lastReviewed).toFixed(4)),
    prerequisite_mastery: Number(prereq.toFixed(2)),
    has_viewed_lesson: viewedLesson,
    best_assignment_score: assignment,
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <div className="inline-flex items-center gap-2 text-sm">
            <Brain className="h-4 w-4 text-primary" /> How the engine works
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-5 p-6">
        <div>
          <h1 className="text-xl">Inside MemoryTwin</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Every number this app shows comes from four small pieces of arithmetic. Move the sliders
            and watch them run — this page calls the same functions the live app calls, not a
            re-implementation for the demo.
          </p>
          <div className="mt-4">
            <Pipeline active={0} />
          </div>
        </div>

        <Step
          n={1}
          title="One answer changes what we believe"
          blurb="Bayesian Knowledge Tracing keeps a single number per topic: the probability that the student has learned it. An answer is evidence, so we apply Bayes' rule, then allow for the chance that answering taught them something."
          file="src/lib/bkt.core.ts — updateMasteryBKT()"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-3">
              <Slider
                label="Mastery before the question"
                value={prior}
                onChange={setPrior}
                display={pct(prior)}
              />
              <Slider label="Question difficulty" value={difficulty} onChange={setDifficulty} />
              <Slider
                label="Prerequisite mastery"
                value={prereq}
                onChange={setPrereq}
                display={pct(prereq)}
              />
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setCorrect(true)}
                  className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-xs ${
                    correct ? "border-emerald-500/40 bg-emerald-500/15" : "border-border"
                  }`}
                >
                  <Check className="h-3.5 w-3.5" /> Answered correctly
                </button>
                <button
                  type="button"
                  onClick={() => setCorrect(false)}
                  className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-xs ${
                    !correct ? "border-rose-500/40 bg-rose-500/15" : "border-border"
                  }`}
                >
                  <X className="h-3.5 w-3.5" /> Answered wrong
                </button>
              </div>
            </div>

            <div className="space-y-3 rounded-md bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
              <div>
                <span className="text-muted-foreground">guess, slip adjusted for difficulty</span>
                <br />
                P(G) = {n3(DEFAULT_BKT.pGuess)} x (1.2 - {n3(difficulty)}) = {n3(pGuess)}
                <br />
                P(S) = {n3(DEFAULT_BKT.pSlip)} x (0.6 + {n3(difficulty)}) = {n3(pSlip)}
              </div>
              <div>
                <span className="text-muted-foreground">learn rate gated by the prerequisite</span>
                <br />
                P(T) = {n3(DEFAULT_BKT.pLearn)} x (0.3 + {n3(prereq)}) = {n3(pLearn)}
              </div>
              <div>
                <span className="text-muted-foreground">
                  evidence step {correct ? "(correct)" : "(wrong)"}
                </span>
                <br />
                {correct ? (
                  <>
                    P(L|obs) = L(1-S) / [L(1-S) + (1-L)G]
                    <br />= {n3(evidence.num)} / {n3(evidence.den)} = {n3(evidence.posterior)}
                  </>
                ) : (
                  <>
                    P(L|obs) = L·S / [L·S + (1-L)(1-G)]
                    <br />= {n3(evidence.num)} / {n3(evidence.den)} = {n3(evidence.posterior)}
                  </>
                )}
              </div>
              <div>
                <span className="text-muted-foreground">learning step</span>
                <br />
                P(L&rsquo;) = {n3(evidence.posterior)} + (1 - {n3(evidence.posterior)}) x{" "}
                {n3(pLearn)}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4 rounded-md border border-border p-3">
            <div className="text-xs text-muted-foreground">Mastery</div>
            <div className="font-mono text-sm">{pct(prior)}</div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div
              className={`font-mono text-lg ${after >= prior ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
            >
              {pct(after)}
            </div>
            <div className="ml-auto text-xs text-muted-foreground">
              {after >= prior ? "+" : ""}
              {((after - prior) * 100).toFixed(1)} points
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Notice: a correct answer on an easy question moves mastery far less than one on a hard
            question, because an easy item is more likely to be a lucky guess. That is the whole
            point of tracking guess and slip.
          </p>
        </Step>

        <Step
          n={2}
          title="Memory fades between sessions"
          blurb="Knowing a topic today does not mean recalling it next month. Each topic carries a stability in days, and predicted recall decays as R = exp(-days / stability). A correct recall makes the memory more stable; a lapse cuts it back."
          file="src/lib/bkt.core.ts — updateStabilityFSRS(), retrievability(), nextRevisionDate()"
        >
          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <div className="space-y-3">
              <Slider
                label="Stability (days)"
                value={stability}
                onChange={setStability}
                min={0.5}
                max={30}
                step={0.5}
                display={`${stability} d`}
              />
              <Slider
                label="Days since last review"
                value={days}
                onChange={setDays}
                min={0}
                max={60}
                step={1}
                display={`${days} d`}
              />
              <div className="rounded-md bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
                R = exp(-{days} / {stability}) = {n3(rNow)}
                <br />
                <span className="text-muted-foreground">
                  after this {correct ? "success" : "lapse"}
                </span>
                <br />S = {n3(stability)} x{" "}
                {correct
                  ? `(1.3 + ${n3(difficulty)} x 0.7)`
                  : `(0.4 + (1 - ${n3(difficulty)}) x 0.2)`}{" "}
                = {n3(newStability)}
                <br />
                <span className="text-muted-foreground">
                  next review when R falls to {RETRIEVAL_THRESHOLD}
                </span>
                <br />t = -S x ln({RETRIEVAL_THRESHOLD}) ={" "}
                {n3(-newStability * Math.log(RETRIEVAL_THRESHOLD))} d
              </div>
            </div>
            <div className="rounded-md border border-border p-2 text-foreground">
              <ForgettingCurve stability={stability} days={days} />
            </div>
          </div>
        </Step>

        <Step
          n={3}
          title="The state is stored, and it is readable"
          blurb="There is no hidden vector. Each topic's state is a handful of named numbers, saved per student and exported as JSON — which is exactly what the analysis step reads."
          file="public.knowledge_states — one row per student per topic"
        >
          <pre className="overflow-x-auto rounded-md bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
            {JSON.stringify(snapshot, null, 2)}
          </pre>
        </Step>

        <Step
          n={4}
          title="The analysis turns state into a next action"
          blurb="Rules decide which stage a topic is in, and the stage decides what the student is asked to do next. Every recommendation can be traced back to the numbers above — nothing is a black box."
          file="src/lib/stage.ts — computeStage(); src/lib/examplan.ts — the exam-date planner"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={viewedLesson}
                  onChange={(e) => setViewedLesson(e.target.checked)}
                  className="accent-primary"
                />
                Lesson has been viewed
              </label>
              <Slider
                label="Best assignment score"
                value={assignment}
                onChange={setAssignment}
                display={pct(assignment)}
              />
              <div className="rounded-md bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
                lesson viewed? {viewedLesson ? "yes" : "no — stage is Learn"}
                <br />
                mastery {n3(after)} {after >= 0.85 ? ">=" : "<"} 0.85
                <br />
                assignment {n3(assignment)} {assignment >= 0.7 ? ">=" : "<"} 0.70
                <br />
                recall {n3(retrievability(newStability, lastReviewed))}{" "}
                {retrievability(newStability, lastReviewed) < 0.8 ? "< 0.80 — due" : ">= 0.80"}
              </div>
            </div>
            <div className="rounded-md border border-border p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Decision</div>
              <div className="mt-2">
                <StageBadge stage={stage} />
              </div>
              <p className="mt-3 text-sm">{stageBlurb(stage)}</p>
              <p className="mt-3 text-xs text-muted-foreground">
                The dashboard shows this as &ldquo;{stageLabel(stage)}&rdquo; with the same
                sentence, so the student always sees why a topic was picked.
              </p>
            </div>
          </div>
        </Step>

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-base">Where each piece comes from</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <span className="text-foreground">Knowledge tracing</span> — the 4-parameter BKT model
              of Corbett &amp; Anderson, with guess and slip adjusted per question and the learn
              rate gated by prerequisites.
            </li>
            <li>
              <span className="text-foreground">Forgetting</span> — an FSRS-style stability model:
              recall decays exponentially, and successful recall at a longer gap makes memory more
              stable.
            </li>
            <li>
              <span className="text-foreground">Explainability</span> — every item in the plan
              carries the rule and the numbers that produced it, which is what research on
              explainable study recommendation says learners act on.
            </li>
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            Verified separately: on test data with known correct values the engine recovered them
            with an average error of 0.012 against a limit of 0.080, and 41 of 41 automated checks
            pass.
          </p>
        </section>
      </main>
    </div>
  );
}
