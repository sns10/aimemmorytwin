## What is already built (in simple terms)

MemoryTwin is a smart study coach for one demo student. It tracks what the student knows, how fast they forget it, and what to study next.

**Core brain (the math)**
- Uses real Bayesian Knowledge Tracing (BKT) with 4 parameters: prior knowledge, learning rate, guessing, and slipping.
- Uses an FSRS-style forgetting curve to estimate how fast memory fades.
- Every quiz answer updates the student's "memory twin" state in the database.

**Course structure**
- 10th-grade Chemistry seeded as: Subject → Chapters → Topics → Lessons → Quizzes → Assignments.
- Each topic moves through 5 stages: Learn → Practice → Apply → Master → Review.

**Student-facing features**
- Dashboard with a 3D brain visualization. Topics are dots on the brain; color = mastery, size = memory stability.
- Daily AI briefing that reads the student's state and explains what to study.
- Study plan with 4 lanes (Learn, Practice, Apply, Review) ranked by the student's current state.
- Quiz flow with AI-generated explanations when the student gets something wrong.
- Concept detail page showing mastery %, memory stability, and review history.
- Onboarding walkthrough that highlights brain nodes and lane cards.
- Personality profiler (`/profile`) based on Big Five research; adds a tailored "why" line to recommendations.
- History page with a conversion-rate panel showing whether tailored recommendations get more clicks.

**Current limitation**
- Everything runs as a single anonymous demo student. There is no real login, no separate accounts, and the "cohort" data is synthetic.

---

## How to make best use of what exists

1. **Treat the BKT/FSRS state as the single source of truth.** Every recommendation, chart, and explanation should read from `knowledge_states`, not from raw event counts.
2. **Use the lane system to reduce decision fatigue.** The dashboard should open on the one highest-priority card per lane, not dump every topic on the student.
3. **Let the AI narrate, not decide.** The LLM should phrase reasons that the math already computed (low recall, weak mastery, prereq ready). This keeps outputs grounded and avoids hallucinations like "Genetics."
4. **Run the personality profiler once per student.** The Big Five check is short; the tailored explanation line is the easiest win from the research paper.
5. **Watch the CVR panel.** It tells you whether the tailored persuasive line actually makes students click more than the neutral line.

---

## What to implement next (priority order)

### 1. Make the core loop actually end-to-end
**Problem:** A student can see the dashboard and brain, but the path from "Learn this" → "watch lesson" → "practice quiz" → "apply assignment" → "mastered" needs to be one smooth flow.

**Build:**
- A single "Next best activity" card on the dashboard that picks exactly one topic + one action based on the current state.
- Clicking it opens the right route: lesson for Learn, quiz for Practice, assignment for Apply, quick review for Review.
- After finishing an activity, automatically advance the topic stage (Learn → Practice → Apply → Master → Review) and refresh the dashboard.
- Add a "Mastered" celebration/state so the student feels progress.

**Result:** Students stop feeling lost; every click moves them forward.

### 2. Replace the demo student with real accounts
**Problem:** Right now `DEMO_STUDENT_ID` is hard-coded. Real students cannot have their own progress.

**Build:**
- Add Supabase auth (email or Google OAuth).
- Link every `knowledge_state`, `learning_event`, `personality_profile`, etc. to `auth.users(id)`.
- Update RLS policies so students only see their own data.
- Keep a "continue as guest" option for quick demos, but make it migrate to a real account later.

**Result:** The app becomes usable in a classroom or as a real product.

### 3. Real adaptive questions and assignments
**Problem:** Practice questions exist, but the app does not yet pick the next question based on the student's live performance.

**Build:**
- In Practice mode, select the next question from the question bank using the current mastery estimate and item difficulty.
- After each answer, update mastery immediately and choose the next question: easier if struggling, harder if mastering.
- In Apply mode, generate or select an assignment prompt that requires combining the current topic with its recently-mastered prerequisites.

**Result:** The BKT math actually controls the learning path instead of just displaying numbers.

### 4. Better spaced-repetition schedule
**Problem:** Review dates are computed but not surfaced as a clear calendar or habit streak.

**Build:**
- A "Review queue" view showing topics due today, tomorrow, and this week.
- Push notifications / email reminders (optional) for due reviews.
- A streak counter and daily goal progress tied to the existing `DAILY_GOAL`.

**Result:** Students build a daily review habit, which is where long-term retention actually happens.

### 5. Expand beyond Chemistry and fix content gaps
**Problem:** Only Chemistry is seeded, and earlier screenshots showed hallucinated topics like "Genetics."

**Build:**
- Seed Physics, Biology, and Math curricula using the same subject/chapter/topic schema.
- Add a content admin flow (or spreadsheet import) so new subjects can be added without code changes.
- Add validation that the AI briefing can only mention topics that exist in the database.

**Result:** The app works for more subjects and stops making up topics.

### 6. Real cohorts and social proof
**Problem:** Peer and authority explanations use fake synthetic cohort data.

**Build:**
- Once real accounts exist, compute cohort stats from actual class/groupmates.
- Allow teachers to create classrooms and invite students.
- Use real completion counts for the persuasive explanation lines.

**Result:** The personality-tailored explanations become honest and grounded.

### 7. Teacher / parent dashboard
**Problem:** There is no view of class-level progress.

**Build:**
- A simple teacher dashboard showing each student's mastery heatmap by topic.
- Flags for students who are stuck, falling behind, or not reviewing.

**Result:** The tool becomes useful in a school setting, not just for self-learners.

---

## Recommended first step

Start with **#1: Make the core loop end-to-end**. It is the smallest change that makes the biggest difference in perceived quality. The math and UI already exist; the work is mostly wiring routes, advancing stages, and refreshing state after each activity. Once that feels smooth, move to real accounts (#2), because everything after that depends on it.

If you want, I can implement #1 first and then we can review how it feels before deciding on #2.