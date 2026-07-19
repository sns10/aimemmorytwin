
-- Demo posture: anonymous single-student app. Permissive anon RLS.

CREATE TABLE public.concepts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL DEFAULT 'Chemistry',
  difficulty numeric NOT NULL DEFAULT 0.5,
  prerequisite_id uuid REFERENCES public.concepts(id),
  question text NOT NULL,
  options jsonb NOT NULL,
  correct_index int NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.concepts TO anon, authenticated;
GRANT ALL ON public.concepts TO service_role;
ALTER TABLE public.concepts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read concepts" ON public.concepts FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  daily_briefing text,
  briefing_generated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO anon, authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Demo anon can read students" ON public.students FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Demo anon can update students" ON public.students FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.knowledge_states (
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  concept_id uuid NOT NULL REFERENCES public.concepts(id) ON DELETE CASCADE,
  mastery_probability numeric NOT NULL DEFAULT 0.15,
  memory_stability numeric NOT NULL DEFAULT 1.0,
  last_reviewed_at timestamptz,
  next_revision_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, concept_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_states TO anon, authenticated;
GRANT ALL ON public.knowledge_states TO service_role;
ALTER TABLE public.knowledge_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Demo anon read knowledge_states" ON public.knowledge_states FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Demo anon write knowledge_states" ON public.knowledge_states FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Demo anon update knowledge_states" ON public.knowledge_states FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.learning_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  concept_id uuid NOT NULL REFERENCES public.concepts(id) ON DELETE CASCADE,
  is_correct boolean NOT NULL,
  response_time_ms int NOT NULL DEFAULT 0,
  difficulty numeric NOT NULL DEFAULT 0.5,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_events TO anon, authenticated;
GRANT ALL ON public.learning_events TO service_role;
ALTER TABLE public.learning_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Demo anon read learning_events" ON public.learning_events FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Demo anon insert learning_events" ON public.learning_events FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Seed demo student "Alex" with a fixed UUID for easy client wiring.
INSERT INTO public.students (id, name)
VALUES ('11111111-1111-1111-1111-111111111111', 'Alex');

-- Seed 10 Chemistry (Class 10) concepts, each with one 5-option MCQ.
WITH new_concepts AS (
  INSERT INTO public.concepts (name, subject, difficulty, question, options, correct_index, sort_order)
  VALUES
    ('Atomic Structure', 'Chemistry', 0.4,
      'Which subatomic particle carries a negative charge?',
      '["Proton","Neutron","Electron","Positron","Nucleus"]'::jsonb, 2, 1),
    ('Atomic Mass', 'Chemistry', 0.5,
      'The atomic mass of an element is approximately equal to the sum of:',
      '["Protons only","Electrons only","Protons and neutrons","Neutrons and electrons","Protons and electrons"]'::jsonb, 2, 2),
    ('Isotopes', 'Chemistry', 0.6,
      'Isotopes of an element have the same number of ___ but different numbers of ___.',
      '["Electrons; protons","Protons; neutrons","Neutrons; protons","Protons; electrons","Neutrons; electrons"]'::jsonb, 1, 3),
    ('Periodic Table Trends', 'Chemistry', 0.6,
      'Across a period from left to right, atomic radius generally:',
      '["Increases","Decreases","Stays the same","First increases then decreases","Doubles"]'::jsonb, 1, 4),
    ('Ionic Bonds', 'Chemistry', 0.5,
      'An ionic bond is typically formed between:',
      '["Two non-metals","A metal and a non-metal","Two metals","Two noble gases","Two identical atoms"]'::jsonb, 1, 5),
    ('Covalent Bonds', 'Chemistry', 0.5,
      'A covalent bond is formed by:',
      '["Transfer of electrons","Sharing of electrons","Loss of protons","Gain of neutrons","Attraction of ions"]'::jsonb, 1, 6),
    ('Acids and Bases', 'Chemistry', 0.5,
      'According to the Arrhenius definition, an acid releases which ion in water?',
      '["OH-","H+","Na+","Cl-","O2-"]'::jsonb, 1, 7),
    ('pH Scale', 'Chemistry', 0.4,
      'A solution with pH = 3 is:',
      '["Strongly basic","Weakly basic","Neutral","Weakly acidic","Strongly acidic"]'::jsonb, 4, 8),
    ('Chemical Reactions', 'Chemistry', 0.5,
      'In the reaction 2H2 + O2 -> 2H2O, water is the:',
      '["Reactant","Catalyst","Product","Solvent","Inhibitor"]'::jsonb, 2, 9),
    ('Balancing Equations', 'Chemistry', 0.7,
      'What coefficient of O2 balances: C3H8 + O2 -> CO2 + H2O ?',
      '["3","4","5","6","7"]'::jsonb, 2, 10)
  RETURNING id, difficulty
)
INSERT INTO public.knowledge_states (student_id, concept_id, mastery_probability, memory_stability, next_revision_at)
SELECT '11111111-1111-1111-1111-111111111111', id, 0.15, 1.0, now()
FROM new_concepts;
