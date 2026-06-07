import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProtectedShell } from "@/components/protected-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { Calendar, Award, ShieldCheck, BookOpen } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/candidate/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Pariksha" }] }),
  component: () => <ProtectedShell requireRoles={["candidate"]}><Dashboard /></ProtectedShell>,
});

function Dashboard() {
  const { user } = useAuth();
  const { data: regs } = useQuery({
    queryKey: ["my-registrations", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("registrations").select("*, exams(*)").eq("candidate_id", user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });
  const { data: results } = useQuery({
    queryKey: ["my-results", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("results").select("*, exams(title)").in("registration_id", (regs ?? []).map((r) => r.id));
      return data ?? [];
    },
    enabled: !!regs,
  });

  const upcoming = (regs ?? []).filter((r) => r.exams && new Date(r.exams.exam_date) >= new Date()).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Welcome back</h1>
        <p className="text-muted-foreground mt-1">Your exams, results, and integrity status — all here.</p>
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
              <li key={r.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold">{r.exams?.title}</div>
                  <div className="text-sm text-muted-foreground">{r.exams?.exam_date} · Admit: {r.admit_card_number}</div>
                </div>
                <span className="text-xs rounded-full bg-muted px-3 py-1 capitalize">{r.status}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">No registrations yet. <Link to="/candidate/exams" className="text-accent hover:underline">Browse available exams</Link>.</p>
        )}
      </Card>
    </div>
  );
}
