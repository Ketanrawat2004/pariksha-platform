import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  sessionId: z.string().uuid(),
  finalPaperHash: z.string().max(256).nullish(),
});

/**
 * Generates a TriShield session report for a completed/halted watch session.
 * Restricted to staff roles (admin, superadmin, institute) — candidates must not
 * be able to mutate audit records.
 */
export const generateSessionReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: supabase } = await import("@/integrations/supabase/client.server");

    // Role gate — only staff may generate/overwrite TriShield reports.
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const allowed = (roles ?? []).some((r: any) =>
      ["admin", "superadmin", "institute"].includes(r.role),
    );
    if (!allowed) throw new Error("Forbidden");

    const { data: sess, error } = await supabase
      .from("trishield_watch_sessions")
      .select("*")
      .eq("id", data.sessionId)
      .single();
    if (error || !sess) throw new Error(error?.message ?? "Session not found");

    // Institute users may only report on sessions they initiated.
    const isStaff = (roles ?? []).some((r: any) => ["admin", "superadmin"].includes(r.role));
    if (!isStaff && sess.initiated_by !== context.userId) {
      throw new Error("Forbidden");
    }

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
