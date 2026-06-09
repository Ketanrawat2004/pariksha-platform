import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedShell } from "@/components/protected-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth/auth-context";
import {
  Building2, FileText, Plus, Lock, Camera, Pencil, Send, ShieldCheck,
  CalendarClock, Trash2, BookOpen, CheckCircle2, AlertCircle, Library,
} from "lucide-react";
import { toast } from "sonner";
import { FaceCapture } from "@/components/face-capture";
import { useTriShieldWatch } from "@/lib/trishield/use-trishield-watch";
import { useEditActivity } from "@/lib/trishield/use-edit-activity";
import { CameraRequiredBlock } from "@/components/trishield/camera-required-block";
import { TriShieldWatchBar } from "@/components/trishield/trishield-watch-bar";
import { LiveWatchPreview } from "@/components/trishield/live-watch-preview";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLockCeremonyInitiator } from "@/lib/trishield/use-lock-ceremony";
import { LockCeremonyWitnessModal } from "@/components/trishield/lock-ceremony-witness-modal";
import { generateSessionReport } from "@/lib/trishield/reports.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/institute/dashboard")({
  head: () => ({ meta: [{ title: "Institute · Paper Builder — Pariksha" }] }),
  component: () => (
    <ProtectedShell requireRoles={["institute", "admin", "superadmin"]}>
      <InstitutePage />
    </ProtectedShell>
  ),
});

type Question = { id: string; text: string; options: string[]; correct: number; marks: number };
type Template = { name: string; subject: string; description: string; durationMinutes: number; questions: Question[] };

const TEMPLATES: Template[] = [
  {
    name: "NEET-UG Mock · Physics",
    subject: "Physics",
    description: "45-question mock paper modelled on NEET-UG physics section.",
    durationMinutes: 60,
    questions: [
      { id: "q1", text: "SI unit of magnetic flux is", options: ["Tesla", "Weber", "Henry", "Gauss"], correct: 1, marks: 4 },
      { id: "q2", text: "Dimensional formula of impulse is", options: ["[MLT⁻¹]", "[MLT⁻²]", "[ML²T⁻¹]", "[ML⁰T⁰]"], correct: 0, marks: 4 },
    ],
  },
  {
    name: "JEE Main · Mathematics",
    subject: "Mathematics",
    description: "Algebra + calculus quick set for JEE Main preparation.",
    durationMinutes: 90,
    questions: [
      { id: "q1", text: "Derivative of sin(x²) w.r.t x is", options: ["cos(x²)", "2x·cos(x²)", "−cos(x²)", "x·cos(x²)"], correct: 1, marks: 4 },
    ],
  },
  {
    name: "SSC CGL · Reasoning",
    subject: "Reasoning",
    description: "Logical reasoning warm-up for SSC CGL candidates.",
    durationMinutes: 30,
    questions: [
      { id: "q1", text: "Find the odd one: 2, 3, 5, 7, 9", options: ["2", "3", "7", "9"], correct: 3, marks: 2 },
    ],
  },
];

