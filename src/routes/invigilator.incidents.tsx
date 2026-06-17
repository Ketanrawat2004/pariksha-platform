import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProtectedShell } from "@/components/protected-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeTables } from "@/hooks/use-realtime-tables";
import { AlertTriangle, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/invigilator/incidents")({
  head: () => ({ meta: [{ title: "Incidents — Pariksha" }] }),
  component: () => (
    <ProtectedShell requireRoles={["invigilator", "admin", "superadmin"]}>
      <IncidentsPage />
    </ProtectedShell>
  ),
});

const sevVariant: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
  critical: "destructive",
  high: "destructive",
  medium: "default",
  low: "secondary",
};

function IncidentsPage() {
  useRealtimeTables(["integrity_events", "incidents"], [["invig-incidents"]]);
  const { data, isLoading } = useQuery({
    queryKey: ["invig-incidents"],
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integrity_events")
        .select("id,event_type,severity,timestamp,details,auto_resolved,session_id")
        .in("severity", ["high", "critical", "medium"])
        .order("timestamp", { ascending: false })
        .limit(150);
      if (error) throw error;
      return data;
    },
  });

  return (
    <>
      <h1 className="flex min-w-0 items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
        <AlertTriangle className="h-7 w-7 shrink-0 text-accent" /> <span className="truncate">Incidents</span>
      </h1>
      <p className="text-muted-foreground mt-1 mb-6">Medium-and-above integrity signals from across the live exam grid.</p>

      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
        ) : (data ?? []).length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <ShieldCheck className="mx-auto h-10 w-10 text-success mb-3" />
            <p className="text-muted-foreground">No incidents reported.</p>
          </Card>
        ) : (
          (data ?? []).map((e) => (
            <Card key={e.id} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 p-3 sm:flex sm:flex-wrap">
              <Badge variant={sevVariant[e.severity] ?? "outline"} className="text-[10px] uppercase">{e.severity}</Badge>
              <div className="min-w-0 truncate font-mono text-sm">{e.event_type}</div>
              <div className="min-w-0 truncate text-xs text-muted-foreground sm:flex-1 sm:min-w-[120px]">session {e.session_id?.slice(0, 8)}…</div>
              {e.auto_resolved && <Badge variant="outline" className="text-[10px]">resolved</Badge>}
              <div className="text-xs text-muted-foreground">{new Date(e.timestamp).toLocaleString()}</div>
            </Card>
          ))
        )}
      </div>
    </>
  );
}
