
-- =============================================
-- ENUMS
-- =============================================
CREATE TYPE public.app_role AS ENUM ('superadmin','admin','invigilator','candidate');
CREATE TYPE public.exam_status AS ENUM ('draft','scheduled','live','completed','cancelled');
CREATE TYPE public.registration_status AS ENUM ('pending','approved','rejected');
CREATE TYPE public.integrity_event_type AS ENUM ('tab_switch','copy_attempt','fullscreen_exit','face_mismatch','multiple_faces','no_face','network_anomaly','rapid_answer','suspicious_pattern');
CREATE TYPE public.event_severity AS ENUM ('low','medium','high','critical');
CREATE TYPE public.notification_type AS ENUM ('info','warning','alert','success');

-- =============================================
-- PROFILES (extends auth.users)
-- =============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  aadhaar_hash TEXT,
  date_of_birth DATE,
  gender TEXT,
  state TEXT,
  center_id UUID,
  face_embedding JSONB,
  face_photo_path TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- USER ROLES (separate table - never on profiles)
-- =============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security-definer role check (prevents recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.current_user_has_any_role(VARIADIC _roles app_role[])
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = ANY(_roles))
$$;

-- =============================================
-- CENTERS
-- =============================================
CREATE TABLE public.centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  district TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  invigilator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  capacity INTEGER NOT NULL DEFAULT 100,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.centers TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.centers TO authenticated;
GRANT ALL ON public.centers TO service_role;
ALTER TABLE public.centers ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_center_fk FOREIGN KEY (center_id) REFERENCES public.centers(id) ON DELETE SET NULL;

-- =============================================
-- EXAMS
-- =============================================
CREATE TABLE public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  exam_date DATE NOT NULL,
  start_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  total_marks INTEGER NOT NULL,
  passing_marks INTEGER NOT NULL,
  status exam_status NOT NULL DEFAULT 'draft',
  paper_hash TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.exams TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.exams TO authenticated;
GRANT ALL ON public.exams TO service_role;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

-- =============================================
-- QUESTIONS (encrypted content)
-- =============================================
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  question_text_encrypted TEXT NOT NULL,
  option_a_encrypted TEXT NOT NULL,
  option_b_encrypted TEXT NOT NULL,
  option_c_encrypted TEXT NOT NULL,
  option_d_encrypted TEXT NOT NULL,
  correct_answer_encrypted TEXT NOT NULL,
  marks INTEGER NOT NULL DEFAULT 1,
  question_order INTEGER NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions TO authenticated;
GRANT ALL ON public.questions TO service_role;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- REGISTRATIONS
-- =============================================
CREATE TABLE public.registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  center_id UUID REFERENCES public.centers(id) ON DELETE SET NULL,
  seat_number TEXT,
  admit_card_number TEXT UNIQUE NOT NULL DEFAULT ('KNS-' || EXTRACT(YEAR FROM now())::TEXT || '-' || LPAD((floor(random()*1000000))::TEXT, 6, '0')),
  status registration_status NOT NULL DEFAULT 'pending',
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, exam_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registrations TO authenticated;
GRANT SELECT ON public.registrations TO anon;
GRANT ALL ON public.registrations TO service_role;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- =============================================
-- EXAM SESSIONS
-- =============================================
CREATE TABLE public.exam_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  device_fingerprint JSONB,
  ip_address TEXT,
  browser_info TEXT,
  integrity_score INTEGER NOT NULL DEFAULT 100,
  is_flagged BOOLEAN NOT NULL DEFAULT false,
  flag_reasons JSONB DEFAULT '[]'::jsonb,
  is_submitted BOOLEAN NOT NULL DEFAULT false
);
GRANT SELECT, INSERT, UPDATE ON public.exam_sessions TO authenticated;
GRANT ALL ON public.exam_sessions TO service_role;
ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- INTEGRITY EVENTS
-- =============================================
CREATE TABLE public.integrity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
  event_type integrity_event_type NOT NULL,
  severity event_severity NOT NULL DEFAULT 'low',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  details JSONB DEFAULT '{}'::jsonb,
  auto_resolved BOOLEAN NOT NULL DEFAULT false
);
GRANT SELECT, INSERT ON public.integrity_events TO authenticated;
GRANT ALL ON public.integrity_events TO service_role;
ALTER TABLE public.integrity_events ENABLE ROW LEVEL SECURITY;

