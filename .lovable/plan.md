
# MemoryTwin AI — Hackathon Build Plan

Full app on Lovable stack. Anonymous demo student, Chemistry (Class 10). BKT + FSRS forgetting curve running server-side, quiz loop with optimistic UI, dashboard with cached LLM daily briefing via Lovable AI.

## Stack mapping (PRD → Lovable)

- FastAPI compute layer → TanStack `createServerFn` in `src/lib/*.functions.ts`.
- PostgreSQL → Lovable Cloud (Supabase). Enable Cloud first.
- LLM (Gemini/OpenAI) → Lovable AI Gateway, `google/gemini-3.5-flash`, called server-side.
- No real auth. A single seeded anonymous `student_id` (UUID) stored in `localStorage` on the client; server functions accept it as input and validate against the demo student row.

## Data model (single migration, with GRANTs)

- `concepts(id uuid pk, name text, subject text, difficulty numeric default 0.5, prerequisite_id uuid null, question text, options jsonb, correct_index int)` — concept + one canonical MCQ per concept to keep seed simple.
- `students(id uuid pk, name text, daily_briefing text, briefing_generated_at timestamptz)`.
- `knowledge_states(student_id uuid, concept_id uuid, mastery_probability numeric, memory_stability numeric, last_reviewed_at timestamptz, next_revision_at timestamptz, primary key(student_id, concept_id))`.
- `learning_events(id uuid pk default gen_random_uuid(), student_id uuid, concept_id uuid, is_correct bool, response_time_ms int, difficulty numeric, created_at timestamptz default now())`.
- Seed: 1 demo student "Alex", 10 Chemistry concepts (Atomic Structure, Atomic Mass, Isotopes, Ionic Bonds, Covalent Bonds, Periodic Table Trends, Acids & Bases, pH Scale, Chemical Reactions, Balancing Equations), each with one MCQ (5 options). Seed `knowledge_states` rows at cold-start P(L0)=0.15, S=1 day, next_revision_at = now(). All in the same migration.
- RLS: enable on all tables. For the hackathon demo (no auth), grant SELECT/INSERT/UPDATE to `anon` with permissive policies scoped to reads/writes needed. This is intentional demo posture, documented in code comments.

## Server functions (`src/lib/`)

All use the server publishable Supabase client (no auth). Read `process.env` inside handlers.

- `getStudent.functions.ts` — returns demo student profile + cached `daily_briefing`.
- `getRecommendations.functions.ts` — selects up to 5 concepts where `next_revision_at <= now()` ordered by lowest current retrievability R = exp(-t/S); joins concept question payload.
- `submitEvent.functions.ts` — input: `{student_id, concept_id, is_correct, response_time_ms}`. Inside handler:
  1. Insert row into `learning_events`.
  2. Fetch prior `knowledge_states` row + concept difficulty.
  3. Apply BKT update (formulas exactly from PRD §1.1, constants P(G)=0.20, P(S)=0.10, P(T)=0.05).
  4. Apply FSRS stability update (correct: S*(1.5+D*0.5); incorrect: S*0.5). Compute `next_revision_at = now() + (-S_new * ln(0.8))` days.
  5. Upsert `knowledge_states`. Return new mastery + next_revision_at.
- `generateBriefing.functions.ts` — pulls mastered (>0.9) and at-risk (next_revision_at <= now or R<0.8) concept names, calls Lovable AI (`openai/gpt-5.5` per default, temperature default) with the PRD system prompt, writes result to `students.daily_briefing` + `briefing_generated_at`. Skips regeneration if `briefing_generated_at` is same UTC day AND no new events since.

Note: PRD's "immediate 200 OK + background task" pattern isn't native to server functions. We keep the client optimistic and simply await the server fn in the background (fire-and-forget from the quiz UI). The UI never blocks on it.

## Routes

- `/` (rewrite `src/routes/index.tsx`) — Dashboard.
  - Hero card: LLM briefing (from `getStudent`), CTA "Start Today's 10-Minute Session" → navigates to `/quiz`.
  - Below: knowledge grid — 10 concept cards with mastery % bar and "due for review" pill when `next_revision_at <= now()`.
- `/quiz` — Quiz flow.
  - Loads recommendations via TanStack Query in loader (`ensureQueryData`).
  - 5 questions, 5-option MCQ. On answer: capture `response_time_ms`, optimistic +/-5% bar update, fire `submitEvent` (no await blocking next question), advance.
  - End screen: session summary + "Back to dashboard". Triggers `generateBriefing` invalidation so next dashboard load is fresh.

## Frontend details

- TanStack Query for loaders + `useSuspenseQuery`. Each route has `errorComponent` + `notFoundComponent`.
- Demo student id: generated once and stored in `localStorage`; if missing, server function ensures the seeded "Alex" row and returns its id.
- Styling: keep it warm, not the default AI purple gradient — go with a paper/ink palette (warm off-white bg, deep navy text, single teal accent for progress/CTA). Semantic tokens in `src/styles.css` (no hardcoded colors in components). Serif display font (e.g., Fraunces) + Inter body via `<link>` in `__root.tsx`.
- Update `__root.tsx` head: title "MemoryTwin AI — Your Study Digital Twin", proper description, og/twitter meta.

## Secrets

- Ensure `LOVABLE_API_KEY` via `ai_gateway--create`.

## Out of scope for this build

- Real auth / multi-student.
- Prerequisite graph traversal beyond storing `prerequisite_id`.
- Streaming LLM, analytics dashboards, teacher views.

## Technical risks / notes

- `student.server` split: keep BKT/FSRS math helpers inside handler bodies or in a `bkt.server.ts` file imported by `.functions.ts` (never at module scope of client-reachable files).
- Migration MUST include `GRANT SELECT, INSERT, UPDATE ON public.<table> TO anon` for all four tables (demo posture).
- Seed all math state at cold start so recommendations return results on first visit.
