-- Richer history for the demo class, replacing the thin first pass.
--
-- Three weeks of study for six classmates, with deliberate patterns a teacher
-- should be able to spot:
--   * two strong students who are ahead of the syllabus
--   * two middling students with topics starting to fade
--   * one weak student who practises but gets things wrong
--   * one student who stopped a fortnight ago while his mastery still looks fine
--   * two topics the whole class struggles with (Mole Concept, Balancing Equations)
--   * one question almost everyone gets wrong, so the item-quality flag fires
-- Safe to re-run.

DO $$
DECLARE
  demo_class uuid := '22222222-2222-2222-2222-222222222222';
  mate uuid;
  rec record;
  day_offset int;
  attempts int;
  i int;
  correct boolean;
  pre numeric;
  post numeric;
  topic_penalty numeric;
  ability numeric;
  reach int;
  idx int;
  names text[] := ARRAY['Aarav M','Fathima R','Jerin P','Nandana S','Rohit K','Sana T'];
  skill numeric[] := ARRAY[0.88, 0.80, 0.58, 0.52, 0.30, 0.62];
  -- how much of the 26-topic course each student has reached
  coverage int[] := ARRAY[22, 20, 16, 15, 11, 14];
  hard_topics text[] := ARRAY['Mole Concept','Balancing Equations','Functional Groups & Isomerism'];
BEGIN
  FOR idx IN 1..array_length(names, 1) LOOP
    mate := ('33333333-3333-4333-8333-00000000000' || idx)::uuid;
    ability := skill[idx];
    reach := coverage[idx];

    INSERT INTO public.students (id, name) VALUES (mate, names[idx])
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
    INSERT INTO public.class_members (class_id, student_id) VALUES (demo_class, mate)
    ON CONFLICT DO NOTHING;

    DELETE FROM public.learning_events WHERE student_id = mate;
    DELETE FROM public.assignment_submissions WHERE student_id = mate;
    DELETE FROM public.knowledge_states WHERE student_id = mate;

    -- ---------------------------------------------------------- state
    INSERT INTO public.knowledge_states
      (student_id, concept_id, mastery_probability, memory_stability, last_reviewed_at, next_revision_at)
    SELECT
      mate,
      c.id,
      CASE
        WHEN c.sort_order > reach THEN c.p_init
        WHEN c.name = ANY(hard_topics)
          THEN least(0.70, greatest(0.08, ability - 0.30 + random() * 0.15))
        ELSE least(0.98, greatest(0.10, ability + (random() - 0.4) * 0.22))
      END,
      CASE WHEN c.sort_order > reach THEN 1.0 ELSE 2 + random() * 16 END,
      CASE
        WHEN c.sort_order > reach THEN NULL
        WHEN idx = 6 THEN now() - (13 + random() * 7) * interval '1 day'   -- Sana stopped
        -- earlier topics were reviewed longer ago, so some are fading
        ELSE now() - (0.5 + (reach - c.sort_order) * 0.8 + random() * 3) * interval '1 day'
      END,
      now() + (random() * 6 - 3) * interval '1 day'
    FROM public.concepts c;

    -- ---------------------------------------------------- lesson views
    INSERT INTO public.learning_events
      (student_id, concept_id, event_kind, is_correct, response_time_ms, difficulty, created_at)
    SELECT mate, ks.concept_id, 'lesson_view', true, 180000 + floor(random() * 120000), c.difficulty,
           now() - (5 + random() * 18) * interval '1 day'
    FROM public.knowledge_states ks
    JOIN public.concepts c ON c.id = ks.concept_id
    WHERE ks.student_id = mate AND ks.last_reviewed_at IS NOT NULL;

    -- ------------------------------------------------------ quiz history
    FOR rec IN
      SELECT ks.concept_id, c.difficulty, c.name, ks.mastery_probability AS m
      FROM public.knowledge_states ks
      JOIN public.concepts c ON c.id = ks.concept_id
      WHERE ks.student_id = mate AND ks.last_reviewed_at IS NOT NULL
    LOOP
      topic_penalty := CASE WHEN rec.name = ANY(hard_topics) THEN 0.28 ELSE 0 END;
      attempts := 3 + floor(random() * 4 + ability * 3);
      FOR i IN 1..attempts LOOP
        -- Sana's answers all sit 9-20 days back; everyone else has this week too
        day_offset := CASE WHEN idx = 6 THEN 9 + floor(random() * 11)
                           ELSE floor(random() * 20) END;
        correct := random() < greatest(0.12, least(0.96, 0.30 + ability * 0.6 - topic_penalty));
        pre := greatest(0.05, rec.m - 0.22 + random() * 0.12);
        post := least(0.99, CASE WHEN correct THEN pre + 0.05 + random() * 0.09
                                 ELSE greatest(0.05, pre - 0.04) END);
        INSERT INTO public.learning_events
          (student_id, concept_id, event_kind, is_correct, response_time_ms, difficulty,
           pre_mastery, post_mastery, created_at, question_id)
        VALUES
          (mate, rec.concept_id, 'quiz_answer', correct,
           7000 + floor(random() * 28000), rec.difficulty, pre, post,
           now() - day_offset * interval '1 day' - (random() * 10) * interval '1 hour',
           (SELECT id FROM public.questions q WHERE q.concept_id = rec.concept_id
            ORDER BY random() LIMIT 1));
      END LOOP;
    END LOOP;

    -- ------------------------------------------------------- assignments
    INSERT INTO public.assignment_submissions
      (student_id, concept_id, assignment_id, response, ai_score, ai_feedback, created_at)
    SELECT mate, a.concept_id, a.id,
           'Short written answer submitted during practice.',
           least(0.95, greatest(0.35, ability + (random() - 0.5) * 0.2)),
           'Reasonable explanation; tighten the underlying reason.',
           now() - (2 + random() * 15) * interval '1 day'
    FROM public.assignments a
    JOIN public.concepts c ON c.id = a.concept_id
    JOIN public.knowledge_states ks ON ks.concept_id = c.id AND ks.student_id = mate
    WHERE ks.mastery_probability >= 0.80
    LIMIT 4;
  END LOOP;

  -- ---------------------------------------------- one badly behaved item
  -- Everyone who has met this question gets it wrong, so the "too hard /
  -- likely mis-keyed" flag has something real to catch.
  UPDATE public.learning_events e
  SET is_correct = false
  WHERE e.event_kind = 'quiz_answer'
    AND e.student_id::text LIKE '33333333-%'
    AND e.question_id = (
      SELECT q.id FROM public.questions q
      JOIN public.concepts c ON c.id = q.concept_id
      WHERE c.name = 'Mole Concept'
      ORDER BY q.sort_order DESC
      LIMIT 1
    );
END $$;
