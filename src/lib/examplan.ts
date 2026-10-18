/**
 * Exam-prep planner.
 *
 * Given the learner's current twin state (per-concept mastery + FSRS stability +
 * last-reviewed date) and a target exam date, lay out a back-scheduled agenda so
 * every selected concept peaks *on the exam*, not before it:
 *
 *   Learn  → for concepts whose lesson hasn't been viewed
 *   Practice → front-loaded, weakest mastery first, until mastery clears target
 *   Review  → spaced at expanding intervals, the last one landing ~1-2 days out
 *
 * Conformance to the canonical model (bkt.server.ts / stage.ts / README):
 *   - Forgetting curve R(t) = e^(-Δt/S) — identical.
 *   - EXAM_RECALL_TARGET 0.8 — identical to RETRIEVAL_THRESHOLD.
 *   - neededReviewCount() solves S ≥ gap / -ln(0.8), the exact inverse of R(t).
 *   - Learn-gating on has_viewed_lesson — identical to computeStage().
 *   - Stability gains are the canonical `S·(1.3 + d·0.7)` evaluated at a fixed
 *     difficulty (getCourseTree's TopicNode carries no per-concept difficulty):
 *     practice ≈ d 0.43, spaced review ≈ d 0.71 (desirable-difficulty bonus).
 *   - planPractice() is a forward *estimate* of the BKT transition step with an
 *     effective learn-rate of 0.3 (inside the canonical [0.02, 0.5] clamp),
 *     assuming correct answers and met prerequisites — it is not the full
 *     Bayesian evidence step, which needs real per-attempt observations.
 *   - Lapses / wrong answers are not modelled: the plan shows the path if you
 *     pass each session. The UI labels every projection as a guide, not a promise.
 * Pure module: safe to import from client route code.
 */
import type { SubjectTree, TopicNode } from "./course.functions";

// Exam-day recall we aim each concept above. Matches RETRIEVAL_THRESHOLD in
// bkt.server.ts so the planner and the twin speak the same language.
export const EXAM_RECALL_TARGET = 0.8;
export const MASTERY_TARGET = 0.8;
const DAY = 86_400_000;
const DEFAULT_MAX_PER_DAY = 6;

// Canonical FSRS-lite growth is S·(1.3 + d·0.7) on a successful recall
// (updateStabilityFSRS in bkt.server.ts). TopicNode has no per-concept
// difficulty, so evaluate it at a representative difficulty per session type:
// practice items sit near the learning zone, spaced reviews earn the
// desirable-difficulty bonus.
const PRACTICE_S_GAIN = 1.6; // 1.3 + 0.43·0.7
const REVIEW_S_GAIN = 1.8; // 1.3 + 0.71·0.7

export type PlanAction = "learn" | "practice" | "review";

export interface PlanItem {
  conceptId: string;
  conceptName: string;
  chapterName: string;
  action: PlanAction;
  reason: string;
}

export interface PlanDay {
  /** yyyy-mm-dd (local) */
  dateISO: string;
  label: string;
  weekday: string;
  offset: number;
  items: PlanItem[];
}

export type PlanStatus = "ready" | "close" | "at-risk";

export interface PlanConcept {
  conceptId: string;
  name: string;
  chapterName: string;
  startMastery: number;
  startRecall: number;
  projectedMastery: number;
  projectedRecall: number;
  learn: boolean;
  practice: number;
  review: number;
  sessions: number;
  status: PlanStatus;
}

export interface ExamPlan {
  examDateISO: string;
  generatedAtISO: string;
  daysToExam: number;
  conceptCount: number;
  totalSessions: number;
  estMinutes: number;
  projectedAvgRecall: number;
  readyCount: number;
  tight: boolean;
  days: PlanDay[];
  concepts: PlanConcept[];
  emptyReason?: string;
}

export interface BuildOptions {
  examDateISO: string;
  chapterIds: string[];
  now?: Date;
  maxPerDay?: number;
}

