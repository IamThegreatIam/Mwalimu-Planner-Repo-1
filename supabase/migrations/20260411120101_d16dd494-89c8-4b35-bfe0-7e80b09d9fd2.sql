
-- Allow teachers to SELECT classes they're assigned to via class_subject_assignments
CREATE POLICY "Teachers view assigned classes"
ON public.classes
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT class_id FROM public.class_subject_assignments
    WHERE teacher_user_id = auth.uid()
  )
);

-- Allow teachers to view students in classes they're assigned to
CREATE POLICY "Teachers view students in assigned classes"
ON public.students
FOR SELECT
TO authenticated
USING (
  class_id IN (
    SELECT class_id FROM public.class_subject_assignments
    WHERE teacher_user_id = auth.uid()
  )
);

-- Allow teachers to view quizzes in classes they're assigned to
CREATE POLICY "Teachers view quizzes in assigned classes"
ON public.quizzes
FOR SELECT
TO authenticated
USING (
  class_id IN (
    SELECT class_id FROM public.class_subject_assignments
    WHERE teacher_user_id = auth.uid()
  )
);