async function sha256(text: string) {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function statusColor(s: string) {
  switch (s) {
    case "draft": return "bg-muted text-muted-foreground";
    case "pending": return "bg-warning/15 text-warning";
    case "locked": return "bg-primary/15 text-primary";
    case "approved": return "bg-success/15 text-success";
    case "published": return "bg-accent/15 text-accent";
    case "edit_requested": return "bg-destructive/15 text-destructive";
    default: return "bg-muted text-muted-foreground";
  }
}

function InstitutePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState("submissions");
  const [editing, setEditing] = useState<any | null>(null);
  const [editRequestFor, setEditRequestFor] = useState<any | null>(null);
  const [editNote, setEditNote] = useState("");
  const [editPhoto, setEditPhoto] = useState("");

  const { data: subs, isLoading } = useQuery({
    queryKey: ["paper-submissions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("paper_submissions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const counts = {
    total: subs?.length ?? 0,
    draft: subs?.filter((s: any) => s.status === "draft").length ?? 0,
    locked: subs?.filter((s: any) => s.status === "locked").length ?? 0,
    published: subs?.filter((s: any) => s.status === "published").length ?? 0,
  };

  async function requestEdit() {
    if (!editRequestFor || !editNote.trim()) return;
    if (!editPhoto) return toast.error("Capture your photo to authenticate the edit request");
    // upload photo for audit
    let editPhotoUrl: string | null = null;
    try {
      const { dataUrlToBlob } = await import("@/components/face-capture");
      const path = `edit-requests/${user!.id}/${Date.now()}.jpg`;
      const blob = dataUrlToBlob(editPhoto);
      const { error: upErr } = await supabase.storage.from("face-photos").upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (!upErr) editPhotoUrl = supabase.storage.from("face-photos").getPublicUrl(path).data.publicUrl;
    } catch { /* ignore */ }
    const { error } = await supabase
      .from("paper_submissions")
      .update({ status: "edit_requested", edit_request_note: editNote + (editPhotoUrl ? `\n\n[Submitter photo: ${editPhotoUrl}]` : "") })
      .eq("id", editRequestFor.id);
    if (error) return toast.error(error.message);
    // notify admins
    const { data: admins } = await supabase.from("user_roles").select("user_id").in("role", ["admin", "superadmin"]);
    if (admins?.length) {
      await supabase.from("notifications").insert(admins.map((a) => ({
        user_id: a.user_id,
        title: "Edit request: " + editRequestFor.title,
        message: editNote,
        type: "warning" as const,
      })));
    }
    toast.success("Edit request sent to admin & superadmin");
    setEditRequestFor(null); setEditNote(""); setEditPhoto("");
    qc.invalidateQueries({ queryKey: ["paper-submissions"] });
  }

  async function publish(sub: any) {
    try {
      // 1) Auto-fill date/time if missing
      const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
      const examDate = sub.exam_date ?? tomorrow;
      const startTime = sub.start_time ?? "10:00";

      // 2) Pick/auto-create a center
      let { data: center } = await supabase.from("centers").select("id, name, district, state").limit(1).maybeSingle();
      if (!center) {
        const { data: created, error: cErr } = await supabase
          .from("centers")
          .insert({ name: "Pariksha National Center", district: "New Delhi", state: "Delhi", pincode: "110001", is_verified: true })
          .select("id, name, district, state").single();
        if (cErr) throw cErr;
        center = created;
      }

      // 3) Create an exam row mirroring the paper submission
      const { data: exam, error: eErr } = await supabase.from("exams").insert({
        title: sub.title,
        subject: sub.subject,
        description: sub.description ?? null,
        exam_date: examDate,
        start_time: startTime,
        duration_minutes: sub.duration_minutes ?? 60,
        total_marks: sub.total_marks ?? 100,
        passing_marks: sub.passing_marks ?? Math.floor((sub.total_marks ?? 100) * 0.4),
        status: "live" as const,
        created_by: user?.id ?? null,
      }).select("id").single();
      if (eErr) throw eErr;

      // 4) Insert questions (encrypt fields = plain text for demo)
      const qs = (sub.questions ?? []) as any[];
      if (qs.length) {
        await supabase.from("questions").insert(qs.map((q, idx) => ({
          exam_id: exam.id,
          question_text_encrypted: q.text ?? "",
          option_a_encrypted: q.options?.[0] ?? "",
          option_b_encrypted: q.options?.[1] ?? "",
          option_c_encrypted: q.options?.[2] ?? "",
          option_d_encrypted: q.options?.[3] ?? "",
          correct_answer_encrypted: ["A","B","C","D"][q.correct ?? 0],
          marks: q.marks ?? 4,
          question_order: idx + 1,
          category: sub.subject ?? "General",
        })));
      }

      // 5) Auto-register all candidates with admit cards
      const { data: cands } = await supabase.from("user_roles").select("user_id").eq("role", "candidate");
      if (cands?.length) {
        await supabase.from("registrations").insert(cands.map((c) => ({
          candidate_id: c.user_id,
          exam_id: exam.id,
          center_id: center!.id,
          status: "approved" as const,
        })));
        await supabase.from("notifications").insert(cands.map((c) => ({
          user_id: c.user_id,
          title: "New exam available: " + sub.title,
          message: `📅 ${examDate} · ⏰ ${startTime.slice(0,5)} · 📍 ${center!.name}, ${center!.district}, ${center!.state}. Download your admit card, then click "Give Exam".`,
          type: "info" as const,
        })));
      }

      // 6) Mark the submission as published
      const { error: upErr } = await supabase
        .from("paper_submissions")
        .update({ status: "published", exam_date: examDate, start_time: startTime })
        .eq("id", sub.id);
      if (upErr) throw upErr;

      toast.success(`📢 Broadcast sent — ${cands?.length ?? 0} candidates notified · ${center!.name}`);
      qc.invalidateQueries({ queryKey: ["paper-submissions"] });
    } catch (e: any) {
      toast.error(e.message ?? "Broadcast failed");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this paper submission?")) return;
    const { error } = await supabase.from("paper_submissions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["paper-submissions"] });
  }

  return (
    <div className="container mx-auto py-8 px-4 animate-fade-up space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-accent uppercase tracking-wider mb-1">
            <Building2 className="h-3.5 w-3.5" /> Institute workspace
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Paper Builder & Schedule Lock</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create papers, lock the schedule with teacher authentication, and publish exams to candidates.
          </p>
        </div>
        <Button onClick={() => { setEditing({ blank: true }); setTab("editor"); }} size="lg" className="shadow-elegant">
          <Plus className="mr-2 h-4 w-4" /> New Paper
        </Button>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: "Total", v: counts.total, icon: FileText, c: "text-primary" },
          { l: "Drafts", v: counts.draft, icon: Pencil, c: "text-muted-foreground" },
          { l: "Locked", v: counts.locked, icon: Lock, c: "text-primary" },
          { l: "Published", v: counts.published, icon: CheckCircle2, c: "text-success" },
        ].map((s) => (
          <Card key={s.l} className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.l}</div>
              <div className="text-2xl font-extrabold tabular-nums">{s.v}</div>
            </div>
            <s.icon className={`h-6 w-6 ${s.c}`} />
          </Card>
        ))}
      </section>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="submissions"><FileText className="h-4 w-4 mr-1.5" />Submissions</TabsTrigger>
          <TabsTrigger value="templates"><Library className="h-4 w-4 mr-1.5" />Pre-made</TabsTrigger>
          <TabsTrigger value="editor"><Pencil className="h-4 w-4 mr-1.5" />Editor</TabsTrigger>
        </TabsList>

        <TabsContent value="submissions" className="mt-6 space-y-3">
          {isLoading && <Skeleton className="h-32 w-full" />}
          {subs && subs.length === 0 && (
            <Card className="p-12 text-center border-dashed">
              <BookOpen className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No papers yet. Start with a pre-made template or build from scratch.</p>
            </Card>
          )}
          {(subs ?? []).map((s: any) => (
            <Card key={s.id} className="p-5">
              <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg truncate">{s.title}</h3>
                    <Badge className={statusColor(s.status)}>{s.status}</Badge>
                    <Badge variant="outline">{s.subject}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                    <span><CalendarClock className="h-3.5 w-3.5 inline mr-1" />{s.exam_date} · {s.start_time?.slice(0, 5)}</span>
                    <span>{s.duration_minutes} min · {s.total_marks} marks</span>
                    <span>{(s.questions ?? []).length} questions</span>
                    {s.teacher_name && <span>👤 {s.teacher_name}</span>}
                  </div>
                  {s.edit_request_note && (
                    <div className="mt-2 text-xs rounded border border-destructive/30 bg-destructive/5 p-2 text-destructive">
                      Edit requested: {s.edit_request_note}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {s.status === "draft" && (
                    <Button size="sm" variant="outline" onClick={() => { setEditing(s); setTab("editor"); }}>
                      <Pencil className="h-4 w-4 mr-1" /> Edit
                    </Button>
                  )}
                  {(s.status === "locked" || s.status === "approved" || s.status === "draft") && (
                    <Button size="sm" onClick={() => publish(s)} className="bg-accent hover:bg-accent/90">
                      <Send className="h-4 w-4 mr-1" /> Send to all
                    </Button>
                  )}
                  {s.status === "published" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          const { data, error } = await supabase.rpc("release_paper_admits" as any, { _paper_submission_id: s.id } as any);
                          if (error) throw error;
                          const n = (data as any)?.[0]?.released_count ?? 0;
                          toast.success(n > 0 ? `Released admit cards for ${n} candidate${n === 1 ? "" : "s"}` : "No new candidates to release");
                        } catch (e: any) {
                          toast.error(e?.message ?? "Could not release admits");
                        }
                      }}
                    >
                      <Send className="h-4 w-4 mr-1" /> Release admit cards
                    </Button>
                  )}
                  {s.status !== "draft" && s.status !== "edit_requested" && (
                    <Button size="sm" variant="outline" onClick={() => setEditRequestFor(s)}>
                      <AlertCircle className="h-4 w-4 mr-1" /> Request edit
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => remove(s.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="templates" className="mt-6 grid gap-4 md:grid-cols-3">
          {TEMPLATES.map((t) => (
            <Card key={t.name} className="p-5 hover:shadow-elegant transition">
              <Library className="h-6 w-6 text-accent mb-2" />
              <h3 className="font-bold">{t.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
              <div className="mt-2 text-xs text-muted-foreground">{t.questions.length} questions · {t.durationMinutes} min</div>
              <Button size="sm" className="mt-3 w-full" onClick={() => {
                setEditing({ blank: true, template: t });
                setTab("editor");
              }}>
                <Plus className="h-4 w-4 mr-1" /> Use template
              </Button>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="editor" className="mt-6">
          {!editing ? (
            <Card className="p-12 text-center border-dashed">
              <p className="text-muted-foreground">Select a paper to edit or click <strong>New Paper</strong> to start.</p>
            </Card>
          ) : (
            <PaperEditor
              initial={editing}
              onSaved={() => { setEditing(null); setTab("submissions"); qc.invalidateQueries({ queryKey: ["paper-submissions"] }); }}
              onCancel={() => setEditing(null)}
              userId={user!.id}
            />
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!editRequestFor} onOpenChange={(o) => !o && setEditRequestFor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Request edit — under super-admin supervision</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Capture your photo and explain the change. A notification will be sent to <strong>admin</strong> and <strong>super admin</strong>. The paper stays locked until approved.
          </p>
          <FaceCapture onCapture={setEditPhoto} />
          <Textarea value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="What needs to change and why?" rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRequestFor(null)}>Cancel</Button>
            <Button onClick={requestEdit} disabled={!editNote.trim() || !editPhoto}>Send request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PaperEditor({ initial, onSaved, onCancel, userId }: { initial: any; onSaved: () => void; onCancel: () => void; userId: string }) {
  const tpl: Template | undefined = initial.template;
  const isNew = !!initial.blank;
  const [title, setTitle] = useState(isNew ? (tpl?.name ?? "") : initial.title);
  const [subject, setSubject] = useState(isNew ? (tpl?.subject ?? "") : initial.subject);
  const [description, setDescription] = useState(isNew ? (tpl?.description ?? "") : (initial.description ?? ""));
  const [examDate, setExamDate] = useState(isNew ? "" : initial.exam_date);
  const [startTime, setStartTime] = useState(isNew ? "10:00" : (initial.start_time?.slice(0, 5) ?? "10:00"));
  const [durationMinutes, setDurationMinutes] = useState<number>(isNew ? (tpl?.durationMinutes ?? 60) : initial.duration_minutes);
  const [totalMarks, setTotalMarks] = useState<number>(isNew ? 100 : initial.total_marks);
  const [teacherName, setTeacherName] = useState(isNew ? "" : (initial.teacher_name ?? ""));
  const [questions, setQuestions] = useState<Question[]>(isNew ? (tpl?.questions ?? []) : (initial.questions ?? []));
  const [showLock, setShowLock] = useState(false);
  const [showCeremony, setShowCeremony] = useState(false);

  // TriShield LiveWatch — institute side
  const { roles } = useAuth();
  const isInstitute = roles.includes("institute");
  const watch = useTriShieldWatch({
    party: "institute",
    enabled: isInstitute,
    paperSubmissionId: isNew ? null : initial.id,
    sessionType: !isNew && (initial.status === "locked" || initial.status === "edit_requested") ? "paper_edit" : "paper_lock",
  });
  const editActivity = useEditActivity(watch.session?.id);
  const allPartiesPresent = !!watch.session?.all_parties_present;
  const ceremony = useLockCeremonyInitiator(watch.session?.id);
  const runGenerateReport = useServerFn(generateSessionReport);

  function addQ() {
    setQuestions([...questions, { id: crypto.randomUUID(), text: "", options: ["", "", "", ""], correct: 0, marks: 4 }]);
  }
  function updateQ(i: number, patch: Partial<Question>) {
    setQuestions(questions.map((q, idx) => idx === i ? { ...q, ...patch } : q));
  }
  function removeQ(i: number) { setQuestions(questions.filter((_, idx) => idx !== i)); }

  async function saveDraft() {
    if (!title || !subject || !examDate) return toast.error("Title, subject and date are required");
    const payload = {
      institute_id: userId, title, subject, description,
      exam_date: examDate, start_time: startTime,
      duration_minutes: durationMinutes, total_marks: totalMarks, passing_marks: Math.floor(totalMarks * 0.4),
      teacher_name: teacherName, questions: questions as any, status: "draft" as const,
    };
    const { error } = isNew
      ? await supabase.from("paper_submissions").insert(payload)
      : await supabase.from("paper_submissions").update(payload).eq("id", initial.id);
    if (error) return toast.error(error.message);
    toast.success("Draft saved");
    onSaved();
  }

  return (
    <>
      {isInstitute && watch.denied && <CameraRequiredBlock onRetry={watch.requestCamera} />}
      {isInstitute && watch.granted && <TriShieldWatchBar session={watch.session} />}
      {isInstitute && watch.granted && <LiveWatchPreview videoRef={watch.videoRef} canvasRef={watch.canvasRef} />}
      <Card className="p-6 space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label>Paper title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Class 12 Physics Mid-term" />
        </div>
        <div>
          <Label>Subject</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div>
          <Label>Teacher / authoring faculty</Label>
          <Input value={teacherName} onChange={(e) => setTeacherName(e.target.value)} placeholder="Dr. R. Mehta" />
        </div>
        <div className="md:col-span-2">
          <Label>Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>
        <div>
          <Label>Exam date</Label>
          <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
        </div>
        <div>
          <Label>Start time</Label>
          <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </div>
        <div>
          <Label>Duration (minutes)</Label>
          <Input type="number" min={5} value={durationMinutes} onChange={(e) => setDurationMinutes(+e.target.value)} />
        </div>
        <div>
          <Label>Total marks</Label>
          <Input type="number" min={1} value={totalMarks} onChange={(e) => setTotalMarks(+e.target.value)} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">Questions ({questions.length})</h3>
          <Button size="sm" variant="outline" onClick={addQ}><Plus className="h-4 w-4 mr-1" />Add question</Button>
        </div>
        <div className="space-y-3">
          {questions.map((q, i) => (
            <Card key={q.id} className="p-4 bg-muted/30">
              <div className="flex items-start gap-2">
                <span className="font-mono text-xs text-muted-foreground mt-2">Q{i + 1}.</span>
                <Textarea
                  value={q.text}
                  onChange={(e) => updateQ(i, { text: e.target.value })}
                  onFocus={() => editActivity.emit("typing_started", i)}
                  onBlur={() => editActivity.emit("typing_stopped", i)}
                  rows={2}
                  className="flex-1"
                  placeholder="Question text"
                />
                <Button size="icon" variant="ghost" onClick={() => removeQ(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
              <div className="grid sm:grid-cols-2 gap-2 mt-3">
                {q.options.map((o, oi) => (
                  <label key={oi} className={`flex items-center gap-2 rounded border p-2 cursor-pointer ${q.correct === oi ? "border-success bg-success/5" : "border-border"}`}>
                    <input type="radio" name={`q-${q.id}`} checked={q.correct === oi} onChange={() => updateQ(i, { correct: oi })} />
                    <Input value={o} onChange={(e) => updateQ(i, { options: q.options.map((v, vi) => vi === oi ? e.target.value : v) })} placeholder={`Option ${String.fromCharCode(65 + oi)}`} className="h-7" />
                  </label>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Marks:</span>
                <Input type="number" value={q.marks} onChange={(e) => updateQ(i, { marks: +e.target.value })} className="h-7 w-20" min={1} />
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 justify-end pt-4 border-t border-border">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button variant="outline" onClick={() => { editActivity.emit("draft_saved"); void saveDraft(); }}>Save draft</Button>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  onClick={() => setShowCeremony(true)}
                  disabled={!title || !subject || !examDate || questions.length === 0 || (isInstitute && !allPartiesPresent)}
                  className={isInstitute && allPartiesPresent ? "ring-2 ring-success shadow-[0_0_20px_-4px] shadow-success/50 transition" : ""}
                >
                  <Lock className="h-4 w-4 mr-1.5" /> Lock & Authenticate
                </Button>
              </span>
            </TooltipTrigger>
            {isInstitute && !allPartiesPresent && (
              <TooltipContent>Waiting for Admin and SuperAdmin to join LiveWatch</TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>

      <LockCeremonyWitnessModal
        open={showCeremony}
        onClose={() => { ceremony.cancel(); setShowCeremony(false); }}
        onStart={ceremony.start}
        onProceed={() => { setShowCeremony(false); setShowLock(true); }}
        adminConfirmed={ceremony.adminConfirmed}
        superadminConfirmed={ceremony.superadminConfirmed}
        bothConfirmed={ceremony.bothConfirmed}
        secondsLeft={ceremony.secondsLeft}
        active={ceremony.active}
      />

      {showLock && (
        <LockDialog
          onClose={() => setShowLock(false)}
          onLocked={async (photoUrl, passkeyHash) => {
            const payload = {
              institute_id: userId, title, subject, description,
              exam_date: examDate, start_time: startTime,
              duration_minutes: durationMinutes, total_marks: totalMarks, passing_marks: Math.floor(totalMarks * 0.4),
              teacher_name: teacherName, questions: questions as any,
              submitter_photo_url: photoUrl, passkey_hash: passkeyHash, status: "locked" as const,
            };
            const { error } = isNew
              ? await supabase.from("paper_submissions").insert(payload)
              : await supabase.from("paper_submissions").update(payload).eq("id", initial.id);
            if (error) { toast.error(error.message); return; }
            toast.success("Paper locked. Schedule, identity & passkey sealed.");
            // Generate the TriShield session report (fire-and-forget)
            const sid = watch.session?.id;
            if (sid) {
              const finalPaperHash = await sha256(JSON.stringify({ title, subject, questions, examDate, startTime }));
              void runGenerateReport({ data: { sessionId: sid, finalPaperHash } }).catch(() => {});
            }
            setShowLock(false);
            onSaved();
          }}
        />
      )}
    </Card>
    </>
  );
}

function LockDialog({ onClose, onLocked }: { onClose: () => void; onLocked: (photoUrl: string, passkeyHash: string) => Promise<void> }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [passkey, setPasskey] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function startCam() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 360 } });
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setStreaming(true);
    } catch { toast.error("Camera permission denied"); }
  }
  function snap() {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current, c = canvasRef.current;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    setPhoto(c.toDataURL("image/jpeg", 0.85));
    (v.srcObject as MediaStream | null)?.getTracks().forEach((t) => t.stop());
    setStreaming(false);
  }

  async function commit() {
    if (!photo) return toast.error("Capture submitter photo");
    if (passkey.length < 6) return toast.error("Passkey must be 6+ chars");
    if (passkey !== confirm) return toast.error("Passkey mismatch");
    setBusy(true);
    try {
      const blob = await (await fetch(photo)).blob();
      const path = `institute-submitters/${crypto.randomUUID()}.jpg`;
      const up = await supabase.storage.from("face-photos").upload(path, blob, { contentType: "image/jpeg" });
      if (up.error) throw up.error;
      const { data: urlData } = supabase.storage.from("face-photos").createSignedUrl
        ? await supabase.storage.from("face-photos").createSignedUrl(path, 60 * 60 * 24 * 365)
        : { data: { signedUrl: path } } as any;
      const photoUrl = (urlData as any)?.signedUrl ?? path;
      const passkeyHash = await sha256(passkey);
      await onLocked(photoUrl, passkeyHash);
    } catch (e: any) {
      toast.error(e?.message ?? "Lock failed");
    } finally { setBusy(false); }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-accent" /> Lock paper · Teacher authentication</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="flex items-center gap-1.5"><Camera className="h-4 w-4" /> Submitter photo</Label>
            <div className="mt-2 rounded-lg border border-border overflow-hidden bg-muted/40 aspect-video flex items-center justify-center">
              {photo ? (
                <img src={photo} alt="submitter" className="h-full object-cover" />
              ) : (
                <video ref={videoRef} className="h-full object-cover" muted playsInline />
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <div className="mt-2 flex gap-2">
              {!streaming && !photo && <Button size="sm" variant="outline" onClick={startCam}>Start camera</Button>}
              {streaming && <Button size="sm" onClick={snap}>Capture</Button>}
              {photo && <Button size="sm" variant="ghost" onClick={() => { setPhoto(null); startCam(); }}>Retake</Button>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Passkey</Label>
              <Input type="password" value={passkey} onChange={(e) => setPasskey(e.target.value)} placeholder="6+ characters" />
            </div>
            <div>
              <Label>Confirm</Label>
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            The passkey is hashed with SHA-256 before storage. The photo is captured in-browser and uploaded to the secure vault.
            Once locked, schedule and questions are sealed — only an approved edit-request from <strong>super admin</strong> can unlock.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={commit} disabled={busy}><Lock className="h-4 w-4 mr-1.5" />Lock now</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
