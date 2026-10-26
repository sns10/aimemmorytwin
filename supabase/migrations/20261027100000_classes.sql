-- Classes: group students under a teacher so the engine's per-student state can
-- be read as a cohort.
--
-- A teacher creates a class and shares a six-character join code. Students join
-- with that code. The teacher dashboard then aggregates the knowledge states and
-- answer history that already exist, per topic and per student.

CREATE TABLE IF NOT EXISTS public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  teacher_user_id uuid NOT NULL,
  join_code text NOT NULL UNIQUE,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.class_members (
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (class_id, student_id)
);

CREATE INDEX IF NOT EXISTS class_members_student_idx ON public.class_members(student_id);

GRANT SELECT, INSERT, UPDATE ON public.classes TO authenticated;
GRANT SELECT, DELETE ON public.class_members TO authenticated;
GRANT SELECT ON public.classes, public.class_members TO anon;
GRANT ALL ON public.classes, public.class_members TO service_role;

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;

-- A teacher owns the classes they created; a student can see the classes they
-- belong to. Finding a class by its join code goes through join_class_by_code()
-- below, so codes are not listable.
DROP POLICY IF EXISTS "Teacher reads own classes" ON public.classes;
CREATE POLICY "Teacher reads own classes" ON public.classes
  FOR SELECT TO authenticated
  USING (
    teacher_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.class_members m
      JOIN public.students s ON s.id = m.student_id
      WHERE m.class_id = classes.id AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Signed-in user creates a class" ON public.classes;
CREATE POLICY "Signed-in user creates a class" ON public.classes
  FOR INSERT TO authenticated
  WITH CHECK (teacher_user_id = auth.uid());

DROP POLICY IF EXISTS "Teacher updates own class" ON public.classes;
CREATE POLICY "Teacher updates own class" ON public.classes
  FOR UPDATE TO authenticated
  USING (teacher_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (teacher_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Membership visible to teacher and member" ON public.class_members;
CREATE POLICY "Membership visible to teacher and member" ON public.class_members
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.classes c
            WHERE c.id = class_members.class_id AND c.teacher_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.students s
               WHERE s.id = class_members.student_id AND s.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Student leaves a class" ON public.class_members;
CREATE POLICY "Student leaves a class" ON public.class_members
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.students s
            WHERE s.id = class_members.student_id AND s.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.classes c
               WHERE c.id = class_members.class_id AND c.teacher_user_id = auth.uid())
  );

-- ------------------------------------------------------------- join by code
-- SECURITY DEFINER so a student can join without being able to read every
-- class row (and therefore every join code).
CREATE OR REPLACE FUNCTION public.join_class_by_code(_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_id uuid;
  me uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'sign in required';
  END IF;

  SELECT id INTO target_id
  FROM public.classes
  WHERE upper(join_code) = upper(trim(_code)) AND archived = false;

  IF target_id IS NULL THEN
    RAISE EXCEPTION 'no class with that code';
  END IF;

  SELECT id INTO me FROM public.students WHERE user_id = auth.uid();
  IF me IS NULL THEN
    RAISE EXCEPTION 'no learner profile yet';
  END IF;

  INSERT INTO public.class_members (class_id, student_id)
  VALUES (target_id, me)
  ON CONFLICT DO NOTHING;

  RETURN target_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_class_by_code(text) TO authenticated;

-- Six-character code, no confusable characters (0/O, 1/I).
CREATE OR REPLACE FUNCTION public.generate_join_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  i int;
BEGIN
  LOOP
    candidate := '';
    FOR i IN 1..6 LOOP
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.classes WHERE join_code = candidate);
  END LOOP;
  RETURN candidate;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_join_code() TO authenticated;
