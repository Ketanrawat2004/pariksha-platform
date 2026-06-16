import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProtectedShell } from "@/components/protected-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Trophy, TrendingUp, Award } from "lucide-react";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({ meta: [{ title: "Reports — Pariksha" }] }),
  component: () => (
    <ProtectedShell requireRoles={["admin", "superadmin"]}>
      <ReportsPage />
    </ProtectedShell>
  ),
});

function ReportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const [reg, res, exams] = await Promise.all([
        supabase.from("registrations").select("id,status,paid", { count: "exact", head: false }).limit(1000),
        supabase.from("results").select("id,total_score,percentage,pass_fail,is_verified,generated_at,exam_id").order("generated_at", { ascending: false }).limit(50),
        supabase.from("exams").select("id,title,status"),
      ]);
      if (reg.error) throw reg.error;
      if (res.error) throw res.error;
      if (exams.error) throw exams.error;
      return { regs: reg.data ?? [], results: res.data ?? [], exams: exams.data ?? [] };
    },
  });

  const stats = (() => {
    if (!data) return null;
    const r = data.results;
    const passRate = r.length ? Math.round((r.filter((x) => x.pass_fail).length / r.length) * 100) : 0;
    const avg = r.length ? (r.reduce((a, x) => a + Number(x.percentage), 0) / r.length).toFixed(1) : "0";
    return {
      registrations: data.regs.length,
      paid: data.regs.filter((x) => x.paid).length,
      results: r.length,
      passRate,
      avg,
      exams: data.exams.length,
    };
  })();

  const examMap = new Map((data?.exams ?? []).map((e) => [e.id, e.title]));

  return (
    <>
      <h1 className="flex min-w-0 items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
        <BarChart3 className="h-7 w-7 shrink-0 text-accent" /> <span className="truncate">Reports</span>
      </h1>
      <p className="text-muted-foreground mt-1 mb-6">Cross-cutting analytics and the latest published results.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {isLoading || !stats ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : (
          <>
            <Stat icon={<TrendingUp className="h-4 w-4" />} label="Registrations" value={stats.registrations} />
            <Stat icon={<Award className="h-4 w-4" />} label="Results published" value={stats.results} />
            <Stat icon={<Trophy className="h-4 w-4" />} label="Pass rate" value={`${stats.passRate}%`} />
            <Stat icon={<BarChart3 className="h-4 w-4" />} label="Avg %" value={stats.avg} />
          </>
        )}
      </div>

      <h2 className="text-xl font-semibold mb-3">Latest results</h2>
      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
        ) : (data?.results ?? []).length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <Trophy className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No results yet.</p>
          </Card>
        ) : (
          data!.results.map((r) => (
            <Card key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3 sm:flex sm:flex-wrap">
              <div className="min-w-0 truncate font-medium sm:flex-1 sm:min-w-[180px]">{examMap.get(r.exam_id) ?? "Exam"}</div>
              <Badge variant={r.pass_fail ? "default" : "destructive"} className="text-[10px] uppercase">
                {r.pass_fail ? "Pass" : "Fail"}
              </Badge>
              <div className="text-sm tabular-nums">{Number(r.percentage).toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">{new Date(r.generated_at).toLocaleString()}</div>
            </Card>
          ))
        )}
      </div>
    </>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="text-2xl font-bold tabular-nums mt-1">{typeof value === "number" ? value.toLocaleString() : value}</div>
    </Card>
  );
}
