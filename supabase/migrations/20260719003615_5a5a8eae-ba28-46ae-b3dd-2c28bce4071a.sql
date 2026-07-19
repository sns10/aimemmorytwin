
-- 1) subjects
CREATE TABLE public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subjects TO anon, authenticated;
GRANT ALL ON public.subjects TO service_role;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read subjects" ON public.subjects FOR SELECT TO anon, authenticated USING (true);

-- 2) chapters
CREATE TABLE public.chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  name text NOT NULL,
  summary text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX chapters_subject_idx ON public.chapters(subject_id, sort_order);
GRANT SELECT ON public.chapters TO anon, authenticated;
GRANT ALL ON public.chapters TO service_role;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read chapters" ON public.chapters FOR SELECT TO anon, authenticated USING (true);

-- 3) Extend concepts (topics)
ALTER TABLE public.concepts
  ADD COLUMN chapter_id uuid REFERENCES public.chapters(id) ON DELETE SET NULL,
  ADD COLUMN learning_objectives text,
  ADD COLUMN video_url text;
CREATE INDEX concepts_chapter_idx ON public.concepts(chapter_id, sort_order);

-- 4) lesson_content
CREATE TABLE public.lesson_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_id uuid NOT NULL REFERENCES public.concepts(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('video','reading','summary')),
  title text NOT NULL,
  body text,
  url text,
  duration_min int NOT NULL DEFAULT 5,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lesson_content_concept_idx ON public.lesson_content(concept_id, sort_order);
GRANT SELECT ON public.lesson_content TO anon, authenticated;
GRANT ALL ON public.lesson_content TO service_role;
ALTER TABLE public.lesson_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read lessons" ON public.lesson_content FOR SELECT TO anon, authenticated USING (true);

-- 5) assignments
CREATE TABLE public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_id uuid NOT NULL REFERENCES public.concepts(id) ON DELETE CASCADE,
  title text NOT NULL,
  prompt text NOT NULL,
  rubric text NOT NULL,
  difficulty numeric NOT NULL DEFAULT 0.6,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX assignments_concept_idx ON public.assignments(concept_id);
GRANT SELECT ON public.assignments TO anon, authenticated;
GRANT ALL ON public.assignments TO service_role;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read assignments" ON public.assignments FOR SELECT TO anon, authenticated USING (true);

-- 6) assignment_submissions
CREATE TABLE public.assignment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  concept_id uuid NOT NULL REFERENCES public.concepts(id) ON DELETE CASCADE,
  response text NOT NULL,
  ai_score numeric NOT NULL DEFAULT 0,
  ai_feedback text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX asub_student_idx ON public.assignment_submissions(student_id, created_at DESC);
GRANT SELECT, INSERT ON public.assignment_submissions TO anon, authenticated;
GRANT ALL ON public.assignment_submissions TO service_role;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Demo anon read submissions" ON public.assignment_submissions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Demo anon write submissions" ON public.assignment_submissions FOR INSERT TO anon, authenticated WITH CHECK (true);

-- 7) learning_events.event_kind
ALTER TABLE public.learning_events
  ADD COLUMN event_kind text NOT NULL DEFAULT 'quiz_answer'
  CHECK (event_kind IN ('quiz_answer','lesson_view','assignment_submit'));

-- ============ SEED ============
DO $$
DECLARE
  subj_id uuid;
  ch1 uuid; ch2 uuid; ch3 uuid;
