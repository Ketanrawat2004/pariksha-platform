import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProtectedShell } from "@/components/protected-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeTables } from "@/hooks/use-realtime-tables";
import { Activity, Flag, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/invigilator/live-monitor")({
  head: () => ({ meta: [{ title: "Live Monitor — Pariksha" }] }),
  component: () => (
    <ProtectedShell requireRoles={["invigilator", "admin", "superadmin"]}>
      <LiveMonitorPage />
    </ProtectedShell>
  ),
});

function LiveMonitorPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["invig-live"],
    refetchInterval: 5000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_sessions")
        .select("id,started_at,ended_at,integrity_score,is_flagged,is_submitted,registration_id")
        .is("ended_at", null)
        .order("started_at", { ascending: false })
        .limit(120);
      if (error) throw error;
      return data;
    },
  });

  const sessions = data ?? [];
  const flagged = sessions.filter((s) => s.is_flagged).length;

  return (
    <>
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-7 w-7 text-accent" /> Live Monitor
            <span className="relative flex h-2 w-2 ml-1">
              <span className="absolute inline-flex h-full w-full rounded-full bg-success animate-ping opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
          </h1>
          <p className="text-muted-foreground mt-1">{sessions.length} live sessions · {flagged} flagged · refreshes every 5s</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)
        ) : sessions.length === 0 ? (
          <Card className="p-12 text-center border-dashed col-span-full">
            <ShieldCheck className="mx-auto h-10 w-10 text-success mb-3" />
            <p className="text-muted-foreground">No live sessions right now.</p>
          </Card>
        ) : (
          sessions.map((s) => {
            const score = s.integrity_score;
            const tone = score >= 80 ? "success" : score >= 50 ? "warning" : "destructive";
            return (
              <Card key={s.id} className="p-4">
                <div className="flex items-center justify-between">
                  <Badge variant={s.is_flagged ? "destructive" : "outline"} className="text-[10px]">
                    {s.is_flagged && <Flag className="h-3 w-3 mr-1" />}
                    {s.is_flagged ? "FLAGGED" : "OK"}
                  </Badge>
                  <span className={`text-2xl font-bold tabular-nums text-${tone}`}>{score}</span>
                </div>
                <div className="text-xs font-mono text-muted-foreground mt-2 truncate">session {s.id.slice(0, 8)}…</div>
                <div className="text-[10px] text-muted-foreground mt-1">started {new Date(s.started_at).toLocaleTimeString()}</div>
              </Card>
            );
          })
        )}
      </div>
    </>
  );
}
