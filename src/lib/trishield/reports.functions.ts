import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Generates a TriShield session report for a completed/halted watch session.
 * Computes duration, snapshot totals, and verification status, then upserts
 * a row in trishield_session_reports (keyed on session_id).
 */
export const generateSessionReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { sessionId: string; finalPaperHash?: string | null }) => data)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: sess, error } = await supabase
      .from("trishield_watch_sessions")
      .select("*")
      .eq("id", data.sessionId)
      .single();
    if (error || !sess) throw new Error(error?.message ?? "Session not found");

    const started = sess.session_started_at ? new Date(sess.session_started_at).getTime() : Date.now();
    const ended = sess.session_ended_at ? new Date(sess.session_ended_at).getTime() : Date.now();
    const durationSeconds = Math.max(0, Math.round((ended - started) / 1000));

    const allParties =
      sess.institute_snapshot_count > 0 &&
      sess.admin_snapshot_count > 0 &&
      sess.superadmin_snapshot_count > 0;
    const completed = sess.status === "completed";
    const verification_status = allParties && completed ? "COMPLETE" : "INCOMPLETE";
    const incomplete_reason = verification_status === "INCOMPLETE"
      ? (sess.status === "halted" ? "SUPERADMIN_HALT"
        : sess.status === "timed_out" ? "TIMED_OUT"
        : "MISSING_PARTY_SNAPSHOTS")
      : null;

    const payload = {
      session_id: sess.id,
      exam_id: sess.exam_id,
      session_type: sess.session_type,
      started_at: sess.session_started_at,
      ended_at: sess.session_ended_at,
      duration_seconds: durationSeconds,
      institute_snapshot_count: sess.institute_snapshot_count,
      admin_snapshot_count: sess.admin_snapshot_count,
      superadmin_snapshot_count: sess.superadmin_snapshot_count,
      final_paper_hash: data.finalPaperHash ?? null,
      verification_status,
      incomplete_reason,
    };

    const { data: existing } = await supabase
      .from("trishield_session_reports")
      .select("id")
      .eq("session_id", sess.id)
      .maybeSingle();

    if (existing) {
      const { error: upErr } = await supabase
        .from("trishield_session_reports")
        .update(payload)
        .eq("id", existing.id);
      if (upErr) throw new Error(upErr.message);
      return { ok: true, id: existing.id, updated: true };
    }
    const { data: ins, error: insErr } = await supabase
      .from("trishield_session_reports")
      .insert(payload)
      .select("id")
      .single();
    if (insErr) throw new Error(insErr.message);
    return { ok: true, id: ins.id, updated: false };
  });
