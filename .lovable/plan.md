## What the paper adds that we don't have

Takami, Flanagan, Dai & Ogata (2023) — *Personality-based tailored explainable recommendation*. Their finding: recommendations that carry an **explanation matched to the learner's personality profile** got significantly higher usage (CVR ~2.4x the control) than the same recommendations with only item-characteristic explanations.

Our engine already picks *what* to study (BKT + FSRS ranking, Learn/Practice/Apply/Review lanes). What we do not have is *why-you-should-do-it-now* framing tuned to the learner. That is exactly the paper's contribution, and it sits on top of our recommender without touching the math.

## Feasible vs. not feasible here

**Feasible now**
- Big Five self-assessment (short 10-item TIPI-style scale + a "good at math" confidence item)
- Profiling into the paper's three clusters: Diligent, Fearful, Agreeable
- Persuasive explanation types per profile: Authority / Commitment / Peer
- Quiz-characteristic explanations shown to everyone (the paper's control condition)
- Logging of recommendation impressions and clicks → CVR panel, i.e. their outcome measure

**Not feasible / adapted**
- K-means over 217 real students: we have one demo learner. Adapted → nearest-centroid assignment against the paper's published cluster means (Table 2). Same three profiles, no population data needed.
- "Three top achievers solved this" / "two classmates solved this": we have no real cohort. Adapted → a small seeded synthetic cohort of anonymous peers with per-topic completion counts, clearly labelled as a demo cohort. Commitment explanations ("2 more and you hit today's goal") are fully real — they come from our own event log.
- 18-day A/B experiment: not runnable. Adapted → an in-app toggle (tailored vs. characteristic-only) plus a small metrics panel, so the mechanism is demonstrable and honest.

## What gets built

1. **Personality profiling**
   - New route `/profile` with the 10-item scale (1–7 Likert), scored into O/A/E/C/N + math confidence.
   - Nearest-centroid classifier against the paper's Table 2 means (z-scored) → `diligent | fearful | agreeable`, stored on the student with the raw trait scores.
   - Skippable; no profile ⇒ characteristic-only explanations (control behaviour).

2. **Tailored explanation layer**
   - A pure module that, given (recommended topic, student profile, today's event counts, cohort stats), returns:
     - a **characteristic explanation** — grounded in our own state model: "recall has fallen to 62%", "mastery 0.41, weakest in this chapter", "prerequisite now mastered"
     - a **persuasive explanation** matched to profile: Authority (top-achiever completions) for Diligent, Commitment (daily-goal progress) for Fearful, Peer (classmate completions) for Agreeable
   - Deterministic templates by default, with the option to have Lovable AI phrase the persuasive line from those exact facts — same hallucination guard we already use for the briefing (facts fixed, LLM only words them).

3. **Wiring into the existing UI**
   - Study plan lane cards and the dashboard recommendation list gain a two-line explanation block (characteristic, then persuasive), matching the paper's Fig. 5 layout.
   - Onboarding gains a step explaining why the reason line is personalised.

4. **Engagement measurement**
   - Log `recommendation_impression` and `recommendation_click` events (topic, lane, profile, explanation type).
   - Small panel on `/history`: impressions, clicks, CVR, broken down by explanation mode — the paper's outcome metric, on our own data.

## Technical notes

- New tables: `personality_profiles` (student_id, O/A/E/C/N, math_confidence, cluster, assessed_at) and `cohort_topic_stats` (topic_id, peers_completed, top_achievers_completed) — both with GRANTs and RLS following our existing pattern.
- New `src/lib/personality.server.ts` (centroids, z-scoring, nearest-centroid, explanation templates) + server fns in `src/lib/personality.functions.ts`.
- Recommendation ranking in `getRecommendations` / `StudyPlan` is unchanged — personality affects presentation only, which is precisely the paper's design (explanations are generated independently of how the recommendation is made).
- README/CONTEXT get a short section citing the paper and stating the demo-cohort caveat.
