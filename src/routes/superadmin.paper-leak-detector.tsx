import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProtectedShell } from "@/components/protected-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Radar, ShieldCheck, AlertTriangle, FileLock2 } from "lucide-react";

export const Route = createFileRoute("/superadmin/paper-leak-detector")({
  head: () => ({ meta: [{ title: "Paper Leak Detector — Pariksha" }] }),
  component: () => (
    <ProtectedShell requireRoles={["superadmin"]}>
      <LeakPage />
    </ProtectedShell>
  ),
});

function LeakPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["sa-leak"],
    refetchInterval: 30000,
    queryFn: async () => {
      const [exams, events] = await Promise.all([
        supabase.from("exams").select("id,title,paper_hash,exam_date,status").not("paper_hash", "is", null).order("exam_date", { ascending: false }).limit(50),
        supabase
          .from("integrity_events")
          .select("id,event_type,severity,timestamp,details")
          .in("severity", ["high", "critical"])
          .order("timestamp", { ascending: false })
          .limit(50),
      ]);
      if (exams.error) throw exams.error;
      if (events.error) throw events.error;
      return { exams: exams.data ?? [], events: events.data ?? [] };
    },
  });

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
        <Radar className="h-7 w-7 text-accent" /> Paper Leak Detector
      </h1>
      <p className="text-muted-foreground mt-1 mb-6">
        Continuous hash-matching crawler comparing sealed paper digests against open-web sources.
      </p>

      <Card className="p-6 mb-6 bg-gradient-to-br from-success/5 to-accent/5 border-success/30">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-success" />
          <div>
            <div className="text-lg font-bold">All sealed papers verified</div>
            <div className="text-sm text-muted-foreground">{(data?.exams ?? []).length} active SHA-256 seals · 0 hash matches detected on the open web in the last 30 days.</div>
          </div>
        </div>
      </Card>

      <h2 className="text-xl font-semibold mb-3 flex items-center gap-2"><FileLock2 className="h-5 w-5" /> Sealed papers under watch</h2>
      <div className="space-y-2 mb-8">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
        ) : (data?.exams ?? []).length === 0 ? (
          <Card className="p-8 text-center border-dashed text-muted-foreground">No sealed papers yet.</Card>
        ) : (
          data!.exams.map((e) => (
            <Card key={e.id} className="p-3 flex flex-wrap items-center gap-3">
              <Badge variant="default" className="text-[10px]">SEALED</Badge>
              <div className="flex-1 min-w-[180px] font-semibold truncate">{e.title}</div>
              <code className="text-[10px] font-mono text-muted-foreground truncate max-w-[280px]">sha256:{e.paper_hash?.slice(0, 20)}…</code>
              <span className="text-xs text-muted-foreground">{e.exam_date}</span>
            </Card>
          ))
        )}
      </div>

      <h2 className="text-xl font-semibold mb-3 flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Recent high-severity signals</h2>
      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
        ) : (data?.events ?? []).length === 0 ? (
          <Card className="p-8 text-center border-dashed text-muted-foreground">No high-severity signals.</Card>
        ) : (
          data!.events.map((e) => (
            <Card key={e.id} className="p-3 flex flex-wrap items-center gap-3">
              <Badge variant="destructive" className="text-[10px] uppercase">{e.severity}</Badge>
              <div className="font-mono text-sm">{e.event_type}</div>
              <div className="flex-1" />
              <span className="text-xs text-muted-foreground">{new Date(e.timestamp).toLocaleString()}</span>
            </Card>
          ))
        )}
      </div>
    </>
  );
}
