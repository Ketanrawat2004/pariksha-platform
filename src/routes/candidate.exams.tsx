import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ProtectedShell } from "@/components/protected-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { Calendar, Clock, MapPin, Award, PlayCircle, Download, UserPlus, CheckCircle2, Loader2 } from "lucide-react";
import { downloadAdmitCard } from "@/lib/pdf/admit-card";
import { toast } from "sonner";

export const Route = createFileRoute("/candidate/exams")({
  head: () => ({ meta: [{ title: "Exams — Pariksha" }] }),
  component: () => <ProtectedShell requireRoles={["candidate"]}><ExamsList /></ProtectedShell>,
});

function ExamsList() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ["profile-photo", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("photo_url, full_name").eq("id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });
  const { data: regs, isLoading } = useQuery({
    queryKey: ["my-regs-full", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("registrations").select("*, exams(*), centers(name, district, state)").eq("candidate_id", user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: available } = useQuery({
    queryKey: ["available-paper-submissions"],
    queryFn: async () => {
      const { data } = await supabase.rpc("list_published_paper_summaries" as any);
      return (data as any[]) ?? [];
    },
  });

  const { data: myPaperRegs } = useQuery({
    queryKey: ["my-paper-regs", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("paper_registrations" as any)
        .select("id, paper_submission_id, admit_card_number, admit_released, full_name")
        .eq("candidate_id", user!.id);
      return (data as any[]) ?? [];
    },
    enabled: !!user,
  });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My exams</h1>
        <p className="text-muted-foreground mt-1">Registered exams — click "Give Exam" to start any time. No delay.</p>
      </div>

      {available && available.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Available from institutes</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {available.map((p) => {
              const myReg = myPaperRegs?.find((r) => r.paper_submission_id === p.id);
              return (
                <Card key={p.id} className="p-4 border-accent/30">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{p.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {p.subject} · {p.exam_date} · {p.start_time?.slice(0, 5)} · {p.duration_minutes} min · {p.total_marks} marks
                      </div>
                    </div>
                    {!myReg && <span className="rounded-full bg-accent/15 text-accent text-[10px] font-bold px-2 py-0.5 shrink-0">NEW</span>}
                  </div>
                  <div className="mt-3">
                    {!myReg ? (
                      <RegisterForPaperButton paperId={p.id} onDone={() => qc.invalidateQueries({ queryKey: ["my-paper-regs", user?.id] })} />
                    ) : myReg.admit_released ? (
                      <div className="text-xs text-success flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Admit released · <span className="font-mono">{myReg.admit_card_number}</span></div>
                    ) : (
                      <div className="text-xs text-muted-foreground">Registered — waiting for institute to release admit card.</div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

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
                <div className="flex flex-col gap-2">
                  <Button asChild size="lg" className="bg-accent hover:bg-accent/90 shadow-elegant">
                    <Link to="/exam/$registrationId" params={{ registrationId: r.id }}>
                      <PlayCircle className="mr-2 h-5 w-5" /> Give Exam
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={`Download admit card for ${exam.title}`}
                    onClick={async () => {
                      try {
                        const { signFacePhotoUrl } = await import("@/lib/storage/face-photo");
                        const signed = profile?.photo_url ? await signFacePhotoUrl(profile.photo_url, 60 * 60) : null;
                        await downloadAdmitCard({
                          candidateName: profile?.full_name ?? user?.user_metadata?.full_name ?? user?.email ?? "Candidate",
                          admitCardNumber: r.admit_card_number,
                          seatNumber: r.seat_number,
                          examTitle: exam.title,
                          examDate: exam.exam_date,
                          startTime: exam.start_time?.slice(0, 5) ?? "",
                          durationMinutes: exam.duration_minutes,
                          centerName: r.centers?.name,
                          photoUrl: signed ?? profile?.photo_url ?? null,
                        });
                        toast.success("Admit card downloaded");
                      } catch {
                        toast.error("Could not generate admit card");
                      }
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" /> Admit Card
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function RegisterForPaperButton({ paperId, onDone }: { paperId: string; onDone: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!user) return;
    if (!fullName.trim()) return toast.error("Full name is required");
    setBusy(true);
    try {
      const { error } = await supabase.from("paper_registrations" as any).insert({
        candidate_id: user.id,
        paper_submission_id: paperId,
        full_name: fullName.trim(),
        date_of_birth: dob || null,
        phone: phone || null,
      } as any);
      if (error) throw error;
      toast.success("Registered. Institute will release your admit card shortly.");
      setOpen(false);
      onDone();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not register");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="w-full"><UserPlus className="h-4 w-4 mr-1.5" /> Register</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Register for this paper</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label htmlFor="rf-name">Full name</Label><Input id="rf-name" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} /></div>
          <div><Label htmlFor="rf-dob">Date of birth</Label><Input id="rf-dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} /></div>
          <div><Label htmlFor="rf-phone">Phone (optional)</Label><Input id="rf-phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} /></div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={busy}>{busy && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />} Submit registration</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
