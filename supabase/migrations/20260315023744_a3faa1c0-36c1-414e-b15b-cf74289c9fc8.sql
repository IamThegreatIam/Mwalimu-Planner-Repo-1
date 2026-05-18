
-- Classes table
CREATE TABLE public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Students table
CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Quizzes table
CREATE TABLE public.quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  teacher_id uuid NOT NULL,
  lesson_plan_id uuid REFERENCES public.lesson_plans(id) ON DELETE SET NULL,
  title text NOT NULL,
  subject text,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

-- Student quiz attempts
CREATE TABLE public.student_quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  score integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 10,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, quiz_id)
);
ALTER TABLE public.student_quiz_attempts ENABLE ROW LEVEL SECURITY;

-- RLS: Classes - teachers manage their own
CREATE POLICY "Teachers manage own classes" ON public.classes FOR ALL TO authenticated USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);

-- RLS: Students - teachers manage students in their classes
CREATE POLICY "Teachers manage students in own classes" ON public.students FOR ALL TO authenticated USING (class_id IN (SELECT id FROM public.classes WHERE teacher_id = auth.uid())) WITH CHECK (class_id IN (SELECT id FROM public.classes WHERE teacher_id = auth.uid()));

-- RLS: Students - anon can select (for student portal login)
CREATE POLICY "Anon can read students" ON public.students FOR SELECT TO anon USING (true);

-- RLS: Quizzes - teachers manage their own
CREATE POLICY "Teachers manage own quizzes" ON public.quizzes FOR ALL TO authenticated USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);

-- RLS: Quizzes - anon can read (for student portal)
CREATE POLICY "Anon can read quizzes" ON public.quizzes FOR SELECT TO anon USING (true);

-- RLS: Student quiz attempts - anon can insert and read
CREATE POLICY "Anon can insert attempts" ON public.student_quiz_attempts FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can read attempts" ON public.student_quiz_attempts FOR SELECT TO anon USING (true);

-- RLS: Authenticated teachers can also read attempts
CREATE POLICY "Teachers read all attempts" ON public.student_quiz_attempts FOR SELECT TO authenticated USING (true);
