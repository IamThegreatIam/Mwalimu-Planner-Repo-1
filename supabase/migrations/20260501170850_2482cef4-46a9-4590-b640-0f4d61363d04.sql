
-- ========== STORAGE BUCKET FOR SCHOOL LOGOS ==========
INSERT INTO storage.buckets (id, name, public)
VALUES ('school-logos', 'school-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view school logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'school-logos');

CREATE POLICY "School admins upload their logo"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'school-logos'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.schools WHERE admin_user_id = auth.uid()
  )
);

CREATE POLICY "School admins update their logo"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'school-logos'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.schools WHERE admin_user_id = auth.uid()
  )
);

CREATE POLICY "School admins delete their logo"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'school-logos'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.schools WHERE admin_user_id = auth.uid()
  )
);

-- ========== EXTEND SCHOOLS ==========
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS school_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS county text,
  ADD COLUMN IF NOT EXISTS sub_county text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS principal_name text,
  ADD COLUMN IF NOT EXISTS school_type text CHECK (school_type IN ('Public','Private')),
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- ========== EXTEND PROFILES (teacher_code, school_id) ==========
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL;

-- (teacher_code column already exists per schema)

-- New format generator: TCH-YYYY-NNNNNN
CREATE OR REPLACE FUNCTION public.generate_tch_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code text;
  yr text := to_char(now(), 'YYYY');
BEGIN
  LOOP
    new_code := 'TCH-' || yr || '-' || lpad(floor(random()*900000 + 100000)::text, 6, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE teacher_code = new_code);
  END LOOP;
  RETURN new_code;
END;
$$;

-- Replace old trigger function to use new format
CREATE OR REPLACE FUNCTION public.generate_teacher_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.teacher_code IS NULL OR NEW.teacher_code = '' OR NEW.teacher_code !~ '^TCH-' THEN
    NEW.teacher_code := public.generate_tch_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_teacher_code ON public.profiles;
CREATE TRIGGER trg_profiles_teacher_code
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.generate_teacher_code();

-- Backfill existing profiles
UPDATE public.profiles
SET teacher_code = public.generate_tch_code()
WHERE teacher_code IS NULL OR teacher_code = '' OR teacher_code !~ '^TCH-';

-- ========== EXTEND STUDENTS ==========
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS admission_number text;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_students_admission_class
  ON public.students(class_id, admission_number)
  WHERE admission_number IS NOT NULL;

-- ========== CURRICULUM SUBJECTS REFERENCE ==========
CREATE TABLE IF NOT EXISTS public.curriculum_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_category text NOT NULL CHECK (grade_category IN ('Lower Primary','Upper Primary','Junior School')),
  applicable_grades text[] NOT NULL,
  subjects jsonb NOT NULL,
  subject_count integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.curriculum_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read curriculum"
ON public.curriculum_subjects FOR SELECT TO authenticated
USING (true);

INSERT INTO public.curriculum_subjects (grade_category, applicable_grades, subjects, subject_count) VALUES
('Lower Primary', ARRAY['Grade 1','Grade 2','Grade 3'],
 '["Kiswahili/KSL","English","Mathematics","Christian Religious Education","Environmental Activities","Creative Activities"]'::jsonb, 6),
('Upper Primary', ARRAY['Grade 4','Grade 5','Grade 6'],
 '["English","Kiswahili/KSL","Mathematics","Christian Religious Education","Science & Technology","Agriculture & Nutrition","Social Studies","Creative Arts"]'::jsonb, 8),
('Junior School', ARRAY['Grade 7','Grade 8','Grade 9'],
 '["English","Kiswahili/KSL","Mathematics","Christian Religious Education","Social Studies","Integrated Science","Pre-Technical & Pre-Career Education","Agriculture & Nutrition","Creative Arts & Sports"]'::jsonb, 9)
ON CONFLICT DO NOTHING;

