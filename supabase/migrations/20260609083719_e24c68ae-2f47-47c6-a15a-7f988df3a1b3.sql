
-- Remove the permissive SELECT policy added in the prior step
DROP POLICY IF EXISTS "Authenticated read published (safe cols via view)" ON public.paper_submissions;
DROP VIEW IF EXISTS public.published_paper_summaries;

-- Provide a SECURITY DEFINER function that returns only safe columns of published papers
CREATE OR REPLACE FUNCTION public.list_published_paper_summaries()
RETURNS TABLE (
  id uuid,
  title text,
  subject text,
  exam_date date,
  start_time time,
  duration_minutes integer,
  total_marks integer,
  passing_marks integer,
  teacher_name text,
  published_exam_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, title, subject, exam_date, start_time, duration_minutes, total_marks, passing_marks, teacher_name, published_exam_id
  FROM public.paper_submissions
  WHERE status = 'published'
  ORDER BY exam_date ASC;
$$;

REVOKE ALL ON FUNCTION public.list_published_paper_summaries() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_published_paper_summaries() TO authenticated;
