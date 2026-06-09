CREATE POLICY "Candidates insert own results"
ON public.results FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.registrations r
  WHERE r.id = results.registration_id AND r.candidate_id = auth.uid()
));

CREATE POLICY "Candidates update own results"
ON public.results FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.registrations r
  WHERE r.id = results.registration_id AND r.candidate_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.registrations r
  WHERE r.id = results.registration_id AND r.candidate_id = auth.uid()
));

CREATE POLICY "Candidates read own results"
ON public.results FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.registrations r
  WHERE r.id = results.registration_id AND r.candidate_id = auth.uid()
));