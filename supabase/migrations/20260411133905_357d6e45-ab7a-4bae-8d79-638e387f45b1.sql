
-- 1. PROFILES: restrict SELECT to authenticated only
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated"
ON public.profiles FOR SELECT TO authenticated
USING (true);

-- 2. STUDENTS: drop anon read/update
DROP POLICY IF EXISTS "Anon can read students" ON public.students;
DROP POLICY IF EXISTS "Anon can update students" ON public.students;

-- 3. STUDENT_QUIZ_ATTEMPTS: drop anon insert and overly permissive policies
DROP POLICY IF EXISTS "Anon can insert attempts" ON public.student_quiz_attempts;
DROP POLICY IF EXISTS "Anon can read attempts" ON public.student_quiz_attempts;
DROP POLICY IF EXISTS "Teachers can update attempts with comments" ON public.student_quiz_attempts;

-- Recreate teacher update policy scoped to their quizzes
CREATE POLICY "Teachers update own quiz attempts"
ON public.student_quiz_attempts FOR UPDATE TO authenticated
USING (
  quiz_id IN (SELECT id FROM public.quizzes WHERE teacher_id = auth.uid())
)
WITH CHECK (
  quiz_id IN (SELECT id FROM public.quizzes WHERE teacher_id = auth.uid())
);

-- 4. CLASS_MESSAGES: drop anon policies
DROP POLICY IF EXISTS "Anon can read class messages" ON public.class_messages;
DROP POLICY IF EXISTS "Anon can insert class messages" ON public.class_messages;

-- Add policy for assigned teachers to manage messages
CREATE POLICY "Assigned teachers manage class messages"
ON public.class_messages FOR ALL TO authenticated
USING (
  class_id IN (
    SELECT class_id FROM public.class_subject_assignments
    WHERE teacher_user_id = auth.uid()
  )
)
WITH CHECK (
  class_id IN (
    SELECT class_id FROM public.class_subject_assignments
    WHERE teacher_user_id = auth.uid()
  )
);

-- Add policy for admins to view class messages
CREATE POLICY "Admin view class messages"
ON public.class_messages FOR SELECT TO authenticated
USING (
  class_id IN (
    SELECT c.id FROM public.classes c
    WHERE c.school_id IN (SELECT get_admin_school_ids(auth.uid()))
  )
);

-- 5. QUIZZES: drop anon read
DROP POLICY IF EXISTS "Anon can read quizzes" ON public.quizzes;
