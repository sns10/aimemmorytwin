// Server-only cognitive math helpers for MemoryTwin AI.
// BKT + FSRS-lite forgetting curve. Imported from *.functions.ts inside handlers only.

export const P_GUESS = 0.2;
export const P_SLIP = 0.1;
export const P_TRANSIT = 0.05;
export const P_L0 = 0.15;
export const RETRIEVAL_THRESHOLD = 0.8;

export function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0.001, Math.min(0.999, x));
}

export function updateMasteryBKT(prior: number, isCorrect: boolean): number {
  const pL = clamp01(prior);
  let posterior: number;
  if (isCorrect) {
    const num = pL * (1 - P_SLIP);
    const den = num + (1 - pL) * P_GUESS;
    posterior = den === 0 ? pL : num / den;
  } else {
    const num = pL * P_SLIP;
    const den = num + (1 - pL) * (1 - P_GUESS);
    posterior = den === 0 ? pL : num / den;
  }
  // Transitive learning bump
  const finalP = posterior + (1 - posterior) * P_TRANSIT;
  return clamp01(finalP);
}

export function updateStabilityFSRS(
  stabilityDays: number,
  difficulty: number,
  isCorrect: boolean,
): number {
  const s = Math.max(0.1, stabilityDays);
  const d = Math.min(1, Math.max(0.1, difficulty));
  if (isCorrect) {
    return s * (1.5 + d * 0.5);
  }
  return Math.max(0.1, s * 0.5);
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