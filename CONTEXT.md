# MemoryTwin — Project Context

> A living "digital twin" of a student's memory. MemoryTwin models what a learner
> knows, what they are forgetting, and what they should study **right now** — then
> renders that state as an interactive 3D brain and a lane-based daily plan.

---

## 1. What the app is

MemoryTwin is an adaptive learning platform for 10th-grade Chemistry (seeded
demo, generalizable to any subject). Instead of a static course player, it
maintains a **per-concept probabilistic model of the student's mind** and uses
it to drive:

- a **3D brain visualization** where each concept is a node whose color, size,
  and glow encode mastery and forgetting risk;
- a **Study Plan with 4 lanes** — Learn → Practice → Apply → Review — each
  ranked by a different pedagogical signal;
- an **AI "Daily Synapse" briefing** that explains, in natural language, what
  changed since yesterday and what to do next;
- a **structured course tree** (Subject → Chapter → Topic → Lesson → Quiz →
  Assignment) so the probabilistic layer is anchored to real curriculum.

The core promise: *the student never has to guess what to study next.*

---

## 2. Who it helps and how

- **Students** get a single "best next activity" instead of an infinite content
  feed. They see *why* something is recommended ("85% recall probability,
  fading fast") and can resume mid-session — state is persisted per topic.
- **Struggling learners** get AI-generated misconception explanations the
  moment they miss a question, tailored to the specific wrong answer.
- **Advanced learners** get pushed into the Apply lane earlier, unlocking
  transfer/assignment tasks once mastery crosses threshold.
- **Teachers / parents** (future) can read the same twin state as a
  diagnostic — mastery, stability, next review — per concept.

---

## 3. Technology stack

| Layer | Choice |
|---|---|
| Framework | **TanStack Start v1** (React 19, Vite 7, SSR + server functions) |
| Language | TypeScript (strict) |
| Styling | **Tailwind v4** via `src/styles.css`, oklch tokens, Sora + Manrope |
| 3D | **react-three-fiber** + drei (OrbitControls, Fibonacci-sphere point cloud) |
| Data layer | **TanStack Query** wired through router context |
| Backend | **Lovable Cloud** (Postgres + RLS + auth) |
| Server logic | `createServerFn` handlers (`*.functions.ts`) — no separate API |
| AI | **Lovable AI Gateway** → Gemini 2.5 Flash for briefings & explanations |
| Auth | Anonymous demo user (single seeded student for the MVP) |

There is **no FastAPI, no Edge Functions, no separate worker** — everything
that used to be "the Python service" in the original PRD is a TanStack
server function running on the same edge runtime as the app.

---

## 4. How it works end-to-end

```text
          ┌────────────────────────────────────────────┐
          │  UI (React + R3F)                          │
          │  Dashboard · Brain · Study Plan · Quiz     │
          └───────────────┬────────────────────────────┘
                          │ useSuspenseQuery / useServerFn
                          ▼
          ┌────────────────────────────────────────────┐
          │  Server Functions (createServerFn)         │
          │  • memorytwin.functions.ts (AI + overview) │
          │  • course.functions.ts     (tree + grade)  │
          │  • bkt.server.ts           (math engine)   │
          └───────────────┬────────────────────────────┘
                          │ SQL (RLS-scoped)
                          ▼
          ┌────────────────────────────────────────────┐
          │  Postgres  (Lovable Cloud)                 │
          │  subjects · chapters · topics · concepts   │
          │  questions · knowledge_states · events     │
          └────────────────────────────────────────────┘
```

**Every answered question** triggers this loop:

1. Client optimistically updates the concept's mastery bar and brain node.
2. Server function `recordAttempt` runs the BKT update, updates FSRS stability
   and next-review time, and writes a `learning_events` row.
3. Query invalidation refetches the overview → brain, chart, plan re-render
   from the same source of truth.
4. If the answer was wrong, `explainMisconception` streams a 2-sentence AI
   explanation into the "Why you missed it" card.

---

## 5. Data model (essentials)

- `subjects → chapters → topics → concepts` — curriculum tree.
- `questions` — MCQs tagged with `difficulty`, `concept_id`, `prerequisites[]`.
- `knowledge_states(student_id, concept_id)` — the **twin**:
  `p_know`, `stability_days`, `last_seen_at`, `next_review_at`, `stage`.
- `learning_events` — append-only log of every attempt (used for the concept
  detail page and future analytics).
- `assignments` / `lesson_content` — Apply-lane tasks and Learn-lane material.

All public tables have explicit `GRANT`s and RLS scoped to the demo student.

---

## 6. The mathematics

Two independent probabilistic models run per (student, concept):

### 6.1 Mastery — Bayesian Knowledge Tracing (Corbett & Anderson, 1995)

Four parameters per concept: `p_init`, `p_learn`, `p_guess`, `p_slip`.

**Evidence step** (after observing `correct ∈ {0,1}`):

```text
If correct:
    P(Lₙ | correct) = P(Lₙ)·(1−slip) / [ P(Lₙ)·(1−slip) + (1−P(Lₙ))·guess ]
Else:
    P(Lₙ | wrong)   = P(Lₙ)·slip     / [ P(Lₙ)·slip     + (1−P(Lₙ))·(1−guess) ]
```

**Learning step** (prior → posterior for the next attempt):

```text
P(Lₙ₊₁) = P(Lₙ | obs) + (1 − P(Lₙ | obs)) · p_learn_effective
```

where `p_learn_effective` is *gated by prerequisites* — if the student hasn't
mastered the prereqs, the effective learn rate is scaled down. Item
difficulty modulates `guess`/`slip`: harder items reduce guess and inflate
slip, so a lucky guess on a hard item moves mastery less than on an easy one.

### 6.2 Forgetting — Ebbinghaus / FSRS-lite

Retrievability is modeled as exponential decay of stability:

```text
R(t) = exp( −Δt / S )
```

where `S` is memory stability in days and `Δt` is days since last review.
After each attempt, stability is updated:

```text
S ← S · (1 + a · (1 − R) · correct)   // successful recall stretches S
S ← S · b                              // lapse shrinks S
```

Next review is scheduled at the time `R` crosses the target recall (0.80 by
default), which is what the dashed line on the Retention Chart represents.

### 6.3 Why two models?

BKT answers *"do they understand it?"* — a latent skill probability.
FSRS answers *"will they remember it tomorrow?"* — a decay over time.
A concept can be **mastered but fading**, or **understood but shaky**; the
Study Plan lanes are literally the cross-product of these two signals:

```text
                  low retrievability     high retrievability
low mastery       Practice               Learn
high mastery      Review                 Apply
```

---

## 7. Feature map

- **3D Brain (`BrainScene.tsx`)** — Fibonacci-distributed concept nodes;
  color = state (ink / amber / red), size = mastery, pulse = fading risk.
  Hover syncs to the sidebar; the onboarding tour drives the camera.
- **Study Plan lanes (`StudyPlan.tsx`)** — Learn (prereq-ready + course
  order), Practice (lowest mastery), Apply (highest mastery), Review (lowest
  retrievability). Each lane surfaces a "Top pick" with a reasoning chip.
- **Quiz flow (`routes/quiz.tsx`)** — optimistic mastery updates, canonical
  BKT on the server, AI misconception card on wrong answers.
- **Course tree (`routes/course.tsx`, `routes/topic.$id.tsx`)** — full
  Subject/Chapter/Topic hierarchy with a 5-stage checkpoint bar
  (Learn → Practice → Apply → Master → Review) and localStorage resume.
- **Concept detail (`routes/concept.$id.tsx`)** — mastery %, stability days,
  next-review timestamp, and a chronological event log.
- **Retention chart (`RetentionChart.tsx`)** — SVG forgetting curves for all
  concepts over 14 days with the 80% recall threshold line.
- **Daily Synapse briefing** — Gemini-generated summary of what changed and
  what to do today, personalized from the twin state.
- **Onboarding tour (`Onboarding.tsx`)** — 5 steps that drive the 3D brain
  and lane highlights via a `memorytwin:tour-step` custom event.

---

## 8. Where AI is used (and where it isn't)

**AI is used for the *explanations*, not the *decisions*.** The pedagogy is
deterministic math — BKT + FSRS — so recommendations are auditable and
reproducible. The LLM (Gemini 2.5 Flash via Lovable AI Gateway) is used for:

1. **Daily Synapse briefing** — turns the twin state into a 3–4 sentence
   narrative ("You consolidated *stoichiometry* yesterday; *mole concept*
   is fading — 62% recall probability").
2. **Misconception explanations** — takes the question, the student's wrong
   answer, and the correct answer, and returns a 2-sentence "why".
3. **Assignment grading** — free-response Apply-lane tasks get a rubric-based
   AI grade that feeds back into BKT as a weighted attempt.

No AI call is on the critical path of a quiz answer — the UI updates
optimistically from local math, and the AI card streams in after.

---

## 9. What's innovative here

- **Twin, not tracker.** Most edtech stores *what you did*. MemoryTwin stores
  *what you know and what you're forgetting*, and treats the UI as a live
  read of that state.
- **Two orthogonal models, one plan.** Mastery (BKT) and retrievability
  (FSRS) are usually competing frameworks; the lane system uses them as
  independent axes so the "next best action" is never ambiguous.
- **3D brain as literal state view.** The visualization isn't decoration —
  every node's color, size, and pulse is a direct render of a database row.
  Hovering a node is hovering a probability distribution.
- **Deterministic math + generative language.** Decisions are transparent
  Bayesian updates; explanations are LLM-generated. Neither layer can
  silently override the other.
- **Lane-based resume.** A student can spend 4 minutes only in the Review
  lane and the plan re-ranks around them — no forced linear sequence.

---

## 10. Why this is effective

- **Spaced repetition is the most robustly replicated result in learning
  science.** FSRS scheduling alone typically improves long-term retention
  ~2× vs. massed practice.
- **BKT gives per-concept diagnostic granularity**, so remediation targets
  the specific weak node instead of re-teaching a whole chapter.
- **Prerequisite-gated learn rates** prevent the "illusion of progress"
  where a student inflates mastery on a concept they can't actually support.
- **Optimistic UI + server-side truth** means the loop between "answer" and
  "see your brain change" is under 100 ms — the felt responsiveness that
  keeps students in flow.
- **Explanations arrive at the moment of error**, when the misconception is
  still active in working memory — the highest-leverage moment for feedback.

---

## 11. Key files (map)

```text
src/
  routes/
    __root.tsx              # shell, head metadata, providers
    index.tsx               # Dashboard: 3D brain + Daily Synapse + lanes
    course.tsx              # Subject → Chapter → Topic outline
    topic.$id.tsx           # Tabbed workspace + stage checkpoints
    concept.$id.tsx         # Per-concept mastery / stability / event log
    quiz.tsx                # Optimistic quiz flow + AI misconception card
  components/
    BrainScene.tsx          # react-three-fiber point-cloud brain
    StudyPlan.tsx           # 4 lanes, ranking logic, top-pick chips
    RetentionChart.tsx      # SVG forgetting curves
    Onboarding.tsx          # 5-step tour, emits tour-step events
  lib/
    bkt.server.ts           # Canonical 4-param BKT + FSRS-lite
    memorytwin.functions.ts # Overview, briefing, misconception AI
    course.functions.ts     # Tree fetch, progress, AI grading
    stage.ts                # Learn→Practice→Apply→Master→Review FSM
  styles.css                # Tailwind v4 tokens, paper-grid, typography
```

---

*This document is the single source of truth for what MemoryTwin is,
how it computes, and why each piece exists. Update it whenever the model,
lanes, or data shape change.*
