export type Stage = "learn" | "practice" | "apply" | "master" | "review";

export interface StageInputs {
  mastery: number;
  stability: number;
  lastReviewedAt: string | null;
  nextRevisionAt: string;
  hasViewedLesson: boolean;
  bestAssignmentScore: number | null; // 0..1, null if none submitted
}

export function computeStage(i: StageInputs, now: Date = new Date()): Stage {
  if (!i.hasViewedLesson) return "learn";

  const mastered = i.mastery >= 0.85 && (i.bestAssignmentScore ?? 0) >= 0.7;
  if (mastered) {
    const last = i.lastReviewedAt ? new Date(i.lastReviewedAt).getTime() : null;
    const days = last ? (now.getTime() - last) / 86_400_000 : 999;
    const R = last ? Math.exp(-days / Math.max(0.1, i.stability)) : 0.5;
    const due = new Date(i.nextRevisionAt).getTime() <= now.getTime();
    if (due || R < 0.8) return "review";
    return "master";
  }

  if (i.mastery >= 0.65) return "apply";
  return "practice";
}

export function stageLabel(s: Stage): string {
  switch (s) {
    case "learn": return "Learn";
    case "practice": return "Practice";
    case "apply": return "Apply";
    case "master": return "Mastered";
    case "review": return "Review";
  }
}

export function stageBlurb(s: Stage): string {
  switch (s) {
    case "learn": return "Watch the lesson to unlock practice.";
    case "practice": return "Drill the quiz until mastery hits 65%.";
    case "apply": return "Write a short explanation to prove you can apply it.";
    case "master": return "Locked in — memory is stable.";
    case "review": return "Fading fast — a quick review will lock it back in.";
  }
}

export function nextActionFor(stage: Stage, topicId: string): {
  label: string;
  href: string;
  params?: Record<string, string>;
} {
  switch (stage) {
    case "learn":
      return { label: "Start the lesson", href: "/topic/$id", params: { id: topicId } };
    case "practice":
      return { label: "Practice questions", href: "/topic/$id", params: { id: topicId } };
    case "apply":
      return { label: "Do the assignment", href: "/topic/$id", params: { id: topicId } };
    case "review":
      return { label: "Quick review", href: "/topic/$id", params: { id: topicId } };
    case "master":
      return { label: "Memory stats", href: "/concept/$id", params: { id: topicId } };
  }
}