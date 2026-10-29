-- Presentation demo state for the sample learner "Alex".
-- Run in the Supabase SQL editor on the day of the demo, a few minutes before
-- the panel arrives. Safe to re-run. Only touches Alex (fixed UUID); classmates
-- and real signed-in students are untouched.
--
-- Every timestamp is relative to now(), so the story holds whenever you run it:
--   * 6 topics consolidated: reviewed today, strong memory, assignment passed
--   * 7 topics building: reviewed within the last hour, memory solid but young
--   * 3 topics genuinely fading: studied 2-3 weeks ago, not revisited
--   * the rest not started
--   * answers on each of the last 7 days, so the streak and weekly chart are full

DO $$
DECLARE
  alex uuid := '11111111-1111-1111-1111-111111111111';
  rec record;
  k int;
  j int;
  day_offset int;
  correct boolean;
  pre numeric;
  post numeric;
BEGIN
  -- ------------------------------------------------------------ reset
  DELETE FROM public.learning_events WHERE student_id = alex;
  DELETE FROM public.assignment_submissions WHERE student_id = alex;

  UPDATE public.knowledge_states ks
  SET mastery_probability = c.p_init,
      memory_stability = 1.0,
      last_reviewed_at = NULL,
      next_revision_at = now() + interval '1 day'
  FROM public.concepts c
  WHERE ks.concept_id = c.id AND ks.student_id = alex;

  -- ------------------------------------------------- 6 consolidated topics
  UPDATE public.knowledge_states ks
  SET mastery_probability = 0.90 + random() * 0.06,
      memory_stability = 12 + random() * 8,
      last_reviewed_at = now() - random() * interval '50 minutes',
      next_revision_at = now() + (3 + random() * 3) * interval '1 day'
  FROM public.concepts c
  WHERE ks.concept_id = c.id AND ks.student_id = alex
    AND c.name IN ('Atomic Structure', 'Electronic Configuration', 'Atomic Mass',
                   'Isotopes', 'Valency', 'Covalent Bonds');

  -- ------------------------------------------------ 7 building topics
  UPDATE public.knowledge_states ks
  SET mastery_probability = 0.55 + random() * 0.20,
      memory_stability = 5 + random() * 3,
      last_reviewed_at = now() - random() * interval '40 minutes',
      next_revision_at = now() + (1 + random() * 2) * interval '1 day'
  FROM public.concepts c
  WHERE ks.concept_id = c.id AND ks.student_id = alex
    AND c.name IN ('Periodic Table Trends', 'Ionic Bonds', 'Metallic Bonding',
                   'Mole Concept', 'Chemical Formulae & Naming',
                   'Chemical Reactions', 'Balancing Equations');

  -- --------------------------------------------- 3 genuinely fading topics
  UPDATE public.knowledge_states ks
  SET mastery_probability = 0.80 + random() * 0.07,
      memory_stability = 6 + random() * 2,
      last_reviewed_at = now() - (14 + random() * 6) * interval '1 day',
      next_revision_at = now() - (2 + random() * 3) * interval '1 day'
  FROM public.concepts c
  WHERE ks.concept_id = c.id AND ks.student_id = alex
    AND c.name IN ('Acids and Bases', 'pH Scale', 'Properties of Ionic & Covalent Compounds');

  -- ------------------------------------------ lesson views for started topics
  INSERT INTO public.learning_events
    (student_id, concept_id, event_kind, is_correct, response_time_ms, difficulty, created_at)
  SELECT alex, ks.concept_id, 'lesson_view', true, 240000, c.difficulty,
         ks.last_reviewed_at - interval '3 days'
  FROM public.knowledge_states ks
  JOIN public.concepts c ON c.id = ks.concept_id
  WHERE ks.student_id = alex AND ks.last_reviewed_at IS NOT NULL;

  -- ------------------------------------------------ quiz history, 7 days
  -- One guaranteed answer per day, so the streak and the weekly chart are full.
  FOR j IN 0..6 LOOP
    INSERT INTO public.learning_events
      (student_id, concept_id, event_kind, is_correct, response_time_ms, difficulty,
       pre_mastery, post_mastery, created_at, question_id)
    SELECT alex, c.id, 'quiz_answer', true, 14000 + floor(random() * 9000), c.difficulty,
           0.92, 0.94, now() - (j * interval '1 day') - interval '2 hours',
           (SELECT q.id FROM public.questions q WHERE q.concept_id = c.id
            ORDER BY random() LIMIT 1)
    FROM public.concepts c
    WHERE c.name = 'Atomic Structure';
  END LOOP;

  -- Practice on the building and consolidated topics across the week.
  FOR rec IN
    SELECT ks.concept_id, c.difficulty, c.name, ks.mastery_probability AS m,
           ks.last_reviewed_at IS NOT NULL AND ks.memory_stability < 9 AS building
    FROM public.knowledge_states ks
    JOIN public.concepts c ON c.id = ks.concept_id
    WHERE ks.student_id = alex AND ks.last_reviewed_at IS NOT NULL
      AND ks.memory_stability < 20
      AND c.name NOT IN ('Acids and Bases', 'pH Scale', 'Properties of Ionic & Covalent Compounds')
  LOOP
    k := 2 + floor(random() * 2);
    FOR j IN 1..k LOOP
      day_offset := floor(random() * 7);
      correct := random() < CASE WHEN rec.building THEN 0.68 ELSE 0.88 END;
      pre := greatest(0.05, rec.m - 0.12 + random() * 0.05);
      post := least(0.99, CASE WHEN correct THEN pre + 0.05 ELSE pre - 0.02 END);
      INSERT INTO public.learning_events
        (student_id, concept_id, event_kind, is_correct, response_time_ms, difficulty,
         pre_mastery, post_mastery, created_at, question_id)
      VALUES
        (alex, rec.concept_id, 'quiz_answer', correct,
         9000 + floor(random() * 22000), rec.difficulty, pre, post,
         now() - day_offset * interval '1 day' - random() * interval '6 hours',
         (SELECT q.id FROM public.questions q WHERE q.concept_id = rec.concept_id
          ORDER BY random() LIMIT 1));
    END LOOP;
  END LOOP;

  -- The three fading topics were practised weeks ago, which is the story.
  FOR rec IN
    SELECT ks.concept_id, c.difficulty, ks.mastery_probability AS m
    FROM public.knowledge_states ks
    JOIN public.concepts c ON c.id = ks.concept_id
    WHERE ks.student_id = alex
      AND c.name IN ('Acids and Bases', 'pH Scale', 'Properties of Ionic & Covalent Compounds')
  LOOP
    FOR j IN 1..3 LOOP
      INSERT INTO public.learning_events
        (student_id, concept_id, event_kind, is_correct, response_time_ms, difficulty,
         pre_mastery, post_mastery, created_at, question_id)
      VALUES
        (alex, rec.concept_id, 'quiz_answer', true, 15000, rec.difficulty,
         rec.m - 0.04, rec.m, now() - (16 + j) * interval '1 day',
         (SELECT q.id FROM public.questions q WHERE q.concept_id = rec.concept_id
          ORDER BY random() LIMIT 1));
    END LOOP;
  END LOOP;

  -- ------------------------------------- assignments that unlock "Mastered"
  INSERT INTO public.assignment_submissions
    (student_id, concept_id, assignment_id, response, ai_score, ai_feedback, created_at)
  SELECT alex, a.concept_id, a.id,
         'Written explanation given in my own words, with an everyday example.',
         0.84,
         'Clear definition with a sound example. Next, explain the reason behind it.',
         now() - interval '3 days'
  FROM (
    SELECT DISTINCT ON (concept_id) id, concept_id
    FROM public.assignments
    WHERE concept_id IN (
      SELECT id FROM public.concepts
      WHERE name IN ('Atomic Structure', 'Electronic Configuration', 'Atomic Mass',
                     'Isotopes', 'Valency', 'Covalent Bonds')
    )
    ORDER BY concept_id, id
  ) a;
END $$;
