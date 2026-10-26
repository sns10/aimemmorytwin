-- A read-only demo class, so the teacher dashboard can be shown without
-- signing in (presentations, and the public demo).
--
-- Creates "Class 10-A — Chemistry" with six synthetic classmates plus the
-- existing demo learner, each with a believable history. Visitors can read
-- this one class; joining and creating still require an account.
-- Safe to re-run.

DO $$
DECLARE
  demo_class uuid := '22222222-2222-2222-2222-222222222222';
  alex uuid := '11111111-1111-1111-1111-111111111111';
  mate uuid;
  rec record;
  n int;
  profile numeric;
  correct boolean;
  pre numeric;
  post numeric;
  names text[] := ARRAY['Aarav M','Fathima R','Jerin P','Nandana S','Rohit K','Sana T'];
  -- how able each classmate is, 0-1: two strong, two middling, one weak, one who stopped
  skill numeric[] := ARRAY[0.88, 0.80, 0.58, 0.52, 0.30, 0.62];
  idx int;
BEGIN
  -- ------------------------------------------------------------ the class
  INSERT INTO public.classes (id, name, teacher_user_id, join_code, archived)
  VALUES (demo_class, 'Class 10-A - Chemistry', '00000000-0000-0000-0000-000000000000', 'DEMO24', false)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, archived = false;

  -- --------------------------------------------------------- the students
  FOR idx IN 1..array_length(names, 1) LOOP
    mate := ('33333333-3333-4333-8333-00000000000' || idx)::uuid;

    INSERT INTO public.students (id, name)
    VALUES (mate, names[idx])
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

    INSERT INTO public.class_members (class_id, student_id)
    VALUES (demo_class, mate)
    ON CONFLICT DO NOTHING;

    -- start from a clean history so the seed is repeatable
    DELETE FROM public.learning_events WHERE student_id = mate;
    DELETE FROM public.knowledge_states WHERE student_id = mate;

    profile := skill[idx];

    -- A classmate has worked through roughly the first 60-90% of the course,
    -- scaled by ability; the rest is untouched.
    INSERT INTO public.knowledge_states
      (student_id, concept_id, mastery_probability, memory_stability, last_reviewed_at, next_revision_at)
    SELECT
      mate,
      c.id,
      CASE
        WHEN c.sort_order <= (profile * 24)::int
          THEN least(0.97, greatest(0.08, profile + (random() - 0.5) * 0.25))
        ELSE c.p_init
      END,
      CASE WHEN c.sort_order <= (profile * 24)::int THEN 3 + random() * 14 ELSE 1.0 END,
      CASE
        WHEN c.sort_order <= (profile * 24)::int
          -- the student who stopped (idx 5) was last seen two weeks ago
          THEN now() - (CASE WHEN idx = 5 THEN 12 + random() * 6 ELSE random() * 6 END) * interval '1 day'
        ELSE NULL
      END,
      now() + (random() * 5 - 2) * interval '1 day'
    FROM public.concepts c;

    -- lesson views for the topics they have started
    INSERT INTO public.learning_events
      (student_id, concept_id, event_kind, is_correct, response_time_ms, difficulty, created_at)
    SELECT mate, ks.concept_id, 'lesson_view', true, 210000, c.difficulty,
           now() - (6 + random() * 16) * interval '1 day'
    FROM public.knowledge_states ks
    JOIN public.concepts c ON c.id = ks.concept_id
    WHERE ks.student_id = mate AND ks.last_reviewed_at IS NOT NULL;

    -- quiz history, denser for the stronger students, none in the last week
    -- for the one who stopped
    FOR rec IN
      SELECT ks.concept_id, c.difficulty, ks.mastery_probability AS m
      FROM public.knowledge_states ks
      JOIN public.concepts c ON c.id = ks.concept_id
      WHERE ks.student_id = mate AND ks.last_reviewed_at IS NOT NULL
    LOOP
      n := 2 + floor(random() * 3 * profile + 1);
      FOR i IN 1..n LOOP
        correct := random() < least(0.96, 0.35 + profile * 0.55);
        pre := greatest(0.05, rec.m - 0.2 + random() * 0.1);
        post := least(0.99, CASE WHEN correct THEN pre + 0.06 + random() * 0.08
                                 ELSE greatest(0.05, pre - 0.03) END);
        INSERT INTO public.learning_events
          (student_id, concept_id, event_kind, is_correct, response_time_ms, difficulty,
           pre_mastery, post_mastery, created_at, question_id)
        VALUES
          (mate, rec.concept_id, 'quiz_answer', correct,
           8000 + floor(random() * 26000), rec.difficulty, pre, post,
           now() - (CASE WHEN idx = 5 THEN 9 + random() * 8 ELSE random() * 7 END) * interval '1 day'
                 - (random() * 9) * interval '1 hour',
           (SELECT id FROM public.questions q WHERE q.concept_id = rec.concept_id
            ORDER BY random() LIMIT 1));
      END LOOP;
    END LOOP;
  END LOOP;

  -- the demo learner is in this class too
  INSERT INTO public.class_members (class_id, student_id)
  VALUES (demo_class, alex)
  ON CONFLICT DO NOTHING;
END $$;

-- --------------------------------------------------------------- read access
-- Visitors may read this one class, its membership, and the names of the
-- students in it. Everything else stays private.
DROP POLICY IF EXISTS "Anyone reads the demo class" ON public.classes;
CREATE POLICY "Anyone reads the demo class" ON public.classes
  FOR SELECT TO anon, authenticated
  USING (id = '22222222-2222-2222-2222-222222222222'::uuid);

DROP POLICY IF EXISTS "Anyone reads demo class membership" ON public.class_members;
CREATE POLICY "Anyone reads demo class membership" ON public.class_members
  FOR SELECT TO anon, authenticated
  USING (class_id = '22222222-2222-2222-2222-222222222222'::uuid);

DROP POLICY IF EXISTS "Read demo classmates" ON public.students;
CREATE POLICY "Read demo classmates" ON public.students
  FOR SELECT TO anon, authenticated
  USING (
    id IN (
      SELECT student_id FROM public.class_members
      WHERE class_id = '22222222-2222-2222-2222-222222222222'::uuid
    )
  );
