-- Create custom types
CREATE TYPE user_role AS ENUM ('student', 'teacher');
CREATE TYPE request_status AS ENUM ('pending', 'reviewed');

-- Profiles table
CREATE TABLE profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    display_name TEXT,
    email TEXT UNIQUE NOT NULL,
    role user_role NOT NULL,
    wants_email_notifications BOOLEAN DEFAULT true NOT NULL,
    assigned_teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS: 
-- 1. Users can read their own profile.
-- 2. Users can update their own profile.
-- 3. Teachers can read all profiles (to see who sent requests).
-- 4. Teachers can update student profiles (for assignment and admin).
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Teachers can read all profiles" ON profiles FOR SELECT USING (
    (auth.jwt()->'user_metadata'->>'role') = 'teacher'
);
CREATE POLICY "Teachers can update student profiles" ON profiles FOR UPDATE USING (
    (auth.jwt()->'user_metadata'->>'role') = 'teacher'
);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role, wants_email_notifications)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'Neuer Benutzer'),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'student'::public.user_role),
    COALESCE((NEW.raw_user_meta_data->>'wants_email_notifications')::boolean, true)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- Pronunciation requests table
CREATE TABLE pronunciation_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    hanzi TEXT NOT NULL,
    pinyin TEXT NOT NULL,
    status request_status DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS for pronunciation_requests
ALTER TABLE pronunciation_requests ENABLE ROW LEVEL SECURITY;

-- Requests RLS:
-- 1. Students can insert their own requests.
-- 2. Students can read their own requests.
-- 3. Teachers can read all requests.
-- 4. Teachers can update requests (e.g. status to reviewed).
CREATE POLICY "Students can insert own requests" ON pronunciation_requests FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students can read own requests" ON pronunciation_requests FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Teachers can read all requests" ON pronunciation_requests FOR SELECT USING (
    (auth.jwt()->'user_metadata'->>'role') = 'teacher'
);
CREATE POLICY "Teachers can update all requests" ON pronunciation_requests FOR UPDATE USING (
    (auth.jwt()->'user_metadata'->>'role') = 'teacher'
);
CREATE POLICY "Students can delete own requests" ON pronunciation_requests FOR DELETE USING (auth.uid() = student_id);
CREATE POLICY "Teachers can delete all requests" ON pronunciation_requests FOR DELETE USING (
    (auth.jwt()->'user_metadata'->>'role') = 'teacher'
);


-- Teacher responses table
CREATE TABLE teacher_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id UUID REFERENCES pronunciation_requests(id) ON DELETE CASCADE NOT NULL,
    teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    comment TEXT,
    audio_url TEXT NOT NULL,
    audio_duration INTEGER,
    audio_file_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS for teacher_responses
ALTER TABLE teacher_responses ENABLE ROW LEVEL SECURITY;

-- Responses RLS:
-- 1. Teachers can insert responses.
-- 2. Teachers can read all responses.
-- 3. Students can read responses for their requests.
CREATE POLICY "Teachers can insert responses" ON teacher_responses FOR INSERT WITH CHECK (
    auth.uid() = teacher_id AND
    (auth.jwt()->'user_metadata'->>'role') = 'teacher'
);
CREATE POLICY "Teachers can read all responses" ON teacher_responses FOR SELECT USING (
    (auth.jwt()->'user_metadata'->>'role') = 'teacher'
);
CREATE POLICY "Students can read responses to their requests" ON teacher_responses FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM pronunciation_requests pr 
        WHERE pr.id = teacher_responses.request_id AND pr.student_id = auth.uid()
    )
);

-- ─── Schema-Erweiterung (Phase 4: Teacher Request System) ─────────────────────
-- Diese Spalten zu pronunciation_requests hinzufügen:
ALTER TABLE pronunciation_requests
  ADD COLUMN IF NOT EXISTS student_audio_url TEXT,
  ADD COLUMN IF NOT EXISTS german_meaning TEXT,
  ADD COLUMN IF NOT EXISTS pinyin_number TEXT,
  ADD COLUMN IF NOT EXISTS emailed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE teacher_responses
  ADD COLUMN IF NOT EXISTS emailed_at TIMESTAMP WITH TIME ZONE;


-- ─── Schema-Erweiterung (Phase 7: Verwaltung & Passwort-Reset) ───────────────

-- Spalte assigned_teacher_id zu profiles hinzufügen (falls noch nicht vorhanden)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS assigned_teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Passwort-Reset-Anfragen Tabelle
CREATE TABLE IF NOT EXISTS password_reset_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')) NOT NULL,
    emailed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE password_reset_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can insert own reset requests" ON password_reset_requests
  FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students can read own reset requests" ON password_reset_requests
  FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Teachers can read all reset requests" ON password_reset_requests
  FOR SELECT USING ((auth.jwt()->'user_metadata'->>'role') = 'teacher');
CREATE POLICY "Teachers can update reset requests" ON password_reset_requests
  FOR UPDATE USING ((auth.jwt()->'user_metadata'->>'role') = 'teacher');
