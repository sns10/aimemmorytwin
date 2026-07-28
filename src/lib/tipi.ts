import type { TraitScores } from "./personality";

/**
 * Ten-Item Personality Inventory (Gosling, Rentfrow & Swann, 2003) — the short
 * Big Five scale. Two items per trait, one of which is reverse-scored.
 * Plus one math/science-confidence item, mirroring the paper's "good at" item.
 */
export type TipiTrait =
  | "extraversion"
  | "agreeableness"
  | "conscientiousness"
  | "neuroticism"
  | "openness";

export interface TipiItem {
  id: number;
  text: string;
  trait: TipiTrait;
  reverse: boolean;
}

export const TIPI_ITEMS: TipiItem[] = [
  { id: 1, text: "Outgoing, enthusiastic", trait: "extraversion", reverse: false },
  { id: 2, text: "Critical, argumentative", trait: "agreeableness", reverse: true },
  { id: 3, text: "Dependable, self-disciplined", trait: "conscientiousness", reverse: false },
  { id: 4, text: "Anxious, easily upset", trait: "neuroticism", reverse: false },
  { id: 5, text: "Open to new experiences, complex", trait: "openness", reverse: false },
  { id: 6, text: "Reserved, quiet", trait: "extraversion", reverse: true },
  { id: 7, text: "Sympathetic, warm", trait: "agreeableness", reverse: false },
  { id: 8, text: "Disorganised, careless", trait: "conscientiousness", reverse: true },
  { id: 9, text: "Calm, emotionally stable", trait: "neuroticism", reverse: true },
  { id: 10, text: "Conventional, uncreative", trait: "openness", reverse: true },
];

export const LIKERT_LABELS = [
  "Strongly disagree",
  "Disagree",
  "Slightly disagree",
  "Neutral",
  "Slightly agree",
  "Agree",
  "Strongly agree",
];

/** answers: item id -> 1..7. mathConfidence: 1..5. */
export function scoreTipi(
  answers: Record<number, number>,
  mathConfidence: number,
): TraitScores {
  const acc: Record<TipiTrait, number[]> = {
    extraversion: [], agreeableness: [], conscientiousness: [], neuroticism: [], openness: [],
  };
  for (const item of TIPI_ITEMS) {
    const raw = answers[item.id] ?? 4;
    acc[item.trait].push(item.reverse ? 8 - raw : raw);
  }
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
  return {
    openness: mean(acc.openness),
    conscientiousness: mean(acc.conscientiousness),
    extraversion: mean(acc.extraversion),
    agreeableness: mean(acc.agreeableness),
    neuroticism: mean(acc.neuroticism),
    math_confidence: mathConfidence,
  };
}