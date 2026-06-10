-- Allow users to claim a role for themselves at signup.
-- Self-service role selection is intentional per product spec; staff roles still require
-- additional verification (photo + signin gate) before granting access to staff surfaces.
CREATE POLICY "Users can insert own role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());