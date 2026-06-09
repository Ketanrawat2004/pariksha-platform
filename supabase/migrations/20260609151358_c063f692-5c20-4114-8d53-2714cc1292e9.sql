
ALTER TABLE public.paper_registrations
  ADD COLUMN IF NOT EXISTS payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cancelled boolean NOT NULL DEFAULT false;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS paper_submission_id uuid REFERENCES public.paper_submissions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS candidate_full_name text,
  ADD COLUMN IF NOT EXISTS candidate_dob date,
  ADD COLUMN IF NOT EXISTS candidate_phone text;

CREATE INDEX IF NOT EXISTS idx_paper_registrations_payment_id ON public.paper_registrations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_paper_submission_id ON public.payments(paper_submission_id);
