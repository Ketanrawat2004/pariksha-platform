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
import { Calendar, Award, ShieldCheck, BookOpen, UserCircle2, PlayCircle, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { startPaperExam } from "@/lib/institute/start-paper-exam.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/candidate/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Pariksha" }] }),
  component: () => <ProtectedShell requireRoles={["candidate"]}><Dashboard /></ProtectedShell>,
});

function Dashboard() {
  const { user } = useAuth();



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
      const { data } = await supabase.from("results").select("*, exams(title)").in("registration_id", regs.map((r) => r.id));
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
            <h1 className="text-3xl font-bold">Welcome, {profile?.full_name?.split(" ")[0] ?? "candidate"}</h1>
            <p className="text-muted-foreground mt-1">Your exams, results, and integrity status — all here.</p>
          </div>
        </div>
        <Button asChild size="lg" className="bg-accent hover:bg-accent/90 shadow-elegant">
          <Link to="/exam/$registrationId" params={{ registrationId: "88888888-8888-8888-8888-888888888888" }}>
            <BookOpen className="mr-2 h-4 w-4" /> Try Demo Exam
          </Link>
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
    </div>
  );
}
