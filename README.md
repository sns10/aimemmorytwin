# MemoryTwin

> A living **digital twin of a student's memory**. MemoryTwin models what a
> learner knows, what they are forgetting, and what they should study **right
> now** — then renders that state as an interactive 3D brain and a lane-based
> daily plan.

Seeded demo: 10th-grade Chemistry. The engine is subject-agnostic.

- **Live demo:** https://aimemmorytwin.lovable.app
- **Deep-dive context:** [`CONTEXT.md`](./CONTEXT.md)
- **Submission brief:** [`SUBMISSION.md`](./SUBMISSION.md)

---

## Table of contents

1. [What it does](#what-it-does)
2. [Screenshots](#screenshots)
3. [How to run it locally](#how-to-run-it-locally)
4. [Architecture snapshot](#architecture-snapshot)
5. [Data model](#data-model)
6. [Algorithms — BKT + FSRS-lite pseudocode](#algorithms--bkt--fsrs-lite-pseudocode)
7. [Lane assignment](#lane-assignment)
8. [Where AI is used](#where-ai-is-used)
9. [Evidence & sanity checks](#evidence--sanity-checks)
10. [Limitations & safeguards](#limitations--safeguards)
11. [Project layout](#project-layout)
12. [License](#license)

---

## What it does

- Maintains a **per-concept probabilistic model** of the student's mind
  (mastery + memory stability), not a lesson-completion tracker.
- Renders that state as a **3D brain** where each concept is a node whose
  color, size, and pulse encode mastery and forgetting risk.
- Ranks the next best activity across **4 lanes**: Learn → Practice → Apply → Review.
- Produces an AI **Daily Synapse briefing** and **misconception explanations**
  the moment a student misses a question.
- Anchors all of the above to a real curriculum tree:
  Subject → Chapter → Topic → Lesson → Quiz → Assignment.

---

## Screenshots

> Add PNGs/GIFs under `docs/screenshots/` and reference them here.

| View | File |
| --- | --- |
| Dashboard — 3D brain + Daily Synapse + lanes | `docs/screenshots/dashboard.png` |
| Study Plan lane recommendation with "Top pick" reasoning | `docs/screenshots/lanes.png` |
| Quiz — "Why you missed it" misconception card | `docs/screenshots/misconception.png` |
| Retention chart — forgetting curves w/ 80% threshold | `docs/screenshots/retention.png` |
| Concept detail — mastery %, stability, next review, event log | `docs/screenshots/concept-detail.png` |

Short screencast: `docs/demo.gif` (60–90 s walkthrough of the loop:
answer question → brain node updates → lane re-ranks → AI card appears).

---

## How to run it locally

### Prerequisites

- **Node.js ≥ 20**
- **[Bun](https://bun.sh) ≥ 1.1** (package manager used in this repo — see `bunfig.toml`)
- A **Supabase** project (Postgres + Auth). On Lovable Cloud this is provisioned for you.
- A **Lovable AI Gateway key** (Gemini 2.5 Flash for briefings / explanations / grading).

### 1. Install

```bash
git clone https://github.com/<you>/memorytwin.git
cd memorytwin
bun install
```

### 2. Environment variables

Create `.env` at the project root. `.env` is git-ignored — never commit it.

```bash
# Public (browser-safe) — Vite exposes VITE_* to the client bundle
VITE_SUPABASE_URL="https://<project-ref>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<publishable-anon-key>"
VITE_SUPABASE_PROJECT_ID="<project-ref>"

# Server-only — used by createServerFn handlers
SUPABASE_URL="https://<project-ref>.supabase.co"
SUPABASE_PUBLISHABLE_KEY="<publishable-anon-key>"
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"   # server only, never expose

# AI
LOVABLE_API_KEY="<lovable-ai-gateway-key>"
```

> On Lovable Cloud, these are injected into the runtime automatically —
> you do not need a local `.env` when running inside the Lovable editor.

### 3. Database — migrations & seed

Migrations live in `supabase/migrations/`. Apply them and seed the demo
curriculum (10th-grade Chemistry, ~30 concepts, 50 tagged questions):

```bash
# with the Supabase CLI
supabase db push          # apply migrations
supabase db seed          # seed subjects/chapters/topics/concepts/questions
```

Every `public` table has explicit `GRANT`s and RLS scoped to the demo
student.

### 4. Run the dev server

```bash
bun run dev
```

Vite serves the app at http://localhost:8080. TanStack Start handles SSR and
`createServerFn` handlers on the same runtime — there is no separate API
process to start.

### 5. Typecheck / lint / build

```bash
bunx tsgo --noEmit     # strict TypeScript typecheck
bun run lint           # ESLint
bun run build          # production build
```

### 6. Deploy

Click **Publish** in the Lovable editor (or push to GitHub with the Lovable
GitHub sync enabled). The Worker runtime hosts SSR + server functions; the
Supabase project hosts Postgres + Auth + Storage.

---

## Architecture snapshot

```text
 ┌──────────────────────────────────────────────────────────────┐
 │ Frontend  (React 19 + TanStack Start v1 + Vite 7)            │
 │  • Routing/state:  TanStack Router + TanStack Query          │
 │  • UI:             Tailwind v4 (oklch tokens) + shadcn/ui    │
 │  • 3D:             react-three-fiber + drei (OrbitControls)  │
 │  • Charts:         hand-rolled SVG (RetentionChart)          │
 └───────────────┬──────────────────────────────────────────────┘
                 │ useSuspenseQuery / useServerFn  (RPC)
                 ▼
 ┌──────────────────────────────────────────────────────────────┐
 │ Server functions  (createServerFn — same edge runtime)       │
 │  • memorytwin.functions.ts  overview + AI briefing/explain   │
 │  • course.functions.ts      tree fetch + AI grading          │
 │  • bkt.server.ts            pure math (BKT + FSRS-lite)      │
 └───────────────┬──────────────────────────────────────────────┘
                 │ SQL (RLS-scoped, publishable key = user)
                 ▼
 ┌──────────────────────────────────────────────────────────────┐
 │ Postgres  (Supabase / Lovable Cloud)                         │
 │  subjects · chapters · topics · concepts · questions         │
 │  knowledge_states · learning_events · assignments · ...      │
 └──────────────────────────────────────────────────────────────┘
                 ▲
                 │  Lovable AI Gateway  (Gemini 2.5 Flash)
                 │  briefings · misconception "why" · rubric grade
```

### Ownership boundaries

| Concern | Runs where | Sync / Async |
| --- | --- | --- |
| BKT posterior + transition update | `bkt.server.ts` (server fn) | **Sync** — awaited on the answer submit |
| FSRS stability + `next_review_at` scheduling | `bkt.server.ts` (server fn) | **Sync** — same DB txn as the attempt row |
| Optimistic mastery bar / brain node | React client | **Sync** — updates before the server round-trip resolves |
| Query cache invalidation → brain/chart/lanes refresh | TanStack Query | **Sync** — triggered by mutation success |
| Misconception "Why you missed it" | `explainMisconception` server fn → AI Gateway | **Async** — streams into card after the score updates |
| Daily Synapse briefing | `memorytwin.functions.ts` → AI Gateway | **Async** — cached per-day per-student |
| Assignment grading (free-response) | `course.functions.ts` → AI Gateway | **Async** — rubric-scored, fed back into BKT as weighted attempt |

**No FastAPI, no Edge Functions, no separate worker.** Everything the
original PRD described as "the Python service" is a TanStack `createServerFn`
handler colocated with the app.

---

## Data model

Simplified — see `src/integrations/supabase/types.ts` for the full generated
schema.

```text
subjects ─┐
          └── chapters ─┐
                        └── topics ─┐
                                    └── concepts ─┐
                                                  ├── prerequisite edges
                                                  ├── lesson_content     (Learn lane)
                                                  ├── questions          (Practice lane)
                                                  └── assignments        (Apply lane)

students ─┬── knowledge_states     (the twin, 1 row per (student, concept))
          ├── learning_events      (append-only attempt log)
          └── assignment_submissions
```

### `knowledge_states` (the twin row)

| Column | Type | Meaning |
| --- | --- | --- |
| `student_id` | uuid | FK → `students.id` |
| `concept_id` | uuid | FK → `concepts.id` |
| `p_know` | numeric | BKT posterior mastery ∈ (0, 1) |
| `stability_days` | numeric | FSRS memory stability `S` |
| `last_seen_at` | timestamptz | last attempt time |
| `next_review_at` | timestamptz | scheduled at retrievability = 0.80 |
| `stage` | enum | Learn / Practice / Apply / Master / Review |

### `learning_events` (attempt log)

`(id, student_id, concept_id, question_id, is_correct, response_ms,
p_know_before, p_know_after, stability_before, stability_after, created_at)`

### `questions`

`(id, concept_id, prompt, choices[], correct_index, difficulty ∈ [0,1],
prerequisites uuid[], concept_tags text[])`

### `concepts` + prerequisite edges

Prerequisites are stored as a `uuid[]` on `concepts` (small graph, no join
table needed at this scale). The BKT update reads prereq mastery to gate the
effective learn rate — see below.

---

## Algorithms — BKT + FSRS-lite pseudocode

Two independent probabilistic models run per `(student, concept)`. Both live
in [`src/lib/bkt.server.ts`](./src/lib/bkt.server.ts) as pure functions.

### On every attempt

```text
function recordAttempt(student, question, isCorrect, now):
    state   ← knowledge_states[(student, question.concept)]
    params  ← bkt_params(question.concept)          # {pInit, pLearn, pGuess, pSlip}
    d       ← question.difficulty                    # 0..1
    prereqM ← mean(p_know for c in question.concept.prerequisites)

    # ── 1. Difficulty-modulated guess / slip ──────────────────────
    pGuess_eff ← clamp(params.pGuess * (1.2 - d), 0.02, 0.5)
    pSlip_eff  ← clamp(params.pSlip  * (0.6 + d), 0.02, 0.5)

    # ── 2. Bayesian evidence step ────────────────────────────────
    pL ← state.p_know
    if isCorrect:
        posterior = pL*(1 - pSlip_eff) /
                    ( pL*(1 - pSlip_eff) + (1 - pL)*pGuess_eff )
    else:
        posterior = pL*pSlip_eff /
                    ( pL*pSlip_eff + (1 - pL)*(1 - pGuess_eff) )

    # ── 3. Prereq-gated learning transition ──────────────────────
    pLearn_eff = clamp(params.pLearn * (0.3 + prereqM), 0.02, 0.5)
    p_know_new = posterior + (1 - posterior) * pLearn_eff

    # ── 4. FSRS-lite stability update ────────────────────────────
    if isCorrect:
        S_new = state.stability_days * (1.3 + d*0.7)   # desirable difficulty
    else:
        S_new = state.stability_days * (0.4 + (1-d)*0.2)  # lapse

    # ── 5. Schedule next review at R = 0.80 threshold ────────────
    #     R(t) = exp(-t/S)  ⇒  t = -S · ln(0.80)
    next_review_at = now + (-S_new * ln(0.80)) days

    persist knowledge_states + append learning_events
    return { p_know_new, stability_new, next_review_at }
```

### Retrievability (used by the Review lane and RetentionChart)

```text
R(t) = exp( -Δt / S )       # Δt = days since last_seen_at
```

### Why two models?

- **BKT** answers *"do they understand it?"* — a latent skill probability.
- **FSRS** answers *"will they remember it tomorrow?"* — decay over time.

A concept can be **mastered but fading**, or **understood but shaky**.

---

## Lane assignment

Lanes are the cross-product of the two signals, with explicit thresholds
(defaults; tune in `src/components/StudyPlan.tsx`):

```text
                           low retrievability      high retrievability
                           R(t) < 0.80              R(t) ≥ 0.80
 low mastery   p_know<0.6   PRACTICE                LEARN
 high mastery  p_know≥0.6   REVIEW                  APPLY
```

Ranking within each lane:

| Lane | Rank by | "Top pick" reasoning chip |
| --- | --- | --- |
| **Learn** | prerequisite readiness ↓, course order | "prereqs met" |
| **Practice** | `p_know` ↑ (weakest first) | "38% mastery" |
| **Apply** | `p_know` ↓ (strongest first) | "ready for transfer" |
| **Review** | `R(t)` ↑ (most-faded first) | "62% recall probability" |

---

## Where AI is used

> Pedagogy is deterministic math. AI is used for **explanations, not decisions**.

| Use | Model | Trigger | On critical path? |
| --- | --- | --- | --- |
| Daily Synapse briefing | Gemini 2.5 Flash | dashboard load, cached per-day | No |
| Misconception "why" | Gemini 2.5 Flash | wrong answer submitted | No — streams after mastery updates |
| Assignment grading | Gemini 2.5 Flash | Apply-lane submission | No — async, feeds BKT as weighted attempt |

A hallucination guard grounds every AI call in the current concept catalog —
the briefing cannot recommend a topic that isn't in the student's tree.

---

## Evidence & sanity checks

> Full evaluation harness is WIP. What ships today:

- **Monotonicity test**: a simulated learner answering correctly N times in a
  row must have strictly non-decreasing `p_know` and non-decreasing `S`.
  Verified for N = 1..50 across difficulty ∈ {0.2, 0.5, 0.8}.
- **Guess/slip smoothing**: on an *easy* item (d=0.2), a single lucky hit
  moves `p_know` less than on a *hard* item (d=0.8) — consistent with
  Corbett & Anderson's expected posterior curves.
- **Prereq gating**: with prereq mastery = 0, the effective learn rate drops
  to ~30% of base — a student can't "skip ahead" into inflated mastery.
- **Retention scheduler**: `next_review_at` computed from
  `t = -S · ln(0.80)` matches the RetentionChart's 80% threshold line to
  within rounding.

### Planned (roadmap)

- Simulated cohort of 500 learners with known true skill; measure
  **calibration** of `p_know` vs. observed correctness (reliability diagram).
- **Retention uplift proxy**: compare lane-driven review order vs. random
  review order on simulated forgetting curves — expect ~2× longer retention
  at the 7-day mark, consistent with spaced-repetition literature.
- **Queue quality**: % of overdue concepts surfaced in the top-3 of the
  Review lane; % of at-risk concepts covered per session.

---

## Limitations & safeguards

- **Decision support, not grading authority.** MemoryTwin's mastery estimate
  is a probability, not a grade. It recommends the next activity; it does
  not certify a student.
- **Uncertainty in low-data concepts.** With <3 attempts on a concept,
  `p_know` is dominated by the `pInit` prior — the UI should communicate
  that as "still learning about you" (planned; today it renders the raw
  probability).
- **Anti-overfitting.** BKT parameters are seeded defaults, not fit from
  student data yet. This is deliberate for the MVP — no overfit to a small
  demo cohort. EM-based per-concept parameter fitting is a roadmap item.
- **Single-student demo.** RLS policies exist but are permissive for the
  seeded demo user. Before multi-tenant use, tighten policies to
  `auth.uid() = student_id` and add the standard `user_roles` + `has_role()`
  admin path.
- **AI is bounded.** No AI call decides mastery, stage, or scheduling —
  those are deterministic. AI outputs are advisory text; a wrong explanation
  cannot corrupt the twin state.
- **Privacy.** Attempt logs are per-student and RLS-scoped. No third-party
  analytics on learner content. AI calls send only the current question,
  the student's answer, and the concept name — no full history.

---

## Project layout

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
    Onboarding.tsx          # 5-step tour, drives 3D + lane highlights
  lib/
    bkt.server.ts           # Canonical 4-param BKT + FSRS-lite
    memorytwin.functions.ts # Overview, briefing, misconception AI
    course.functions.ts     # Tree fetch, progress, AI grading
    stage.ts                # Learn→Practice→Apply→Master→Review FSM
  styles.css                # Tailwind v4 tokens, paper-grid, typography
supabase/
  migrations/               # schema + GRANTs + RLS + seed
```

---

## License

MIT — see [`LICENSE`](./LICENSE).

---

*Built with TanStack Start, Supabase (Lovable Cloud), react-three-fiber, and
the Lovable AI Gateway.*
*See [`CONTEXT.md`](./CONTEXT.md) for the deep technical narrative and
[`SUBMISSION.md`](./SUBMISSION.md) for the 1.5-page brief.*
