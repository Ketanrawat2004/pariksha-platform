
-- 1. Add photo column to profiles for candidate face capture
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS photo_url text;

-- 2. Staff sign-in photo audit (admin/superadmin/invigilator)
CREATE TABLE IF NOT EXISTS public.staff_signin_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  photo_url text NOT NULL,
  signed_in_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.staff_signin_photos TO authenticated;
GRANT ALL ON public.staff_signin_photos TO service_role;

ALTER TABLE public.staff_signin_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own signin photos"
ON public.staff_signin_photos FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own + admins read all"
ON public.staff_signin_photos FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.current_user_has_any_role('admin','superadmin'));

CREATE INDEX IF NOT EXISTS idx_staff_signin_user ON public.staff_signin_photos(user_id, signed_in_at DESC);

-- 3. Loosen paper_submissions insert RLS so any authed user can author (institute_id = self)
DROP POLICY IF EXISTS "Institute manages own submissions" ON public.paper_submissions;

CREATE POLICY "Authors manage own submissions"
ON public.paper_submissions FOR ALL TO authenticated
USING (
  auth.uid() = institute_id
  OR public.current_user_has_any_role('admin','superadmin')
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    auth.uid() = institute_id
    OR public.current_user_has_any_role('admin','superadmin')
  )
);

-- 4. Storage policies for face-photos bucket so candidates and staff can upload
DROP POLICY IF EXISTS "Authed users upload face photos" ON storage.objects;
DROP POLICY IF EXISTS "Authed users read face photos" ON storage.objects;
DROP POLICY IF EXISTS "Authed users update own face photos" ON storage.objects;

CREATE POLICY "Authed users upload face photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'face-photos');

CREATE POLICY "Authed users read face photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'face-photos');

CREATE POLICY "Authed users update own face photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'face-photos' AND owner = auth.uid())
WITH CHECK (bucket_id = 'face-photos' AND owner = auth.uid());
