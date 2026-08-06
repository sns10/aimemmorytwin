import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Sparkles, ArrowRight, BookOpen, History, ChevronRight, HelpCircle, Zap, Flame } from "lucide-react";
import {
  getStudentOverview,
  generateDailyBriefing,
} from "@/lib/memorytwin.functions";
import { getCourseTree } from "@/lib/course.functions";
import { getPersonalityContext } from "@/lib/personality.functions";
import { logRecEvent } from "@/lib/rec-log";
import { getReviewQueue } from "@/lib/review.functions";
import { BrainVisualization } from "@/components/BrainVisualization";
import { RetentionChart } from "@/components/RetentionChart";
import { StudyPlan } from "@/components/StudyPlan";
import { AccountMenu } from "@/components/AccountMenu";
import { Onboarding, openOnboarding } from "@/components/Onboarding";
import { nextActionFor, stageBlurb } from "@/lib/stage";
import { DemoBanner } from "@/components/DemoBanner";
import { sessionQuery } from "@/lib/session-query";

const overviewQuery = queryOptions({
  queryKey: ["overview"],
  queryFn: () => getStudentOverview(),
  staleTime: 0,
});

const courseQuery = queryOptions({
  queryKey: ["course-tree"],
  queryFn: () => getCourseTree(),
  staleTime: 0,
});

const personalityQuery = queryOptions({
  queryKey: ["personality"],
  queryFn: () => getPersonalityContext(),
  staleTime: 0,
});

const reviewSummaryQuery = queryOptions({
  queryKey: ["review-queue"],
  queryFn: () => getReviewQueue(),
  staleTime: 0,
});

export const Route = createFileRoute("/")({
  ssr: false,
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(sessionQuery);
    context.queryClient.ensureQueryData(overviewQuery);
    context.queryClient.ensureQueryData(courseQuery);
    context.queryClient.ensureQueryData(personalityQuery);
    context.queryClient.ensureQueryData(reviewSummaryQuery);
  },
  component: Dashboard,
  errorComponent: ErrBoundary,
  notFoundComponent: () => <div className="p-10">Not found</div>,
});