-- ========== EXAMS TABLE ==========
CREATE TABLE IF NOT EXISTS public.exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_name text NOT NULL,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  grade_level text NOT NULL,
  stream text,
  exam_type text NOT NULL CHECK (exam_type IN ('Opener Assessment','Mid-Term Exam','End-of-Term Exam','Continuous Assessment Test','Mock Exam','KJSEA')),
  exam_period text CHECK (exam_period IN ('Term 1','Term 2','Term 3')),
  academic_year text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  total_marks_per_subject integer NOT NULL DEFAULT 100,
  subject_count integer NOT NULL,
  subjects jsonb NOT NULL,
  duration text,
  is_draft boolean NOT NULL DEFAULT true,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  deleted_by uuid,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_exams_school ON public.exams(school_id);
CREATE INDEX IF NOT EXISTS idx_exams_created_by ON public.exams(created_by);

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School members view exams"
ON public.exams FOR SELECT TO authenticated
USING (
  is_deleted = false AND (
    school_id IN (SELECT public.get_admin_school_ids(auth.uid()))
    OR public.is_school_teacher(auth.uid(), school_id)
    OR created_by = auth.uid()
  )
);

CREATE POLICY "School admins manage exams"
ON public.exams FOR ALL TO authenticated
USING (school_id IN (SELECT public.get_admin_school_ids(auth.uid())))
WITH CHECK (school_id IN (SELECT public.get_admin_school_ids(auth.uid())));

CREATE POLICY "Teachers create exams in their school"
ON public.exams FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND public.is_school_teacher(auth.uid(), school_id)
);

CREATE POLICY "Teachers update own exams"
ON public.exams FOR UPDATE TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Teachers soft-delete own exams"
ON public.exams FOR DELETE TO authenticated
USING (created_by = auth.uid());

CREATE TRIGGER trg_exams_updated_at
BEFORE UPDATE ON public.exams
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== EXAM RESULTS ==========
CREATE TABLE IF NOT EXISTS public.exam_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject text NOT NULL,
  marks_scored integer NOT NULL CHECK (marks_scored >= 0),
  total_marks integer NOT NULL,
  percentage numeric(5,2) NOT NULL,
  achievement_level text NOT NULL CHECK (achievement_level IN ('EE1','EE2','ME1','ME2','AE1','AE2','BE1','BE2')),
  points integer NOT NULL CHECK (points BETWEEN 1 AND 8),
  entered_by uuid NOT NULL,
  edited_by uuid,
  edited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(exam_id, student_id, subject)
);

CREATE INDEX IF NOT EXISTS idx_results_exam ON public.exam_results(exam_id);
CREATE INDEX IF NOT EXISTS idx_results_student ON public.exam_results(student_id);

ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School members view results"
ON public.exam_results FOR SELECT TO authenticated
USING (
  exam_id IN (
    SELECT id FROM public.exams
    WHERE school_id IN (SELECT public.get_admin_school_ids(auth.uid()))
       OR public.is_school_teacher(auth.uid(), school_id)
       OR created_by = auth.uid()
  )
);

CREATE POLICY "Exam owners and admins manage results"
ON public.exam_results FOR ALL TO authenticated
USING (
  exam_id IN (
    SELECT id FROM public.exams
    WHERE created_by = auth.uid()
       OR school_id IN (SELECT public.get_admin_school_ids(auth.uid()))
  )
)
WITH CHECK (
  exam_id IN (
    SELECT id FROM public.exams
    WHERE created_by = auth.uid()
       OR school_id IN (SELECT public.get_admin_school_ids(auth.uid()))
  )
);

-- KJSEA grading function
CREATE OR REPLACE FUNCTION public.kjsea_grade(_marks integer, _total integer)
RETURNS TABLE(percentage numeric, achievement_level text, points integer)
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  pct numeric;
BEGIN
  IF _total <= 0 THEN
    pct := 0;
  ELSE
    pct := round((_marks::numeric / _total::numeric) * 100, 2);
  END IF;

  IF pct >= 90 THEN
    RETURN QUERY SELECT pct, 'EE1'::text, 8;
  ELSIF pct >= 75 THEN
    RETURN QUERY SELECT pct, 'EE2'::text, 7;
  ELSIF pct >= 58 THEN
    RETURN QUERY SELECT pct, 'ME1'::text, 6;
  ELSIF pct >= 41 THEN
    RETURN QUERY SELECT pct, 'ME2'::text, 5;
  ELSIF pct >= 31 THEN
    RETURN QUERY SELECT pct, 'AE1'::text, 4;
  ELSIF pct >= 21 THEN
    RETURN QUERY SELECT pct, 'AE2'::text, 3;
  ELSIF pct >= 11 THEN
    RETURN QUERY SELECT pct, 'BE1'::text, 2;
  ELSE
    RETURN QUERY SELECT pct, 'BE2'::text, 1;
  END IF;
