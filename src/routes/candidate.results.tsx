import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ProtectedShell } from "@/components/protected-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { Award, Download, TrendingUp, Trophy, FileX, Code2, AlertTriangle } from "lucide-react";
import { downloadCertificate } from "@/lib/pdf/certificate";
import { toast } from "sonner";
import { readDemoCodingResults, type DemoCodingResult } from "@/routes/coding-exam";

export const Route = createFileRoute("/candidate/results")({
  head: () => ({ meta: [{ title: "Results — Pariksha" }] }),
  component: () => (
    <ProtectedShell requireRoles={["candidate"]}>
      <ResultsList />
    </ProtectedShell>
  ),
});

function ResultsList() {
  const { user } = useAuth();
  const [demoResults, setDemoResults] = useState<DemoCodingResult[]>([]);
  useEffect(() => {
    setDemoResults(readDemoCodingResults(user?.id ?? user?.email ?? "anon"));
  }, [user]);
  const { data, isLoading } = useQuery({
    queryKey: ["my-results", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("results")
        .select("*, exams(title, exam_date, total_marks), registrations!inner(candidate_id)")
        .eq("registrations.candidate_id", user!.id)
        .order("generated_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Your results</h1>
        <p className="text-muted-foreground mt-1">
          Scores, ranks and verifiable certificates for every exam you've taken.
        </p>
      </div>

      {demoResults.length > 0 && (
        <div className="grid gap-4">
          {demoResults.map((r) => (
            <Card key={r.id} className="p-6 animate-fade-in border-accent/30">
              <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Code2 className="h-5 w-5 text-accent" />
                    <h2 className="text-xl font-bold">{r.title}</h2>
                    <span className="rounded-full text-xs font-bold px-2 py-0.5 bg-accent/10 text-accent">DEMO</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">Taken {new Date(r.takenAt).toLocaleString()} · Grade: {r.grade}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                    <Stat icon={<Award className="h-4 w-4" />} label="DSA" value={`${r.dsa}/${r.dsaTotal}`} />
                    <Stat icon={<Code2 className="h-4 w-4" />} label="Coding" value={`${r.code}/${r.codeTotal}`} />
                    <Stat icon={<TrendingUp className="h-4 w-4" />} label="Overall" value={`${r.pct}%`} />
                    <Stat icon={<AlertTriangle className="h-4 w-4" />} label="Warnings" value={String(r.warnings)} />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}


      {isLoading && (
        <div className="grid gap-4">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      )}

      {data && data.length === 0 && (
        <Card className="p-12 text-center border-dashed">
          <FileX className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            No results yet. Once you complete an exam, results will appear here.
          </p>
        </Card>
      )}

      <div className="grid gap-4">
        {(data ?? []).map((r) => {
          const exam = r.exams!;
          const pct = (r.total_score / exam.total_marks) * 100;
          const passed = pct >= 35;
          return (
            <Card key={r.id} className="p-6 hover:shadow-elegant transition animate-fade-in">
              <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold">{exam.title}</h2>
                    <span
                      className={`rounded-full text-xs font-bold px-2 py-0.5 ${
                        passed
                          ? "bg-success/10 text-success"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {passed ? "PASSED" : "TRY AGAIN"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Exam date: {exam.exam_date}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                    <Stat
                      icon={<Award className="h-4 w-4" />}
                      label="Score"
                      value={`${r.total_score}/${exam.total_marks}`}
                    />
                    <Stat
                      icon={<TrendingUp className="h-4 w-4" />}
                      label="Percentage"
                      value={`${pct.toFixed(2)}%`}
                    />
                    <Stat
                      icon={<Trophy className="h-4 w-4" />}
                      label="Rank"
                      value={r.rank ? `#${r.rank}` : "—"}
                    />
                    <Stat
                      icon={<Award className="h-4 w-4" />}
                      label="Percentile"
                      value={r.percentile ? `${Number(r.percentile).toFixed(1)}` : "—"}
                    />
                  </div>
                </div>
                {passed && (
                  <div>
                    <Button
                      size="lg"
                      aria-label={`Download certificate for ${exam.title}`}
                      onClick={async () => {
                        try {
                          await downloadCertificate({
                            candidateName:
                              user?.user_metadata?.full_name ?? user?.email ?? "Candidate",
                            examTitle: exam.title,
                            scoreObtained: r.total_score,
                            totalMarks: exam.total_marks,
                            percentage: pct,
                            rank: r.rank,
                            examDate: exam.exam_date,
                            certificateId: r.id.slice(0, 8).toUpperCase(),
                          });
                          toast.success("Certificate downloaded");
                        } catch {
                          toast.error("Could not generate certificate");
                        }
                      }}
                    >
                      <Download className="mr-2 h-5 w-5" /> Certificate
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        {icon}
        {label}
      </div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}
