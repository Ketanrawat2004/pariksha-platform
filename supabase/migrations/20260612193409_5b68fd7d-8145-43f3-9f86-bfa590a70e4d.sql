CREATE POLICY "users insert own tickets"
ON public.support_tickets
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "users read own tickets"
ON public.support_tickets
FOR SELECT
TO authenticated
USING (created_by = auth.uid());