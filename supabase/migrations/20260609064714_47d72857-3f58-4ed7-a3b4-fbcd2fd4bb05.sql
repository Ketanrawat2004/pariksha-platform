
DO $$ BEGIN
  CREATE TYPE public.paper_submission_status AS ENUM ('draft','pending','locked','approved','published','edit_requested','rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.paper_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  exam_date DATE NOT NULL,
  start_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  total_marks INTEGER NOT NULL DEFAULT 100,
  passing_marks INTEGER NOT NULL DEFAULT 40,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  teacher_name TEXT,
  submitter_photo_url TEXT,
  passkey_hash TEXT,
  status public.paper_submission_status NOT NULL DEFAULT 'draft',
  edit_request_note TEXT,
  admin_note TEXT,
  published_exam_id UUID REFERENCES public.exams(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.paper_submissions TO authenticated;
GRANT ALL ON public.paper_submissions TO service_role;

ALTER TABLE public.paper_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Institute manages own submissions" ON public.paper_submissions;
CREATE POLICY "Institute manages own submissions" ON public.paper_submissions
  FOR ALL TO authenticated
  USING (institute_id = auth.uid() OR public.current_user_has_any_role('admin','superadmin'))
  WITH CHECK (institute_id = auth.uid() OR public.current_user_has_any_role('admin','superadmin'));

CREATE OR REPLACE FUNCTION public.touch_paper_submissions() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_touch_paper_submissions ON public.paper_submissions;
CREATE TRIGGER trg_touch_paper_submissions BEFORE UPDATE ON public.paper_submissions
FOR EACH ROW EXECUTE FUNCTION public.touch_paper_submissions();
