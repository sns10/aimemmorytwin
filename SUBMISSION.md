# MemoryTwin

**A live digital twin of a student's memory that tells them exactly what to study next.**

---

## The problem

Students don't know what to study next, and the tools they use don't know either. Course players march linearly through videos regardless of what the learner already understands. Flashcard apps schedule reviews without any model of *understanding* — a lucky guess and a real grasp look identical. LMS dashboards proudly display activity — hours logged, streaks maintained — while saying nothing about knowledge.

Two invisible failures compound underneath all of this. The first is **forgetting**: Ebbinghaus decay is silent, so material learned last week quietly evaporates until an exam exposes it. The second is **shallow mastery**: a student can score 80% on a quiz by guessing on the two hardest items and still not understand the concept. Both failures hide in plain sight until it's too late to fix them.

The result is the pattern every learner recognises — wasted study time, last-minute cramming, and confidence that collapses on exam day.

## Who it affects

- **Secondary-school students** preparing for high-stakes board and entrance exams, where the syllabus is large, the timeline is fixed, and forgetting is the dominant cost. Our seeded demo is 10th-grade Chemistry, but the model is subject-agnostic.
- **Self-directed learners on MOOCs**, who drop off in the majority because nothing tells them where they actually stand or what to do next.
- **Under-resourced learners** without a private tutor to diagnose weak spots — the exact group for whom adaptive software should matter most.
- **Teachers and parents**, who need per-concept diagnostics rather than a single quiz score to know where to intervene.

## Why existing solutions fail

- **Khan Academy, Coursera, Byju's, and most video-first platforms** are linear. They have no per-concept probabilistic model, no forgetting curve, and no notion that mastery decays.
- **Anki, Quizlet, and other SRS tools** get spacing right but have no understanding model. They treat every correct answer as equal evidence, so a guessed answer is indistinguishable from a real one.
- **Duolingo-style adaptive engines** work well inside one domain but are proprietary, opaque, and non-transferable. A student can't see *why* an item was chosen.
- **General-purpose ChatGPT tutors** are stateless. They have no persistent memory of what the learner knows, no scheduling, and cheerfully hallucinate confidence in the student's grasp.

The common gap is the same in every case: none of these systems maintain a **persistent, auditable, per-student per-concept state that combines *understanding* and *retention*.** Without that state, the recommendation "what should I study next?" can only be guessed at.

## Our approach

MemoryTwin is built around one central idea: model the mind, then render it.

**The twin.** For every (student, concept) pair we keep a single row storing a probability of mastery `p_know`, a memory `stability_days`, and a `next_review_at` timestamp. This is a live model of what the learner knows, not a log of what they clicked. Every quiz attempt is an observation that updates this state.

**Two orthogonal models, one plan.** We run two independent probabilistic models per concept:

1. *Mastery* is tracked with the canonical 4-parameter **Bayesian Knowledge Tracing** model (Corbett & Anderson, 1995), extended with item-difficulty modulation of guess/slip and prerequisite-gated learning rates. A lucky guess on a hard item moves the posterior less than a correct answer on an easy one — the math sees through it.
2. *Retention* is tracked with an Ebbinghaus / FSRS-lite exponential decay, `R(t) = exp(−t / S)`, where stability `S` grows on successful recall and shrinks on lapse.

The cross-product of these two axes — understanding × retrievability — becomes the four lanes of the daily Study Plan: **Learn** (unmastered, unfamiliar), **Practice** (weak understanding), **Apply** (mastered, stretch it), and **Review** (mastered but fading). The student always sees the single best next activity, and *why* it was chosen.

**Deterministic math, generative language.** Recommendations are auditable Bayesian updates — reproducible, explainable, and free of model drift. AI (Gemini 2.5 Flash via the Lovable AI Gateway) is used only for *explanation*: a "Daily Synapse" briefing that turns the twin state into natural language, misconception feedback delivered the moment a student answers wrong, and rubric-based grading of free-response Apply-lane tasks. The LLM never overrides the math; it interprets it.

**The brain as a literal state view.** The dashboard renders every concept as a node in a 3D react-three-fiber point cloud. Colour encodes state (consolidated, building, fading), size encodes mastery, and pulse intensity encodes forgetting risk. Hovering a node is, quite literally, hovering a probability distribution stored in the database.

## Why it works

Spaced repetition is one of the most robustly replicated results in cognitive science, roughly doubling long-term retention against massed practice. BKT gives concept-level diagnostic granularity, so remediation is surgical rather than "re-watch the chapter". Prerequisite-gated learn rates prevent the illusion of progress where a student inflates mastery on a concept they can't actually support. Misconception explanations arrive at the moment of error — the highest-leverage feedback window, when the wrong idea is still active in working memory. And an optimistic UI keeps the answer-to-feedback loop under 100 ms, preserving the felt responsiveness that sustains flow.

## Status

MemoryTwin is a working full-stack build on TanStack Start with Lovable Cloud (Postgres + row-level security) and the Lovable AI Gateway. It ships seeded with 10th-grade Chemistry, fifty tagged questions, and a full course tree — Subject → Chapter → Topic → Lesson → Quiz → Assignment — wired end-to-end into the twin, so the probabilistic layer is always anchored to real curriculum. The pedagogy is the math; the AI is the voice.