/**
 * Lightweight client-side activity logger.
 * Writes to public.audit_log under the current user's id (RLS enforced).
 * Fails silently — never block UX on logging.
 */
import { supabase } from "@/integrations/supabase/client";

export type ActivityAction =
  | "signup"
  | "signin"
  | "signout"
  | "password_reset_request"
  | "password_reset"
  | "profile_update"
  | "paper_submit"
  | "paper_publish"
  | "paper_edit_request"
  | "exam_start"
  | "exam_submit"
  | "certificate_download"
  | "score_report_download"
  | "activity_report_download"
  | "settings_change"
  | "role_change";

export async function logActivity(
  action: ActivityAction | string,
  details: Record<string, unknown> = {},
  resource: string | null = null,
  resource_id: string | null = null,
) {
  try {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (!uid) return;
    await supabase.from("audit_log").insert({
      user_id: uid,
      action,
      resource,
      resource_id,
      details: details as never,
    });
  } catch {
    /* swallow */
  }
}
