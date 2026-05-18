-- Create security definer function to check school admin
CREATE OR REPLACE FUNCTION public.is_school_admin(_user_id uuid, _school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.schools
    WHERE id = _school_id AND admin_user_id = _user_id
  )
$$;

-- Create security definer function to get school ids for an admin
CREATE OR REPLACE FUNCTION public.get_admin_school_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.schools WHERE admin_user_id = _user_id
$$;

-- Create security definer function to check if user is teacher in school
CREATE OR REPLACE FUNCTION public.is_school_teacher(_user_id uuid, _school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.school_teachers
    WHERE school_id = _school_id AND teacher_user_id = _user_id
  )
$$;

-- Drop and recreate schools policies
DROP POLICY IF EXISTS "Admin manages own school" ON public.schools;
DROP POLICY IF EXISTS "School teachers can view school" ON public.schools;

CREATE POLICY "Admin manages own school"
ON public.schools FOR ALL
TO authenticated
USING (auth.uid() = admin_user_id)
WITH CHECK (auth.uid() = admin_user_id);

CREATE POLICY "School teachers can view school"
ON public.schools FOR SELECT
TO authenticated
USING (public.is_school_teacher(auth.uid(), id));

-- Drop and recreate school_teachers policies to avoid recursion
DROP POLICY IF EXISTS "Admin manages school teachers" ON public.school_teachers;
DROP POLICY IF EXISTS "Teachers can view own membership" ON public.school_teachers;

CREATE POLICY "Admin manages school teachers"
ON public.school_teachers FOR ALL
TO authenticated
USING (school_id IN (SELECT public.get_admin_school_ids(auth.uid())))
WITH CHECK (school_id IN (SELECT public.get_admin_school_ids(auth.uid())));

CREATE POLICY "Teachers can view own membership"
ON public.school_teachers FOR SELECT
TO authenticated
USING (teacher_user_id = auth.uid());

-- Fix class_subject_assignments policies too
DROP POLICY IF EXISTS "Admin manages subject assignments" ON public.class_subject_assignments;

CREATE POLICY "Admin manages subject assignments"
ON public.class_subject_assignments FOR ALL
TO authenticated
USING (school_id IN (SELECT public.get_admin_school_ids(auth.uid())))
WITH CHECK (school_id IN (SELECT public.get_admin_school_ids(auth.uid())));

-- Fix classes admin policy
DROP POLICY IF EXISTS "Admin can manage school classes" ON public.classes;
DROP POLICY IF EXISTS "Admin can view school classes" ON public.classes;

CREATE POLICY "Admin can manage school classes"
ON public.classes FOR ALL
TO authenticated
USING (school_id IN (SELECT public.get_admin_school_ids(auth.uid())))
WITH CHECK (school_id IN (SELECT public.get_admin_school_ids(auth.uid())));

-- Fix students admin policy
DROP POLICY IF EXISTS "Admin can manage school students" ON public.students;
DROP POLICY IF EXISTS "Admin can view school students" ON public.students;

CREATE POLICY "Admin can manage school students"
ON public.students FOR ALL
TO authenticated
USING (class_id IN (SELECT c.id FROM classes c WHERE c.school_id IN (SELECT public.get_admin_school_ids(auth.uid()))))
WITH CHECK (class_id IN (SELECT c.id FROM classes c WHERE c.school_id IN (SELECT public.get_admin_school_ids(auth.uid()))));

-- Fix quizzes admin policy
DROP POLICY IF EXISTS "Admin can view school quizzes" ON public.quizzes;

CREATE POLICY "Admin can view school quizzes"
ON public.quizzes FOR SELECT
TO authenticated
USING (class_id IN (SELECT c.id FROM classes c WHERE c.school_id IN (SELECT public.get_admin_school_ids(auth.uid()))));

-- Fix student_quiz_attempts admin policy
DROP POLICY IF EXISTS "Admin can view school quiz attempts" ON public.student_quiz_attempts;

CREATE POLICY "Admin can view school quiz attempts"
ON public.student_quiz_attempts FOR SELECT
TO authenticated
USING (student_id IN (
  SELECT st.id FROM students st
  JOIN classes c ON c.id = st.class_id
  WHERE c.school_id IN (SELECT public.get_admin_school_ids(auth.uid()))
));

-- Fix lesson_plans admin policies
DROP POLICY IF EXISTS "Admin can comment on school lesson plans" ON public.lesson_plans;
DROP POLICY IF EXISTS "Admin can view school lesson plans" ON public.lesson_plans;

CREATE POLICY "Admin can view school lesson plans"
ON public.lesson_plans FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  user_id IN (
    SELECT st.teacher_user_id FROM school_teachers st
    WHERE st.school_id IN (SELECT public.get_admin_school_ids(auth.uid()))
  )
);

CREATE POLICY "Admin can comment on school lesson plans"
ON public.lesson_plans FOR UPDATE
TO authenticated
USING (
  user_id IN (
    SELECT st.teacher_user_id FROM school_teachers st
    WHERE st.school_id IN (SELECT public.get_admin_school_ids(auth.uid()))
  )
);