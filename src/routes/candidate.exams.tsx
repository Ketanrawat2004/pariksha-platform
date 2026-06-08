import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProtectedShell } from "@/components/protected-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { Calendar, Clock, MapPin, Award, PlayCircle } from "lucide-react";

export const Route = createFileRoute("/candidate/exams")({
  head: () => ({ meta: [{ title: "Exams — Pariksha" }] }),
  component: () => <ProtectedShell requireRoles={["candidate"]}><ExamsList /></ProtectedShell>,
});

function ExamsList() {
  const { user } = useAuth();
  const { data: regs, isLoading } = useQuery({
    queryKey: ["my-regs-full", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("registrations").select("*, exams(*), centers(name, district, state)").eq("candidate_id", user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My exams</h1>
        <p className="text-muted-foreground mt-1">Registered exams. The Enter Exam button activates on exam day.</p>
      </div>

      {isLoading && <Card className="p-8 text-center text-muted-foreground">Loading…</Card>}

      {regs && regs.length === 0 && (
        <Card className="p-12 text-center border-dashed">
          <p className="text-muted-foreground">You haven't registered for any exams yet.</p>
        </Card>
      )}

      <div className="grid gap-4">
        {(regs ?? []).map((r) => {
          const exam = r.exams!;
          const isToday = exam.exam_date === today;
          return (
            <Card key={r.id} className="p-6 hover:shadow-elegant transition">
              <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold">{exam.title}</h2>
                    {isToday && <span className="rounded-full bg-accent/10 text-accent text-xs font-bold px-2 py-0.5">TODAY</span>}
                    <span className="rounded-full bg-success/10 text-success text-xs font-semibold px-2 py-0.5 capitalize">{r.status}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{exam.description}</p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Calendar className="h-4 w-4" />{exam.exam_date}</span>
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Clock className="h-4 w-4" />{exam.start_time?.slice(0,5)} · {exam.duration_minutes} min</span>
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Award className="h-4 w-4" />{exam.total_marks} marks</span>
                    {r.centers && <span className="inline-flex items-center gap-1.5 text-muted-foreground"><MapPin className="h-4 w-4" />{r.centers.name}</span>}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">Admit Card: <span className="font-mono">{r.admit_card_number}</span> · Seat: <span className="font-semibold text-foreground">{r.seat_number ?? "—"}</span></div>
                </div>
                <div>
                  {isToday ? (
                    <Button asChild size="lg" className="bg-accent hover:bg-accent/90 shadow-elegant">
                      <Link to="/exam/$registrationId" params={{ registrationId: r.id }}>
                        <PlayCircle className="mr-2 h-5 w-5" /> Enter Exam
                      </Link>
                    </Button>
                  ) : (
                    <Button size="lg" disabled variant="outline">
                      Opens on exam day
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
