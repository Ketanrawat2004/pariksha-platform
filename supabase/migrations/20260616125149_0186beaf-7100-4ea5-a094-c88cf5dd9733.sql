
-- Seed demo staff access codes (hackathon panelist demo)
INSERT INTO public.app_config (key, value) VALUES
  ('staff_code_invigilator_sha256', '06d5c2b40065b2ee211a4b216b3e3a0ac62c4dd54d358417c3b07e1404a633fb'),
  ('staff_code_institute_sha256',   '6ac1cc3a6a593d18669a8d0126d48c9bdb8833d2a63aafc7fa22cf14307f8ec6')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Support ticket replies
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS reply_message text,
  ADD COLUMN IF NOT EXISTS replied_at    timestamptz,
  ADD COLUMN IF NOT EXISTS replied_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- When admin adds a reply, push a notification to the original ticket owner
CREATE OR REPLACE FUNCTION public.notify_support_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.reply_message IS NOT NULL
     AND (OLD.reply_message IS NULL OR OLD.reply_message IS DISTINCT FROM NEW.reply_message)
     AND NEW.created_by IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      NEW.created_by,
      'Support reply for ' || NEW.case_ref,
      NEW.reply_message,
      'info'::notification_type
    );
    NEW.replied_at := now();
    NEW.replied_by := COALESCE(NEW.replied_by, auth.uid());
    IF NEW.status = 'open' THEN NEW.status := 'in_progress'; END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS support_ticket_reply_notify ON public.support_tickets;
CREATE TRIGGER support_ticket_reply_notify
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.notify_support_reply();

-- Enable realtime on notifications so candidates see replies live
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
