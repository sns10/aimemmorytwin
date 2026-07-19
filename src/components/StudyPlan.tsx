import { Link } from "@tanstack/react-router";
import { BookOpen, Dumbbell, Feather, RotateCcw, ArrowRight, CheckCircle2 } from "lucide-react";
import type { SubjectTree, TopicNode } from "@/lib/course.functions";
import type { Stage } from "@/lib/stage";

type Lane = {
  key: "learn" | "practice" | "apply" | "review";
  title: string;
  purpose: string;
  activity: string;
  minutes: string;
  icon: React.ReactNode;
  accent: string;
  match: (s: Stage) => boolean;
};

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
  },
];

export function StudyPlan({ subjects }: { subjects: SubjectTree[] }) {
  const allTopics: TopicNode[] = subjects.flatMap((s) =>
    s.chapters.flatMap((c) => c.topics),
  );

  const totalMastered = allTopics.filter((t) => t.stage === "master").length;
  const total = allTopics.length;

  return (
    <section className="mt-12">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="font-serif text-2xl font-semibold">Your study plan</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Four independent lanes — pick any one, in any order. Each is short
            enough to finish in a single sitting; progress auto-saves.
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          {totalMastered}/{total} mastered
        </span>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {LANES.map((lane) => {
          const topics = allTopics
            .filter((t) => lane.match(t.stage))
            .sort((a, b) => a.sort_order - b.sort_order);
          const first = topics[0];
          return (
            <div
              key={lane.key}
              className={`rounded-2xl border p-5 ${lane.accent}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 text-foreground">
                    {lane.icon}
                    <h3 className="font-serif text-lg font-semibold">
                      {lane.title}
                    </h3>
                    <span className="rounded-full bg-background/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {topics.length} pending
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-foreground/90">
                    <span className="font-medium">{lane.purpose}.</span>{" "}
                    <span className="text-muted-foreground">
                      {lane.activity}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                    {lane.minutes}
                  </p>
                </div>
              </div>

              {topics.length === 0 ? (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-border bg-background/60 p-3 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Nothing here right now — great work.
                </div>
              ) : (
                <>
                  <ul className="mt-4 space-y-1.5">
                    {topics.slice(0, 3).map((t) => (
                      <li key={t.id}>
                        <Link
                          to="/topic/$id"
                          params={{ id: t.id }}
                          className="flex items-center justify-between rounded-lg border border-border bg-background/70 px-3 py-2 text-sm transition hover:border-primary/60"
                        >
                          <span className="truncate">{t.name}</span>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {first && (
                    <Link
                      to="/topic/$id"
                      params={{ id: first.id }}
                      className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                    >
                      Start with {first.name} →
                    </Link>
                  )}
                  {topics.length > 3 && (
                    <span className="ml-3 text-xs text-muted-foreground">
                      +{topics.length - 3} more
                    </span>
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
