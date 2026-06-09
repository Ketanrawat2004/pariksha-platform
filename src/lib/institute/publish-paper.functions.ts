import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Publishes a paper_submission as a live exam, inserts questions, auto-registers
 * all candidates with admit cards, and notifies them.
 * Uses supabaseAdmin so the institute role can bypass the admin-only RLS on the
 * `exams` / `questions` / `registrations` / `notifications` tables.
 */
export const publishPaperAsExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { paperSubmissionId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    const { data: sub, error: subErr } = await supabaseAdmin
      .from("paper_submissions")
      .select("*")
      .eq("id", data.paperSubmissionId)
      .single();
    if (subErr || !sub) throw new Error(subErr?.message ?? "Paper not found");

    // Authorize: institute owner OR admin/superadmin
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isStaff = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "superadmin");
    if (!isStaff && sub.institute_id !== userId) throw new Error("Forbidden");

    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
    const examDate = sub.exam_date ?? tomorrow;
    const startTime = sub.start_time ?? "10:00";

    // Pick or auto-create a center
    let { data: center } = await supabaseAdmin
      .from("centers")
      .select("id, name, district, state")
      .limit(1)
      .maybeSingle();
    if (!center) {
      const { data: created, error: cErr } = await supabaseAdmin
        .from("centers")
        .insert({ name: "Pariksha National Center", district: "New Delhi", state: "Delhi", pincode: "110001", is_verified: true } as any)
        .select("id, name, district, state")
        .single();
      if (cErr) throw new Error(cErr.message);
      center = created;
    }

    // Create exam
    const { data: exam, error: eErr } = await supabaseAdmin
      .from("exams")
      .insert({
        title: sub.title,
        subject: sub.subject,
        description: sub.description ?? null,
        exam_date: examDate,
        start_time: startTime,
        duration_minutes: sub.duration_minutes ?? 60,
        total_marks: sub.total_marks ?? 100,
        passing_marks: sub.passing_marks ?? Math.floor((sub.total_marks ?? 100) * 0.4),
        status: "live",
        created_by: userId,
      } as any)
      .select("id")
      .single();
    if (eErr) throw new Error(eErr.message);

    // Insert questions
    const qs = (sub.questions ?? []) as any[];
    if (qs.length) {
      const { error: qErr } = await supabaseAdmin.from("questions").insert(
        qs.map((q, idx) => ({
          exam_id: exam.id,
          question_text_encrypted: q.text ?? "",
          option_a_encrypted: q.options?.[0] ?? "",
          option_b_encrypted: q.options?.[1] ?? "",
          option_c_encrypted: q.options?.[2] ?? "",
          option_d_encrypted: q.options?.[3] ?? "",
          correct_answer_encrypted: ["A", "B", "C", "D"][q.correct ?? 0],
          marks: q.marks ?? 4,
          question_order: idx + 1,
          category: sub.subject ?? "General",
        })) as any,
      );
      if (qErr) throw new Error(qErr.message);
    }

    // NOTE: We no longer auto-register every candidate. Candidates must register
    // (and pay) themselves via the institute paper flow, and admit cards are
    // issued only when the institute releases them.
    // Notify all candidates that a new paper is available.
    const { data: cands } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "candidate");
    let candidateCount = 0;
    if (cands?.length) {
      candidateCount = cands.length;
      await supabaseAdmin.from("notifications").insert(
        cands.map((c: any) => ({
          user_id: c.user_id,
          title: "New exam available: " + sub.title,
          message: `📅 ${examDate} · ⏰ ${startTime.slice(0, 5)} · 📍 ${center!.name}, ${center!.district}, ${center!.state}. Register on the Exams page; your admit card will be issued by the institute.`,
          type: "info",
        })) as any,
      );
    }

    // Mark submission as published
    const { error: upErr } = await supabaseAdmin
      .from("paper_submissions")
      .update({ status: "published", exam_date: examDate, start_time: startTime, published_exam_id: exam.id } as any)
      .eq("id", sub.id);
    if (upErr) throw new Error(upErr.message);

    return { ok: true, examId: exam.id, candidateCount, centerName: center!.name };
  });
