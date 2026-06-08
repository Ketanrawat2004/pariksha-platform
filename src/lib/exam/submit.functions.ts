import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({ sessionId: z.string().uuid() });

export const submitExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Load session + registration + exam
    const { data: session, error: sErr } = await supabase
      .from("exam_sessions").select("*, registrations!inner(*, exams(*))").eq("id", data.sessionId).single();
    if (sErr || !session) throw new Error("Session not found");
    if (session.registrations.candidate_id !== userId) throw new Error("Forbidden");

    const exam = session.registrations.exams;

    // Load questions and answers
    const { data: questions } = await supabase.from("questions").select("id, correct_answer_encrypted, marks, category").eq("exam_id", exam.id);
    const { data: answers } = await supabase.from("answers").select("question_id, selected_option").eq("session_id", data.sessionId);
    const answerMap = new Map((answers ?? []).map((a) => [a.question_id, a.selected_option]));

    let total = 0;
    const section: Record<string, number> = {};
    for (const q of questions ?? []) {
      const sel = answerMap.get(q.id);
      const cat = q.category ?? "General";
      section[cat] = section[cat] ?? 0;
      if (sel == null || sel === "") continue;
      if (sel === q.correct_answer_encrypted) {
        total += q.marks;
        section[cat] += q.marks;
      } else {
        total -= 1;
        section[cat] -= 1;
      }
    }
    total = Math.max(0, total);
    const percentage = exam.total_marks > 0 ? Number(((total / exam.total_marks) * 100).toFixed(2)) : 0;
    const pass = total >= exam.passing_marks;

    // Mark session submitted
    await supabase.from("exam_sessions").update({ is_submitted: true, ended_at: new Date().toISOString() }).eq("id", data.sessionId);

    // Insert result (upsert by registration_id unique)
    const { data: result, error: rErr } = await supabase.from("results").upsert({
      registration_id: session.registration_id,
      exam_id: exam.id,
      total_score: total,
      percentage,
      pass_fail: pass,
      section_scores: section,
      rank: 1,
      percentile: 99,
    }, { onConflict: "registration_id" }).select().single();
    if (rErr) throw rErr;

    // Notification
    await supabase.from("notifications").insert({
      user_id: userId,
      title: pass ? "Result published — Passed" : "Result published",
      message: `${exam.title}: ${total}/${exam.total_marks} (${percentage}%)`,
      type: "success",
    });

    return { resultId: result.id, total, percentage, pass };
  });