-- =============================================
-- ANSWERS
-- =============================================
CREATE TABLE public.answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_option TEXT,
  time_taken_seconds INTEGER DEFAULT 0,
  changed_count INTEGER DEFAULT 0,
  marked_for_review BOOLEAN DEFAULT false,
  answered_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (session_id, question_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.answers TO authenticated;
GRANT ALL ON public.answers TO service_role;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RESULTS
-- =============================================
CREATE TABLE public.results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL UNIQUE REFERENCES public.registrations(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  total_score NUMERIC NOT NULL,
  percentage NUMERIC NOT NULL,
  rank INTEGER,
  percentile NUMERIC,
  pass_fail BOOLEAN NOT NULL,
  section_scores JSONB DEFAULT '{}'::jsonb,
  certificate_id TEXT UNIQUE NOT NULL DEFAULT ('PRK-CERT-' || EXTRACT(YEAR FROM now())::TEXT || '-' || LPAD((floor(random()*10000000))::TEXT, 7, '0')),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_verified BOOLEAN NOT NULL DEFAULT false
);
GRANT SELECT ON public.results TO authenticated, anon;
GRANT INSERT, UPDATE ON public.results TO authenticated;
GRANT ALL ON public.results TO service_role;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

-- =============================================
-- AUDIT LOG
-- =============================================
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource TEXT,
  resource_id TEXT,
  ip_address TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  details JSONB DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- =============================================
-- NOTIFICATIONS
-- =============================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type notification_type NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- profiles
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.current_user_has_any_role('admin','superadmin','invigilator'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id OR public.current_user_has_any_role('admin','superadmin')) WITH CHECK (auth.uid() = id OR public.current_user_has_any_role('admin','superadmin'));
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- user_roles
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.current_user_has_any_role('admin','superadmin'));

-- centers
CREATE POLICY "Anyone reads centers" ON public.centers FOR SELECT USING (true);
CREATE POLICY "Admins manage centers" ON public.centers FOR ALL TO authenticated USING (public.current_user_has_any_role('admin','superadmin')) WITH CHECK (public.current_user_has_any_role('admin','superadmin'));

-- exams
CREATE POLICY "Anyone reads exams" ON public.exams FOR SELECT USING (true);
CREATE POLICY "Admins manage exams" ON public.exams FOR ALL TO authenticated USING (public.current_user_has_any_role('admin','superadmin')) WITH CHECK (public.current_user_has_any_role('admin','superadmin'));

-- questions (NEVER visible to candidates outside active session - handled via server fn)
CREATE POLICY "Admins manage questions" ON public.questions FOR ALL TO authenticated USING (public.current_user_has_any_role('admin','superadmin')) WITH CHECK (public.current_user_has_any_role('admin','superadmin'));

-- registrations
CREATE POLICY "Candidates manage own registrations" ON public.registrations FOR ALL TO authenticated USING (candidate_id = auth.uid() OR public.current_user_has_any_role('admin','superadmin','invigilator')) WITH CHECK (candidate_id = auth.uid() OR public.current_user_has_any_role('admin','superadmin'));
CREATE POLICY "Public verify by admit card" ON public.registrations FOR SELECT TO anon USING (true);

-- exam_sessions
CREATE POLICY "Candidates view own sessions" ON public.exam_sessions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.registrations r WHERE r.id = registration_id AND (r.candidate_id = auth.uid() OR public.current_user_has_any_role('admin','superadmin','invigilator')))
);
CREATE POLICY "Candidates create own sessions" ON public.exam_sessions FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.registrations r WHERE r.id = registration_id AND r.candidate_id = auth.uid())
);
CREATE POLICY "Candidates update own sessions" ON public.exam_sessions FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.registrations r WHERE r.id = registration_id AND (r.candidate_id = auth.uid() OR public.current_user_has_any_role('admin','superadmin')))
);

-- integrity_events
CREATE POLICY "Session owner inserts events" ON public.integrity_events FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.exam_sessions s JOIN public.registrations r ON r.id = s.registration_id WHERE s.id = session_id AND r.candidate_id = auth.uid())
);
CREATE POLICY "Owner and staff read events" ON public.integrity_events FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.exam_sessions s JOIN public.registrations r ON r.id = s.registration_id WHERE s.id = session_id AND (r.candidate_id = auth.uid() OR public.current_user_has_any_role('admin','superadmin','invigilator')))
);

-- answers
CREATE POLICY "Candidates manage own answers" ON public.answers FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.exam_sessions s JOIN public.registrations r ON r.id = s.registration_id WHERE s.id = session_id AND (r.candidate_id = auth.uid() OR public.current_user_has_any_role('admin','superadmin')))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.exam_sessions s JOIN public.registrations r ON r.id = s.registration_id WHERE s.id = session_id AND r.candidate_id = auth.uid())
);

-- results
CREATE POLICY "Anyone verifies certificates" ON public.results FOR SELECT USING (true);
CREATE POLICY "Admins manage results" ON public.results FOR ALL TO authenticated USING (public.current_user_has_any_role('admin','superadmin')) WITH CHECK (public.current_user_has_any_role('admin','superadmin'));

-- audit_log
CREATE POLICY "Anyone authenticated inserts audit" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Superadmins read audit" ON public.audit_log FOR SELECT TO authenticated USING (public.current_user_has_any_role('superadmin','admin'));

-- notifications
CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins create notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.current_user_has_any_role('admin','superadmin'));

-- =============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'candidate');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- REALTIME
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.exam_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.integrity_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
