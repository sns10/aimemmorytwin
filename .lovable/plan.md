## Goal

Evolve MemoryTwin from a flat "10 concepts + quiz" demo into a structured course platform: **Subject → Chapter → Topic → Lesson → Quiz → Assignment**, wired to a **Learn → Practice → Master** progression driven by the existing BKT + FSRS engine.

## New data model

Add four tables, keep the existing `students`, `knowledge_states`, `learning_events`, and repurpose `concepts` as **topics**.

```text
subjects        (id, name, description, sort_order)
chapters        (id, subject_id, name, summary, sort_order)
topics          (= renamed concepts; add chapter_id, learning_objectives, video_url, sort_order)
lesson_content  (id, topic_id, kind: 'video'|'reading'|'summary', title, body, url, duration_min, sort_order)
assignments     (id, topic_id, title, prompt, rubric, difficulty)
assignment_submissions (id, student_id, assignment_id, response, ai_score, ai_feedback, created_at)
```

Keep `learning_events` as the single source of truth for BKT/FSRS updates, but add an `event_kind` column: `'lesson_view' | 'quiz_answer' | 'assignment_submit'` so practice history distinguishes activity types.

Seed: 1 subject (Class 10 Chemistry) → 3 chapters (Matter, Chemical Reactions, Acids/Bases/Salts) → 9 topics (3 per chapter) → 1 video + 1 reading per topic → the existing MCQ per topic → 1 short-answer assignment per topic.

## Learn → Practice → Master state machine

Each `(student, topic)` has a **stage**, computed from `knowledge_states`:

| Stage | Enter when | UI unlocks |
|---|---|---|
| **Learn** | no `lesson_view` event yet | Video + reading |
| **Practice** | lesson viewed, mastery < 0.65 | Quiz drills (feeds BKT) |
| **Apply** | mastery ≥ 0.65, no assignment submitted | Assignment (AI-graded) |
| **Master** | mastery ≥ 0.85 AND assignment score ≥ 0.7 | Marked complete; enters spaced-review pool |
| **Review** | mastered AND retrievability < 0.8 | Surfaces back in "Due today" |

Chapter/subject progress = weighted average of topic stages. A chapter unlocks the next when ≥70% of its topics reach Master.

## Server functions (new + refactored)

`src/lib/course.functions.ts` (new):
- `getCourseTree(studentId)` — subject → chapters → topics with per-topic stage + mastery
- `getTopicWorkspace(studentId, topicId)` — lessons, quiz question, assignment, current stage, next action
- `markLessonViewed(studentId, topicId, lessonId)` — writes `learning_events` with `event_kind='lesson_view'`
- `submitAssignment(studentId, assignmentId, response)` — calls Lovable AI to score against rubric (0–1 + 2-sentence feedback), stores submission, writes `learning_events`, nudges BKT mastery

Refactor `memorytwin.functions.ts`:
- `submitEvent` → tag as `event_kind='quiz_answer'`
- `getRecommendations` → prefer topics in **Practice** or **Review** stages, ordered by retrievability

## Routes

```text
/                         Dashboard: AI briefing, retention chart, "Continue learning" card, due-today list
/course                   Course tree: subject → chapters → topics with stage chips + progress bars
/topic/$id                Topic workspace: tabs [Learn | Practice | Apply], shows current stage & next action
/concept/$id              (kept) analytics deep-dive — link from topic workspace as "Memory stats"
/quiz                     (kept) mixed-topic practice session driven by recommendations
/history                  Timeline of all learning_events (lessons, quizzes, assignments)
```

The topic workspace is the heart of the flow: one page that guides the student through the right stage automatically. The dashboard's "Continue" button routes to whichever topic has the highest priority next-action.

## AI usage (Lovable AI Gateway, Gemini 2.5 Flash)

1. **Daily briefing** — already built, re-tuned to reference chapter/stage progress
2. **Wrong-answer explanation** — already built
3. **Assignment grader** — new: prompt with rubric + response → JSON `{score, feedback}`; score feeds into `learning_events` as a partial-credit signal (correct = score ≥ 0.7)

## UI

Keep the "warm paper and ink" theme. Add:
- `StageBadge` — pill with Learn/Practice/Apply/Master/Review colors
- `ProgressRing` — for chapter completion
- `CourseTree` — collapsible chapter → topic list on `/course`
- `TopicWorkspace` — tabbed layout with a persistent "Next step" CTA computed from stage

## Build order

1. Migration: new tables + `event_kind` column + `chapter_id` on concepts (rename mentally to topics; keep table name for continuity).
2. Data seed migration: 1 subject, 3 chapters, 9 topics (retire the current 10, seed fresh with chapter links), lessons, assignments.
3. `course.functions.ts` + stage helper `src/lib/stage.ts`.
4. Refactor `memorytwin.functions.ts` for `event_kind` + stage-aware recommendations.
5. New routes `/course`, `/topic/$id`, `/history`. Update `/` dashboard "Continue" CTA. Update `/quiz` to write `event_kind='quiz_answer'`.
6. Reusable components (StageBadge, ProgressRing, CourseTree).
7. Typecheck + smoke test the flow end-to-end.

## What stays

- BKT + FSRS math (`bkt.server.ts`) — unchanged, still the mastery/retention engine
- Retention chart, concept detail page, wrong-answer AI explanations, daily briefing
- Anonymous demo student "Alex", permissive RLS (unchanged demo posture)

## Non-goals for this pass

- Real auth (still anonymous demo)
- Prerequisite graph across topics (chapter ordering only)
- Cron-driven briefing regeneration
