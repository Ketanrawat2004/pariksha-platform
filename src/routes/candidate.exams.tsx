import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ProtectedShell } from "@/components/protected-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { PlayCircle, Download, UserPlus, CheckCircle2, Loader2, CreditCard, Clock } from "lucide-react";
import { downloadAdmitCard } from "@/lib/pdf/admit-card";
import { toast } from "sonner";
import { StripeEmbeddedCheckoutForm } from "@/components/StripeEmbeddedCheckout";
import { startPaperExam } from "@/lib/institute/start-paper-exam.functions";

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">My exams</h1>
          <p className="text-muted-foreground mt-1">Register for papers below. You can take the exam once the institute releases your admit card and the start time has arrived.</p>
        </div>
        <Button asChild variant="outline" size="sm"><Link to="/candidate/billing"><CreditCard className="h-4 w-4 mr-1.5" /> Billing</Link></Button>
      </div>

      {(!available || available.length === 0) && (
        <Card className="p-12 text-center border-dashed">
          <p className="text-muted-foreground">No live papers right now. Check back soon.</p>
        </Card>
      )}

      {available && available.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Available from institutes</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {available.map((p) => {
              const myReg = myPaperRegs?.find((r) => r.paper_submission_id === p.id);
              return (
                <PaperCard
                  key={p.id}
                  paper={p}
                  myReg={myReg}
                  candidateName={profile?.full_name}
                  photoUrl={profile?.photo_url}
                  userEmail={user?.email}
                  onRegistered={() => qc.invalidateQueries({ queryKey: ["my-paper-regs", user?.id] })}
                />
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function PaperCard({
  paper,
  myReg,
  candidateName,
  photoUrl,
  userEmail,
  onRegistered,
}: {
  paper: any;
  myReg: any | undefined;
  candidateName?: string | null;
  photoUrl?: string | null;
  userEmail?: string | null;
  onRegistered: () => void;
}) {
  const navigate = useNavigate();
  const runStart = useServerFn(startPaperExam);
  const [starting, setStarting] = useState(false);

  const startsAt = new Date(`${paper.exam_date}T${paper.start_time ?? "00:00:00"}`);
  const canGiveExam = !!myReg?.admit_released && Date.now() >= startsAt.getTime();

  async function giveExam() {
    if (!myReg) return;
    setStarting(true);
    try {
      const res = await runStart({ data: { paperRegistrationId: myReg.id } });
      navigate({ to: "/exam/$registrationId", params: { registrationId: res.registrationId } });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not start exam");
    } finally {
      setStarting(false);
    }
  }

  async function getAdmit() {
    if (!myReg?.admit_card_number) return;
    try {
      const { signFacePhotoUrl } = await import("@/lib/storage/face-photo");
      const signed = photoUrl ? await signFacePhotoUrl(photoUrl, 60 * 60) : null;
      await downloadAdmitCard({
        candidateName: candidateName ?? userEmail ?? "Candidate",
        admitCardNumber: myReg.admit_card_number,
        seatNumber: null,
        examTitle: paper.title,
        examDate: paper.exam_date,
        startTime: (paper.start_time ?? "").slice(0, 5),
        durationMinutes: paper.duration_minutes,
        photoUrl: signed ?? photoUrl ?? null,
      });
      toast.success("Admit card downloaded");
    } catch {
      toast.error("Could not generate admit card");
    }
  }

  return (
    <Card className="p-4 border-accent/30">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold truncate">{paper.title}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {paper.subject} · {paper.exam_date} · {paper.start_time?.slice(0, 5)} · {paper.duration_minutes} min · {paper.total_marks} marks
          </div>
        </div>
        {!myReg && <span className="rounded-full bg-accent/15 text-accent text-[10px] font-bold px-2 py-0.5 shrink-0">NEW</span>}
      </div>
      <div className="mt-3 space-y-2">
        {!myReg ? (
          <PayAndRegisterForPaper paperId={paper.id} paperTitle={paper.title} onDone={onRegistered} />
        ) : !myReg.admit_released ? (
          <div className="text-xs text-muted-foreground">Registered — waiting for institute to release admit card.</div>
        ) : (
          <>
            <div className="text-xs text-success flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Admit released · <span className="font-mono">{myReg.admit_card_number}</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 bg-accent hover:bg-accent/90" disabled={!canGiveExam || starting} onClick={giveExam}>
                {starting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-1.5" />}
                {canGiveExam ? "Give Exam" : <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Starts {startsAt.toLocaleString()}</span>}
              </Button>
              <Button size="sm" variant="outline" onClick={getAdmit}><Download className="h-4 w-4 mr-1.5" /> Admit</Button>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

function PayAndRegisterForPaper({ paperId, paperTitle, onDone }: { paperId: string; paperTitle: string; onDone: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [paid, setPaid] = useState(false);
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!user) return;
    if (!paid) return toast.error("Please complete payment first.");
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
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setPaid(false); } }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="w-full">
          <UserPlus className="h-4 w-4 mr-1.5" /> Register & Pay ₹500
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Register for {paperTitle}</DialogTitle>
          <DialogDescription>Payment is required for every exam (no fee for the demo).</DialogDescription>
        </DialogHeader>
        {!paid ? (
          <>
            <div className="rounded-md border border-orange-300 bg-orange-100 px-3 py-2 text-xs text-orange-800">
              <strong>Test mode:</strong> Use card <span className="font-mono">4242 4242 4242 4242</span>, any future expiry, any CVC. No real money is charged.
            </div>
            <StripeEmbeddedCheckoutForm priceId="exam_registration_500" examId={paperId} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setPaid(true)}>I've completed payment — continue</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="rounded-md bg-success/10 text-success px-3 py-2 text-xs flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Payment recorded. Now enter your details.
            </div>
            <div className="space-y-3">
              <div><Label htmlFor="rf-name">Full name</Label><Input id="rf-name" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} /></div>
              <div><Label htmlFor="rf-dob">Date of birth</Label><Input id="rf-dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} /></div>
              <div><Label htmlFor="rf-phone">Phone (optional)</Label><Input id="rf-phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} /></div>
            </div>
            <DialogFooter>
              <Button onClick={submit} disabled={busy}>{busy && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />} Submit registration</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
