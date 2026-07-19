// Server-only cognitive math helpers for MemoryTwin AI.
// Canonical 4-parameter BKT (Corbett & Anderson 1995) with item-difficulty
// modulation on guess/slip and prerequisite-gated learning, plus FSRS-lite
// forgetting curve. Imported from *.functions.ts inside handlers only.

export const RETRIEVAL_THRESHOLD = 0.8;

export interface BktParams {
  pInit: number;   // P(L₀) — prior mastery before any evidence
  pLearn: number;  // P(T)  — probability of transitioning unlearned → learned per opportunity
  pGuess: number;  // P(G)  — probability of correct answer while unlearned
  pSlip: number;   // P(S)  — probability of incorrect answer while learned
}

export const DEFAULT_BKT: BktParams = {
  pInit: 0.15,
  pLearn: 0.10,
  pGuess: 0.20,
  pSlip: 0.10,
};

export function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0.001, Math.min(0.999, x));
}

function clampRange(x: number, lo: number, hi: number): number {
  if (!Number.isFinite(x)) return lo;
  return Math.max(lo, Math.min(hi, x));
}

/**
 * Item-difficulty aware guess/slip.
 *  - Harder items → lower effective guess (fewer lucky hits) and higher effective slip.
 *  - Easier items → higher effective guess and lower effective slip.
 * Difficulty is expected in [0, 1] with 0.5 as neutral. This keeps the
 * posterior update smoother (no sudden 0.15 → 0.9 jumps on a single easy hit).
 */
export function effectiveGuessSlip(
  params: BktParams,
  itemDifficulty = 0.5,
): { pGuess: number; pSlip: number } {
  const d = clampRange(itemDifficulty, 0, 1);
  // pGuess shrinks with difficulty (harder ⇒ less likely to guess right).
  const pGuess = clampRange(params.pGuess * (1.2 - d), 0.02, 0.5);
  // pSlip grows with difficulty (harder ⇒ easier to slip even when known).
  const pSlip = clampRange(params.pSlip * (0.6 + d), 0.02, 0.5);
  return { pGuess, pSlip };
}

/**
 * Prerequisite-gated learning rate. A student is much more likely to
 * transition to "learned" if the prerequisite is already mastered. Interpolates
 * pLearn between 30% (no prereq mastery) and 130% (full prereq mastery) of the
 * base rate — again favouring smoother, more monotonic curves.
 */
export function effectiveLearnRate(
  params: BktParams,
  prereqMastery = 1,
): number {
  const p = clampRange(prereqMastery, 0, 1);
  return clampRange(params.pLearn * (0.3 + p), 0.02, 0.5);
}

export interface UpdateOptions {
  itemDifficulty?: number;
  prereqMastery?: number;
  params?: Partial<BktParams>;
}

/**
 * Canonical BKT posterior + transition step.
 *   evidence step: P(L | obs) = P(L)·P(obs|L) / P(obs)
 *   transition step: P(L') = P(L|obs) + (1 - P(L|obs))·P(T)
 */
export function updateMasteryBKT(
  prior: number,
  isCorrect: boolean,
  options: UpdateOptions = {},
): number {
  const params: BktParams = { ...DEFAULT_BKT, ...(options.params ?? {}) };
  const { pGuess, pSlip } = effectiveGuessSlip(params, options.itemDifficulty);
  const pLearn = effectiveLearnRate(params, options.prereqMastery);
  const pL = clamp01(prior);

  let posterior: number;
  if (isCorrect) {
    const num = pL * (1 - pSlip);
    const den = num + (1 - pL) * pGuess;
    posterior = den === 0 ? pL : num / den;
  } else {
    const num = pL * pSlip;
    const den = num + (1 - pL) * (1 - pGuess);
    posterior = den === 0 ? pL : num / den;
  }
  return clamp01(posterior + (1 - posterior) * pLearn);
}

export function updateStabilityFSRS(
  stabilityDays: number,
  difficulty: number,
  isCorrect: boolean,
): number {
  const s = Math.max(0.1, stabilityDays);
  const d = Math.min(1, Math.max(0.1, difficulty));
  if (isCorrect) {
    // Smoother growth: easy items give small bumps, hard items give bigger
    // bumps (the "desirable difficulty" effect from cognitive science).
    return s * (1.3 + d * 0.7);
  }
  // Lapses cut stability but not as brutally on easy items you just slipped on.
  return Math.max(0.1, s * (0.4 + (1 - d) * 0.2));
}

// t (days) until retrievability drops to threshold: R = e^(-t/S) => t = -S ln(R)
export function nextRevisionDate(stabilityDays: number, from: Date = new Date()): Date {
  const t = -stabilityDays * Math.log(RETRIEVAL_THRESHOLD);
  const ms = t * 24 * 60 * 60 * 1000;
  return new Date(from.getTime() + ms);
}

export function retrievability(
  stabilityDays: number,
  lastReviewedAt: Date | null,
  now: Date = new Date(),
): number {
  if (!lastReviewedAt) return 1;
  const days = (now.getTime() - lastReviewedAt.getTime()) / (1000 * 60 * 60 * 24);
  return Math.exp(-days / Math.max(0.1, stabilityDays));
}