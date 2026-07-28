DROP POLICY IF EXISTS "Read own knowledge_states" ON public.knowledge_states;
DROP POLICY IF EXISTS "Write own knowledge_states" ON public.knowledge_states;
DROP POLICY IF EXISTS "Update own knowledge_states" ON public.knowledge_states;
DROP POLICY IF EXISTS "Read own learning_events" ON public.learning_events;
DROP POLICY IF EXISTS "Insert own learning_events" ON public.learning_events;
DROP POLICY IF EXISTS "Read own submissions" ON public.assignment_submissions;
DROP POLICY IF EXISTS "Write own submissions" ON public.assignment_submissions;
DROP POLICY IF EXISTS "Read own personality" ON public.personality_profiles;
DROP POLICY IF EXISTS "Write own personality" ON public.personality_profiles;
DROP POLICY IF EXISTS "Update own personality" ON public.personality_profiles;
DROP POLICY IF EXISTS "Read own rec events" ON public.recommendation_events;
DROP POLICY IF EXISTS "Insert own rec events" ON public.recommendation_events;

DROP FUNCTION IF EXISTS public.owns_student(uuid);

CREATE POLICY "Read own knowledge_states" ON public.knowledge_states FOR SELECT TO anon, authenticated
  USING (student_id = '11111111-1111-1111-1111-111111111111'::uuid OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()));
CREATE POLICY "Write own knowledge_states" ON public.knowledge_states FOR INSERT TO anon, authenticated
  WITH CHECK (student_id = '11111111-1111-1111-1111-111111111111'::uuid OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()));
CREATE POLICY "Update own knowledge_states" ON public.knowledge_states FOR UPDATE TO anon, authenticated
  USING (student_id = '11111111-1111-1111-1111-111111111111'::uuid OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()))
  WITH CHECK (student_id = '11111111-1111-1111-1111-111111111111'::uuid OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()));

CREATE POLICY "Read own learning_events" ON public.learning_events FOR SELECT TO anon, authenticated
  USING (student_id = '11111111-1111-1111-1111-111111111111'::uuid OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()));
CREATE POLICY "Insert own learning_events" ON public.learning_events FOR INSERT TO anon, authenticated
  WITH CHECK (student_id = '11111111-1111-1111-1111-111111111111'::uuid OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()));

CREATE POLICY "Read own submissions" ON public.assignment_submissions FOR SELECT TO anon, authenticated
  USING (student_id = '11111111-1111-1111-1111-111111111111'::uuid OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()));
CREATE POLICY "Write own submissions" ON public.assignment_submissions FOR INSERT TO anon, authenticated
  WITH CHECK (student_id = '11111111-1111-1111-1111-111111111111'::uuid OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()));

CREATE POLICY "Read own personality" ON public.personality_profiles FOR SELECT TO anon, authenticated
  USING (student_id = '11111111-1111-1111-1111-111111111111'::uuid OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()));
CREATE POLICY "Write own personality" ON public.personality_profiles FOR INSERT TO anon, authenticated
  WITH CHECK (student_id = '11111111-1111-1111-1111-111111111111'::uuid OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()));
CREATE POLICY "Update own personality" ON public.personality_profiles FOR UPDATE TO anon, authenticated
  USING (student_id = '11111111-1111-1111-1111-111111111111'::uuid OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()))
  WITH CHECK (student_id = '11111111-1111-1111-1111-111111111111'::uuid OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()));

CREATE POLICY "Read own rec events" ON public.recommendation_events FOR SELECT TO anon, authenticated
  USING (student_id = '11111111-1111-1111-1111-111111111111'::uuid OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()));
CREATE POLICY "Insert own rec events" ON public.recommendation_events FOR INSERT TO anon, authenticated
  WITH CHECK (student_id = '11111111-1111-1111-1111-111111111111'::uuid OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()));