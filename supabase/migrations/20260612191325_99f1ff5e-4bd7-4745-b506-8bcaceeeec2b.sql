
CREATE TABLE IF NOT EXISTS public.security_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scanner_name text NOT NULL,
  internal_id text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low','medium','high','critical','info')),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','fixed','ignored')),
  fix_ref text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  fixed_at timestamptz,
  UNIQUE (scanner_name, internal_id)
);
CREATE INDEX IF NOT EXISTS idx_security_findings_status ON public.security_findings(status);
CREATE INDEX IF NOT EXISTS idx_security_findings_scanner ON public.security_findings(scanner_name);
GRANT SELECT ON public.security_findings TO authenticated;
GRANT ALL ON public.security_findings TO service_role;
ALTER TABLE public.security_findings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "superadmin reads findings" ON public.security_findings;
CREATE POLICY "superadmin reads findings" ON public.security_findings
  FOR SELECT TO authenticated
  USING (public.current_user_has_any_role('superadmin','admin'));

CREATE TABLE IF NOT EXISTS public.security_alert_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.security_alert_recipients TO authenticated;
GRANT ALL ON public.security_alert_recipients TO service_role;
ALTER TABLE public.security_alert_recipients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "superadmin reads recipients" ON public.security_alert_recipients;
CREATE POLICY "superadmin reads recipients" ON public.security_alert_recipients
  FOR SELECT TO authenticated
  USING (public.current_user_has_any_role('superadmin'));
DROP POLICY IF EXISTS "superadmin manages recipients" ON public.security_alert_recipients;
CREATE POLICY "superadmin manages recipients" ON public.security_alert_recipients
  FOR ALL TO authenticated
  USING (public.current_user_has_any_role('superadmin'))
  WITH CHECK (public.current_user_has_any_role('superadmin'));
