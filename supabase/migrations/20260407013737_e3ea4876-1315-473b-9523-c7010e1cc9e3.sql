
-- Add teacher_code to profiles for school linking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS teacher_code text UNIQUE;

-- Add admin_comment to lesson_plans for admin feedback
ALTER TABLE public.lesson_plans ADD COLUMN IF NOT EXISTS admin_comment text;

-- Create a function to generate unique teacher codes on profile creation
CREATE OR REPLACE FUNCTION public.generate_teacher_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_code text;
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i int;
BEGIN
  LOOP
    new_code := 'T-';
    FOR i IN 1..6 LOOP
      new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE teacher_code = new_code);
  END LOOP;
  NEW.teacher_code := new_code;
  RETURN NEW;
END;
$$;

-- Attach trigger to auto-generate teacher_code on insert
CREATE TRIGGER trigger_generate_teacher_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_teacher_code();

-- Backfill existing profiles with unique teacher codes
DO $$
DECLARE
  rec RECORD;
  new_code text;
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i int;
BEGIN
  FOR rec IN SELECT id FROM public.profiles WHERE teacher_code IS NULL LOOP
    LOOP
      new_code := 'T-';
      FOR i IN 1..6 LOOP
        new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
      END LOOP;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE teacher_code = new_code);
    END LOOP;
    UPDATE public.profiles SET teacher_code = new_code WHERE id = rec.id;
  END LOOP;
END;
$$;

-- Allow admin to read lesson plans of teachers in their school
CREATE POLICY "Admin can view school lesson plans"
ON public.lesson_plans
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT st.teacher_user_id FROM public.school_teachers st
    JOIN public.schools s ON s.id = st.school_id
    WHERE s.admin_user_id = auth.uid()
  )
  OR user_id = auth.uid()
);

-- Allow admin to update lesson plans (for adding comments)
CREATE POLICY "Admin can comment on school lesson plans"
ON public.lesson_plans
FOR UPDATE
TO authenticated
USING (
  user_id IN (
    SELECT st.teacher_user_id FROM public.school_teachers st
    JOIN public.schools s ON s.id = st.school_id
    WHERE s.admin_user_id = auth.uid()
  )
);

-- Allow admin to view students in school classes
CREATE POLICY "Admin can view school students"
ON public.students
FOR SELECT
TO authenticated
USING (
  class_id IN (
    SELECT c.id FROM public.classes c
    WHERE c.school_id IN (
      SELECT s.id FROM public.schools s WHERE s.admin_user_id = auth.uid()
    )
  )
);

-- Allow admin to manage students in school classes
CREATE POLICY "Admin can manage school students"
ON public.students
FOR ALL
TO authenticated
USING (
  class_id IN (
    SELECT c.id FROM public.classes c
    WHERE c.school_id IN (
      SELECT s.id FROM public.schools s WHERE s.admin_user_id = auth.uid()
    )
  )
)
WITH CHECK (
  class_id IN (
    SELECT c.id FROM public.classes c
    WHERE c.school_id IN (
      SELECT s.id FROM public.schools s WHERE s.admin_user_id = auth.uid()
    )
  )
);

-- Admin can view classes in their school
CREATE POLICY "Admin can view school classes"
ON public.classes
FOR SELECT
TO authenticated
USING (
  school_id IN (SELECT s.id FROM public.schools s WHERE s.admin_user_id = auth.uid())
);

-- Admin can manage classes in their school
CREATE POLICY "Admin can manage school classes"
ON public.classes
FOR ALL
TO authenticated
USING (
  school_id IN (SELECT s.id FROM public.schools s WHERE s.admin_user_id = auth.uid())
)
WITH CHECK (
  school_id IN (SELECT s.id FROM public.schools s WHERE s.admin_user_id = auth.uid())
);

-- Admin can view quiz attempts for school students
CREATE POLICY "Admin can view school quiz attempts"
ON public.student_quiz_attempts
FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT st.id FROM public.students st
    JOIN public.classes c ON c.id = st.class_id
    JOIN public.schools s ON s.id = c.school_id
    WHERE s.admin_user_id = auth.uid()
  )
);

-- Admin can view quizzes for school classes
CREATE POLICY "Admin can view school quizzes"
ON public.quizzes
FOR SELECT
TO authenticated
USING (
  class_id IN (
    SELECT c.id FROM public.classes c
    WHERE c.school_id IN (SELECT s.id FROM public.schools s WHERE s.admin_user_id = auth.uid())
  )
);
