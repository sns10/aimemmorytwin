# Real per-student mathematics after sign-in

## What's actually happening

Your account exists in the database but has **zero** knowledge states, learning events and submissions. The app still shows the demo learner "Alex" because:

- Page data is loaded during the server-rendered first pass, where no signed-in token is available. The session resolver falls back to the shared demo learner, so the first paint is always Alex.
- Nothing seeds a signed-in student's memory model, so even on the real account there is nothing to draw curves from.

## The plan

### 1. Never show demo data to a signed-in user
- Return an `isDemo` flag from every data-loading function so the UI always knows whose numbers it is showing.
- Dashboard, course, topic, review, history and concept pages fetch once the session is known instead of trusting the tokenless server pass — no more Alex flash.
- Refetch everything on sign-in and sign-out (the auth listener already exists; it will now also drive the student switch).

### 2. Clearly labelled guest mode
- Signed-out visitors keep seeing Alex, but every surface with learner numbers (dashboard header, brain view, study plan, retention chart, review queue, concept page) carries a "Demo data — sign in to build your own memory model" badge.
- Guest writes keep working against the demo learner so the demo stays explorable.

### 3. Placement quiz for new accounts
- On first sign-in, if the student has no knowledge states, send them to a new `/placement` flow.
- 6-8 adaptive questions from the existing bank, roughly one per chapter, starting mid-difficulty and moving up or down with correctness (the learning-zone selector already in `src/lib/adaptive.ts`).
- Each answer runs the real BKT update, so placement writes a genuine posterior mastery rather than a guessed number.
- Concepts not directly tested get states seeded from their own `p_init`, adjusted by their chapter's placement result and prerequisite mastery — the whole map starts from evidence, not a flat 0.15.
- Placement answers are stored as learning events with a `placement` kind, so history and explainability show where the starting point came from.
- A "Skip placement" option seeds every concept at its pure `p_init` prior.

### 4. Make every downstream number student-real
- Study plan lanes, urgency ranking, retention curves, streaks, review queue, brain node colours and the AI briefing already read the knowledge-state tables — after steps 1-3 they read the signed-in student's rows.
- Proper empty states for a brand-new student (empty review queue, no streak yet, curves at prior) instead of blank panels.

## Technical notes

- `src/lib/session.server.ts`: keep the demo fallback only when there is genuinely no bearer token; expose `isDemo` on all results.
- Routes touched: `index.tsx`, `course.tsx`, `topic.$id.tsx`, `review.tsx`, `history.tsx`, `concept.$id.tsx` — move the initial fetch to a client-side query pass.
- New: `src/routes/placement.tsx`, `src/lib/placement.functions.ts`, a `placement_completed_at` column on `students`, and a `placement` event kind.
- Placement seeding is one server function doing a batched upsert into `knowledge_states`, reusing `bkt.server.ts` — no new math.
- One migration: add `students.placement_completed_at`; no new tables.