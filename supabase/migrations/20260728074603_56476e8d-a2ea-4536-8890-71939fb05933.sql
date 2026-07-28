CREATE TABLE public.personality_profiles (
  student_id uuid NOT NULL PRIMARY KEY,
  openness numeric NOT NULL DEFAULT 0,
  conscientiousness numeric NOT NULL DEFAULT 0,
  extraversion numeric NOT NULL DEFAULT 0,
  agreeableness numeric NOT NULL DEFAULT 0,
  neuroticism numeric NOT NULL DEFAULT 0,
  math_confidence numeric NOT NULL DEFAULT 3,
  cluster text NOT NULL DEFAULT 'diligent',
  tailored_enabled boolean NOT NULL DEFAULT true,
  assessed_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personality_profiles TO anon, authenticated;
GRANT ALL ON public.personality_profiles TO service_role;
ALTER TABLE public.personality_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Demo anon read personality" ON public.personality_profiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Demo anon write personality" ON public.personality_profiles FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Demo anon update personality" ON public.personality_profiles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.cohort_topic_stats (
  concept_id uuid NOT NULL PRIMARY KEY REFERENCES public.concepts(id) ON DELETE CASCADE,
  peers_completed integer NOT NULL DEFAULT 0,
  top_achievers_completed integer NOT NULL DEFAULT 0,
  cohort_size integer NOT NULL DEFAULT 24,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cohort_topic_stats TO anon, authenticated;
GRANT ALL ON public.cohort_topic_stats TO service_role;
ALTER TABLE public.cohort_topic_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read cohort stats" ON public.cohort_topic_stats FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.recommendation_events (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  concept_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'impression',
  lane text NOT NULL DEFAULT 'practice',
  explanation_mode text NOT NULL DEFAULT 'characteristic',
  persuasive_type text,
  profile_cluster text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX recommendation_events_student_idx ON public.recommendation_events (student_id, created_at DESC);
GRANT SELECT, INSERT ON public.recommendation_events TO anon, authenticated;
GRANT ALL ON public.recommendation_events TO service_role;
ALTER TABLE public.recommendation_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Demo anon read rec events" ON public.recommendation_events FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Demo anon insert rec events" ON public.recommendation_events FOR INSERT TO anon, authenticated WITH CHECK (true);