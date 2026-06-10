import { createServerFn } from "@tanstack/react-start";

export interface VaultStats {
  exam: {
    id: string;
    title: string;
    subject: string | null;
    status: string;
    examDate: string | null;
    startTime: string | null;
    paperHash: string;
    durationMinutes: number;
    totalMarks: number;
  } | null;
  counts: {
    questions: number;
    registrations: number;
    sessions: number;
    submitted: number;
    integrityEvents: number;
    results: number;
    centers: number;
  };
  // recent flagged integrity events for the "live anomaly watch" step
  recentFlags: { id: string; event_type: string; severity: string; timestamp: string }[];
}

// Public-safe: only aggregate counts + non-sensitive exam metadata. No PII.
export const getVaultStats = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Pick the most relevant exam (live > scheduled > most recent)
  const { data: exams } = await supabaseAdmin
    .from("exams")
    .select("id, title, subject, status, exam_date, start_time, paper_hash, duration_minutes, total_marks")
    .order("exam_date", { ascending: false })
    .limit(5);
  const exam =
    exams?.find((e) => e.status === "live") ??
    exams?.find((e) => e.status === "draft") ??
    exams?.[0] ??
    null;

  const [qRes, rRes, sRes, subRes, iRes, resRes, cRes] = await Promise.all([
    exam ? supabaseAdmin.from("questions").select("id", { count: "exact", head: true }).eq("exam_id", exam.id) : null,
    exam ? supabaseAdmin.from("registrations").select("id", { count: "exact", head: true }).eq("exam_id", exam.id) : null,
    supabaseAdmin.from("exam_sessions").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("exam_sessions").select("id", { count: "exact", head: true }).eq("is_submitted", true),
    supabaseAdmin.from("integrity_events").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("results").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("centers").select("id", { count: "exact", head: true }),
  ]);

  // Deterministic hash if DB column is empty — uses real exam metadata
  let paperHash = exam?.paper_hash ?? "";
  if (exam && !paperHash) {
    const seed = `${exam.id}|${exam.title}|${qRes?.count ?? 0}`;
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(seed));
    paperHash = "0x" + Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  return {
    exam: exam
      ? {
          id: exam.id,
          title: exam.title,
          subject: exam.subject,
          status: exam.status,
          examDate: exam.exam_date,
          startTime: exam.start_time,
          paperHash,
          durationMinutes: exam.duration_minutes,
          totalMarks: exam.total_marks,
        }
      : null,
    counts: {
      questions: qRes?.count ?? 0,
      registrations: rRes?.count ?? 0,
      sessions: sRes?.count ?? 0,
      submitted: subRes?.count ?? 0,
      integrityEvents: iRes?.count ?? 0,
      results: resRes?.count ?? 0,
      centers: cRes?.count ?? 0,
    },
    recentFlags: [],
  } satisfies VaultStats;
});
