-- 1. Let every authenticated user log their own activity (signin/signout/etc.)
DROP POLICY IF EXISTS "Users insert own activity" ON public.audit_log;
CREATE POLICY "Users insert own activity"
  ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Let users read their own activity rows so they can render their own PDF reports
DROP POLICY IF EXISTS "Users read own activity" ON public.audit_log;
CREATE POLICY "Users read own activity"
  ON public.audit_log FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR current_user_has_any_role('superadmin','admin'));

-- 2. Helper: is there a live 3-party TriShield watch session for this paper?
CREATE OR REPLACE FUNCTION public.paper_has_full_trishield(_paper_submission_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trishield_watch_sessions s
    WHERE s.paper_submission_id = _paper_submission_id
      AND s.status = 'active'
      AND s.all_parties_present = true
  );
$$;

-- 3. Guard: prevent moving a paper into edit_requested unless all 3 parties are watching live
CREATE OR REPLACE FUNCTION public.enforce_edit_request_trishield()
RETURNS trigger
LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'edit_requested'
     AND COALESCE(OLD.status, '') <> 'edit_requested'
     AND NOT public.paper_has_full_trishield(NEW.id) THEN
    RAISE EXCEPTION 'Edit request blocked: institute, admin, and superadmin must all be connected on TriShield LiveWatch before requesting an edit.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_edit_request_trishield ON public.paper_submissions;
CREATE TRIGGER trg_enforce_edit_request_trishield
  BEFORE UPDATE ON public.paper_submissions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_edit_request_trishield();