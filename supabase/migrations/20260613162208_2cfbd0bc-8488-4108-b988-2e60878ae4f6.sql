CREATE OR REPLACE FUNCTION public.enforce_edit_request_trishield()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'edit_requested'
     AND (OLD.status IS DISTINCT FROM 'edit_requested'::paper_submission_status)
     AND NOT public.paper_has_full_trishield(NEW.id) THEN
    RAISE EXCEPTION 'Edit request blocked: institute, admin, and superadmin must all be connected on TriShield LiveWatch before requesting an edit.';
  END IF;
  RETURN NEW;
END;
$function$;