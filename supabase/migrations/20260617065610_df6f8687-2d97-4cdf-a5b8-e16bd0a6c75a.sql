-- Extend candidate guard on exam_sessions to also block tampering with submission flags.
CREATE OR REPLACE FUNCTION public.guard_exam_session_integrity_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) IS NULL
     OR current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF public.current_user_has_any_role('admin','superadmin','invigilator') THEN
    RETURN NEW;
  END IF;
  IF NEW.integrity_score IS DISTINCT FROM OLD.integrity_score
     OR NEW.is_flagged   IS DISTINCT FROM OLD.is_flagged
     OR NEW.flag_reasons IS DISTINCT FROM OLD.flag_reasons
     OR NEW.is_submitted IS DISTINCT FROM OLD.is_submitted
     OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at
     OR NEW.browser_info IS DISTINCT FROM OLD.browser_info
     OR NEW.device_fingerprint IS DISTINCT FROM OLD.device_fingerprint
     OR NEW.ip_address IS DISTINCT FROM OLD.ip_address
     OR NEW.registration_id IS DISTINCT FROM OLD.registration_id
     OR NEW.started_at IS DISTINCT FROM OLD.started_at THEN
    -- Allow legitimate one-way submission: candidate may set is_submitted from false to true
    -- and stamp submitted_at, but cannot revert a submission or touch integrity fields.
    IF NEW.integrity_score IS DISTINCT FROM OLD.integrity_score
       OR NEW.is_flagged   IS DISTINCT FROM OLD.is_flagged
       OR NEW.flag_reasons IS DISTINCT FROM OLD.flag_reasons
       OR NEW.browser_info IS DISTINCT FROM OLD.browser_info
       OR NEW.device_fingerprint IS DISTINCT FROM OLD.device_fingerprint
       OR NEW.ip_address IS DISTINCT FROM OLD.ip_address
       OR NEW.registration_id IS DISTINCT FROM OLD.registration_id
       OR NEW.started_at IS DISTINCT FROM OLD.started_at
       OR (OLD.is_submitted = true AND NEW.is_submitted IS DISTINCT FROM OLD.is_submitted)
       OR (OLD.is_submitted = true AND NEW.submitted_at IS DISTINCT FROM OLD.submitted_at) THEN
      RAISE EXCEPTION 'Candidates cannot modify protected exam_session columns';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;