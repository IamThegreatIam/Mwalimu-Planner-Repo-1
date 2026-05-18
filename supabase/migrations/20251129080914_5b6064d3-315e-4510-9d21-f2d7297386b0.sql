-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles are viewable by everyone
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  RETURN new;
END;
$$;

-- Trigger the function every time a user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create lesson_plans table for storing generated lesson plans
CREATE TABLE public.lesson_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  teacher_name TEXT NOT NULL,
  school_name TEXT NOT NULL,
  date DATE NOT NULL,
  grade TEXT NOT NULL,
  term TEXT NOT NULL,
  roll TEXT,
  strand TEXT NOT NULL,
  sub_strand TEXT NOT NULL,
  lesson_number INTEGER NOT NULL,
  lesson_title TEXT NOT NULL,
  ai_generated_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lesson_plans ENABLE ROW LEVEL SECURITY;

-- Users can view their own lesson plans
CREATE POLICY "Users can view their own lesson plans" 
ON public.lesson_plans 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can create their own lesson plans
CREATE POLICY "Users can create their own lesson plans" 
ON public.lesson_plans 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own lesson plans
CREATE POLICY "Users can update their own lesson plans" 
ON public.lesson_plans 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own lesson plans
CREATE POLICY "Users can delete their own lesson plans" 
ON public.lesson_plans 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates on profiles
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for automatic timestamp updates on lesson_plans
CREATE TRIGGER update_lesson_plans_updated_at
BEFORE UPDATE ON public.lesson_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();