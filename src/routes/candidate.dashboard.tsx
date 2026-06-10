import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ProtectedShell } from "@/components/protected-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { useSignedFacePhoto } from "@/lib/storage/face-photo";
import { Calendar, Award, ShieldCheck, BookOpen, UserCircle2, PlayCircle, Loader2, Download, FileText, Trophy } from "lucide-react";
import { downloadCertificate } from "@/lib/pdf/certificate";
import { downloadScoreReport } from "@/lib/pdf/score-report";
import { ActivityReportButton } from "@/components/activity-report-button";
import { logActivity } from "@/lib/activity-log";
import { Link } from "@tanstack/react-router";
import { startPaperExam } from "@/lib/institute/start-paper-exam.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/candidate/dashboard")({
  head: () => ({ meta: [
    { title: "Dashboard — Pariksha" },
    { name: "description", content: "Your Pariksha candidate dashboard — upcoming exams, admit cards, results, and notifications in one place." },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: () => <ProtectedShell requireRoles={["candidate"]}><Dashboard /></ProtectedShell>,
});

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const runStart = useServerFn(startPaperExam);
  const [starting, setStarting] = useState(false);

  // Eligible paper registration = paid, admit released, not cancelled.
  // The home "Give Exam" button picks the most recent one and launches it;
  // falls back to demo if none.
  const { data: nextEligible } = useQuery({
    queryKey: ["next-eligible-paper", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("paper_registrations" as any)
        .select("id, paper_submission_id, paid, admit_released, cancelled, registered_at")
        .eq("candidate_id", user!.id)
        .eq("paid", true)
        .eq("admit_released", true)
        .eq("cancelled", false)
        .order("registered_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as { id: string } | null;
    },
    enabled: !!user,
  });

  async function handleGiveExam() {
    if (!nextEligible?.id) {
      navigate({ to: "/exam/$registrationId", params: { registrationId: "88888888-8888-8888-8888-888888888888" } });
      return;
    }
    setStarting(true);
    try {
      const res = await runStart({ data: { paperRegistrationId: nextEligible.id } });
      if (!res.ok) { toast.error(res.reason); return; }
      navigate({ to: "/exam/$registrationId", params: { registrationId: res.registrationId } });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not start exam");
    } finally {
      setStarting(false);
    }
  }




  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name, photo_url").eq("id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });
  const signedPhoto = useSignedFacePhoto(profile?.photo_url);

  const { data: regs } = useQuery({
    queryKey: ["my-registrations", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("registrations")
        .select("*, exams(*)")
        .eq("candidate_id", user!.id)
        .order("registered_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  // NOTE: candidates are NOT auto-registered for live exams. They must register
  // (and pay) via the institute paper flow; admit cards are issued only when
  // the institute explicitly releases them.

  const { data: results } = useQuery({
    queryKey: ["my-results", user?.id, regs?.length],
    queryFn: async () => {
      if (!regs?.length) return [];
      const { data } = await supabase.from("results").select("*, exams(title, exam_date, total_marks)").in("registration_id", regs.map((r) => r.id));
      return data ?? [];
    },
    enabled: !!regs,
  });

  const upcoming = (regs ?? []).filter((r) => r.exams && new Date(r.exams.exam_date) >= new Date()).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:justify-between">
        <div className="flex items-center gap-4">
          {signedPhoto ? (
            <img src={signedPhoto} alt={profile?.full_name ?? "You"} className="h-16 w-16 rounded-full object-cover border-2 border-accent shadow-elegant" />
          ) : (
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <UserCircle2 className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Welcome, {profile?.full_name?.split(" ")[0] ?? "candidate"}</h1>
            <p className="text-muted-foreground mt-1">Your exams, results, and integrity status — all here.</p>
          </div>
        </div>
        <Button onClick={handleGiveExam} disabled={starting} size="lg" className="bg-accent hover:bg-accent/90 shadow-elegant">
          {starting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
          {nextEligible ? "Give Exam" : "Try Demo Exam"}
        </Button>
      </div>




      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Calendar, label: "Upcoming exams", value: upcoming, color: "bg-accent/10 text-accent" },
          { icon: BookOpen, label: "Registered", value: regs?.length ?? 0, color: "bg-primary/10 text-primary" },
          { icon: Award, label: "Results", value: results?.length ?? 0, color: "bg-success/10 text-success" },
          { icon: ShieldCheck, label: "Integrity", value: "100", color: "bg-warning/10 text-warning" },
        ].map((s) => (
          <Card key={s.label} className="p-5">
            <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${s.color} mb-3`}>
              <s.icon className="h-5 w-5" />
            </div>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-sm text-muted-foreground">{s.label}</div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">Your exams</h2>
          <Button asChild variant="outline" size="sm"><Link to="/candidate/exams">Browse all</Link></Button>
        </div>
        {regs && regs.length > 0 ? (
          <ul className="divide-y divide-border">
            {regs.map((r) => (
              <li key={r.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{r.exams?.title}</div>
                  <div className="text-sm text-muted-foreground">{r.exams?.exam_date} · Admit: {r.admit_card_number}</div>
                </div>
                <span className="text-xs rounded-full bg-muted px-3 py-1 capitalize">{r.status}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">Preparing your demo exam… <Link to="/candidate/exams" className="text-accent hover:underline">Browse available exams</Link>.</p>
        )}
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-success" />
            <h2 className="font-bold text-lg">Results & certificates</h2>
          </div>
          <Button asChild variant="outline" size="sm"><Link to="/candidate/results">View all</Link></Button>
        </div>
        {results && results.length > 0 ? (
          <ul className="divide-y divide-border">
            {results.slice(0, 5).map((r: any) => {
              const pct = r.exams?.total_marks ? (r.total_score / r.exams.total_marks) * 100 : Number(r.percentage ?? 0);
              const passed = r.pass_fail ?? pct >= 35;
              return (
                <li key={r.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold truncate flex items-center gap-2">
                      {r.exams?.title ?? "Exam"}
                      <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${passed ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                        {passed ? "PASSED" : "TRY AGAIN"}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Score: {r.total_score}{r.exams?.total_marks ? `/${r.exams.total_marks}` : ""} · {pct.toFixed(1)}%
                      {r.rank ? ` · Rank #${r.rank}` : ""}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/candidate/results"><FileText className="mr-1 h-4 w-4" />Details</Link>
                    </Button>
                    {passed ? (
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            await downloadCertificate({
                              candidateName: profile?.full_name ?? user?.email ?? "Candidate",
                              examTitle: r.exams?.title ?? "Examination",
                              scoreObtained: r.total_score,
                              totalMarks: r.exams?.total_marks ?? 100,
                              percentage: pct,
                              rank: r.rank,
                              examDate: r.exams?.exam_date ?? new Date().toISOString().slice(0, 10),
                              certificateId: r.id.slice(0, 8).toUpperCase(),
                            });
                            void logActivity("certificate_download", { result_id: r.id });
                            toast.success("Certificate downloaded");
                          } catch {
                            toast.error("Could not generate certificate");
                          }
                        }}
                      >
                        <Download className="mr-1 h-4 w-4" />Certificate
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={async () => {
                          try {
                            await downloadScoreReport({
                              candidateName: profile?.full_name ?? user?.email ?? "Candidate",
                              examTitle: r.exams?.title ?? "Examination",
                              scoreObtained: r.total_score,
                              totalMarks: r.exams?.total_marks ?? 100,
                              percentage: pct,
                              examDate: r.exams?.exam_date ?? new Date().toISOString().slice(0, 10),
                              resultId: r.id,
                            });
                            void logActivity("score_report_download", { result_id: r.id });
                            toast.success("Score report downloaded");
                          } catch {
                            toast.error("Could not generate score report");
                          }
                        }}
                      >
                        <Download className="mr-1 h-4 w-4" />Score report
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">No results yet. Complete an exam to see your result and download your certificate here.</p>
        )}
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-bold text-lg">Activity log</h2>
            <p className="text-xs text-muted-foreground">Sign-ins, exam attempts and downloads — exported as a stamped PDF.</p>
          </div>
          <ActivityReportButton role="candidate" />
        </div>
      </Card>

    </div>
  );
}
