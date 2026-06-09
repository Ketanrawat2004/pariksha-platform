import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedShell } from "@/components/protected-shell";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, GraduationCap, FileCheck } from "lucide-react";

export const Route = createFileRoute("/institute/dashboard")({
  head: () => ({ meta: [{ title: "Institute Dashboard — Pariksha" }] }),
  component: InstituteDashboard,
});

function InstituteDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["institute-overview"],
    queryFn: async () => {
      const [cands, exams, regs] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("exams").select("id", { count: "exact", head: true }),
        supabase.from("registrations").select("id", { count: "exact", head: true }),
      ]);
      return {
        candidates: cands.count ?? 0,
        exams: exams.count ?? 0,
        registrations: regs.count ?? 0,
      };
    },
  });

  const stats = [
    { label: "Enrolled Candidates", value: data?.candidates ?? 0, icon: GraduationCap, color: "text-accent" },
    { label: "Active Exams", value: data?.exams ?? 0, icon: FileCheck, color: "text-primary" },
    { label: "Registrations", value: data?.registrations ?? 0, icon: Users, color: "text-warning" },
    { label: "Institute Verified", value: "Yes", icon: Building2, color: "text-success" },
  ];

  return (
    <ProtectedShell allowedRoles={["institute", "admin", "superadmin"]}>
      <div className="container mx-auto py-8 px-4 animate-fade-up">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">Institute Dashboard</h1>
          <p className="text-muted-foreground" aria-live="polite">
            Manage enrolled candidates, monitor exam performance, and verify certificates.
          </p>
        </header>

        <section aria-labelledby="stats-heading" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <h2 id="stats-heading" className="sr-only">Institute overview metrics</h2>
          {stats.map((s) => (
            <Card key={s.label} className="p-6">
              {isLoading ? (
                <Skeleton className="h-12 w-full" />
              ) : (
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
                    <div className="mt-1 text-3xl font-bold tabular-nums">{s.value}</div>
                  </div>
                  <s.icon className={`h-8 w-8 ${s.color}`} aria-hidden="true" />
                </div>
              )}
            </Card>
          ))}
        </section>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-2">Welcome, Demo Institute</h2>
          <p className="text-sm text-muted-foreground">
            From here you can enroll students, register them for national exams, download bulk admit cards, and
            view aggregated performance reports for your institution.
          </p>
        </Card>
      </div>
    </ProtectedShell>
  );
}