END;
$$;

-- Auto-grading trigger
CREATE OR REPLACE FUNCTION public.exam_results_autograde()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  g record;
BEGIN
  SELECT * INTO g FROM public.kjsea_grade(NEW.marks_scored, NEW.total_marks);
  NEW.percentage := g.percentage;
  NEW.achievement_level := g.achievement_level;
  NEW.points := g.points;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_results_autograde ON public.exam_results;
CREATE TRIGGER trg_results_autograde
BEFORE INSERT OR UPDATE OF marks_scored, total_marks ON public.exam_results
FOR EACH ROW EXECUTE FUNCTION public.exam_results_autograde();

-- ========== STUDENT EXAM SUMMARY ==========
CREATE TABLE IF NOT EXISTS public.student_exam_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  total_points integer NOT NULL DEFAULT 0,
  average_percentage numeric(5,2) NOT NULL DEFAULT 0,
  mean_achievement_level text,
  subjects_completed integer NOT NULL DEFAULT 0,
  total_subjects integer NOT NULL DEFAULT 0,
  overall_grade text,
  rank integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(exam_id, student_id)
);

ALTER TABLE public.student_exam_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School members view summaries"
ON public.student_exam_summary FOR SELECT TO authenticated
USING (
  exam_id IN (
    SELECT id FROM public.exams
    WHERE school_id IN (SELECT public.get_admin_school_ids(auth.uid()))
       OR public.is_school_teacher(auth.uid(), school_id)
       OR created_by = auth.uid()
  )
);

-- Recompute summary trigger
CREATE OR REPLACE FUNCTION public.recompute_student_exam_summary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exam_id uuid;
  v_student_id uuid;
  v_total_subjects integer;
  v_avg numeric;
  v_pts integer;
  v_completed integer;
  v_grade record;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_exam_id := OLD.exam_id;
    v_student_id := OLD.student_id;
  ELSE
    v_exam_id := NEW.exam_id;
    v_student_id := NEW.student_id;
  END IF;

  SELECT subject_count INTO v_total_subjects FROM public.exams WHERE id = v_exam_id;

  SELECT
    COALESCE(SUM(points),0),
    COALESCE(ROUND(AVG(percentage),2),0),
    COUNT(*)
  INTO v_pts, v_avg, v_completed
  FROM public.exam_results
  WHERE exam_id = v_exam_id AND student_id = v_student_id;

  SELECT * INTO v_grade FROM public.kjsea_grade(v_avg::integer, 100);

  INSERT INTO public.student_exam_summary
    (exam_id, student_id, total_points, average_percentage, mean_achievement_level, subjects_completed, total_subjects, overall_grade)
  VALUES
    (v_exam_id, v_student_id, v_pts, v_avg, v_grade.achievement_level, v_completed, COALESCE(v_total_subjects,0), v_grade.achievement_level)
  ON CONFLICT (exam_id, student_id) DO UPDATE SET
    total_points = EXCLUDED.total_points,
    average_percentage = EXCLUDED.average_percentage,
    mean_achievement_level = EXCLUDED.mean_achievement_level,
    subjects_completed = EXCLUDED.subjects_completed,
    total_subjects = EXCLUDED.total_subjects,
    overall_grade = EXCLUDED.overall_grade,
    updated_at = now();

  -- Recompute ranks for the exam
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY total_points DESC, average_percentage DESC) AS rnk
    FROM public.student_exam_summary
    WHERE exam_id = v_exam_id
  )
  UPDATE public.student_exam_summary s
  SET rank = r.rnk
  FROM ranked r
  WHERE s.id = r.id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_results_recompute_summary ON public.exam_results;
CREATE TRIGGER trg_results_recompute_summary
AFTER INSERT OR UPDATE OR DELETE ON public.exam_results
FOR EACH ROW EXECUTE FUNCTION public.recompute_student_exam_summary();
