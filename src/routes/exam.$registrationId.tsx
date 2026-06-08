import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ParikshaLogo } from "@/components/pariksha-logo";
import { Loader2, ShieldCheck, Camera, Maximize, AlertTriangle, Bookmark, ChevronLeft, ChevronRight, Save, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { submitExam } from "@/lib/exam/submit.functions";

export const Route = createFileRoute("/exam/$registrationId")({
  head: () => ({ meta: [{ title: "Exam in Progress — Pariksha" }] }),
  component: ExamPage,
});

const DEMO = import.meta.env.VITE_DEMO_MODE === "true";

interface Q { id: string; question_text_encrypted: string; option_a_encrypted: string; option_b_encrypted: string; option_c_encrypted: string; option_d_encrypted: string; marks: number; question_order: number; category: string | null; }

function ExamPage() {
  const { registrationId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const submitFn = useServerFn(submitExam);

  // Phases: gate -> face -> exam -> submitting -> done
  const [phase, setPhase] = useState<"gate" | "face" | "exam" | "submitting">("gate");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [fsExits, setFsExits] = useState(0);
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  // Load registration + exam + questions
  const { data: regData, isLoading } = useQuery({
    queryKey: ["exam-reg", registrationId],
    queryFn: async () => {
      const { data: reg } = await supabase.from("registrations").select("*, exams(*)").eq("id", registrationId).single();
      const { data: qs } = await supabase.from("questions").select("*").eq("exam_id", reg!.exam_id).order("question_order");
      return { reg, qs: (qs ?? []) as Q[] };
    },
  });

  const questions = regData?.qs ?? [];
  const exam = regData?.reg?.exams;

  // Answers state
  const [answers, setAnswers] = useState<Record<string, { selected: string | null; marked: boolean }>>({});
  const [current, setCurrent] = useState(0);
  const [activeSection, setActiveSection] = useState<string>("");

  const sections = useMemo(() => {
    const s = new Set<string>();
    questions.forEach((q) => s.add(q.category ?? "General"));
    return Array.from(s);
  }, [questions]);

  useEffect(() => {
    if (sections.length && !activeSection) setActiveSection(sections[0]);
  }, [sections, activeSection]);

  const sectionQuestions = useMemo(() => questions.filter((q) => (q.category ?? "General") === activeSection), [questions, activeSection]);
  const q = sectionQuestions[current];

  // Timer
  const [timeLeft, setTimeLeft] = useState<number>(0);
  useEffect(() => {
    if (phase !== "exam" || !exam) return;
    setTimeLeft(exam.duration_minutes * 60);
    const t = setInterval(() => setTimeLeft((p) => Math.max(0, p - 1)), 1000);
    return () => clearInterval(t);
  }, [phase, exam]);

  // Auto-submit on time-up
  useEffect(() => {
    if (phase === "exam" && timeLeft === 0 && exam) {
      handleFinalSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase]);

  // Anti-cheat
  const logEvent = useCallback(async (event_type: string, severity: "low" | "medium" | "high" | "critical", details: object = {}) => {
    if (!sessionId) return;
    await supabase.from("integrity_events").insert({ session_id: sessionId, event_type, severity, details });
  }, [sessionId]);

  useEffect(() => {
    if (phase !== "exam") return;
    const onVis = () => { if (document.hidden) { logEvent("tab_switch", "medium"); toast.warning("Tab switch detected — logged."); } };
    const onBlur = () => { logEvent("window_blur", "medium"); };
    const onCopy = (e: ClipboardEvent) => { e.preventDefault(); logEvent("copy_attempt", "high"); toast.error("Copy disabled during exam"); };
    const onCtx = (e: MouseEvent) => e.preventDefault();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F12" || (e.ctrlKey && e.shiftKey && ["I","J","C"].includes(e.key))) {
        e.preventDefault();
        logEvent("devtools_attempt", "high");
      }
    };
    const onFs = () => {
      if (!document.fullscreenElement) {
        setFsExits((n) => {
          const next = n + 1;
          logEvent("fullscreen_exit", next >= 3 ? "critical" : "high", { count: next });
          if (next >= 3) { toast.error("Exam auto-submitted (3 fullscreen exits)"); handleFinalSubmit(); }
          else toast.warning(`Fullscreen exit ${next}/3 — return now`);
          return next;
        });
      }
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCopy);
    document.addEventListener("contextmenu", onCtx);
    document.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCopy);
      document.removeEventListener("contextmenu", onCtx);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFs);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, sessionId]);

  // Auto-save
  const saveAnswer = useCallback(async (qid: string, selected: string | null, marked: boolean) => {
    if (!sessionId) return;
    await supabase.from("answers").upsert({ session_id: sessionId, question_id: qid, selected_option: selected, marked_for_review: marked }, { onConflict: "session_id,question_id" });
  }, [sessionId]);

  useEffect(() => {
    if (phase !== "exam") return;
    const t = setInterval(() => {
      Object.entries(answers).forEach(([qid, a]) => saveAnswer(qid, a.selected, a.marked));
    }, 30000);
    return () => clearInterval(t);
  }, [answers, phase, saveAnswer]);

  // Start exam: request fullscreen + create session
  const startExam = async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      toast.error("Fullscreen is required to proceed.");
      return;
    }
    const { data: sess, error } = await supabase.from("exam_sessions").insert({ registration_id: registrationId }).select().single();
    if (error || !sess) { toast.error("Could not start session"); return; }
    setSessionId(sess.id);
    setPhase("face");
  };

  // Face verify (demo): animate confidence
  useEffect(() => {
    if (phase !== "face") return;
    setConfidence(60);
    const start = Date.now();
    const t = setInterval(() => {
      const elapsed = (Date.now() - start) / 8000;
      const pct = Math.min(94, 60 + Math.round(34 * Math.min(1, elapsed)));
      setConfidence(pct);
      if (elapsed >= 1) {
        clearInterval(t);
        setTimeout(() => setPhase("exam"), 800);
      }
    }, 100);
    return () => clearInterval(t);
  }, [phase]);

  const handleFinalSubmit = async () => {
    if (!sessionId) return;
    setPhase("submitting");
    try {
      await Promise.all(Object.entries(answers).map(([qid, a]) => saveAnswer(qid, a.selected, a.marked)));
      const res = await submitFn({ data: { sessionId } });
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
      toast.success(`Submitted — ${res.total} marks`);
      navigate({ to: "/candidate/results" });
    } catch (e: any) {
      toast.error(e.message ?? "Submit failed");
      setPhase("exam");
    }
  };

  // GATE: pre-exam
  if (isLoading || !exam) {
    return <div className="min-h-dvh flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (phase === "gate") {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
        <Card className="max-w-2xl w-full p-8 shadow-elegant">
          <div className="flex items-center gap-3 mb-6"><ParikshaLogo className="h-12 w-12" /><div><h1 className="text-2xl font-bold">{exam.title}</h1><p className="text-sm text-muted-foreground">{exam.duration_minutes} min · {exam.total_marks} marks · {questions.length} questions</p></div></div>
          <div className="space-y-3 text-sm mb-6">
            <div className="flex items-start gap-2"><Maximize className="h-4 w-4 mt-0.5 text-accent" /><span>Fullscreen mode is mandatory. Exiting more than 2 times will auto-submit your exam.</span></div>
            <div className="flex items-start gap-2"><ShieldCheck className="h-4 w-4 mt-0.5 text-accent" /><span>Live face verification will run before the exam begins.</span></div>
            <div className="flex items-start gap-2"><AlertTriangle className="h-4 w-4 mt-0.5 text-accent" /><span>Tab switching, copy/paste, right-click, and devtools are blocked and logged.</span></div>
          </div>
          <Button onClick={startExam} size="lg" className="w-full bg-accent hover:bg-accent/90">
            <Maximize className="mr-2 h-5 w-5" /> Enter Fullscreen & Begin
          </Button>
        </Card>
      </div>
    );
  }

  if (phase === "face") {
    const granted = confidence >= 94;
    return (
      <div className="min-h-dvh flex items-center justify-center bg-foreground p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <ParikshaLogo className="h-12 w-12 mx-auto mb-4" />
          <h2 className="text-xl font-bold">Identity verification</h2>
          <p className="text-sm text-muted-foreground mb-6">Matching your live face with registration photo…</p>
          <div className="relative mx-auto h-64 w-64 rounded-lg bg-gradient-to-br from-primary/20 to-accent/10 overflow-hidden mb-4">
            <Camera className="absolute inset-0 m-auto h-16 w-16 text-muted-foreground" />
            <div className="absolute inset-6 border-2 border-accent rounded-md animate-pulse" />
          </div>
          <div className="text-3xl font-bold tabular-nums">{confidence}%</div>
          <p className="text-xs text-muted-foreground">Match confidence</p>
          {granted && (
            <div className="mt-4 rounded-lg bg-success/10 text-success p-3 font-bold flex items-center justify-center gap-2 animate-fade-up">
              <CheckCircle2 className="h-5 w-5" /> ACCESS GRANTED
            </div>
          )}
        </Card>
      </div>
    );
  }

  if (phase === "submitting") {
    return <div className="min-h-dvh flex items-center justify-center"><div className="text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /><p className="mt-4 text-muted-foreground">Evaluating your answers…</p></div></div>;
  }

  // EXAM
  const total = questions.length;
  const answered = Object.values(answers).filter((a) => a.selected).length;
  const marked = Object.values(answers).filter((a) => a.marked).length;
  const unanswered = total - answered;
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timerColor = timeLeft < 300 ? "text-destructive animate-pulse" : timeLeft < 600 ? "text-warning" : "text-foreground";

  const setAnswer = (selected: string | null) => {
    if (!q) return;
    setAnswers((p) => ({ ...p, [q.id]: { selected, marked: p[q.id]?.marked ?? false } }));
    saveAnswer(q.id, selected, answers[q.id]?.marked ?? false);
  };
  const toggleMark = () => {
    if (!q) return;
    const next = !(answers[q.id]?.marked ?? false);
    setAnswers((p) => ({ ...p, [q.id]: { selected: p[q.id]?.selected ?? null, marked: next } }));
    saveAnswer(q.id, answers[q.id]?.selected ?? null, next);
  };

  const opts: Array<["A"|"B"|"C"|"D", string]> = q ? [
    ["A", q.option_a_encrypted], ["B", q.option_b_encrypted], ["C", q.option_c_encrypted], ["D", q.option_d_encrypted],
  ] : [];

  return (
    <div className="min-h-dvh flex flex-col bg-secondary/40 select-none">
      {/* Top bar */}
      <header className="bg-background border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <ParikshaLogo className="h-8 w-8" />
          <div>
            <div className="font-bold text-sm">{exam.title}</div>
            <div className="text-xs text-muted-foreground">{user?.email} · Section: {activeSection}</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className={`font-mono text-2xl font-bold tabular-nums ${timerColor}`}>{String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}</div>
          <Button onClick={() => setConfirmSubmit(true)} variant="destructive">Submit Exam</Button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-[30%_70%] gap-4 p-4 max-w-[1600px] mx-auto w-full">
        {/* Sidebar */}
        <aside className="space-y-4">
          {sections.length > 1 && (
            <Card className="p-2">
              <div className="flex gap-1 overflow-x-auto">
                {sections.map((s) => (
                  <button key={s} onClick={() => { setActiveSection(s); setCurrent(0); }}
                    className={`px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap transition ${activeSection === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </Card>
          )}
          <Card className="p-4">
            <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
              <div className="rounded bg-success/10 text-success p-2 font-bold">{answered}<div className="font-normal">Answered</div></div>
              <div className="rounded bg-muted text-muted-foreground p-2 font-bold">{unanswered}<div className="font-normal">Unanswered</div></div>
              <div className="rounded bg-warning/10 text-warning p-2 font-bold">{marked}<div className="font-normal">Marked</div></div>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {sectionQuestions.map((sq, i) => {
                const a = answers[sq.id];
                const isCur = i === current;
                const cls = isCur ? "bg-primary text-primary-foreground"
                  : a?.marked ? "bg-warning/20 text-warning border border-warning"
                  : a?.selected ? "bg-success/15 text-success border border-success/40"
                  : "bg-muted text-muted-foreground hover:bg-muted/70";
                return (
                  <button key={sq.id} onClick={() => setCurrent(i)} className={`h-9 rounded text-xs font-semibold transition ${cls}`}>{i + 1}</button>
                );
              })}
            </div>
          </Card>
        </aside>

        {/* Question */}
        <main>
          {q && (
            <Card className="p-6 md:p-8 animate-fade-up">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-muted-foreground">Question <span className="font-bold text-foreground">{current + 1}</span> of {sectionQuestions.length}</div>
                <div className="flex gap-2 text-xs">
                  <span className="rounded bg-success/10 text-success px-2 py-1 font-semibold">+{q.marks}</span>
                  <span className="rounded bg-destructive/10 text-destructive px-2 py-1 font-semibold">−1</span>
                </div>
              </div>
              <p className="text-lg leading-relaxed mb-6">{q.question_text_encrypted}</p>
              <div className="space-y-2">
                {opts.map(([key, text]) => {
                  const sel = answers[q.id]?.selected === key;
                  return (
                    <button key={key} onClick={() => setAnswer(key)}
                      className={`w-full text-left rounded-lg border-2 p-4 transition flex items-start gap-3 ${sel ? "border-accent bg-accent/5" : "border-border hover:border-accent/40 hover:bg-muted/50"}`}>
                      <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-bold text-sm ${sel ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>{key}</span>
                      <span className="text-sm pt-0.5">{text}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-6 pt-6 border-t border-border">
                <Button variant="outline" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button variant="outline" onClick={toggleMark}>
                  <Bookmark className={`h-4 w-4 mr-1 ${answers[q.id]?.marked ? "fill-warning text-warning" : ""}`} /> Mark for Review
                </Button>
                <Button variant="ghost" onClick={() => setAnswer(null)}>Clear Response</Button>
                <div className="ml-auto">
                  <Button onClick={() => { saveAnswer(q.id, answers[q.id]?.selected ?? null, answers[q.id]?.marked ?? false); setCurrent((c) => Math.min(sectionQuestions.length - 1, c + 1)); toast.success("Saved", { duration: 800 }); }}>
                    <Save className="h-4 w-4 mr-1" /> Save & Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </main>
      </div>

      {/* aria-live announcer */}
      <div className="sr-only" role="status" aria-live="polite">{`${answered} of ${total} answered`}</div>

      <Dialog open={confirmSubmit} onOpenChange={setConfirmSubmit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit exam?</DialogTitle>
            <DialogDescription>You won't be able to make further changes. Review your summary:</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3 text-center my-4">
            <div className="rounded-lg bg-success/10 p-4"><div className="text-2xl font-bold text-success">{answered}</div><div className="text-xs text-muted-foreground">Answered</div></div>
            <div className="rounded-lg bg-muted p-4"><div className="text-2xl font-bold">{unanswered}</div><div className="text-xs text-muted-foreground">Unanswered</div></div>
            <div className="rounded-lg bg-warning/10 p-4"><div className="text-2xl font-bold text-warning">{marked}</div><div className="text-xs text-muted-foreground">Marked</div></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmSubmit(false)}>Continue Exam</Button>
            <Button variant="destructive" onClick={() => { setConfirmSubmit(false); handleFinalSubmit(); }}>Submit Now</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
