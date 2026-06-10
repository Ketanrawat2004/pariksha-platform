import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProtectedShell } from "@/components/protected-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { ShieldAlert, AlertTriangle, ShieldCheck, Activity } from "lucide-react";

export const Route = createFileRoute("/admin/integrity")({
  head: () => ({ meta: [{ title: "Integrity — Pariksha" }] }),
  component: () => (
    <ProtectedShell requireRoles={["admin", "superadmin"]}>
      <IntegrityPage />
    </ProtectedShell>
  ),
});

const sevColor: Record<string, string> = {
  critical: "destructive",
  high: "destructive",
  medium: "default",
  low: "secondary",
};

function IntegrityPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-integrity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integrity_events")
        .select("id,event_type,severity,timestamp,auto_resolved,details,session_id")
        .order("timestamp", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const counts = (data ?? []).reduce(
    (a, e) => {
      a.total++;
      if (e.severity === "critical" || e.severity === "high") a.high++;
      if (!e.auto_resolved) a.open++;
      return a;
    },
    { total: 0, high: 0, open: 0 },
  );

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
        <ShieldAlert className="h-7 w-7 text-accent" /> Integrity Events
      </h1>
      <p className="text-muted-foreground mt-1 mb-6">Real-time signals from every exam session — tab-switch, copy, devtools, multi-face, prohibited objects.</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <Stat icon={<Activity className="h-4 w-4" />} label="Total" value={counts.total} />
        <Stat icon={<AlertTriangle className="h-4 w-4 text-destructive" />} label="High / Critical" value={counts.high} />
        <Stat icon={<ShieldCheck className="h-4 w-4 text-success" />} label="Unresolved" value={counts.open} />
      </div>

      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
        ) : (data ?? []).length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <ShieldCheck className="mx-auto h-10 w-10 text-success mb-3" />
            <p className="text-muted-foreground">No integrity events recorded.</p>
          </Card>
        ) : (
          (data ?? []).map((e) => (
            <Card key={e.id} className="p-3 flex flex-wrap items-center gap-3">
              <Badge variant={(sevColor[e.severity] ?? "outline") as never} className="text-[10px] uppercase">
                {e.severity}
              </Badge>
              <div className="font-mono text-sm">{e.event_type}</div>
              <div className="text-xs text-muted-foreground truncate flex-1 min-w-[140px]">
                session {e.session_id?.slice(0, 8)}…
              </div>
              {e.auto_resolved && <Badge variant="outline" className="text-[10px]">auto-resolved</Badge>}
              <div className="text-xs text-muted-foreground">{new Date(e.timestamp).toLocaleString()}</div>
            </Card>
          ))
        )}
      </div>
    </>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="text-2xl font-bold tabular-nums mt-1">{value.toLocaleString()}</div>
    </Card>
  );
}
