// Personality profiling + tailored explainable recommendation.
//
// Implements the mechanism from:
//   Takami, K., Flanagan, B., Dai, Y., & Ogata, H. (2023).
//   "Personality-based tailored explainable recommendation for trustworthy
//    smart learning system in the age of artificial intelligence."
//   Smart Learning Environments 10:38.
//
// Two adaptations for this app (documented honestly in the UI):
//  1. The paper k-means-clustered 217 students. We have a single demo learner,
//     so we assign the learner to the paper's *published* cluster centroids
//     (Table 2) with a nearest-centroid rule in z-space.
//  2. Authority ("top achievers solved this") and Peer ("classmates solved
//     this") statements need a cohort. We use a seeded synthetic demo cohort.
//     Commitment statements use the learner's real event log.

export type Cluster = "diligent" | "fearful" | "agreeable";
export type PersuasiveType = "authority" | "commitment" | "peer";

export interface TraitScores {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  math_confidence: number;
}

/** Paper, Table 2 — mean personality scores per cluster (n = 217). */
const PAPER_CENTROIDS: Record<Cluster, Omit<TraitScores, "math_confidence"> & { math_confidence: number }> = {
  diligent:  { openness: 6.792, agreeableness: 8.000, extraversion: 7.481, conscientiousness: 6.948, neuroticism: 7.195, math_confidence: 3.623 },
  fearful:   { openness: 2.333, agreeableness: 6.125, extraversion: 4.000, conscientiousness: 2.986, neuroticism: 9.639, math_confidence: 2.153 },
  agreeable: { openness: 3.529, agreeableness: 8.971, extraversion: 7.897, conscientiousness: 4.735, neuroticism: 3.529, math_confidence: 2.294 },
};

const TRAITS = [
  "openness",
  "agreeableness",
  "extraversion",
  "conscientiousness",
  "neuroticism",
  "math_confidence",
] as const;

type TraitKey = (typeof TRAITS)[number];

// Standardise the three published centroids per trait so clusters are compared
// on shape, not on the paper's raw item scale.
const CENTROID_Z: Record<Cluster, Record<TraitKey, number>> = (() => {
  const out = {
    diligent: {}, fearful: {}, agreeable: {},
  } as Record<Cluster, Record<TraitKey, number>>;
  for (const trait of TRAITS) {
    const vals = (Object.keys(PAPER_CENTROIDS) as Cluster[]).map(
      (c) => PAPER_CENTROIDS[c][trait],
    );
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const sd =
      Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length) || 1;
    (Object.keys(PAPER_CENTROIDS) as Cluster[]).forEach((c) => {
      out[c][trait] = (PAPER_CENTROIDS[c][trait] - mean) / sd;
    });
  }
  return out;
})();

/**
 * Learner traits arrive on a 1..7 Likert-derived scale (math_confidence 1..5).
 * Standardise against the scale midpoint so the learner sits in the same
 * z-space as the paper's centroids, then take the nearest centroid.
 */
export function assignCluster(scores: TraitScores): {
  cluster: Cluster;
  distances: Record<Cluster, number>;
} {
  const z: Record<TraitKey, number> = {
    openness: (scores.openness - 4) / 1.5,
    agreeableness: (scores.agreeableness - 4) / 1.5,
    extraversion: (scores.extraversion - 4) / 1.5,
    conscientiousness: (scores.conscientiousness - 4) / 1.5,
    neuroticism: (scores.neuroticism - 4) / 1.5,
    math_confidence: (scores.math_confidence - 3) / 1.1,
  };

  const distances = {} as Record<Cluster, number>;
  let best: Cluster = "diligent";
  for (const c of Object.keys(CENTROID_Z) as Cluster[]) {
    let d = 0;
    for (const t of TRAITS) d += (z[t] - CENTROID_Z[c][t]) ** 2;
    distances[c] = Math.sqrt(d);
    if (distances[c] < distances[best]) best = c;
  }
  return { cluster: best, distances };
}

export const PERSUASIVE_BY_CLUSTER: Record<Cluster, PersuasiveType> = {
  diligent: "authority",   // conscientious learners respond to authority cues
  fearful: "commitment",   // high-neuroticism learners respond to commitment
  agreeable: "peer",       // agreeable learners respond to peer/liking cues
};

export const CLUSTER_LABEL: Record<Cluster, string> = {
  diligent: "Diligent",
  fearful: "Fearful",
  agreeable: "Agreeable",
};

export const CLUSTER_BLURB: Record<Cluster, string> = {
  diligent:
    "High openness and conscientiousness. You get the authority cue — what strong performers have already worked through.",
  fearful:
    "Higher neuroticism, lower confidence. You get the commitment cue — small, finishable daily goals instead of pressure.",
  agreeable:
    "High agreeableness and extraversion. You get the peer cue — what the rest of the group is working on.",
};

// ---------------------------------------------------------------- explanations

export interface ExplanationFacts {
  topicName: string;
  lane: "learn" | "practice" | "apply" | "review";
  mastery: number;         // 0..1
  retrievability: number;  // 0..1
  due: boolean;
  prereqReady: boolean;
  peersCompleted: number;
  topAchieversCompleted: number;
  cohortSize: number;
  recsUsedToday: number;
  dailyGoal: number;
}

/**
 * Item/state-characteristic explanation — shown to *everyone* (the paper's
 * control condition). Grounded strictly in the BKT/FSRS state model.
 */
export function characteristicExplanation(f: ExplanationFacts): string {
  const m = Math.round(f.mastery * 100);
  const r = Math.round(f.retrievability * 100);
  switch (f.lane) {
    case "learn":
      return f.prereqReady
        ? "Its prerequisite is already solid, so this is the cheapest new idea to add right now."
        : "New material — the earlier topic in this chapter is still open, so expect this one to feel steep.";
    case "practice":
      return `Mastery is estimated at ${m}% — the weakest point in your model, so practice here moves the needle most.`;
    case "apply":
      return `Mastery is ${m}%: high enough that writing your own explanation should stick rather than frustrate.`;
    case "review":
      return f.due
        ? `Predicted recall has dropped to ${r}% and the review is overdue — a short pass restores it cheaply.`
        : `Predicted recall is ${r}% and falling toward the 80% threshold.`;
  }
}

/**
 * Personality-tailored persuasive statement, appended below the characteristic
 * explanation exactly as in the paper's Fig. 5 layout.
 */
export function persuasiveExplanation(
  cluster: Cluster,
  f: ExplanationFacts,
): { type: PersuasiveType; text: string } {
  const type = PERSUASIVE_BY_CLUSTER[cluster];
  if (type === "authority") {
    return {
      type,
      text:
        f.topAchieversCompleted > 0
          ? `${f.topAchieversCompleted} of the top achievers have already worked through this one.`
          : "None of the top achievers have covered this yet — get there first.",
    };
  }
  if (type === "commitment") {
    const left = Math.max(0, f.dailyGoal - f.recsUsedToday);
    return {
      type,
      text:
        left === 0
          ? `You did it — ${f.recsUsedToday} recommended activities done today. One more only makes the memory firmer.`
          : f.recsUsedToday === 0
            ? `Start small: ${f.dailyGoal} recommended activities today and your goal is met.`
            : `Today you've used ${f.recsUsedToday}. ${left} more and you hit your daily goal.`,
    };
  }
  return {
    type,
    text:
      f.peersCompleted > 0
        ? `${f.peersCompleted} students in your group have solved this. Your turn.`
        : "No one in your group has taken this on yet — be the first.",
  };
}

export const DAILY_GOAL = 3;