function ErrBoundary({ error }: { error: Error }) {
  return (
    <div className="p-10 text-sm text-destructive">
      Something went wrong: {error.message}
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const { data } = useSuspenseQuery(overviewQuery);
  const { data: subjects } = useSuspenseQuery(courseQuery);
  const { data: personality } = useQuery(personalityQuery);
  const { data: review } = useQuery(reviewSummaryQuery);
  const { data: session } = useQuery(sessionQuery);
  useEffect(() => {
    if (session?.needsPlacement) navigate({ to: "/placement", replace: true });
  }, [session?.needsPlacement, navigate]);
  const briefingFn = useServerFn(generateDailyBriefing);
  const briefingQ = useQuery({
    queryKey: ["briefing"],
    queryFn: () => briefingFn(),
    staleTime: 60_000,
  });
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [today, setToday] = useState<string>("");
  const [greet, setGreet] = useState<string>("hi");
  const [tour, setTour] = useState<{ step: number; cycle: number } | null>(null);
  useEffect(() => {
    setToday(new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" }));
    const h = new Date().getHours();
    setGreet(h < 5 ? "night" : h < 12 ? "morning" : h < 18 ? "afternoon" : "evening");
  }, []);
  useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent<{ step: number; cycle: number }>;
      setTour(ev.detail.step < 0 ? null : ev.detail);
    };
    window.addEventListener("memorytwin:tour-step", handler);
    return () => window.removeEventListener("memorytwin:tour-step", handler);
  }, []);

  const allTopics = subjects.flatMap((s) => s.chapters.flatMap((c) => c.topics));

  // Pick the single best next activity: review > learn > practice > apply > master.
  // Within each stage, use the same lane ranking logic as StudyPlan.
  const nextTopic = useMemo(() => {
    const nowTs = Date.now();
    const mastered = new Set(
      allTopics.filter((t) => t.stage === "master" || t.stage === "review").map((t) => t.id),
    );
    const readyByTopic = new Map<string, boolean>();
    for (const s of subjects) {
      for (const ch of s.chapters) {
        const sorted = [...ch.topics].sort((a, b) => a.sort_order - b.sort_order);
        let ready = true;
        for (const t of sorted) {
          readyByTopic.set(t.id, ready);
          if (t.stage === "learn") ready = false;
        }
      }
    }
    const scored = allTopics.map((t) => {
      const last = t.last_reviewed_at ? new Date(t.last_reviewed_at).getTime() : null;
      const days = last ? Math.max(0, (nowTs - last) / 86_400_000) : 0;
      const R = last ? Math.exp(-days / Math.max(0.1, t.stability)) : 0.5;
      const prereqReady = readyByTopic.get(t.id) ?? true;
      let urgency = 0;
      switch (t.stage) {
        case "review":
          urgency = 1000 + (1 - R) * 100;
          break;
        case "learn":
          urgency = 800 + (prereqReady ? 50 : 0) - t.sort_order;
          break;
        case "practice":
          urgency = 600 + (1 - t.mastery) * 100;
          break;
        case "apply":
          urgency = 400 + t.mastery * 100;
          break;
        case "master":
          urgency = 200 + R * 100;
          break;
      }
      return { topic: t, R, prereqReady, urgency };
    });
    scored.sort((a, b) => b.urgency - a.urgency);
    return scored[0]?.topic ?? null;
  }, [allTopics, subjects]);
  const nextAction = nextTopic ? nextActionFor(nextTopic.stage, nextTopic.id) : null;

  const now = Date.now();
  const atRisk = data.concepts
    .map((c) => {
      const last = c.state.last_reviewed_at ? new Date(c.state.last_reviewed_at).getTime() : null;
      const days = last ? Math.max(0, (now - last) / 86400000) : 0;
      const R = last ? Math.exp(-days / Math.max(0.25, c.state.memory_stability)) : 0.5;
      return { c, R };
    })
    .sort((a, b) => a.R - b.R)
    .slice(0, 4);

  // Translate the current tour step into concrete UI targets.
  const tourTargets = (() => {
    if (!tour) return { nodeId: null as string | null, lane: null as "learn" | "practice" | "apply" | "review" | null, cta: false };
    const byMastery = [...data.concepts].sort(
      (a, b) => b.state.mastery_probability - a.state.mastery_probability,
    );
    const consolidated = byMastery.find((c) => c.state.mastery_probability >= 0.8) ?? byMastery[0];
    const building = byMastery.find(
      (c) => c.state.mastery_probability >= 0.4 && c.state.mastery_probability < 0.8,
    ) ?? byMastery[Math.floor(byMastery.length / 2)];
    const fading = atRisk[0]?.c ?? byMastery[byMastery.length - 1];
    switch (tour.step) {
      case 0:
        return { nodeId: consolidated?.id ?? null, lane: null, cta: false };
      case 1: {
        const rotation = [consolidated?.id, building?.id, fading?.id].filter(Boolean) as string[];
        return { nodeId: rotation[tour.cycle % rotation.length] ?? null, lane: null, cta: false };
      }
      case 2:
        return { nodeId: fading?.id ?? null, lane: null, cta: false };
      case 3: {
        const lanes = ["learn", "practice", "apply", "review"] as const;
        return { nodeId: null, lane: lanes[tour.cycle % 4], cta: false };
      }
      case 4:
        return { nodeId: nextTopic ? (data.concepts.find((c) => c.id === nextTopic.id)?.id ?? null) : null, lane: null, cta: true };
      default:
        return { nodeId: null, lane: null, cta: false };
    }
  })();

  const brainFocus = hoverId ?? tourTargets.nodeId;
  const ctaHighlight = tourTargets.cta;

  return (
    <div className="min-h-screen bg-secondary/60">
      <header className="border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-8 py-4">
          <div className="flex items-baseline gap-3">
            <span className="font-serif text-lg font-bold tracking-tight">MemoryTwin</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Cognitive Instrument · v4.2
            </span>
          </div>
          <nav className="flex items-center gap-6 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            <button
              onClick={openOnboarding}
              className="inline-flex items-center gap-1.5 hover:text-primary"
            >
              <HelpCircle className="h-3.5 w-3.5" /> Tour
            </button>
            <Link to="/course" className="inline-flex items-center gap-1.5 hover:text-primary">
              <BookOpen className="h-3.5 w-3.5" /> Course
            </Link>
            <Link to="/review" className="inline-flex items-center gap-1.5 hover:text-primary">
              <Flame className="h-3.5 w-3.5" /> Review
              {review && review.due.length > 0 && (
                <span className="rounded-full bg-primary px-1.5 py-px font-mono text-[10px] text-primary-foreground">
                  {review.due.length}
                </span>
              )}
            </Link>
            <Link to="/history" className="inline-flex items-center gap-1.5 hover:text-primary">
              <History className="h-3.5 w-3.5" /> Activity
            </Link>
            <Link to="/timeline" className="inline-flex items-center gap-1.5 hover:text-primary">
              <History className="h-3.5 w-3.5" /> Timeline
            </Link>
            <AccountMenu fallbackName={data.student.name} />
          </nav>
        </div>
      </header>

      <Onboarding />

      {/* Split-screen instrument: brain | briefing + plan */}
      <main className="mx-auto max-w-[1400px] p-4 sm:p-6">
        <DemoBanner className="mb-4" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          {/* LEFT — 3D brain instrument */}
          <section className="relative min-h-[560px] overflow-hidden rounded-sm border border-border bg-card shadow-sm lg:h-[calc(100vh-6.5rem)]">
            <BrainVisualization
              concepts={data.concepts}
              activeId={brainFocus}
              onHover={setHoverId}
            />
          </section>

          {/* RIGHT — briefing, plan */}
          <section className="flex flex-col gap-4 lg:h-[calc(100vh-6.5rem)] lg:overflow-y-auto lg:pr-1">
            <div>
              <div className="ink-caps text-muted-foreground">Daily Synapse{today ? ` · ${today}` : ""}</div>
              <h1 className="mt-1.5 font-serif text-3xl font-bold leading-tight sm:text-4xl">
                Good {greet}, {data.student.name.split(" ")[0]}.
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {data.dueCount > 0
                  ? `${data.dueCount} concept${data.dueCount === 1 ? "" : "s"} slipping — plan below.`
                  : "Memory looks stable across the board."}
              </p>
            </div>

            {/* AI Briefing */}
            <div className="relative border-l-2 border-primary bg-card p-5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="ink-caps text-primary">Twin Briefing</span>
              </div>
              <p className="mt-3 text-sm italic leading-relaxed text-foreground">
                “{briefingQ.isLoading
                  ? "Reading your memory twin…"
                  : (briefingQ.data?.briefing ?? data.student.daily_briefing ??
                    "Let's build your first study session.")}”
              </p>
              <div className="mt-4 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="ink-caps text-muted-foreground">BKT · FSRS · Protocol v4.2</span>
              </div>
            </div>

            {/* Primary CTA */}
            {review && (
              <Link
                to="/review"
                className="flex items-center justify-between border border-border bg-card px-4 py-3 transition hover:border-foreground/40"
              >
                <div className="flex items-center gap-3">
                  <Flame
                    className={
                      "h-5 w-5 " +
                      (review.streak.current_streak > 0 ? "text-primary" : "text-muted-foreground")
                    }
                  />
                  <div>
                    <div className="text-sm font-semibold">
                      {review.due.length > 0
                        ? `${review.due.length} card${review.due.length === 1 ? "" : "s"} due for review`
                        : "Review queue clear"}
                    </div>
                    <div className="ink-caps mt-0.5 text-muted-foreground">
                      {review.streak.current_streak}-day streak ·{" "}
                      {review.streak.reviews_today} answered today
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            )}

            {nextTopic && nextAction && (
              <Link
                to={nextAction.href as "/topic/$id"}
                params={{ id: nextTopic.id }}
                onClick={() => {
                  void logRecEvent({
                      concept_id: nextTopic.id,
                      kind: "click",
                      lane: nextTopic.stage as "learn" | "practice" | "apply" | "review",
                      explanation_mode: "characteristic",
                      persuasive_type: null,
                      profile_cluster: personality?.profile?.cluster ?? null,
                    }).catch(() => {});
                }}
                className={
                  "group relative flex items-center justify-between overflow-hidden border border-border bg-primary px-5 py-4 text-primary-foreground transition hover:bg-foreground " +
                  (ctaHighlight ? "ring-4 ring-primary/30 ring-offset-2 ring-offset-secondary animate-pulse" : "")
                }
              >
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-2 ink-caps text-primary-foreground/80">
                    <Zap className="h-3.5 w-3.5" />
                    Next best activity · {nextAction.label}
                  </div>
                  <div className="mt-1 font-serif text-xl font-semibold">{nextTopic.name}</div>
                  <p className="mt-1 max-w-md text-xs text-primary-foreground/70">
                    {stageBlurb(nextTopic.stage)}
                  </p>
                </div>
                <ArrowRight className="relative z-10 h-5 w-5 transition group-hover:translate-x-1" />
              </Link>
            )}

            {/* At-risk concepts (hover-syncs with brain) */}
            {atRisk.length > 0 && (
              <div>
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="ink-caps text-muted-foreground">Fading fastest</span>
                  <span className="text-[10px] text-muted-foreground">hover to locate on brain</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {atRisk.map(({ c, R }) => (
                    <Link
                      key={c.id}
                      to="/concept/$id"
                      params={{ id: c.id }}
                      onMouseEnter={() => setHoverId(c.id)}
                      onMouseLeave={() => setHoverId(null)}
                      className={
                        "flex items-center justify-between border bg-card px-3 py-2 text-xs transition " +
                        (hoverId === c.id
                          ? "border-primary shadow-sm"
                          : "border-border hover:border-foreground/40")
                      }
                    >
                      <span className="truncate font-medium">{c.name}</span>
                      <span className={"ml-2 shrink-0 font-mono " + (R < 0.5 ? "text-destructive" : "text-muted-foreground")}>
                        {Math.round(R * 100)}%
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Study plan lanes — compact */}
            <StudyPlan
              subjects={subjects}
              highlightLane={tourTargets.lane}
              personality={personality ?? null}
            />

            {/* Course quick nav */}
            <div className="border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <span className="ink-caps text-muted-foreground">Course</span>
                <Link to="/course" className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-widest text-primary hover:underline">
                  Open <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="divide-y divide-border">
                {subjects.flatMap((s) => s.chapters).map((ch) => (
                  <div key={ch.id} className="px-4 py-3">
                    <div className="flex items-baseline justify-between">
                      <span className="font-serif text-sm font-semibold">{ch.name}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{Math.round(ch.progress * 100)}%</span>
                    </div>
                    <div className="mt-1.5 h-[3px] w-full overflow-hidden bg-muted">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${Math.max(2, ch.progress * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Retention chart, tucked at the bottom */}
            <div className="border border-border bg-card p-4">
              <RetentionChart concepts={data.concepts} />
            </div>

            <footer className="pb-6 pt-2 text-[10px] uppercase tracking-widest text-muted-foreground">
              Anonymous demo · responses reshape the twin in real time.
            </footer>
          </section>
        </div>
      </main>
    </div>
  );
}


