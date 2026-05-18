
-- Class messages table for student discussion
CREATE TABLE public.class_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  teacher_id uuid DEFAULT NULL,
  sender_name text NOT NULL,
  sender_role text NOT NULL DEFAULT 'student',
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.class_messages ENABLE ROW LEVEL SECURITY;

-- Students (anon) can read messages in their class
CREATE POLICY "Anon can read class messages" ON public.class_messages
  FOR SELECT TO anon USING (true);

-- Students (anon) can insert messages  
CREATE POLICY "Anon can insert class messages" ON public.class_messages
  FOR INSERT TO anon WITH CHECK (true);

-- Teachers can manage messages in their own classes
CREATE POLICY "Teachers manage class messages" ON public.class_messages
  FOR ALL TO authenticated
  USING (class_id IN (SELECT id FROM public.classes WHERE teacher_id = auth.uid()))
  WITH CHECK (class_id IN (SELECT id FROM public.classes WHERE teacher_id = auth.uid()));

-- Anon can update students (for profile updates)
CREATE POLICY "Anon can update students" ON public.students
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Enable realtime for class_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.class_messages;
