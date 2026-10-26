-- A teacher must be able to read the state of the students in their own class,
-- and the seeded demo class must be readable by visitors. Without this,
-- owns_student() hides every classmate and the cohort view shows zeros.

CREATE OR REPLACE FUNCTION public.in_readable_class(_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.class_members m
    JOIN public.classes c ON c.id = m.class_id
    WHERE m.student_id = _student_id
      AND (
        c.teacher_user_id = auth.uid()
        OR c.id = '22222222-2222-2222-2222-222222222222'::uuid
      )
  )
$$;

GRANT EXECUTE ON FUNCTION public.in_readable_class(uuid) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Class staff read knowledge_states" ON public.knowledge_states;
CREATE POLICY "Class staff read knowledge_states" ON public.knowledge_states
  FOR SELECT TO anon, authenticated
  USING (public.in_readable_class(student_id));

DROP POLICY IF EXISTS "Class staff read learning_events" ON public.learning_events;
CREATE POLICY "Class staff read learning_events" ON public.learning_events
  FOR SELECT TO anon, authenticated
  USING (public.in_readable_class(student_id));

DROP POLICY IF EXISTS "Class staff read assignment_submissions" ON public.assignment_submissions;
CREATE POLICY "Class staff read assignment_submissions" ON public.assignment_submissions
  FOR SELECT TO anon, authenticated
  USING (public.in_readable_class(student_id));
