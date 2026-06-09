import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Called when a candidate clicks "Give Exam" on a paper they've registered for
 * and the institute has released their admit card. Validates time window,
 * ensures a registrations row exists for the published exam, and returns its id.
 */
export const startPaperExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { paperRegistrationId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    const { data: preg, error: pErr } = await supabaseAdmin
      .from("paper_registrations")
      .select("id, candidate_id, paper_submission_id, admit_released, admit_card_number")
      .eq("id", data.paperRegistrationId)
      .single();
    if (pErr || !preg) throw new Error("Registration not found");
    if (preg.candidate_id !== userId) throw new Error("Forbidden");
    if (!preg.admit_released) throw new Error("Your admit card has not been released yet.");

    const { data: sub, error: sErr } = await supabaseAdmin
      .from("paper_submissions")
      .select("published_exam_id, exam_date, start_time, title")
      .eq("id", preg.paper_submission_id)
      .single();
    if (sErr || !sub?.published_exam_id) throw new Error("Exam is not live yet.");

    // Gate by time: only allow once exam_date + start_time has arrived
    const startsAt = new Date(`${sub.exam_date}T${(sub.start_time as string) ?? "00:00:00"}`);
    if (!Number.isNaN(startsAt.getTime()) && Date.now() < startsAt.getTime()) {
      const mins = Math.ceil((startsAt.getTime() - Date.now()) / 60000);
      throw new Error(`Exam starts at ${startsAt.toLocaleString()} (in ${mins} min).`);
    }

    // Find or create a registrations row for this candidate + exam
    let { data: reg } = await supabaseAdmin
      .from("registrations")
      .select("id")
      .eq("candidate_id", userId)
      .eq("exam_id", sub.published_exam_id)
      .maybeSingle();
    if (!reg) {
      const insertPayload: any = {
        candidate_id: userId,
        exam_id: sub.published_exam_id,
        status: "approved",
        paid: true,
      };
      if (preg.admit_card_number) insertPayload.admit_card_number = preg.admit_card_number;
      const { data: created, error: cErr } = await supabaseAdmin
        .from("registrations")
        .insert(insertPayload)
        .select("id")
        .single();
      if (cErr) throw new Error(cErr.message);
      reg = created;
    }

    return { registrationId: reg!.id };
  });
