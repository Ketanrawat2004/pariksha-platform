
-- 1) Fix release_paper_admits to use institute_id (the paper_submissions column)
CREATE OR REPLACE FUNCTION public.release_paper_admits(_paper_submission_id uuid)
 RETURNS TABLE(released_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _count INT;
BEGIN
  IF NOT public.current_user_has_any_role('admin','superadmin','invigilator') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.paper_submissions
      WHERE id = _paper_submission_id AND institute_id = auth.uid()
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
$function$;

-- 2) Anonymous admit-card verification used by the public /give-exam page.
-- Returns the registered profile photo URL so the client can face-match.
CREATE OR REPLACE FUNCTION public.verify_admit_anonymous(
  _full_name text,
  _dob date,
  _aadhaar_last4 text,
  _admit_card_number text
)
RETURNS TABLE(
  registration_id uuid,
  exam_id uuid,
  exam_title text,
  exam_date date,
  candidate_id uuid,
  photo_url text,
  full_name text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT r.id, e.id, e.title, e.exam_date, p.id, p.photo_url, p.full_name
  FROM public.registrations r
  JOIN public.exams e ON e.id = r.exam_id
  JOIN public.profiles p ON p.id = r.candidate_id
  WHERE r.admit_card_number = _admit_card_number
    AND lower(trim(p.full_name)) = lower(trim(_full_name))
    AND (p.date_of_birth IS NULL OR p.date_of_birth = _dob)
    AND (
      _aadhaar_last4 IS NULL OR _aadhaar_last4 = ''
      OR p.aadhaar_hash IS NULL
      OR right(p.aadhaar_hash, 4) = _aadhaar_last4
    )
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_admit_anonymous(text, date, text, text) TO anon, authenticated;
