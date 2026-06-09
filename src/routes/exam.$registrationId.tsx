import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ParikshaLogo } from "@/components/pariksha-logo";
import { Loader2, ShieldCheck, Camera, Maximize, AlertTriangle, Bookmark, ChevronLeft, ChevronRight, Save, Eye } from "lucide-react";
import { toast } from "sonner";
import { submitExam } from "@/lib/exam/submit.functions";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export const Route = createFileRoute("/exam/$registrationId")({
  head: () => ({ meta: [{ title: "Exam in Progress — Pariksha" }] }),
  component: ExamPage,
});

interface Q { id: string; question_text_encrypted: string; option_a_encrypted: string; option_b_encrypted: string; option_c_encrypted: string; option_d_encrypted: string; correct_answer_encrypted?: string; marks: number; question_order: number; category: string | null; }

const MODEL_URL = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights";
let faceModelsLoaded = false;
async function loadFaceApi() {
  const faceapi = await import("face-api.js");
  if (!faceModelsLoaded) {
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    faceModelsLoaded = true;
  }
  return faceapi;
}

const DEMO_REG_ID = "88888888-8888-8888-8888-888888888888";

function buildDemoQuestions(): Q[] {
  const bank: Array<Omit<Q, "id" | "question_order">> = [
    { question_text_encrypted: "Which planet is known as the Red Planet?", option_a_encrypted: "Venus", option_b_encrypted: "Mars", option_c_encrypted: "Jupiter", option_d_encrypted: "Saturn", correct_answer_encrypted: "B", marks: 2, category: "General Knowledge" },
    { question_text_encrypted: "What is the capital of Australia?", option_a_encrypted: "Sydney", option_b_encrypted: "Melbourne", option_c_encrypted: "Canberra", option_d_encrypted: "Perth", correct_answer_encrypted: "C", marks: 2, category: "General Knowledge" },
    { question_text_encrypted: "Who wrote the play 'Hamlet'?", option_a_encrypted: "Charles Dickens", option_b_encrypted: "Mark Twain", option_c_encrypted: "William Shakespeare", option_d_encrypted: "Leo Tolstoy", correct_answer_encrypted: "C", marks: 2, category: "General Knowledge" },
    { question_text_encrypted: "12 × 11 = ?", option_a_encrypted: "121", option_b_encrypted: "132", option_c_encrypted: "144", option_d_encrypted: "133", correct_answer_encrypted: "B", marks: 2, category: "Quantitative" },
    { question_text_encrypted: "Solve: 15% of 200", option_a_encrypted: "25", option_b_encrypted: "30", option_c_encrypted: "35", option_d_encrypted: "40", correct_answer_encrypted: "B", marks: 2, category: "Quantitative" },
    { question_text_encrypted: "Square root of 169 is", option_a_encrypted: "11", option_b_encrypted: "12", option_c_encrypted: "13", option_d_encrypted: "14", correct_answer_encrypted: "C", marks: 2, category: "Quantitative" },
    { question_text_encrypted: "Choose the synonym of 'Diligent'", option_a_encrypted: "Lazy", option_b_encrypted: "Hardworking", option_c_encrypted: "Quick", option_d_encrypted: "Slow", correct_answer_encrypted: "B", marks: 2, category: "English" },
    { question_text_encrypted: "Antonym of 'Ancient' is", option_a_encrypted: "Old", option_b_encrypted: "Modern", option_c_encrypted: "Historic", option_d_encrypted: "Worn", correct_answer_encrypted: "B", marks: 2, category: "English" },
    { question_text_encrypted: "Which gas do plants absorb for photosynthesis?", option_a_encrypted: "Oxygen", option_b_encrypted: "Nitrogen", option_c_encrypted: "Carbon Dioxide", option_d_encrypted: "Helium", correct_answer_encrypted: "C", marks: 2, category: "Science" },
    { question_text_encrypted: "Water boils at how many °C at sea level?", option_a_encrypted: "90", option_b_encrypted: "100", option_c_encrypted: "110", option_d_encrypted: "120", correct_answer_encrypted: "B", marks: 2, category: "Science" },
  ];
  // shuffle
  const shuffled = [...bank].sort(() => Math.random() - 0.5);
  return shuffled.map((q, i) => ({ ...q, id: `demo-q-${i}`, question_order: i }));
}

