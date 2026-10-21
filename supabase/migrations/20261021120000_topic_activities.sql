-- Game-style practice activities per topic.
--
-- Three kinds, all closed-form so they can be auto-scored and fed back into
-- the BKT engine exactly like a quiz answer:
--   flashcard — front/back recall card, learner self-rates
--   cloze     — a sentence with one blank and four choices
--   match     — four term/meaning pairs to pair up against the clock
--
-- Flashcards are generated from the existing question bank (question ->
-- correct answer + explanation), so every topic gets cards for free.

CREATE TABLE IF NOT EXISTS public.topic_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_id uuid NOT NULL REFERENCES public.concepts(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('flashcard','cloze','match')),
  payload jsonb NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS topic_activities_concept_idx
  ON public.topic_activities(concept_id, kind, sort_order);

GRANT SELECT ON public.topic_activities TO anon, authenticated;
GRANT ALL ON public.topic_activities TO service_role;

ALTER TABLE public.topic_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read topic_activities" ON public.topic_activities;
CREATE POLICY "Public read topic_activities" ON public.topic_activities
  FOR SELECT TO anon, authenticated USING (true);

-- ------------------------------------------------------------- flashcards
-- One card per question: the question on the front, the answer and the
-- reason on the back.
DELETE FROM public.topic_activities WHERE kind = 'flashcard';

INSERT INTO public.topic_activities (concept_id, kind, payload, sort_order)
SELECT q.concept_id,
       'flashcard',
       jsonb_build_object(
         'front', q.question,
         'back', (q.options ->> q.correct_index),
         'why', COALESCE(q.explanation, '')
       ),
       q.sort_order
FROM public.questions q;
