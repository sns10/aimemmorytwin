# Curriculum Admin + Learning Timeline

Most of your recommended pipeline already exists and runs on real data: quiz engine, immutable `learning_events`, the BKT/FSRS knowledge-state engine, the ranked recommendation lanes, the dashboard, and the review queue. The two genuine gaps are Phase 1 (nobody can author curriculum from inside the app — it only exists because it was seeded by hand) and the explainable mastery timeline.

So this sprint builds exactly those two.

## 1. Admin access control

Curriculum editing is restricted to admins, using a dedicated roles table (never a flag on the student/profile row).

- New `app_role` enum and `user_roles` table, with a security-definer `has_role()` check.
- Content tables (`subjects`, `chapters`, `concepts`, `questions`, `lesson_content`) keep their public read access and gain admin-only create/edit/delete rules.
- Everyone still reads the catalog; only an admin can change it.
- I'll grant the first admin role to your signed-in account during setup so you can open the screens immediately.

## 2. Curriculum admin screens (`/admin`)

A protected section with a sidebar and four managers:

**Subjects** — list, add, rename, description, ordering, delete (blocked if chapters exist).

**Chapters** — filtered by subject; name, summary, order, same CRUD.

**Concepts** — the important one. Form fields: name, subject, chapter, learning objectives, difficulty (0–1 slider), prerequisite concept (dropdown, self/cycle prevented), video URL, concept tags, and the four BKT parameters (p-init, p-learn, p-guess, p-slip) with sensible defaults so a teacher can ignore them.

**Questions** — question bank per concept: text, options, correct answer, difficulty, tags, prerequisite concepts, explanation, order. Inline list showing how many questions each concept has, so gaps in the bank are obvious.

Each manager shows a live count and warns when a concept has no lesson and no questions — i.e. when the engine has nothing to work with.

## 3. Learning timeline (`/timeline`)

A new page built for demos and viva, separate from the existing Activity page.

Reverse-chronological feed grouped by day (Today / Yesterday / date), where each entry shows the event type (placement, quiz answer, review, lesson viewed, assignment) and, for scored events, the mastery movement:

```text
Today
  Answered Q14 · Functional Groups · Correct
  Mastery  42% --> 48%   (+6)
  Stability 6.1d --> 8.4d · next review 12 Aug
```

- Left rail day markers, per-event concept link, correct/incorrect marker, response time.
- A small sparkline per concept showing mastery over that concept's event history.
- Filters: by concept and by event type.
- Empty state points at the placement test.

`learning_events` already stores `pre_mastery` and `post_mastery`, so the deltas come straight from the immutable log — nothing is recomputed for display.

## Technical notes

- Migration: `app_role` enum, `public.user_roles` + grants + RLS, `public.has_role(uuid, app_role)` security definer, and admin-only write policies on the five content tables.
- Admin routes live under the authenticated layout with a role gate; all writes go through new `src/lib/admin.functions.ts` server functions using `requireSupabaseAuth`, which re-check `has_role` server-side (the UI gate is convenience only).
- Timeline reads via a new server function over `learning_events` joined to `concepts`/`questions`, ordered by `created_at`, paginated.
- No changes to `bkt.server.ts`, the recommendation ranking, or existing routes — the engine stays as documented.

## Not in this sprint

Personality profiling, the 3D brain, AI explanations and briefings, and assignment grading already exist and stay as-is — this plan doesn't extend them.