function ExamPage() {
  const { registrationId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const submitFn = useServerFn(submitExam);
  const isDemo = registrationId === DEMO_REG_ID;

  // Phases: gate -> terms -> exam -> submitting
  const [phase, setPhase] = useState<"gate" | "terms" | "exam" | "submitting">("gate");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [autoSubmitReason, setAutoSubmitReason] = useState<string | null>(null);

  // Camera proctoring
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camReady, setCamReady] = useState(false);
  const noFaceStreakRef = useRef(0);

  // Load registration + exam + questions (or generate demo)
  const { data: regData, isLoading } = useQuery({
    queryKey: ["exam-reg", registrationId],
    queryFn: async () => {
      if (isDemo) {
        return {
          reg: { id: DEMO_REG_ID, exam_id: "demo", exams: { id: "demo", title: "Pariksha Demo Exam", duration_minutes: 10, total_marks: 20, passing_marks: 8 } } as any,
          qs: buildDemoQuestions(),
        };
      }
      const { data: reg } = await supabase.from("registrations").select("*, exams(*)").eq("id", registrationId).single();
      const { data: qs } = await supabase.from("questions").select("id, exam_id, question_text_encrypted, option_a_encrypted, option_b_encrypted, option_c_encrypted, option_d_encrypted, marks, question_order, category").eq("exam_id", reg!.exam_id).order("question_order");
      const realQs = (qs ?? []) as Q[];
      // Fallback: if the exam has no questions (open/demo exams), serve random demo questions
      return { reg, qs: realQs.length ? realQs : buildDemoQuestions() };
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

  // Timer (use null sentinel so the auto-submit effect doesn't fire before
  // the initial duration is applied — otherwise demo/exam submits instantly)
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  useEffect(() => {
    if (phase !== "exam" || !exam) return;
    setTimeLeft(exam.duration_minutes * 60);
    const t = setInterval(() => setTimeLeft((p) => (p == null ? p : Math.max(0, p - 1))), 1000);
    return () => clearInterval(t);
  }, [phase, exam]);

  // Integrity event logger
  type IntegrityEventType =
    | "tab_switch" | "copy_attempt" | "fullscreen_exit" | "face_mismatch"
    | "multiple_faces" | "no_face" | "network_anomaly" | "rapid_answer" | "suspicious_pattern";
  const logEvent = useCallback(async (
    event_type: IntegrityEventType,
    severity: "low" | "medium" | "high" | "critical",
    details: Record<string, unknown> = {},
  ) => {
    if (!sessionId || isDemo) return;
    await supabase.from("integrity_events").insert({ session_id: sessionId, event_type, severity, details: details as never });
  }, [sessionId, isDemo]);

  // ---- Final submit (declared early so anti-cheat effects can reference) ----
  const saveAnswer = useCallback(async (qid: string, selected: string | null, marked: boolean) => {
    if (!sessionId || isDemo) return;
    await supabase.from("answers").upsert({ session_id: sessionId, question_id: qid, selected_option: selected, marked_for_review: marked }, { onConflict: "session_id,question_id" });
  }, [sessionId, isDemo]);

  const handleFinalSubmit = useCallback(async (reason?: string) => {
    if (!sessionId && !isDemo) return;
    if (reason) setAutoSubmitReason(reason);
    setPhase("submitting");
    try {
      if (isDemo) {
        // Local scoring for demo
        let total = 0;
        let totalMarks = 0;
        for (const dq of questions) {
          totalMarks += dq.marks;
          const sel = answers[dq.id]?.selected;
          if (sel && dq.correct_answer_encrypted && sel === dq.correct_answer_encrypted) total += dq.marks;
        }
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
        toast.success(`Demo complete — ${total}/${totalMarks} marks${reason ? ` (${reason})` : ""}`);
        navigate({ to: "/" });
        return;
      }
      await Promise.all(Object.entries(answers).map(([qid, a]) => saveAnswer(qid, a.selected, a.marked)));
      const res = await submitFn({ data: { sessionId: sessionId! } });
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
      toast.success(`Submitted — ${res.total} marks${reason ? ` (${reason})` : ""}`);
      navigate({ to: "/candidate/results" });
    } catch (e: any) {
      toast.error(e.message ?? "Submit failed");
      setPhase("exam");
    }
  }, [sessionId, isDemo, answers, questions, saveAnswer, submitFn, navigate]);

  // Auto-submit on time-up (only after timer initialized — null means not started yet)
  useEffect(() => {
    if (phase === "exam" && timeLeft === 0 && exam) {
      void handleFinalSubmit("time up");
    }
  }, [timeLeft, phase, exam, handleFinalSubmit]);

  // Auto-save
  useEffect(() => {
    if (phase !== "exam") return;
    const t = setInterval(() => {
      const entries = Object.entries(answers);
      if (!entries.length) return;
      entries.forEach(([qid, a]) => saveAnswer(qid, a.selected, a.marked));
    }, 30000);
    return () => clearInterval(t);
  }, [answers, phase, saveAnswer]);

  // ---- ANTI-CHEAT: hard. ANY fullscreen exit, tab switch, or backgrounding
  // → warn + immediate auto-submit. ----
  useEffect(() => {
    if (phase !== "exam") return;
    // Grace period: entering fullscreen + dialog teardown can fire a transient
    // window blur / visibilitychange. Ignore those for the first 2s so the
    // candidate actually sees the exam paper instead of being instantly submitted.
    const startedAt = Date.now();
    const GRACE_MS = 2000;
    const isGrace = () => Date.now() - startedAt < GRACE_MS;

    const triggerHardSubmit = (reason: string) => {
      if (isGrace()) return;
      toast.error(`Exam terminated: ${reason}. Submitting now.`);
      void logEvent(reason.includes("tab") ? "tab_switch" : "fullscreen_exit", "critical", { reason });
      void handleFinalSubmit(reason);
    };
    const onVis = () => { if (document.hidden) triggerHardSubmit("tab/app switched"); };
    const onBlur = () => {
      // Some browsers fire blur transiently when fullscreen activates; double-check focus on next tick.
      setTimeout(() => { if (!document.hasFocus()) triggerHardSubmit("window lost focus"); }, 300);
    };
    const onFs = () => { if (!document.fullscreenElement) triggerHardSubmit("fullscreen exited"); };
    const onCopy = (e: ClipboardEvent) => { e.preventDefault(); void logEvent("copy_attempt", "high"); toast.error("Copy disabled"); };
    const onCtx = (e: MouseEvent) => e.preventDefault();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F12" || (e.ctrlKey && e.shiftKey && ["I","J","C"].includes(e.key))) {
        e.preventDefault();
        void logEvent("suspicious_pattern", "high", { reason: "devtools_attempt" });
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
  }, [phase, logEvent, handleFinalSubmit]);

  // ---- CAMERA: open on terms acceptance, keep live through entire exam ----
  const ensureCamera = useCallback(async () => {
    if (streamRef.current) return true;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, facingMode: "user" }, audio: false });
      streamRef.current = s;
      setCamReady(true);
      return true;
    } catch {
      toast.error("Camera access is mandatory to take the exam.");
      return false;
    }
  }, []);

  // attach stream to <video> whenever it mounts
  useEffect(() => {
    const v = videoRef.current;
    if (v && streamRef.current && v.srcObject !== streamRef.current) {
      v.srcObject = streamRef.current;
      void v.play().catch(() => {});
    }
  });

  // AI integrity check every 6s — uses face-api.js TinyFaceDetector
  useEffect(() => {
    if (phase !== "exam" || !camReady) return;
    let cancelled = false;
    let timer: number | null = null;
    (async () => {
      try {
        const faceapi = await loadFaceApi();
        const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
        const tick = async () => {
          if (cancelled) return;
          const v = videoRef.current;
          if (v && v.readyState >= 2) {
            const dets = await faceapi.detectAllFaces(v, opts);
            if (dets.length === 0) {
              noFaceStreakRef.current += 1;
              if (noFaceStreakRef.current === 2) {
                toast.warning("Face not visible — stay in frame");
                void logEvent("no_face", "medium");
              }
              if (noFaceStreakRef.current >= 4) {
                void handleFinalSubmit("candidate left the camera frame");
                return;
              }
            } else if (dets.length > 1) {
              toast.error("Multiple faces detected — exam will end");
              void logEvent("multiple_faces", "critical", { count: dets.length });
              void handleFinalSubmit("multiple faces detected");
              return;
            } else {
              noFaceStreakRef.current = 0;
            }
          }
          timer = window.setTimeout(tick, 6000);
        };
        void tick();
      } catch {
        /* face-api failed to load — skip AI but keep camera + DOM anti-cheat */
      }
    })();
    return () => { cancelled = true; if (timer) window.clearTimeout(timer); };
  }, [phase, camReady, logEvent, handleFinalSubmit]);

  // Stop camera on unmount
  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; }, []);

  // Start: from gate -> terms (also asks for camera)
  const goToTerms = async () => {
    const ok = await ensureCamera();
    if (!ok) return;
    setPhase("terms");
  };

  // Accept terms -> request fullscreen (best-effort) + create session -> exam
  const acceptAndStart = async () => {
    if (!termsAccepted) { toast.error("Please accept the terms first."); return; }
    // Fullscreen is best-effort: some embedded contexts (preview iframes) block it.
    // We still enforce anti-cheat via focus/visibility events below.
    try {
      const el: any = document.documentElement;
      const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
      if (req) await req.call(el).catch(() => {});
      if (!document.fullscreenElement) {
        toast.warning("Could not enter fullscreen — exam will continue but please avoid switching apps/tabs.");
      }
    } catch {
      toast.warning("Fullscreen unavailable in this view — exam will continue.");
    }
    if (isDemo) {
      setSessionId("demo-session");
      setPhase("exam");
      return;
    }
    const { data: sess, error } = await supabase.from("exam_sessions").insert({ registration_id: registrationId }).select().single();
    if (error || !sess) { toast.error("Could not start session"); return; }
    setSessionId(sess.id);
    setPhase("exam");
  };

  // -------- RENDER --------
  if (isLoading || !exam) {
    return <div className="min-h-dvh flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (phase === "gate") {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
        <Card className="max-w-2xl w-full p-6 md:p-8 shadow-elegant">
          <div className="flex items-center gap-3 mb-6">
            <ParikshaLogo className="h-12 w-12" />
            <div>
              <h1 className="text-xl md:text-2xl font-bold">{exam.title}</h1>
              <p className="text-sm text-muted-foreground">{exam.duration_minutes} min · {exam.total_marks} marks · {questions.length} questions</p>
            </div>
          </div>
          <div className="space-y-3 text-sm mb-6">
            <div className="flex items-start gap-2"><Camera className="h-4 w-4 mt-0.5 text-accent" /><span>Your camera must stay on for the full duration — AI proctoring is active.</span></div>
            <div className="flex items-start gap-2"><Maximize className="h-4 w-4 mt-0.5 text-accent" /><span>Fullscreen is mandatory. Leaving fullscreen will <b>immediately auto-submit</b> your exam.</span></div>
            <div className="flex items-start gap-2"><AlertTriangle className="h-4 w-4 mt-0.5 text-accent" /><span>Switching tabs, opening another app on mobile, or background activity will <b>auto-submit instantly</b>.</span></div>
          </div>
          <Button onClick={goToTerms} size="lg" className="w-full bg-accent hover:bg-accent/90">
            <Camera className="mr-2 h-5 w-5" /> Enable Camera & Continue
          </Button>
        </Card>
      </div>
    );
  }

  if (phase === "terms") {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
        <Card className="max-w-3xl w-full p-6 md:p-8 shadow-elegant">
          <div className="flex items-center gap-3 mb-4">
            <ShieldCheck className="h-8 w-8 text-accent" />
            <h2 className="text-xl md:text-2xl font-bold">Terms & Conditions</h2>
          </div>

          <div className="grid md:grid-cols-[1fr_220px] gap-4 mb-4">
            <div className="text-sm space-y-2 max-h-[45vh] overflow-y-auto pr-2 leading-relaxed text-muted-foreground">
              <p><b className="text-foreground">1. Identity & camera:</b> Your webcam will remain on for the entire exam. AI will continuously verify that you are alone and in frame. Multiple faces or leaving the frame ends your exam.</p>
              <p><b className="text-foreground">2. Fullscreen:</b> The exam runs in fullscreen mode. Exiting fullscreen, minimising the window, switching tabs, opening another app on mobile, or losing focus will instantly auto-submit your exam.</p>
              <p><b className="text-foreground">3. Fair use:</b> No copy/paste, right-click, devtools, screenshots, screen sharing, or any external help. Communication devices (phone, smartwatch, headphones) must be removed.</p>
              <p><b className="text-foreground">4. Network:</b> Stay on a stable connection. Your answers auto-save every 30 seconds.</p>
              <p><b className="text-foreground">5. Submission:</b> When time ends, the exam submits automatically. Result is sent to your registered email along with your answer copy.</p>
              <p><b className="text-foreground">6. Integrity:</b> All proctoring events are recorded and shared with your institute. Any violation will be reviewed by the institute and may invalidate your result.</p>
            </div>
            <div className="rounded-lg overflow-hidden border border-border bg-foreground/5 aspect-[4/3] relative">
              <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
              <div className="absolute bottom-1 left-1 right-1 text-[10px] text-center bg-background/80 rounded px-1 py-0.5">Camera preview · live</div>
            </div>
          </div>

          <label className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 cursor-pointer">
            <Checkbox checked={termsAccepted} onCheckedChange={(v) => setTermsAccepted(!!v)} className="mt-0.5" />
            <span className="text-sm">I have read and accept all the rules above. I understand that any violation will <b>immediately auto-submit</b> my exam and the result will be shared with my institute.</span>
          </label>

          <Button onClick={acceptAndStart} size="lg" className="w-full mt-4 bg-accent hover:bg-accent/90" disabled={!termsAccepted}>
            <Maximize className="mr-2 h-5 w-5" /> Accept · Enter Fullscreen & Start Exam
          </Button>
        </Card>
      </div>
    );
  }

  if (phase === "submitting") {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="mt-4 text-muted-foreground">Evaluating your answers…</p>
          {autoSubmitReason && <p className="mt-2 text-xs text-destructive">Reason: {autoSubmitReason}</p>}
        </div>
      </div>
    );
  }

  // EXAM
  const total = questions.length;
  const answered = Object.values(answers).filter((a) => a.selected).length;
  const marked = Object.values(answers).filter((a) => a.marked).length;
  const unanswered = total - answered;
  const tl = timeLeft ?? 0;
  const mins = Math.floor(tl / 60);
  const secs = tl % 60;
  const timerColor = tl < 300 ? "text-destructive animate-pulse" : tl < 600 ? "text-warning" : "text-foreground";

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
      <header className="bg-background border-b border-border px-3 md:px-4 py-2.5 md:py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm gap-2">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <ParikshaLogo className="h-7 w-7 md:h-8 md:w-8 shrink-0" />
          <div className="min-w-0">
            <div className="font-bold text-xs md:text-sm truncate">{exam.title}</div>
            <div className="text-[10px] md:text-xs text-muted-foreground truncate">{user?.email ?? "Candidate"} · {activeSection}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <div className="hidden sm:flex items-center gap-1 text-xs text-success"><Eye className="h-3.5 w-3.5" /> AI proctored</div>
          <div className={`font-mono text-lg md:text-2xl font-bold tabular-nums ${timerColor}`}>{String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}</div>
          <Button onClick={() => setConfirmSubmit(true)} variant="destructive" size="sm" className="md:h-10">Submit</Button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-[30%_70%] gap-3 md:gap-4 p-3 md:p-4 max-w-[1600px] mx-auto w-full">
        <aside className="space-y-3 md:space-y-4 order-2 md:order-1">
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
            <div className="grid grid-cols-6 sm:grid-cols-5 gap-1.5">
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

        <main className="order-1 md:order-2">
          {q && (
            <Card key={q.id} className="p-4 md:p-8 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs md:text-sm text-muted-foreground">Question <span className="font-bold text-foreground">{current + 1}</span> of {sectionQuestions.length}</div>
                <div className="flex gap-2 text-xs">
                  <span className="rounded bg-success/10 text-success px-2 py-1 font-semibold">+{q.marks}</span>
                  <span className="rounded bg-destructive/10 text-destructive px-2 py-1 font-semibold">−1</span>
                </div>
              </div>
              <p className="text-base md:text-lg leading-relaxed mb-6">{q.question_text_encrypted}</p>
              <div className="space-y-2">
                {opts.map(([key, text]) => {
                  const sel = answers[q.id]?.selected === key;
                  return (
                    <button key={key} onClick={() => setAnswer(key)}
                      className={`w-full text-left rounded-lg border-2 p-3 md:p-4 transition flex items-start gap-3 ${sel ? "border-accent bg-accent/5" : "border-border hover:border-accent/40 hover:bg-muted/50"}`}>
                      <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-bold text-sm ${sel ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>{key}</span>
                      <span className="text-sm pt-0.5">{text}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-6 pt-6 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button variant="outline" size="sm" onClick={toggleMark}>
                  <Bookmark className={`h-4 w-4 mr-1 ${answers[q.id]?.marked ? "fill-warning text-warning" : ""}`} /> Mark
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setAnswer(null)}>Clear</Button>
                <div className="ml-auto">
                  <Button size="sm" onClick={() => { saveAnswer(q.id, answers[q.id]?.selected ?? null, answers[q.id]?.marked ?? false); setCurrent((c) => Math.min(sectionQuestions.length - 1, c + 1)); }}>
                    <Save className="h-4 w-4 mr-1" /> Save & Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </main>
      </div>

      {/* Persistent live camera preview (proctor watching) */}
      <div className="fixed bottom-3 right-3 z-30 w-32 sm:w-40 rounded-lg overflow-hidden border-2 border-accent shadow-elegant bg-foreground/10">
        <video ref={videoRef} muted playsInline className="w-full aspect-[4/3] object-cover" />
        <div className="text-[10px] text-center bg-background/90 px-1 py-0.5 flex items-center justify-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" /> AI Proctor
        </div>
      </div>

      <div className="sr-only" role="status" aria-live="polite">{`${answered} of ${total} answered`}</div>

      <Dialog open={confirmSubmit} onOpenChange={setConfirmSubmit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit exam?</DialogTitle>
            <DialogDescription>You won't be able to make further changes.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-[120px_1fr] gap-4 items-center my-4">
            <div className="h-[120px] w-[120px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Answered", value: answered, fill: "hsl(var(--success))" },
                      { name: "Marked", value: marked, fill: "hsl(var(--warning))" },
                      { name: "Unanswered", value: Math.max(0, unanswered - marked), fill: "hsl(var(--muted))" },
                    ]}
                    dataKey="value" cx="50%" cy="50%" innerRadius={36} outerRadius={54}
                    paddingAngle={2} stroke="none" isAnimationActive animationDuration={600}
                  >
                    {[0,1,2].map((i) => <Cell key={i} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-xl font-bold tabular-nums">{Math.round((answered / Math.max(1,total)) * 100)}%</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">complete</div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-success" />Answered</span><span className="font-bold tabular-nums">{answered}</span></div>
              <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-warning" />Marked</span><span className="font-bold tabular-nums">{marked}</span></div>
              <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />Unanswered</span><span className="font-bold tabular-nums">{unanswered}</span></div>
              <div className="flex items-center justify-between gap-2 pt-2 border-t"><span className="text-muted-foreground">Total</span><span className="font-bold tabular-nums">{total}</span></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmSubmit(false)}>Continue</Button>
            <Button variant="destructive" onClick={() => { setConfirmSubmit(false); void handleFinalSubmit(); }}>Submit Now</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
