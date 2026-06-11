
-- ============ status_pings ============
CREATE TABLE public.status_pings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  component text NOT NULL DEFAULT 'web',
  latency_ms integer NOT NULL CHECK (latency_ms >= 0 AND latency_ms < 60000),
  ok boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.status_pings TO anon, authenticated;
GRANT ALL ON public.status_pings TO service_role;
ALTER TABLE public.status_pings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can read pings"
  ON public.status_pings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anyone can insert pings"
  ON public.status_pings FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE INDEX status_pings_created_idx ON public.status_pings (created_at DESC);
CREATE INDEX status_pings_component_idx ON public.status_pings (component, created_at DESC);

-- ============ incidents ============
CREATE TABLE public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  severity text NOT NULL DEFAULT 'minor' CHECK (severity IN ('minor','major','critical')),
  status text NOT NULL DEFAULT 'investigating' CHECK (status IN ('investigating','identified','monitoring','resolved')),
  summary text NOT NULL DEFAULT '' CHECK (char_length(summary) <= 4000),
  started_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.incidents TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.incidents TO authenticated;
GRANT ALL ON public.incidents TO service_role;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public can read incidents"
  ON public.incidents FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins manage incidents"
  ON public.incidents FOR ALL TO authenticated
  USING (public.current_user_has_any_role('admin','superadmin'))
  WITH CHECK (public.current_user_has_any_role('admin','superadmin'));
CREATE INDEX incidents_started_idx ON public.incidents (started_at DESC);

CREATE OR REPLACE FUNCTION public.touch_incidents()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
REVOKE EXECUTE ON FUNCTION public.touch_incidents() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER touch_incidents_trg
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.touch_incidents();

-- ============ support_tickets ============
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_ref text NOT NULL UNIQUE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  email text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 254),
  subject text NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 200),
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 4000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.support_tickets TO anon, authenticated;
GRANT SELECT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can submit tickets"
  ON public.support_tickets FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "admins read tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (public.current_user_has_any_role('admin','superadmin'));
CREATE POLICY "admins update tickets"
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (public.current_user_has_any_role('admin','superadmin'))
  WITH CHECK (public.current_user_has_any_role('admin','superadmin'));

CREATE TRIGGER touch_support_tickets_trg
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.touch_incidents();
CREATE INDEX support_tickets_created_idx ON public.support_tickets (created_at DESC);
