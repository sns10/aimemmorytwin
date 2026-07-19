import { Link } from "@tanstack/react-router";
import { BookOpen, Dumbbell, Feather, RotateCcw, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import type { SubjectTree, TopicNode } from "@/lib/course.functions";
import type { Stage } from "@/lib/stage";

type LaneKey = "learn" | "practice" | "apply" | "review";

type Ranked = {
  topic: TopicNode;
  score: number;   // higher = more urgent
  reason: string;  // short chip explaining the pick
  retrievability: number; // 0..1
};

type Lane = {
  key: LaneKey;
  title: string;
  purpose: string;
  activity: string;
  minutes: string;
  icon: React.ReactNode;
  accent: string;
  match: (s: Stage) => boolean;
  rank: (t: TopicNode, R: number, prereqDone: boolean) => { score: number; reason: string };
};

function retrievability(t: TopicNode, now: number): number {
  const last = t.last_reviewed_at ? new Date(t.last_reviewed_at).getTime() : null;
  if (!last) return 0.5; // cold start
  const days = Math.max(0, (now - last) / 86_400_000);
  const s = Math.max(0.1, t.stability);
  return Math.exp(-days / s);
}

const LANES: Lane[] = [
  {
    key: "learn",
    title: "Learn",
    purpose: "Build awareness",
    activity: "Watch the lesson · skim key ideas",
    minutes: "5–8 min each",
    icon: <BookOpen className="h-4 w-4" />,
    accent: "border-muted-foreground/20 bg-muted/40",
    match: (s) => s === "learn",
    // Prerequisite-ready topics first, then by course order.
    rank: (t, _R, prereqDone) => ({
      score: (prereqDone ? 100 : 0) - t.sort_order,
      reason: prereqDone ? "Prereq ready" : "Prereq first",
    }),
  },
  {
    key: "practice",
    title: "Practice",
    purpose: "Make it strong",
    activity: "Drill MCQs · adaptive difficulty",
    minutes: "3–5 questions",
    icon: <Dumbbell className="h-4 w-4" />,
    accent: "border-primary/25 bg-primary/5",
    match: (s) => s === "practice",
    // Weakest mastery first — biggest gain per minute.
    rank: (t) => ({
      score: 100 - t.mastery * 100,
      reason: `${Math.round(t.mastery * 100)}% mastery`,
    }),
  },
  {
    key: "apply",
    title: "Apply",
    purpose: "Prove mastery",
    activity: "Short written answer · AI graded",
    minutes: "1 assignment",
    icon: <Feather className="h-4 w-4" />,
    accent: "border-amber-500/30 bg-amber-500/5",
    match: (s) => s === "apply",
    // Highest mastery first — most likely to nail the assignment.
    rank: (t) => ({
      score: t.mastery * 100,
      reason: `Ready · ${Math.round(t.mastery * 100)}%`,
    }),
  },
  {
    key: "review",
    title: "Review",
    purpose: "Keep it in memory",
    activity: "Spaced recall on fading topics",
    minutes: "1–2 min each",
    icon: <RotateCcw className="h-4 w-4" />,
    accent: "border-rose-500/30 bg-rose-500/5",
    match: (s) => s === "review",
    // Lowest retrievability first — most at risk.
    rank: (_t, R) => ({
      score: 100 - R * 100,
      reason: `${Math.round(R * 100)}% recall`,
    }),
  },
];

export function StudyPlan({
  subjects,
  highlightLane,
}: {
  subjects: SubjectTree[];
  highlightLane?: LaneKey | null;
}) {
  const now = Date.now();
  const allTopics: TopicNode[] = subjects.flatMap((s) =>
    s.chapters.flatMap((c) => c.topics),
  );

  // Prereq map (any topic whose prerequisite is mastered/reviewed counts as "ready").
  const mastered = new Set(
    allTopics.filter((t) => t.stage === "master" || t.stage === "review").map((t) => t.id),
  );
  // For learn lane we don't have prerequisite_id on TopicNode; approximate with sort_order:
  // a topic is "prereq ready" if all earlier topics in its chapter are past Learn stage.
  const readyByTopic = new Map<string, boolean>();
  for (const s of subjects) {
    for (const ch of s.chapters) {
      const sorted = [...ch.topics].sort((a, b) => a.sort_order - b.sort_order);
      let ready = true;
      for (const t of sorted) {
        readyByTopic.set(t.id, ready);
        if (t.stage === "learn") ready = false; // downstream topics wait
      }
    }
  }

  const totalMastered = allTopics.filter((t) => t.stage === "master").length;
  const total = allTopics.length;

  return (
    <section className="mt-12">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="font-serif text-2xl font-semibold">Your study plan</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Four independent lanes, ordered for you by mastery, memory decay,
            and prerequisites — the top pick in each is always your best next
            move.
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          {totalMastered}/{total} mastered
        </span>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {LANES.map((lane) => {
          const ranked: Ranked[] = allTopics
            .filter((t) => lane.match(t.stage))
            .map((t) => {
              const R = retrievability(t, now);
              const prereqDone =
                readyByTopic.get(t.id) ??
                (t.stage !== "learn" || mastered.size >= 0);
              const { score, reason } = lane.rank(t, R, prereqDone);
              return { topic: t, score, reason, retrievability: R };
            })
            .sort((a, b) => b.score - a.score);

          const first = ranked[0];
          return (
            <div
              key={lane.key}
              className={
                `rounded-2xl border p-5 transition ${lane.accent} ` +
                (highlightLane === lane.key
                  ? "ring-4 ring-primary/40 ring-offset-2 ring-offset-secondary scale-[1.01] shadow-lg"
                  : "")
              }
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 text-foreground">
                    {lane.icon}
                    <h3 className="font-serif text-lg font-semibold">{lane.title}</h3>
                    <span className="rounded-full bg-background/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {ranked.length} pending
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-foreground/90">
                    <span className="font-medium">{lane.purpose}.</span>{" "}
                    <span className="text-muted-foreground">{lane.activity}</span>
                  </p>
                  <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                    {lane.minutes}
                  </p>
                </div>
              </div>

              {ranked.length === 0 ? (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-border bg-background/60 p-3 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Nothing here right now — great work.
                </div>
              ) : (
                <>
                  {first && (
                    <Link
                      to="/topic/$id"
                      params={{ id: first.topic.id }}
                      className="mt-4 flex items-center justify-between rounded-xl border border-primary/40 bg-background px-3 py-3 shadow-sm transition hover:border-primary"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                          <Sparkles className="h-3 w-3" /> Top pick
                        </div>
                        <div className="mt-0.5 truncate text-sm font-medium">
                          {first.topic.name}
                        </div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {first.reason}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
                    </Link>
                  )}
                  {ranked.length > 1 && (
                    <ul className="mt-2 space-y-1.5">
                      {ranked.slice(1, 4).map((r) => (
                        <li key={r.topic.id}>
                          <Link
                            to="/topic/$id"
                            params={{ id: r.topic.id }}
                            className="flex items-center justify-between rounded-lg border border-border bg-background/70 px-3 py-2 text-xs transition hover:border-primary/60"
                          >
                            <span className="truncate">{r.topic.name}</span>
                            <span className="ml-2 shrink-0 text-[10px] text-muted-foreground">
                              {r.reason}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                  {ranked.length > 4 && (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      +{ranked.length - 4} more in this lane
                    </p>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
