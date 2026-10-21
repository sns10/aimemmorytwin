-- Demo-history seed for the sample learner ("Alex").
-- Run this in the Supabase SQL editor before a demo. It is safe to re-run.
--
-- Why: without a history every topic looks "fading" and every chart is empty,
-- so the engine appears to do nothing. This gives the demo learner a believable
-- three weeks of study: some topics consolidated, some building, some genuinely
-- slipping, plus day-by-day activity so the report card and timeline have data.
--
-- It only touches the demo student (fixed UUID below). Real signed-in students
-- are untouched.

DO $$
DECLARE
  demo_id uuid := '11111111-1111-1111-1111-111111111111';
  rec record;
  n int;
  ev_day int;
  correct boolean;
  pre numeric;
  post numeric;
BEGIN
  -- Start from a clean demo history so the seed is repeatable.
  DELETE FROM public.learning_events WHERE student_id = demo_id;
  DELETE FROM public.assignment_submissions WHERE student_id = demo_id;

  -- ---------------------------------------------------------------- states
  -- Mastered and stable: studied a while ago but revised, so recall is high.
  UPDATE public.knowledge_states ks
  SET mastery_probability = 0.90 + random() * 0.07,
      memory_stability   = 18 + random() * 10,
      last_reviewed_at   = now() - (2 + random() * 2) * interval '1 day',
      next_revision_at   = now() + (3 + random() * 4) * interval '1 day'
  FROM public.concepts c
  WHERE ks.concept_id = c.id AND ks.student_id = demo_id
    AND c.name IN ('Atomic Structure','Electronic Configuration','Atomic Mass',
                   'Isotopes','Ionic Bonds','Covalent Bonds');

  -- Building: practised recently, not yet solid.
  UPDATE public.knowledge_states ks
  SET mastery_probability = 0.45 + random() * 0.25,
      memory_stability   = 4 + random() * 4,
      last_reviewed_at   = now() - (1 + random() * 2) * interval '1 day',
      next_revision_at   = now() + (1 + random() * 3) * interval '1 day'
  FROM public.concepts c
  WHERE ks.concept_id = c.id AND ks.student_id = demo_id
    AND c.name IN ('Valency','Periodic Table Trends','Metallic Bonding',
                   'Chemical Formulae & Naming','Chemical Reactions','Balancing Equations');

  -- Genuinely fading: learned well, then left alone — this is the story to tell.
  UPDATE public.knowledge_states ks
  SET mastery_probability = 0.78 + random() * 0.12,
      memory_stability   = 5 + random() * 3,
      last_reviewed_at   = now() - (16 + random() * 10) * interval '1 day',
      next_revision_at   = now() - (2 + random() * 5) * interval '1 day'
  FROM public.concepts c
  WHERE ks.concept_id = c.id AND ks.student_id = demo_id
    AND c.name IN ('Mole Concept','Properties of Ionic & Covalent Compounds',
                   'Acids and Bases','pH Scale');

  -- Everything else stays at its starting value: not studied yet.
  UPDATE public.knowledge_states ks
  SET mastery_probability = c.p_init,
      memory_stability   = 1.0,
      last_reviewed_at   = NULL,
      next_revision_at   = now()
  FROM public.concepts c
  WHERE ks.concept_id = c.id AND ks.student_id = demo_id
    AND c.name IN ('Types of Chemical Reactions','Oxidation & Reduction','Salts & Neutralisation',
                   'Reactivity Series','Extraction of Metals','Corrosion & Its Prevention',
                   'Carbon & Its Covalency','Hydrocarbons','Functional Groups & Isomerism',
                   'Ethanol & Ethanoic Acid');

  -- --------------------------------------------------------- lesson views
  -- A lesson view unlocks practice, so stages show Practice/Apply/Master
  -- instead of every topic sitting in "Learn".
  INSERT INTO public.learning_events
    (student_id, concept_id, event_kind, is_correct, response_time_ms, difficulty, created_at)
  SELECT demo_id, ks.concept_id, 'lesson_view', true, 240000, c.difficulty,
         now() - (10 + random() * 14) * interval '1 day'
  FROM public.knowledge_states ks
  JOIN public.concepts c ON c.id = ks.concept_id
  WHERE ks.student_id = demo_id AND ks.last_reviewed_at IS NOT NULL;

  -- ------------------------------------------------------- quiz history
  -- Spread answers over the last 12 days, heavier in the last week so the
  -- report card's 7-day chart and the streak look alive. Accuracy rises over
  -- time, which is what a learning curve should look like.
  FOR rec IN
    SELECT ks.concept_id, c.difficulty, ks.mastery_probability AS m
    FROM public.knowledge_states ks
    JOIN public.concepts c ON c.id = ks.concept_id
    WHERE ks.student_id = demo_id AND ks.last_reviewed_at IS NOT NULL
  LOOP
    n := 3 + floor(random() * 3);   -- 3-5 attempts per studied topic
    FOR i IN 1..n LOOP
      ev_day  := floor(random() * 12);
      correct := random() < least(0.95, 0.45 + rec.m * 0.5);
      pre     := greatest(0.05, rec.m - 0.25 + random() * 0.1);
      post    := least(0.99, CASE WHEN correct THEN pre + 0.08 + random() * 0.08
                                  ELSE greatest(0.05, pre - 0.03) END);
      INSERT INTO public.learning_events
        (student_id, concept_id, event_kind, is_correct, response_time_ms,
         difficulty, pre_mastery, post_mastery, created_at,
         question_id)
      VALUES
        (demo_id, rec.concept_id, 'quiz_answer', correct,
         9000 + floor(random() * 22000), rec.difficulty, pre, post,
         now() - ev_day * interval '1 day' - (random() * 8) * interval '1 hour',
         (SELECT id FROM public.questions q WHERE q.concept_id = rec.concept_id
          ORDER BY random() LIMIT 1));
    END LOOP;
  END LOOP;

  -- Guarantee activity today and yesterday so the streak is not zero on stage.
  INSERT INTO public.learning_events
    (student_id, concept_id, event_kind, is_correct, response_time_ms,
     difficulty, pre_mastery, post_mastery, created_at)
  SELECT demo_id, c.id, 'quiz_answer', true, 12000, c.difficulty, 0.62, 0.71,
         now() - (g.n || ' hours')::interval
  FROM public.concepts c
  CROSS JOIN (VALUES (2),(5),(26),(30)) AS g(n)
  WHERE c.name = 'Covalent Bonds';

  -- ------------------------------------------------------- one assignment
  -- Lets a topic reach the "Master" stage, which needs an assignment score.
  INSERT INTO public.assignment_submissions
    (student_id, concept_id, assignment_id, response, ai_score, ai_feedback, created_at)
  SELECT demo_id, a.concept_id, a.id,
         'An ionic bond forms when a metal transfers electrons to a non-metal, so the ions attract. Example: sodium gives one electron to chlorine to form table salt.',
         0.85,
         'Clear definition with a correct everyday example. Next time, mention why the resulting crystal is brittle.',
         now() - interval '4 day'
  FROM public.assignments a
  JOIN public.concepts c ON c.id = a.concept_id
  WHERE c.name = 'Ionic Bonds'
  LIMIT 1;
END $$;
