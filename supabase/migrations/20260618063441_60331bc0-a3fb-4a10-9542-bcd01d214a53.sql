
-- Remove sensitive tables from realtime publication to prevent broadcast leakage
ALTER PUBLICATION supabase_realtime DROP TABLE public.exam_sessions;
ALTER PUBLICATION supabase_realtime DROP TABLE public.paper_registrations;
ALTER PUBLICATION supabase_realtime DROP TABLE public.registrations;
ALTER PUBLICATION supabase_realtime DROP TABLE public.support_tickets;

-- Prevent candidates from self-assigning admit_card_number on insert
CREATE OR REPLACE FUNCTION public.force_null_admit_card_on_candidate_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only staff roles may set admit_card_number directly; otherwise wipe any caller-supplied value
  IF NOT public.current_user_has_any_role('admin','superadmin','invigilator') THEN
    NEW.admit_card_number := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_force_null_admit_card_on_insert ON public.registrations;
CREATE TRIGGER trg_force_null_admit_card_on_insert
BEFORE INSERT ON public.registrations
FOR EACH ROW EXECUTE FUNCTION public.force_null_admit_card_on_candidate_insert();
