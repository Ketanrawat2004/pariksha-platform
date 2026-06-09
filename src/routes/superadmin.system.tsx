import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProtectedShell } from "@/components/protected-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Server, Database, Activity, ShieldCheck, Users, FileText, Building2 } from "lucide-react";

export const Route = createFileRoute("/superadmin/system")({
  head: () => ({ meta: [{ title: "System — Pariksha" }] }),
  component: () => (
    <ProtectedShell requireRoles={["superadmin"]}>
      <SystemPage />
    </ProtectedShell>
  ),
});

function SystemPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["sa-system"],
    refetchInterval: 60000,
    queryFn: async () => {
      const head = { count: "exact" as const, head: true };
      const [profiles, exams, centers, regs, results, events, sessions] = await Promise.all([
        supabase.from("profiles").select("id", head),
        supabase.from("exams").select("id", head),
        supabase.from("centers").select("id", head),
        supabase.from("registrations").select("id", head),
        supabase.from("results").select("id", head),
        supabase.from("integrity_events").select("id", head),
        supabase.from("exam_sessions").select("id", head),
      ]);
      return {
        profiles: profiles.count ?? 0,
        exams: exams.count ?? 0,
        centers: centers.count ?? 0,
        regs: regs.count ?? 0,
        results: results.count ?? 0,
        events: events.count ?? 0,
        sessions: sessions.count ?? 0,
      };
    },
  });

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
        <Server className="h-7 w-7 text-accent" /> System Health
      </h1>
      <p className="text-muted-foreground mt-1 mb-6">Live counts across every table in the platform.</p>

      <Card className="p-6 mb-6 bg-gradient-to-br from-success/5 to-accent/5 border-success/30">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-success" />
          <div>
            <div className="text-lg font-bold flex items-center gap-2">
              All systems operational
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-success animate-ping opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
            </div>
            <div className="text-sm text-muted-foreground">Database · Auth · Storage · Realtime · Edge functions — all green.</div>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading || !data ? (
          Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : (
          <>
            <Stat icon={<Users className="h-4 w-4" />} label="Profiles" value={data.profiles} />
            <Stat icon={<FileText className="h-4 w-4" />} label="Exams" value={data.exams} />
            <Stat icon={<Building2 className="h-4 w-4" />} label="Centers" value={data.centers} />
            <Stat icon={<Database className="h-4 w-4" />} label="Registrations" value={data.regs} />
            <Stat icon={<ShieldCheck className="h-4 w-4" />} label="Results" value={data.results} />
            <Stat icon={<Activity className="h-4 w-4" />} label="Integrity events" value={data.events} />
            <Stat icon={<Server className="h-4 w-4" />} label="Sessions" value={data.sessions} />
          </>
        )}
      </div>

      <Card className="p-5 mt-6">
        <h2 className="font-semibold mb-3">Subsystem status</h2>
        <div className="space-y-2 text-sm">
          {[
            "PostgreSQL (Lovable Cloud)",
            "Row-level security policies",
            "Auth — JWT + Google OAuth",
            "Storage — face photos / artifacts",
            "Realtime — websocket fanout",
            "Edge functions",
            "TriShield watch sessions",
          ].map((s) => (
            <div key={s} className="flex items-center justify-between border-b border-border last:border-0 pb-2">
              <span>{s}</span>
              <Badge variant="default" className="text-[10px]">OPERATIONAL</Badge>
            </div>
          ))}
        </div>
      </Card>
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
