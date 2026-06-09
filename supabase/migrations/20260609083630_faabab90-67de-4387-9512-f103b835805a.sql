
-- 1) Remove overly permissive storage policies on face-photos bucket
DROP POLICY IF EXISTS "Authed users read face photos" ON storage.objects;
DROP POLICY IF EXISTS "Authed users upload face photos" ON storage.objects;
DROP POLICY IF EXISTS "Authed users update own face photos" ON storage.objects;

-- 2) Restrict candidate access to paper_submissions: drop broad read policy
DROP POLICY IF EXISTS "Candidates read published submissions" ON public.paper_submissions;

-- Create a security-barrier view exposing only safe non-sensitive columns
CREATE OR REPLACE VIEW public.published_paper_summaries
WITH (security_invoker = true, security_barrier = true) AS
SELECT id, title, subject, exam_date, start_time, duration_minutes, total_marks, passing_marks, teacher_name, published_exam_id
FROM public.paper_submissions
WHERE status = 'published';

GRANT SELECT ON public.published_paper_summaries TO authenticated;

-- Allow authenticated users to read published rows via the view (security_invoker requires base policy)
CREATE POLICY "Authenticated read published (safe cols via view)"
ON public.paper_submissions
FOR SELECT
TO authenticated
USING (status = 'published');