interface SelectedTopic extends TopicNode {
  chapterName: string;
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function dayISO(ms: number): string {
  const d = new Date(ms);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function labelFor(offset: number, ms: number): string {
  if (offset === 0) return "Today";
  if (offset === 1) return "Tomorrow";
  return new Date(ms).toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
}

function weekdayFor(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { weekday: "long" });
}

function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

// Same shape as retrievability() in bkt.server.ts and the dashboard's own
// client-side calc: R = e^(-Δt/S), with 0.5 as the "never studied" placeholder.
function currentRecall(t: SelectedTopic, nowMs: number): number {
  if (!t.last_reviewed_at) return 0.5;
  const days = Math.max(0, (nowMs - new Date(t.last_reviewed_at).getTime()) / DAY);
  return Math.exp(-days / Math.max(0.1, t.stability));
}

/**
 * How many practice sessions to clear the mastery target, and the mastery
 * trajectory they produce (diminishing returns towards 1).
 */
function planPractice(
  startMastery: number,
  needLearn: boolean,
): { count: number; projected: number } {
  let m = startMastery;
  if (needLearn && m < 0.2) m = 0.2; // a viewed lesson seeds a floor
  if (m >= MASTERY_TARGET) return { count: 0, projected: m };
  let count = 0;
  while (m < MASTERY_TARGET && count < 3) {
    m = m + (1 - m) * 0.3;
    count++;
  }
  return { count, projected: m };
}

function neededReviewCount(stabilityAfterPractice: number, daysToExam: number): number {
  const anchorGap = daysToExam >= 6 ? 2 : 1;
  const sNeeded = anchorGap / -Math.log(EXAM_RECALL_TARGET);
  let s = Math.max(0.5, stabilityAfterPractice);
  let count = 0;
  while (s < sNeeded && count < 3) {
    s *= REVIEW_S_GAIN;
    count++;
  }
  // Always at least one consolidation pass if the exam is more than a day away.
  return daysToExam >= 2 ? Math.max(1, count) : count;
}

export function buildExamPlan(subjects: SubjectTree[], opts: BuildOptions): ExamPlan {
  const now = opts.now ?? new Date();
  const nowMs = startOfDay(now);
  const examMs = startOfDay(new Date(opts.examDateISO));
  const daysToExam = Math.round((examMs - nowMs) / DAY);
  const maxPerDay = opts.maxPerDay ?? DEFAULT_MAX_PER_DAY;
  const generatedAtISO = now.toISOString();

  const base: ExamPlan = {
    examDateISO: opts.examDateISO,
    generatedAtISO,
    daysToExam,
    conceptCount: 0,
    totalSessions: 0,
    estMinutes: 0,
    projectedAvgRecall: 0,
    readyCount: 0,
    tight: false,
    days: [],
    concepts: [],
  };

  const chapterSet = new Set(opts.chapterIds);
  const selected: SelectedTopic[] = [];
  for (const s of subjects) {
    for (const ch of s.chapters) {
      if (!chapterSet.has(ch.id)) continue;
      for (const t of ch.topics) selected.push({ ...t, chapterName: ch.name });
    }
  }

  if (opts.chapterIds.length === 0)
    return { ...base, emptyReason: "Pick at least one chapter to plan around." };
  if (selected.length === 0) return { ...base, emptyReason: "Those chapters have no topics yet." };
  if (!Number.isFinite(daysToExam) || daysToExam <= 0)
    return {
      ...base,
      conceptCount: selected.length,
      emptyReason: "Choose an exam date in the future.",
    };

  // Weakest first: lowest current recall, then lowest mastery.
  selected.sort((a, b) => {
    const ra = currentRecall(a, nowMs);
    const rb = currentRecall(b, nowMs);
    if (Math.abs(ra - rb) > 0.02) return ra - rb;
    return a.mastery - b.mastery;
  });

  // day offset -> items
  const byDay = new Map<number, PlanItem[]>();
  const pushItem = (offset: number, item: PlanItem) => {
    const o = Math.max(0, Math.min(daysToExam - 1, offset));
    const list = byDay.get(o) ?? [];
    list.push(item);
    byDay.set(o, list);
  };

  const lastDay = Math.max(0, daysToExam - 1);
  const reviewAnchor = Math.max(0, daysToExam - (daysToExam >= 6 ? 2 : 1));
  const practiceEnd = Math.max(1, Math.min(reviewAnchor - 1, Math.floor(daysToExam * 0.55)));
  const reviewGaps = [4, 8, 11];

  const planConcepts: PlanConcept[] = [];
  let learnRotor = 0;

  selected.forEach((t, rank) => {
    const startMastery = t.mastery;
    const startRecall = currentRecall(t, nowMs);
    const needLearn = !t.has_viewed_lesson;

    const { count: practiceCount, projected: projectedMastery } = planPractice(
      startMastery,
      needLearn,
    );

    // Stability after the learn + practice block, before spaced reviews.
    let stability = Math.max(0.5, t.stability);
    if (needLearn) stability = Math.max(stability, 1);
    for (let i = 0; i < practiceCount; i++) stability *= PRACTICE_S_GAIN;

    const reviewCount = neededReviewCount(stability, daysToExam);

    // --- choose distinct, spaced touch days for this concept ---
    const used = new Set<number>();
    const claim = (want: number, min: number, max: number): number | null => {
      const lo = Math.max(0, min);
      const hi = Math.min(lastDay, max);
      if (lo > hi) return null;
      const best = Math.min(hi, Math.max(lo, want));
      for (let step = 0; step <= hi - lo; step++) {
        for (const cand of [best + step, best - step]) {
          if (cand >= lo && cand <= hi && !used.has(cand)) {
            used.add(cand);
            return cand;
          }
        }
      }
      return null;
    };

    const touches: { off: number; action: PlanAction; reason: string }[] = [];

    let learnOff = -1;
    if (needLearn) {
      learnOff = claim(learnRotor % 3, 0, Math.min(lastDay, 3)) ?? claim(0, 0, lastDay) ?? 0;
      learnRotor++;
      touches.push({
        off: learnOff,
        action: "learn",
        reason: "New topic — start with the lesson.",
      });
    }

    const pStart = needLearn ? learnOff + 1 : 0;
    const pSpan = Math.max(pStart, practiceEnd);
    let lastPracticeOff = pStart;
    for (let k = 0; k < practiceCount; k++) {
      const frac = practiceCount <= 1 ? 0.35 : k / (practiceCount - 1);
      // Rotate the target day by concept rank so concepts fan across the window
      // instead of all landing on the same two days.
      const span = Math.max(1, pSpan - pStart + 1);
      const want = pStart + ((Math.round((pSpan - pStart) * frac) + rank) % span);
      const off = claim(want, pStart, pSpan) ?? claim(want, 0, reviewAnchor - 1);
      if (off === null) continue;
      lastPracticeOff = Math.max(lastPracticeOff, off);
      touches.push({
        off,
        action: "practice",
        reason:
          k === 0
            ? `Mastery ${pct(startMastery)} — build it toward ${pct(MASTERY_TARGET)}.`
            : "Another practice pass to push mastery up.",
      });
    }

    // Reviews: the LAST one lands on the shared pre-exam anchor for every concept
    // (so recall peaks *at* the exam, per the spaced-repetition goal); earlier
    // reviews step back by the expanding gaps with a small rank jitter so they
    // don't all fall on the same days. claim()'s ±search fans out collisions.
    const rMin = Math.min(reviewAnchor, lastPracticeOff + 1);
    const reviewOffs: number[] = [];
    let simStability = stability;
    let wantDay = reviewAnchor;
    for (let k = 0; k < reviewCount; k++) {
      if (wantDay < rMin) break;
      // Last review may use the final day too; earlier ones stay at/behind the anchor.
      const rMax = k === 0 ? lastDay : reviewAnchor;
      const off = claim(wantDay, rMin, rMax);
      if (off !== null) {
        reviewOffs.push(off);
        simStability *= REVIEW_S_GAIN;
      }
      wantDay -= reviewGaps[Math.min(k, reviewGaps.length - 1)] + (rank % 2);
    }
    reviewOffs.sort((a, b) => a - b);
    const placedReviews = reviewOffs.length;
    reviewOffs.forEach((off, k) => {
      touches.push({
        off,
        action: "review",
        reason:
          k === placedReviews - 1
            ? "Final pass — lock it in before the exam."
            : "Spaced review — the gap to the next one widens.",
      });
    });

    for (const touch of touches) {
      pushItem(touch.off, {
        conceptId: t.id,
        conceptName: t.name,
        chapterName: t.chapterName,
        action: touch.action,
        reason: touch.reason,
      });
    }

    // --- projected recall on exam day ---
    const offs = touches.map((x) => x.off);
    const lastTouch = offs.length ? Math.max(...offs) : null;
    let projectedRecall: number;
    if (lastTouch === null) {
      const anchorDays = t.last_reviewed_at
        ? (nowMs - new Date(t.last_reviewed_at).getTime()) / DAY + daysToExam
        : daysToExam;
      projectedRecall = Math.exp(-Math.max(0, anchorDays) / Math.max(0.1, t.stability));
    } else {
      const gap = daysToExam - lastTouch;
      const sFinal = placedReviews ? simStability : stability;
      projectedRecall = Math.exp(-Math.max(0, gap) / Math.max(0.1, sFinal));
    }
    projectedRecall = Math.max(0, Math.min(0.999, projectedRecall));

    const status: PlanStatus =
      projectedRecall >= EXAM_RECALL_TARGET && projectedMastery >= MASTERY_TARGET
        ? "ready"
        : projectedRecall >= 0.68
          ? "close"
          : "at-risk";

    planConcepts.push({
      conceptId: t.id,
      name: t.name,
      chapterName: t.chapterName,
      startMastery,
      startRecall,
      projectedMastery,
      projectedRecall,
      learn: needLearn,
      practice: practiceCount,
      review: placedReviews,
      sessions: touches.length,
      status,
    });
  });

  // --- capacity balancing: nudge overflow to the nearest day with room ---
  const priority: Record<PlanAction, number> = { learn: 0, practice: 1, review: 2 };
  let tight = false;
  for (let off = 0; off <= lastDay; off++) {
    const list = byDay.get(off);
    if (!list || list.length <= maxPerDay) continue;
    list.sort((a, b) => priority[a.action] - priority[b.action]);
    const overflow = list.splice(maxPerDay);
    byDay.set(off, list);
    for (const item of overflow) {
      let placed = false;
      for (let d = 1; d <= lastDay && !placed; d++) {
        for (const cand of [off + d, off - d]) {
          if (cand < 0 || cand > lastDay) continue;
          // Keep reviews at or after the day they were scheduled.
          if (item.action === "review" && cand < off) continue;
          const target = byDay.get(cand) ?? [];
          if (target.length >= maxPerDay) continue;
          // Never put the same concept on a day it already occupies.
          if (target.some((x) => x.conceptId === item.conceptId)) continue;
          target.push(item);
          byDay.set(cand, target);
          placed = true;
          break;
        }
      }
      if (!placed) {
        (byDay.get(off) ?? []).push(item);
        tight = true;
      }
    }
  }

  const days: PlanDay[] = [];
  const order: Record<PlanAction, number> = { learn: 0, practice: 1, review: 2 };
  for (let off = 0; off < daysToExam; off++) {
    const raw = byDay.get(off);
    if (!raw || raw.length === 0) continue;
    // Collapse any accidental (concept, action) repeats within a day.
    const seen = new Set<string>();
    const list = raw.filter((it) => {
      const key = it.conceptId + it.action;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const ms = nowMs + off * DAY;
    list.sort(
      (a, b) => order[a.action] - order[b.action] || a.conceptName.localeCompare(b.conceptName),
    );
    days.push({
      dateISO: dayISO(ms),
      label: labelFor(off, ms),
      weekday: weekdayFor(ms),
      offset: off,
      items: list,
    });
  }

  const totalSessions = planConcepts.reduce((n, c) => n + c.sessions, 0);
  const estMinutes = planConcepts.reduce(
    (n, c) => n + (c.learn ? 8 : 0) + c.practice * 4 + c.review * 3,
    0,
  );
  const projectedAvgRecall = planConcepts.length
    ? planConcepts.reduce((n, c) => n + c.projectedRecall, 0) / planConcepts.length
    : 0;
  const readyCount = planConcepts.filter((c) => c.status === "ready").length;

  return {
    ...base,
    conceptCount: planConcepts.length,
    totalSessions,
    estMinutes,
    projectedAvgRecall,
    readyCount,
    tight,
    days,
    concepts: planConcepts,
  };
}
