-- Follow-up to seed_demo_history.sql: give the demo learner a graded
-- assignment on the topics they have genuinely learned.
--
-- Why: a topic only reaches the "Master" stage when mastery is high AND an
-- assignment has been scored. Without this the dashboard reads "1/26 mastered"
-- even though six topics are consolidated. Safe to re-run.

DO $$
DECLARE
  demo_id uuid := '11111111-1111-1111-1111-111111111111';
BEGIN
  DELETE FROM public.assignment_submissions
  WHERE student_id = demo_id
    AND concept_id IN (
      SELECT id FROM public.concepts
      WHERE name IN ('Atomic Structure','Electronic Configuration','Atomic Mass',
                     'Isotopes','Covalent Bonds','Mole Concept','Acids and Bases','pH Scale')
    );

  INSERT INTO public.assignment_submissions
    (student_id, concept_id, assignment_id, response, ai_score, ai_feedback, created_at)
  SELECT demo_id, a.concept_id, a.id,
         'Short written answer submitted during practice for ' || c.name || '.',
         CASE
           WHEN c.name IN ('Atomic Structure','Atomic Mass','Isotopes') THEN 0.88
           WHEN c.name IN ('Electronic Configuration','Covalent Bonds') THEN 0.80
           ELSE 0.74
         END,
         'Correct idea with a relevant example. Tighten the explanation of the underlying reason.',
         now() - (3 + random() * 9) * interval '1 day'
  FROM public.assignments a
  JOIN public.concepts c ON c.id = a.concept_id
  WHERE c.name IN ('Atomic Structure','Electronic Configuration','Atomic Mass',
                   'Isotopes','Covalent Bonds','Mole Concept','Acids and Bases','pH Scale');
END $$;
