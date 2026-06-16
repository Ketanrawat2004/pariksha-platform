import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { useRealtimeTables } from "@/hooks/use-realtime-tables";
import {
  Building2, FileText, Plus, Lock, Camera, Pencil, Send, ShieldCheck,
  CalendarClock, Trash2, BookOpen, CheckCircle2, AlertCircle, Library, Code2,
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
import { publishPaperAsExam } from "@/lib/institute/publish-paper.functions";
import { useServerFn } from "@tanstack/react-start";
import { ActivityReportButton } from "@/components/activity-report-button";
import { logActivity } from "@/lib/activity-log";

export const Route = createFileRoute("/institute/dashboard")({
  head: () => ({ meta: [
    { title: "Institute · Paper Builder — Pariksha" },
    { name: "description", content: "Build, publish, and release secure exam papers — manage rosters, admit cards, and TriShield sessions for your institute." },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: () => (
    <ProtectedShell requireRoles={["institute", "admin", "superadmin"]}>
      <InstitutePage />
    </ProtectedShell>
  ),
});

type Question = { id: string; text: string; options: string[]; correct: number; marks: number };
type Template = { name: string; subject: string; description: string; durationMinutes: number; questions: Question[]; kind?: "coding" };

// Pre-made DSA MCQ bank used when "Add question" is clicked on a coding paper
const DSA_MCQ_BANK: Omit<Question, "id">[] = [
  { text: "Time complexity of binary search on a sorted array of n elements?", options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"], correct: 1, marks: 2 },
  { text: "Which data structure uses LIFO order?", options: ["Queue", "Stack", "Deque", "Heap"], correct: 1, marks: 2 },
  { text: "Best-case time complexity of QuickSort?", options: ["O(n²)", "O(n log n)", "O(n)", "O(log n)"], correct: 1, marks: 2 },
  { text: "Which traversal of a BST yields sorted output?", options: ["Preorder", "Inorder", "Postorder", "Level-order"], correct: 1, marks: 2 },
  { text: "Hash map average lookup complexity?", options: ["O(log n)", "O(n)", "O(1)", "O(n log n)"], correct: 2, marks: 2 },
  { text: "Worst-case complexity of insertion in a singly linked list (at tail, no tail pointer)?", options: ["O(1)", "O(log n)", "O(n)", "O(n²)"], correct: 2, marks: 2 },
  { text: "Which algorithm is used to find shortest paths from a single source on a weighted graph with non-negative edges?", options: ["Bellman-Ford", "Dijkstra", "Floyd-Warshall", "Kruskal"], correct: 1, marks: 2 },
  { text: "Heap-sort overall time complexity?", options: ["O(n)", "O(n log n)", "O(n²)", "O(log n)"], correct: 1, marks: 2 },
  { text: "Which is NOT a stable sort?", options: ["Merge sort", "Bubble sort", "QuickSort", "Insertion sort"], correct: 2, marks: 2 },
  { text: "DFS uses which data structure (iteratively)?", options: ["Queue", "Stack", "Priority queue", "Set"], correct: 1, marks: 2 },
  { text: "Trie is best used for?", options: ["Range queries", "Prefix lookups", "Disjoint sets", "Shortest paths"], correct: 1, marks: 2 },
  { text: "Number of edges in a tree with n nodes?", options: ["n", "n-1", "n+1", "2n"], correct: 1, marks: 2 },
];

// Coding problem bank — generated WITHOUT explicit answers; institute fills tests during review
const CODING_PROBLEM_BANK: { title: string; description: string }[] = [
  { title: "Two Sum", description: "Given an array of integers nums and an integer target, return the indices [i, j] of the two numbers such that they add up to target. Assume exactly one solution exists and you may not use the same element twice." },
  { title: "Reverse a String", description: "Return the reverse of the given string s without using the built-in String.reverse. Write the loop yourself. Handle empty strings and single characters." },
  { title: "Valid Parentheses", description: "Given a string containing only '(){}[]', determine if the input is valid. Open brackets must be closed by the same type and in the correct order." },
  { title: "Maximum Subarray", description: "Given an integer array nums, find the contiguous subarray (containing at least one number) which has the largest sum and return the sum (Kadane's algorithm)." },
  { title: "Merge Two Sorted Lists", description: "You are given the heads of two sorted linked lists list1 and list2. Merge them into a single sorted list by splicing the nodes of the first two lists. Return the head of the merged list." },
  { title: "FizzBuzz", description: "Print numbers from 1 to n. For multiples of 3 print 'Fizz', for multiples of 5 print 'Buzz', for multiples of both print 'FizzBuzz'. Return the result as an array of strings." },
  { title: "Palindrome Check", description: "Given a string s, return true if it reads the same backwards as forwards considering only alphanumeric characters and ignoring case." },
  { title: "First Non-Repeating Character", description: "Given a string s, return the index of the first non-repeating character. If it does not exist, return -1." },
  { title: "Binary Tree Level Order Traversal", description: "Given the root of a binary tree, return the level order traversal of its nodes' values (i.e., from left to right, level by level)." },
  { title: "Climbing Stairs", description: "You are climbing a staircase. It takes n steps to reach the top. Each time you can climb either 1 or 2 steps. In how many distinct ways can you climb to the top?" },
];

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
  {
    name: "DSA + Coding Round",
    subject: "Computer Science",
    description: "Two-phase: DSA MCQs then live coding problems with in-browser workspace & compiler. Launches in the secured coding-exam page.",
    durationMinutes: 30,
    kind: "coding",
    questions: [
      { id: "q1", text: "Time complexity of binary search?", options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"], correct: 1, marks: 2 },
      { id: "q2", text: "Stack follows which order?", options: ["FIFO", "LIFO", "Random", "Priority"], correct: 1, marks: 2 },
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

  useRealtimeTables(
    ["paper_submissions", "paper_registrations", "trishield_watch_sessions"],
    [["paper-submissions", user?.id], ["trishield-live-by-paper"]],
  );

  const { data: subs, isLoading } = useQuery({
    queryKey: ["paper-submissions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("paper_submissions")
        .select("id, institute_id, title, subject, description, exam_date, start_time, duration_minutes, total_marks, passing_marks, teacher_name, submitter_photo_url, status, edit_request_note, admin_note, published_exam_id, created_at, updated_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  // Live TriShield session map: paper_submission_id -> all_parties_present (used to gate "Request edit").
  // Server-side trigger also blocks the update, but we hide the button so users don't see a failure path.
  const { data: liveSessions } = useQuery({
    queryKey: ["trishield-live-by-paper"],
    queryFn: async () => {
      const { data } = await supabase
        .from("trishield_watch_sessions" as any)
        .select("paper_submission_id, all_parties_present, status")
        .eq("status", "active");
      const map = new Map<string, boolean>();
      ((data ?? []) as any[]).forEach((s) => {
        if (s.paper_submission_id) map.set(s.paper_submission_id, Boolean(s.all_parties_present));
      });
      return map;
    },
    refetchInterval: 5_000,
  });
  const allPartiesFor = (id: string) => liveSessions?.get(id) === true;

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
      const path = `${user!.id}/edit-requests/${Date.now()}.jpg`;
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
    void logActivity("paper_edit_request", { paper_id: editRequestFor.id, title: editRequestFor.title }, "paper_submissions", editRequestFor.id);
    setEditRequestFor(null); setEditNote(""); setEditPhoto("");
    qc.invalidateQueries({ queryKey: ["paper-submissions"] });
  }

  const runPublishPaper = useServerFn(publishPaperAsExam);
  async function publish(sub: any) {
    try {
      const result = await runPublishPaper({ data: { paperSubmissionId: sub.id } });
      toast.success(`📢 Broadcast sent — ${result.candidateCount} candidates notified · ${result.centerName}`);
      qc.invalidateQueries({ queryKey: ["paper-submissions"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Broadcast failed");
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
    <TooltipProvider>
    <div className="container mx-auto py-6 sm:py-8 px-4 animate-fade-up space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-accent uppercase tracking-wider mb-1">
            <Building2 className="h-3.5 w-3.5" /> Institute workspace
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight break-words">Paper Builder & Schedule Lock</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create papers, lock the schedule with teacher authentication, and publish exams to candidates.
          </p>
        </div>
        <div className="flex w-full max-w-full flex-col items-stretch gap-2 sm:w-auto sm:max-w-[260px] sm:items-end md:max-w-[280px]">
          <div className="w-full"><ActivityReportButton role="institute" /></div>
          <Button onClick={() => { setEditing({ blank: true }); setTab("editor"); }} size="lg" className="shadow-elegant w-full">
            <Plus className="mr-2 h-4 w-4" /> New Paper
          </Button>
        </div>
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
                    allPartiesFor(s.id) ? (
                      <Button size="sm" variant="outline" onClick={() => setEditRequestFor(s)}>
                        <AlertCircle className="h-4 w-4 mr-1" /> Request edit
                      </Button>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button size="sm" variant="outline" disabled>
                              <AlertCircle className="h-4 w-4 mr-1" /> Request edit
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          Institute, admin and superadmin must all be live on TriShield before requesting an edit.
                        </TooltipContent>
                      </Tooltip>
                    )
                  )}
                  <Button size="sm" variant="ghost" onClick={() => remove(s.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="templates" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((t) => (
            <Card key={t.name} className="p-5 hover:shadow-elegant transition flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-2">
                {t.kind === "coding" ? <Code2 className="h-6 w-6 text-accent" /> : <Library className="h-6 w-6 text-accent" />}
                {t.kind === "coding" && <Badge variant="secondary" className="text-[10px]">Coding</Badge>}
              </div>
              <h3 className="font-bold">{t.name}</h3>
              <p className="text-xs text-muted-foreground mt-1 flex-1">{t.description}</p>
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
    </TooltipProvider>
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

  const isCodingPaper = tpl?.kind === "coding" || /\b(dsa|coding)\b/i.test(`${title} ${subject}`);

  function addQ() {
    if (isCodingPaper) {
      // Generate a random pre-made DSA MCQ from the bank, avoiding duplicates already added
      const used = new Set(questions.map((q) => q.text));
      const pool = DSA_MCQ_BANK.filter((q) => !used.has(q.text));
      const pick = (pool.length ? pool : DSA_MCQ_BANK)[Math.floor(Math.random() * (pool.length || DSA_MCQ_BANK.length))];
      setQuestions([...questions, { id: crypto.randomUUID(), ...pick }]);
      return;
    }
    setQuestions([...questions, { id: crypto.randomUUID(), text: "", options: ["", "", "", ""], correct: 0, marks: 4 }]);
  }
  function addCodingQ() {
    // Coding problems are generated WITHOUT explicit answers — institute reviews/edits before lock
    const used = new Set(questions.map((q) => q.text));
    const pool = CODING_PROBLEM_BANK.filter((p) => !used.has(p.description));
    const p = (pool.length ? pool : CODING_PROBLEM_BANK)[Math.floor(Math.random() * (pool.length || CODING_PROBLEM_BANK.length))];
    setQuestions([
      ...questions,
      {
        id: crypto.randomUUID(),
        text: `[CODING] ${p.title}\n\n${p.description}`,
        options: ["Sample input #1", "Expected output #1", "Sample input #2", "Expected output #2"],
        correct: 0,
        marks: 10,
      },
    ]);
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
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h3 className="font-bold">Questions ({questions.length}){isCodingPaper && <span className="ml-2 text-xs font-normal text-accent">DSA + Coding</span>}</h3>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={addQ}>
              <Plus className="h-4 w-4 mr-1" />{isCodingPaper ? "Add DSA question" : "Add question"}
            </Button>
            {isCodingPaper && (
              <Button size="sm" variant="outline" onClick={addCodingQ} className="border-accent text-accent hover:bg-accent/10">
                <Code2 className="h-4 w-4 mr-1" />Add coding question
              </Button>
            )}
          </div>
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
  const streamRef = useRef<MediaStream | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [passkey, setPasskey] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const startCam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 360, facingMode: "user" } });
      streamRef.current = stream;
      setStreaming(true);
    } catch { toast.error("Camera permission denied"); }
  }, []);

  // Auto-start camera when the dialog opens, and re-attach the stream whenever the <video> mounts.
  useEffect(() => { void startCam(); return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; }; }, [startCam]);
  useEffect(() => {
    const v = videoRef.current;
    if (v && streamRef.current && v.srcObject !== streamRef.current) {
      v.srcObject = streamRef.current;
      void v.play().catch(() => {});
    }
  });

  function snap() {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current, c = canvasRef.current;
    c.width = v.videoWidth || 480; c.height = v.videoHeight || 360;
    c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
    setPhoto(c.toDataURL("image/jpeg", 0.85));
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStreaming(false);
  }
  async function retake() { setPhoto(null); await startCam(); }

  async function commit() {
    if (!photo) return toast.error("Capture submitter photo");
    if (passkey.length < 6) return toast.error("Passkey must be 6+ chars");
    if (passkey !== confirm) return toast.error("Passkey mismatch");
    const { data: u } = await supabase.auth.getUser();
    const uid = u?.user?.id;
    if (!uid) return toast.error("Sign-in expired — please re-login");
    setBusy(true);
    try {
      const blob = await (await fetch(photo)).blob();
      // RLS on storage requires the first path segment to equal auth.uid()
      const path = `${uid}/submitters/${Date.now()}-${crypto.randomUUID()}.jpg`;
      const up = await supabase.storage.from("face-photos").upload(path, blob, { contentType: "image/jpeg" });
      if (up.error) throw up.error;
      const { data: urlData } = await supabase.storage.from("face-photos").createSignedUrl(path, 60 * 60 * 24 * 365);
      const photoUrl = urlData?.signedUrl ?? path;
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
