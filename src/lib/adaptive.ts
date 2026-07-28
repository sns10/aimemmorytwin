/**
 * Adaptive item selection.
 *
 * BKT gives us P(mastery). We want each practice item to sit in the learning
 * zone — hard enough to be informative, easy enough to stay ~70-80% solvable.
 * Target difficulty rises linearly with mastery and is clamped to the bank range.
 */
export function targetDifficulty(mastery: number): number {
  const m = Math.min(1, Math.max(0, mastery));
  return Math.min(0.95, Math.max(0.2, 0.25 + 0.65 * m));
}

export interface AdaptiveItem {
  difficulty: number;
  sort_order: number;
}

/**
 * Pick the index of the next question: closest to the target difficulty among
 * items not yet served this session. Once every item has been served the
 * session wraps and the pool resets.
 */
export function pickQuestionIndex(
  bank: AdaptiveItem[],
  mastery: number,
  served: number[],
): number {
  if (bank.length === 0) return 0;
  const pool = bank.map((_, i) => i).filter((i) => !served.includes(i));
  const candidates = pool.length > 0 ? pool : bank.map((_, i) => i);
  const target = targetDifficulty(mastery);
  let best = candidates[0];
  let bestGap = Infinity;
  for (const i of candidates) {
    const gap = Math.abs(bank[i].difficulty - target);
    if (gap < bestGap - 1e-9 || (Math.abs(gap - bestGap) < 1e-9 && bank[i].sort_order < bank[best].sort_order)) {
      best = i;
      bestGap = gap;
    }
  }
  return best;
}

export function difficultyFitLabel(itemDifficulty: number, mastery: number): string {
  const gap = itemDifficulty - targetDifficulty(mastery);
  if (gap > 0.12) return "Stretch";
  if (gap < -0.12) return "Warm-up";
  return "In your zone";
}
