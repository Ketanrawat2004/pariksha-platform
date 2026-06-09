
-- Self-registration table for institute-published papers
CREATE TABLE IF NOT EXISTS public.paper_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paper_submission_id UUID NOT NULL REFERENCES public.paper_submissions(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  phone TEXT,
  admit_card_number TEXT UNIQUE,
  admit_released BOOLEAN NOT NULL DEFAULT false,
  admit_released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, paper_submission_id)
);

GRANT SELECT, INSERT, UPDATE ON public.paper_registrations TO authenticated;
GRANT ALL ON public.paper_registrations TO service_role;

ALTER TABLE public.paper_registrations ENABLE ROW LEVEL SECURITY;

-- Candidate manages own rows
CREATE POLICY "candidates manage own paper regs"
  ON public.paper_registrations FOR ALL
  TO authenticated
  USING (auth.uid() = candidate_id)
  WITH CHECK (auth.uid() = candidate_id);

-- Institute/admin/superadmin can read all paper registrations (for their dashboards)
CREATE POLICY "staff read all paper regs"
  ON public.paper_registrations FOR SELECT
  TO authenticated
  USING (public.current_user_has_any_role('admin','superadmin','invigilator'));

-- Bulk admit-card release: assigns unique PRK-style codes for everyone registered.
CREATE OR REPLACE FUNCTION public.release_paper_admits(_paper_submission_id UUID)
RETURNS TABLE(released_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count INT;
BEGIN
  IF NOT public.current_user_has_any_role('admin','superadmin','invigilator') THEN
    -- Allow the paper's owner (institute) to release too
    IF NOT EXISTS (
      SELECT 1 FROM public.paper_submissions
      WHERE id = _paper_submission_id AND teacher_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
  END IF;

  UPDATE public.paper_registrations
     SET admit_card_number = COALESCE(
           admit_card_number,
           'PRK-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
         ),
         admit_released = true,
         admit_released_at = now(),
         updated_at = now()
   WHERE paper_submission_id = _paper_submission_id
     AND admit_released = false;

  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN QUERY SELECT _count;
END;
$$;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_paper_registrations()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_touch_paper_registrations ON public.paper_registrations;
CREATE TRIGGER trg_touch_paper_registrations
BEFORE UPDATE ON public.paper_registrations
FOR EACH ROW EXECUTE FUNCTION public.touch_paper_registrations();
