# Plan: Submission document

Create `SUBMISSION.md` at the project root — a focused 1–2 page brief (≈700–900 words) suitable as a hackathon / grant / course submission write-up. It stays distinct from `CONTEXT.md` (which is the technical reference); this document is persuasive and problem-first.

## Structure

1. **Title + one-line pitch**
   *MemoryTwin — a live digital twin of a student's memory that tells them exactly what to study next.*

2. **The Problem (≈150 words)**
   - Students don't know what to study next. Course players are linear; flashcard apps are blind to understanding; LMS dashboards show activity, not knowledge.
   - Two invisible failures compound: **forgetting** (Ebbinghaus decay is silent) and **shallow mastery** (a lucky guess looks identical to real understanding).
   - Result: wasted study time, cramming, and confidence that collapses on exam day.

3. **Who it affects (≈120 words)**
   - Secondary-school students (seed: 10th-grade Chemistry) preparing for high-stakes board / entrance exams.
   - Self-learners on MOOCs who drop off because nothing tells them where they actually stand.
   - Under-resourced learners without a tutor to diagnose weak spots.
   - Teachers who need per-concept diagnostics, not just quiz scores.

4. **Why existing solutions fail (≈180 words)** — short comparison, not a table dump:
   - **Khan Academy / Coursera / Byju's:** linear content, no per-concept probabilistic model, no forgetting curve.
   - **Anki / Quizlet:** great spacing, zero understanding model — treats a lucky guess as knowledge.
   - **Duolingo-style adaptive:** proprietary, single-domain, opaque; no transferable framework.
   - **Generic ChatGPT tutors:** stateless — no memory of what the student knows, no scheduling, hallucinated confidence.
   - Common gap: none maintain a **persistent, auditable per-student per-concept state** that combines *understanding* and *retention*.

5. **Our approach (≈250 words)** — the core novelty:
   - **The twin.** One row per (student, concept) stores `p_know`, `stability_days`, `next_review_at`. This is a live model of the mind, not a log of activity.
   - **Two orthogonal models, one plan.**
     - *Mastery* via canonical 4-parameter Bayesian Knowledge Tracing (Corbett & Anderson 1995) with item-difficulty modulation and prerequisite-gated learning.
     - *Retention* via Ebbinghaus / FSRS-lite exponential decay `R(t) = e^(−t/S)`.
     - The cross-product of these two axes becomes the four Study Plan lanes: **Learn · Practice · Apply · Review**.
   - **Deterministic math + generative language.** Recommendations are auditable Bayesian updates. AI (Gemini 2.5 Flash via Lovable AI Gateway) is used only for *explanation*: the Daily Synapse briefing, misconception feedback the moment a student answers wrong, and rubric-based grading of free-response tasks. AI never overrides the math.
   - **The brain as literal state view.** A 3D react-three-fiber point cloud renders every concept node — color = state, size = mastery, pulse = fading risk. Hovering a node is hovering a probability distribution.

6. **Why it works (≈100 words)**
   - Spaced repetition is the most robustly replicated result in learning science (~2× long-term retention vs. massed practice).
   - BKT gives concept-level diagnostic granularity, so remediation is surgical.
   - Prerequisite-gated learn rates prevent illusion-of-progress.
   - Misconception explanations arrive at the moment of error — the highest-leverage feedback window.
   - Optimistic UI keeps the answer→feedback loop under 100 ms — the felt responsiveness that sustains flow.

7. **Status & stack (≈60 words)**
   One-paragraph mention: built on TanStack Start + Lovable Cloud (Postgres + RLS) + Lovable AI Gateway, seeded with 10th-grade Chemistry and 50 tagged questions. Full course tree (Subject → Chapter → Topic → Lesson → Quiz → Assignment) wired to the twin so the probabilistic layer is anchored to real curriculum.

## Constraints

- Length ≈ 1.5 pages of A4 at 11pt (700–900 words).
- No emojis. Plain markdown, no HTML.
- Written in a submission voice — persuasive, first-person plural, not a README.
- No duplicate of `CONTEXT.md`; this one leads with the problem, not the architecture.
- Only create `SUBMISSION.md` — no other files touched.
