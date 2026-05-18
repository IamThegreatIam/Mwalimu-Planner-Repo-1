-- Library admins table (separate from school admins)
CREATE TABLE public.library_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.library_admins ENABLE ROW LEVEL SECURITY;

-- Helper: is_library_admin
CREATE OR REPLACE FUNCTION public.is_library_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.library_admins WHERE user_id = _user_id)
$$;

CREATE POLICY "Anyone authenticated can view library admins"
  ON public.library_admins FOR SELECT TO authenticated USING (true);

CREATE POLICY "Library admins manage library admins"
  ON public.library_admins FOR ALL TO authenticated
  USING (public.is_library_admin(auth.uid()))
  WITH CHECK (public.is_library_admin(auth.uid()));

-- Subfolders table
CREATE TABLE public.library_subfolders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  name text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category, name)
);

ALTER TABLE public.library_subfolders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view subfolders"
  ON public.library_subfolders FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Library admins manage subfolders"
  ON public.library_subfolders FOR ALL TO authenticated
  USING (public.is_library_admin(auth.uid()))
  WITH CHECK (public.is_library_admin(auth.uid()));

-- Files table
CREATE TABLE public.library_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  subfolder_id uuid REFERENCES public.library_subfolders(id) ON DELETE SET NULL,
  title text NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL UNIQUE,
  file_type text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  uploaded_by uuid NOT NULL,
  uploader_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.library_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view files metadata"
  ON public.library_files FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Library admins manage files"
  ON public.library_files FOR ALL TO authenticated
  USING (public.is_library_admin(auth.uid()))
  WITH CHECK (public.is_library_admin(auth.uid()));

CREATE INDEX idx_library_files_category ON public.library_files(category);
CREATE INDEX idx_library_files_subfolder ON public.library_files(subfolder_id);

-- Storage bucket (public for read; authenticated download in app via signed URLs optional)
INSERT INTO storage.buckets (id, name, public) VALUES ('library-resources', 'library-resources', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: library admins can upload/update/delete; authenticated users can download
CREATE POLICY "Library admins upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'library-resources' AND public.is_library_admin(auth.uid()));

CREATE POLICY "Library admins update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'library-resources' AND public.is_library_admin(auth.uid()));

CREATE POLICY "Library admins delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'library-resources' AND public.is_library_admin(auth.uid()));

CREATE POLICY "Authenticated can read library files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'library-resources');