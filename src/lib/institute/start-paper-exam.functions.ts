import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type StartResult =
  | { ok: true; registrationId: string }
  | { ok: false; reason: string };

const StartPaperInput = z.object({ paperRegistrationId: z.string().uuid() });

/**
 * Returns a structured result instead of throwing for expected
 * validation failures (not released, too early). Throwing surfaces as a
 * blank-screen runtime error in the client.
 */
export const startPaperExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => StartPaperInput.parse(d))
  .handler(async ({ data, context }): Promise<StartResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    const { data: preg, error: pErr } = await supabaseAdmin
      .from("paper_registrations")
      .select("id, candidate_id, paper_submission_id, admit_released, admit_card_number, paid, cancelled")
      .eq("id", data.paperRegistrationId)
      .single();
    if (pErr || !preg) return { ok: false, reason: "Registration not found" };
    if (preg.candidate_id !== userId) return { ok: false, reason: "Forbidden" };
    if (preg.cancelled) return { ok: false, reason: "This registration was cancelled (payment refunded)." };
    if (!preg.paid) return { ok: false, reason: "Payment not confirmed yet. Please wait a moment and try again." };
    if (!preg.admit_released) return { ok: false, reason: "Your admit card has not been released yet." };

    const { data: sub, error: sErr } = await supabaseAdmin
      .from("paper_submissions")
      .select("published_exam_id, exam_date, start_time, title")
      .eq("id", preg.paper_submission_id)
      .single();
    if (sErr || !sub?.published_exam_id) return { ok: false, reason: "Exam is not live yet." };

    // Time gate removed — candidates may attempt anytime once admit card is released.
    // Scheduled date/time remains printed on the admit card for reference.

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
      if (cErr) return { ok: false, reason: cErr.message };
      reg = created;
    }

    return { ok: true, registrationId: reg!.id };
  });
