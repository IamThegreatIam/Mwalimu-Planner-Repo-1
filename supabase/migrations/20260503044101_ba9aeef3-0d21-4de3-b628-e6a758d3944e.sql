
-- 1. CLASSES: Optional class teacher
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS class_teacher_user_id uuid;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS stream text;

-- 2. EXAMS: marks entry mode + total locked
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS marks_entry_mode text NOT NULL DEFAULT 'class_teacher';
-- 'class_teacher' | 'subject_teachers'
ALTER TABLE public.exams ALTER COLUMN total_marks_per_subject SET DEFAULT 100;
UPDATE public.exams SET total_marks_per_subject = 100 WHERE total_marks_per_subject IS DISTINCT FROM 100;

-- 3. QUIZZES: deadline extension, soft delete, release, type
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS original_due_date timestamptz;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS allow_late boolean NOT NULL DEFAULT true;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS instructions text;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS total_marks integer;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS submission_format text DEFAULT 'inline';
-- 'inline' (existing inline answers) | 'file_upload' | 'mixed'

-- 4. STUDENT QUIZ ATTEMPTS: marking workflow
ALTER TABLE public.student_quiz_attempts ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'submitted';
-- 'submitted' | 'marked' | 'released'
ALTER TABLE public.student_quiz_attempts ADD COLUMN IF NOT EXISTS submission_url text;
ALTER TABLE public.student_quiz_attempts ADD COLUMN IF NOT EXISTS submission_file_name text;
ALTER TABLE public.student_quiz_attempts ADD COLUMN IF NOT EXISTS marked_at timestamptz;
ALTER TABLE public.student_quiz_attempts ADD COLUMN IF NOT EXISTS released_at timestamptz;
ALTER TABLE public.student_quiz_attempts ADD COLUMN IF NOT EXISTS is_late boolean NOT NULL DEFAULT false;

-- Allow teachers/students to insert
DROP POLICY IF EXISTS "Anyone can insert attempts" ON public.student_quiz_attempts;
CREATE POLICY "Anyone can insert attempts" ON public.student_quiz_attempts
FOR INSERT WITH CHECK (true);

-- 5. NOTICEBOARD
CREATE TABLE IF NOT EXISTS public.teacher_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  author_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  priority text NOT NULL DEFAULT 'normal',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.teacher_notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages notices" ON public.teacher_notices
FOR ALL TO authenticated
USING (school_id IN (SELECT get_admin_school_ids(auth.uid())))
WITH CHECK (school_id IN (SELECT get_admin_school_ids(auth.uid())));

CREATE POLICY "Teachers view school notices" ON public.teacher_notices
FOR SELECT TO authenticated
USING (is_school_teacher(auth.uid(), school_id));

-- 6. SHARED EXAM RESULTS to students
CREATE TABLE IF NOT EXISTS public.shared_exam_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL,
  student_id uuid NOT NULL,
  shared_by uuid NOT NULL,
  shared_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(exam_id, student_id)
);
ALTER TABLE public.shared_exam_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages shared results" ON public.shared_exam_results
FOR ALL TO authenticated
USING (exam_id IN (SELECT id FROM public.exams WHERE school_id IN (SELECT get_admin_school_ids(auth.uid()))))
WITH CHECK (exam_id IN (SELECT id FROM public.exams WHERE school_id IN (SELECT get_admin_school_ids(auth.uid()))));

CREATE POLICY "Anyone read shared results" ON public.shared_exam_results
FOR SELECT TO anon, authenticated USING (true);

-- 7. LIBRARY: nested subfolders
ALTER TABLE public.library_subfolders ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.library_subfolders(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_library_subfolders_parent ON public.library_subfolders(parent_id);

-- 8. Storage bucket for assignment submissions
INSERT INTO storage.buckets (id, name, public)
VALUES ('assignment-submissions', 'assignment-submissions', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can upload submission"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'assignment-submissions');

CREATE POLICY "Anyone read submissions"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'assignment-submissions');

-- 9. Helper: is class teacher
CREATE OR REPLACE FUNCTION public.is_class_teacher(_user_id uuid, _class_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.classes WHERE id = _class_id AND class_teacher_user_id = _user_id)
$$;