BEGIN
  INSERT INTO public.subjects (name, description, sort_order)
  VALUES ('Class 10 Chemistry', 'CBSE Class 10 Chemistry — a structured course from atoms to reactions.', 1)
  RETURNING id INTO subj_id;

  INSERT INTO public.chapters (subject_id, name, summary, sort_order) VALUES
    (subj_id, 'Atoms & Elements', 'Structure of the atom, atomic mass, isotopes, and how the periodic table organises everything.', 1)
    RETURNING id INTO ch1;
  INSERT INTO public.chapters (subject_id, name, summary, sort_order) VALUES
    (subj_id, 'Chemical Bonding', 'How atoms join together — ionic and covalent bonds and the properties they produce.', 2)
    RETURNING id INTO ch2;
  INSERT INTO public.chapters (subject_id, name, summary, sort_order) VALUES
    (subj_id, 'Reactions, Acids & Bases', 'Chemical change, balanced equations, and the acid–base–salt family.', 3)
    RETURNING id INTO ch3;

  -- Assign each existing concept to a chapter and give a placeholder video url
  UPDATE public.concepts SET chapter_id = ch1, video_url = 'https://www.youtube.com/embed/thnDxFdkzZs',
    learning_objectives = 'Describe protons, neutrons, electrons and how they arrange in an atom.'
    WHERE name = 'Atomic Structure';
  UPDATE public.concepts SET chapter_id = ch1, video_url = 'https://www.youtube.com/embed/pnQ8x-tK-c8',
    learning_objectives = 'Define atomic mass and compute it from isotope abundances.'
    WHERE name = 'Atomic Mass';
  UPDATE public.concepts SET chapter_id = ch1, video_url = 'https://www.youtube.com/embed/G_ULRhBQhx4',
    learning_objectives = 'Explain what isotopes are and give real-world examples.'
    WHERE name = 'Isotopes';
  UPDATE public.concepts SET chapter_id = ch1, video_url = 'https://www.youtube.com/embed/0RRVV4Diomg',
    learning_objectives = 'Predict atomic radius, electronegativity, and ionization energy trends across the periodic table.'
    WHERE name = 'Periodic Table Trends';

  UPDATE public.concepts SET chapter_id = ch2, video_url = 'https://www.youtube.com/embed/QqjcCvzWwww',
    learning_objectives = 'Explain how metals and non-metals form ionic bonds by electron transfer.'
    WHERE name = 'Ionic Bonds';
  UPDATE public.concepts SET chapter_id = ch2, video_url = 'https://www.youtube.com/embed/H4h-1FF9soM',
    learning_objectives = 'Explain covalent bonding through electron sharing and predict simple molecular shapes.'
    WHERE name = 'Covalent Bonds';

  UPDATE public.concepts SET chapter_id = ch3, video_url = 'https://www.youtube.com/embed/pyeur1uEMhs',
    learning_objectives = 'Identify chemical changes and classify reactions (combination, decomposition, displacement).'
    WHERE name = 'Chemical Reactions';
  UPDATE public.concepts SET chapter_id = ch3, video_url = 'https://www.youtube.com/embed/RnGu3xO2h74',
    learning_objectives = 'Balance simple chemical equations using the conservation of mass.'
    WHERE name = 'Balancing Equations';
  UPDATE public.concepts SET chapter_id = ch3, video_url = 'https://www.youtube.com/embed/vt8fB3MFzLk',
    learning_objectives = 'Distinguish acids from bases and describe their reactions with metals and carbonates.'
    WHERE name = 'Acids and Bases';
  UPDATE public.concepts SET chapter_id = ch3, video_url = 'https://www.youtube.com/embed/LS67vS10O5Y',
    learning_objectives = 'Interpret the pH scale and estimate acidity/basicity of common substances.'
    WHERE name = 'pH Scale';

  -- Lesson content: 1 video + 1 reading per topic
  INSERT INTO public.lesson_content (concept_id, kind, title, body, url, duration_min, sort_order)
  SELECT c.id, 'video', 'Watch: ' || c.name, NULL, c.video_url, 6, 1 FROM public.concepts c;

  INSERT INTO public.lesson_content (concept_id, kind, title, body, url, duration_min, sort_order)
  SELECT c.id, 'reading',
    'Read: ' || c.name || ' in 3 minutes',
    'Key idea: ' || COALESCE(c.learning_objectives, c.name) ||
    E'\n\nThink about it: ' || c.question ||
    E'\n\nRemember: the answer that best fits is "' || (c.options ->> c.correct_index) || '". Study why the other options fall short — that''s where most learners lose marks.',
    NULL, 3, 2
  FROM public.concepts c;

  -- Assignment per topic
  INSERT INTO public.assignments (concept_id, title, prompt, rubric, difficulty)
  SELECT c.id,
    'Apply: ' || c.name,
    'In 3–5 sentences, explain ' || c.name || ' in your own words and give one real-world example. Do not copy from the reading.',
    'Full credit: correct definition + accurate mechanism/example + own words. Partial credit: correct definition only. Zero: incorrect or off-topic.',
    c.difficulty
  FROM public.concepts c;
END $$;
