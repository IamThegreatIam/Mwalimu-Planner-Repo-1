
-- Schools table
CREATE TABLE public.schools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  admin_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- School teachers junction table
CREATE TABLE public.school_teachers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(school_id, teacher_user_id)
);
ALTER TABLE public.school_teachers ENABLE ROW LEVEL SECURITY;

-- Subject assignments: which teacher teaches what subject in which class
CREATE TABLE public.class_subject_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(class_id, subject)
);
ALTER TABLE public.class_subject_assignments ENABLE ROW LEVEL SECURITY;

-- Add quiz enhancements
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS shared_notes TEXT;

-- Add teacher comment on student attempts
ALTER TABLE public.student_quiz_attempts ADD COLUMN IF NOT EXISTS teacher_comment TEXT;

-- Add school_id to classes
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;

-- RLS policies for schools
CREATE POLICY "Admin manages own school" ON public.schools FOR ALL TO authenticated
  USING (auth.uid() = admin_user_id)
  WITH CHECK (auth.uid() = admin_user_id);

CREATE POLICY "School teachers can view school" ON public.schools FOR SELECT TO authenticated
  USING (id IN (SELECT school_id FROM public.school_teachers WHERE teacher_user_id = auth.uid()));

-- RLS policies for school_teachers
CREATE POLICY "Admin manages school teachers" ON public.school_teachers FOR ALL TO authenticated
  USING (school_id IN (SELECT id FROM public.schools WHERE admin_user_id = auth.uid()))
  WITH CHECK (school_id IN (SELECT id FROM public.schools WHERE admin_user_id = auth.uid()));

CREATE POLICY "Teachers can view own membership" ON public.school_teachers FOR SELECT TO authenticated
  USING (teacher_user_id = auth.uid());

-- RLS policies for class_subject_assignments
CREATE POLICY "Admin manages subject assignments" ON public.class_subject_assignments FOR ALL TO authenticated
  USING (school_id IN (SELECT id FROM public.schools WHERE admin_user_id = auth.uid()))
  WITH CHECK (school_id IN (SELECT id FROM public.schools WHERE admin_user_id = auth.uid()));

CREATE POLICY "Teachers view their assignments" ON public.class_subject_assignments FOR SELECT TO authenticated
  USING (teacher_user_id = auth.uid());

-- Allow authenticated users to update student_quiz_attempts (for teacher comments)
CREATE POLICY "Teachers can update attempts with comments" ON public.student_quiz_attempts FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);
