ALTER TABLE public.students ADD COLUMN IF NOT EXISTS user_id uuid UNIQUE;

CREATE OR REPLACE FUNCTION public.owns_student(_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _student_id = '11111111-1111-1111-1111-111111111111'::uuid
    OR EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = _student_id AND s.user_id = auth.uid()
    )
$$;

GRANT EXECUTE ON FUNCTION public.owns_student(uuid) TO anon, authenticated, service_role;

-- students
DROP POLICY IF EXISTS "Demo anon can read students" ON public.students;
DROP POLICY IF EXISTS "Demo anon can update students" ON public.students;
CREATE POLICY "Read own or demo student" ON public.students FOR SELECT TO anon, authenticated
  USING (id = '11111111-1111-1111-1111-111111111111'::uuid OR user_id = auth.uid());
CREATE POLICY "Update own or demo student" ON public.students FOR UPDATE TO anon, authenticated
  USING (id = '11111111-1111-1111-1111-111111111111'::uuid OR user_id = auth.uid())
  WITH CHECK (id = '11111111-1111-1111-1111-111111111111'::uuid OR user_id = auth.uid());
CREATE POLICY "Create own student" ON public.students FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
GRANT SELECT, INSERT, UPDATE ON public.students TO anon, authenticated;
GRANT ALL ON public.students TO service_role;

-- knowledge_states
DROP POLICY IF EXISTS "Demo anon read knowledge_states" ON public.knowledge_states;
DROP POLICY IF EXISTS "Demo anon update knowledge_states" ON public.knowledge_states;
DROP POLICY IF EXISTS "Demo anon write knowledge_states" ON public.knowledge_states;
CREATE POLICY "Read own knowledge_states" ON public.knowledge_states FOR SELECT TO anon, authenticated USING (public.owns_student(student_id));
CREATE POLICY "Write own knowledge_states" ON public.knowledge_states FOR INSERT TO anon, authenticated WITH CHECK (public.owns_student(student_id));
CREATE POLICY "Update own knowledge_states" ON public.knowledge_states FOR UPDATE TO anon, authenticated USING (public.owns_student(student_id)) WITH CHECK (public.owns_student(student_id));

-- learning_events
DROP POLICY IF EXISTS "Demo anon read learning_events" ON public.learning_events;
DROP POLICY IF EXISTS "Demo anon insert learning_events" ON public.learning_events;
CREATE POLICY "Read own learning_events" ON public.learning_events FOR SELECT TO anon, authenticated USING (public.owns_student(student_id));
CREATE POLICY "Insert own learning_events" ON public.learning_events FOR INSERT TO anon, authenticated WITH CHECK (public.owns_student(student_id));

-- assignment_submissions
DROP POLICY IF EXISTS "Demo anon read submissions" ON public.assignment_submissions;
DROP POLICY IF EXISTS "Demo anon write submissions" ON public.assignment_submissions;
CREATE POLICY "Read own submissions" ON public.assignment_submissions FOR SELECT TO anon, authenticated USING (public.owns_student(student_id));
CREATE POLICY "Write own submissions" ON public.assignment_submissions FOR INSERT TO anon, authenticated WITH CHECK (public.owns_student(student_id));

-- personality_profiles
DROP POLICY IF EXISTS "Demo anon read personality" ON public.personality_profiles;
DROP POLICY IF EXISTS "Demo anon write personality" ON public.personality_profiles;
DROP POLICY IF EXISTS "Demo anon update personality" ON public.personality_profiles;
CREATE POLICY "Read own personality" ON public.personality_profiles FOR SELECT TO anon, authenticated USING (public.owns_student(student_id));
CREATE POLICY "Write own personality" ON public.personality_profiles FOR INSERT TO anon, authenticated WITH CHECK (public.owns_student(student_id));
CREATE POLICY "Update own personality" ON public.personality_profiles FOR UPDATE TO anon, authenticated USING (public.owns_student(student_id)) WITH CHECK (public.owns_student(student_id));

-- recommendation_events
DROP POLICY IF EXISTS "Demo anon read rec events" ON public.recommendation_events;
DROP POLICY IF EXISTS "Demo anon insert rec events" ON public.recommendation_events;
CREATE POLICY "Read own rec events" ON public.recommendation_events FOR SELECT TO anon, authenticated USING (public.owns_student(student_id));
CREATE POLICY "Insert own rec events" ON public.recommendation_events FOR INSERT TO anon, authenticated WITH CHECK (public.owns_student(student_id));