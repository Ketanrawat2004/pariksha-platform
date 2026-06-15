import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ExamWatermark } from "@/components/exam/watermark";
import { useAuth } from "@/lib/auth/auth-context";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import {
  ArrowLeft, ArrowRight, Code2, Play, ShieldCheck, Timer, Send,
  CheckCircle2, XCircle, BookOpen, Maximize2, AlertTriangle, Lock,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/coding-exam")({
  head: () => ({ meta: [
    { title: "DSA & Coding Round — Pariksha" },
    { name: "description", content: "Secured DSA + coding examination with built-in workspace and multi-language compiler." },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: SecuredCodingExamRoute,
});

function SecuredCodingExamRoute() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);
  // Hide global accessibility FAB while this secured exam is mounted
  useEffect(() => {
    document.body.setAttribute("data-secured-exam", "true");
    return () => { document.body.removeAttribute("data-secured-exam"); };
  }, []);
  if (loading || !user) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-950 text-slate-300">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  return <CodingExamPage />;
}

// --- DSA MCQs ---
type Mcq = { id: string; q: string; options: string[]; correct: number };
const DSA_QUESTIONS: Mcq[] = [
  { id: "d1", q: "Time complexity of binary search on a sorted array of n elements?", options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"], correct: 1 },
  { id: "d2", q: "Which data structure uses LIFO order?", options: ["Queue", "Stack", "Deque", "Heap"], correct: 1 },
  { id: "d3", q: "Best-case time complexity of QuickSort?", options: ["O(n²)", "O(n log n)", "O(n)", "O(log n)"], correct: 1 },
  { id: "d4", q: "Which traversal of a BST yields sorted output?", options: ["Preorder", "Inorder", "Postorder", "Level-order"], correct: 1 },
  { id: "d5", q: "Hash map average lookup complexity?", options: ["O(log n)", "O(n)", "O(1)", "O(n log n)"], correct: 2 },
];

// --- Coding problems ---
type Lang = "javascript" | "python" | "c" | "cpp";
type CodingProblem = {
  id: string;
  title: string;
  description: string;
  funcName: string;
  tests: { input: any[]; expected: any; label?: string }[];
  // stdin-based: each test serializes input lines for non-JS langs
  starters: Record<Lang, string>;
};

const PROBLEMS: CodingProblem[] = [
  {
    id: "p1",
    title: "Two Sum",
    description: "Given an array of integers and a target, return the 0-indexed pair [i, j] that sums to target. Exactly one solution exists.\n\nSTDIN (for C/C++/Python): first line n target, second line n integers.\nJS: implement function solve(nums, target).",
    funcName: "solve",
    tests: [
      { input: [[2, 7, 11, 15], 9], expected: [0, 1], label: "basic" },
      { input: [[3, 2, 4], 6], expected: [1, 2], label: "middle pair" },
      { input: [[3, 3], 6], expected: [0, 1], label: "duplicates" },
    ],
    starters: {
      javascript: "function solve(nums, target) {\n  // return [i, j]\n  \n}",
      python: "import sys\nn, target = map(int, input().split())\nnums = list(map(int, input().split()))\n# print: i j\n",
      c: "#include <stdio.h>\nint main(){\n  int n, target; scanf(\"%d %d\", &n, &target);\n  int a[100]; for(int i=0;i<n;i++) scanf(\"%d\", &a[i]);\n  // print: i j\n  return 0;\n}",
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n  int n, target; cin>>n>>target;\n  vector<int> a(n); for(auto&x:a)cin>>x;\n  // print: i j\n  return 0;\n}",
    },
  },
  {
    id: "p2",
    title: "Reverse a String",
    description: "Reverse the given string.\n\nSTDIN: a single line containing the string.\nJS: implement function solve(s).",
    funcName: "solve",
    tests: [
      { input: ["hello"], expected: "olleh" },
      { input: ["Pariksha"], expected: "ahskiraP" },
      { input: ["abc"], expected: "cba" },
    ],
    starters: {
      javascript: "function solve(s) {\n  // return reversed string\n  \n}",
      python: "s = input()\n# print reversed\n",
      c: "#include <stdio.h>\n#include <string.h>\nint main(){\n  char s[1024]; scanf(\"%s\", s);\n  // print reversed\n  return 0;\n}",
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n  string s; cin>>s;\n  // print reversed\n  return 0;\n}",
    },
  },
];

const TOTAL_MINUTES = 30;

// Piston public API for multi-language execution
const PISTON_URL = "https://emkc.org/api/v2/piston/execute";
const PISTON_VERSIONS: Record<Lang, { language: string; version: string }> = {
  javascript: { language: "javascript", version: "18.15.0" },
  python:     { language: "python", version: "3.10.0" },
  c:          { language: "c", version: "10.2.0" },
  cpp:        { language: "c++", version: "10.2.0" },
};

function serializeStdin(p: CodingProblem, input: any[]): string {
  // Two Sum
  if (p.id === "p1") {
    const nums = input[0] as number[]; const target = input[1] as number;
    return `${nums.length} ${target}\n${nums.join(" ")}\n`;
  }
  // Reverse string
  if (p.id === "p2") return `${input[0]}\n`;
  return "";
}
function compareOutput(p: CodingProblem, expected: any, raw: string): boolean {
  const out = (raw ?? "").trim();
  if (p.id === "p1") {
    const parts = out.split(/\s+/).slice(0, 2).map((x) => parseInt(x, 10));
    return Array.isArray(expected) && parts.length === 2 && parts[0] === expected[0] && parts[1] === expected[1];
  }
  return out === String(expected);
}

function CodingExamPage() {
  const { user } = useAuth();
  const wmLabel = user?.email ? `${user.email} · ${new Date().toISOString().slice(0, 16)}` : "candidate";

  const [phase, setPhase] = useState<"intro" | "dsa" | "code" | "done">("intro");
  const [dsaIdx, setDsaIdx] = useState(0);
  const [dsaAnswers, setDsaAnswers] = useState<Record<string, number>>({});
  const [probIdx, setProbIdx] = useState(0);
  const [lang, setLang] = useState<Lang>("javascript");
  const [codeByKey, setCodeByKey] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const p of PROBLEMS) for (const l of Object.keys(p.starters) as Lang[]) init[`${p.id}:${l}`] = p.starters[l];
    return init;
  });
  const [results, setResults] = useState<Record<string, { passed: number; total: number; logs: string[] }>>({});
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_MINUTES * 60);
  const [warnings, setWarnings] = useState(0);
  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // Camera + AI proctor (basic motion/coverage detection via canvas pixel sampling)
  const proctorVideoRef = useRef<HTMLVideoElement | null>(null);
  const proctorStreamRef = useRef<MediaStream | null>(null);
  const sampleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastFrameRef = useRef<Uint8ClampedArray | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const submitExam = useCallback((reason?: string) => {
    if (phaseRef.current === "done") return;
    if (reason) toast.error(`Auto-submitted: ${reason}`);
    setPhase("done");
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }, []);

  const strikeWarning = useCallback((msg: string) => {
    setWarnings((n) => {
      const next = n + 1;
      if (next === 1) toast.warning(`⚠ Strict warning #1 — ${msg}. Next violation will auto-submit.`);
      else if (next >= 2) { submitExam(`${msg} (2nd violation)`); }
      return next;
    });
  }, [submitExam]);

  async function enableCamera() {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: "user" }, audio: false,
      });
      proctorStreamRef.current = stream;
      if (proctorVideoRef.current) {
        proctorVideoRef.current.srcObject = stream;
        await proctorVideoRef.current.play().catch(() => {});
      }
      setCameraReady(true);
      toast.success("AI proctoring active");
    } catch (e: any) {
      setCameraError(e?.message ?? "Camera permission denied");
      setCameraReady(false);
    }
  }

  // AI proctoring: track liveness + brightness (face covered = very dark)
  useEffect(() => {
    if (phase !== "dsa" && phase !== "code") return;
    const id = setInterval(() => {
      const track = proctorStreamRef.current?.getVideoTracks?.()[0];
      if (!track || track.readyState !== "live" || !track.enabled) {
        strikeWarning("Camera feed lost / face not visible");
        return;
      }
      const v = proctorVideoRef.current;
      if (!v || !v.videoWidth) return;
      if (!sampleCanvasRef.current) sampleCanvasRef.current = document.createElement("canvas");
      const c = sampleCanvasRef.current; c.width = 32; c.height = 24;
      const ctx = c.getContext("2d"); if (!ctx) return;
      ctx.drawImage(v, 0, 0, 32, 24);
      const data = ctx.getImageData(0, 0, 32, 24).data;
      let sum = 0; for (let i = 0; i < data.length; i += 4) sum += data[i] + data[i+1] + data[i+2];
      const avg = sum / (data.length / 4) / 3;
      // Very dark = face covered / camera blocked
      if (avg < 18) { strikeWarning("Frame too dark — possible face cover or obstruction"); return; }
      // Detect large sudden motion (e.g. holding phone in view): big frame diff
      if (lastFrameRef.current && lastFrameRef.current.length === data.length) {
        let diff = 0;
        for (let i = 0; i < data.length; i += 16) diff += Math.abs(data[i] - lastFrameRef.current[i]);
        const score = diff / (data.length / 16);
        if (score > 90) strikeWarning("Unusual motion in frame — possible mobile device or misbehavior");
      }
      lastFrameRef.current = new Uint8ClampedArray(data);
    }, 3500);
    return () => clearInterval(id);
  }, [phase, strikeWarning]);

  useEffect(() => () => { proctorStreamRef.current?.getTracks().forEach((t) => t.stop()); }, []);

  // Re-attach the live stream whenever the video element remounts
  useEffect(() => {
    const v = proctorVideoRef.current;
    if (v && proctorStreamRef.current && v.srcObject !== proctorStreamRef.current) {
      v.srcObject = proctorStreamRef.current;
      void v.play().catch(() => {});
    }
  });

  // timer
  useEffect(() => {
    if (phase === "intro" || phase === "done") return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { clearInterval(id); submitExam("Time's up"); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, submitExam]);

  // Anti-cheat + fullscreen enforcement
  useEffect(() => {
    if (phase !== "dsa" && phase !== "code") return;
    const block = (e: Event) => { e.preventDefault(); };
    const onBlur = () => { strikeWarning("Tab / window switch detected"); };
    const onVis = () => { if (document.hidden) strikeWarning("Tab hidden"); };
    const onFs = () => {
      if (!document.fullscreenElement && (phaseRef.current === "dsa" || phaseRef.current === "code")) {
        submitExam("Exited fullscreen mode");
      }
    };
    const onKey = (e: KeyboardEvent) => {
      // Block dev tools / view source shortcuts
      if (e.key === "F12") { e.preventDefault(); strikeWarning("Dev tools shortcut blocked"); }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase())) {
        e.preventDefault(); strikeWarning("Dev tools shortcut blocked");
      }
      if ((e.ctrlKey || e.metaKey) && ["u", "s", "p"].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };
    document.addEventListener("contextmenu", block);
    document.addEventListener("copy", block);
    document.addEventListener("cut", block);
    document.addEventListener("paste", block);
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("visibilitychange", onVis);
    document.addEventListener("keydown", onKey);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("copy", block);
      document.removeEventListener("cut", block);
      document.removeEventListener("paste", block);
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("visibilitychange", onVis);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", onBlur);
    };
  }, [phase, strikeWarning, submitExam]);

  const dsaScore = useMemo(
    () => DSA_QUESTIONS.reduce((acc, q) => acc + (dsaAnswers[q.id] === q.correct ? 1 : 0), 0),
    [dsaAnswers]
  );
  const codeScore = useMemo(
    () => PROBLEMS.reduce((acc, p) => acc + (results[p.id]?.passed === results[p.id]?.total && results[p.id]?.total ? 1 : 0), 0),
    [results]
  );

  async function runCode(problemId: string) {
    const p = PROBLEMS.find((x) => x.id === problemId)!;
    const key = `${problemId}:${lang}`;
    const src = codeByKey[key];
    setRunning(true);
    const logs: string[] = [];
    let passed = 0;
    try {
      if (lang === "javascript") {
        // sandboxed via Function — fast in-browser path
        // eslint-disable-next-line no-new-func
        const factory = new Function(`${src}; return ${p.funcName};`);
        const fn = factory();
        if (typeof fn !== "function") throw new Error(`Function "${p.funcName}" not found`);
        for (const t of p.tests) {
          let got: any;
          try { got = fn(...t.input.map((v) => (Array.isArray(v) ? v.slice() : v))); }
          catch (e: any) { logs.push(`✗ ${t.label ?? "case"} — runtime error: ${e.message}`); continue; }
          const ok = JSON.stringify(got) === JSON.stringify(t.expected);
          logs.push(`${ok ? "✓" : "✗"} ${t.label ?? "case"} — expected ${JSON.stringify(t.expected)}, got ${JSON.stringify(got)}`);
          if (ok) passed++;
        }
      } else {
        // Multi-language path via Piston public API
        const cfg = PISTON_VERSIONS[lang];
        for (const t of p.tests) {
          const stdin = serializeStdin(p, t.input);
          try {
            const res = await fetch(PISTON_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                language: cfg.language,
                version: cfg.version,
                files: [{ name: lang === "cpp" ? "main.cpp" : lang === "c" ? "main.c" : lang === "python" ? "main.py" : "main.js", content: src }],
                stdin,
              }),
            });
            const j: any = await res.json();
            const out = j?.run?.stdout ?? "";
            const err = j?.run?.stderr || j?.compile?.stderr || "";
            if (err && !out) { logs.push(`✗ ${t.label ?? "case"} — ${err.split("\n")[0]}`); continue; }
            const ok = compareOutput(p, t.expected, out);
            logs.push(`${ok ? "✓" : "✗"} ${t.label ?? "case"} — expected ${JSON.stringify(t.expected)}, got "${out.trim()}"`);
            if (ok) passed++;
          } catch (e: any) {
            logs.push(`✗ ${t.label ?? "case"} — compiler unreachable: ${e.message}`);
          }
        }
      }
    } catch (e: any) {
      logs.push(`✗ compile error: ${e.message}`);
    }
    setResults((r) => ({ ...r, [problemId]: { passed, total: p.tests.length, logs } }));
    setRunning(false);
  }

  async function startExam() {
    try { await document.documentElement.requestFullscreen(); }
    catch { toast.warning("Fullscreen blocked by browser — please allow to continue"); return; }
    setPhase("dsa");
  }

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const secs = String(secondsLeft % 60).padStart(2, "0");

  if (phase === "intro") {
    return (
      <div className="container mx-auto py-8 px-4 max-w-3xl animate-fade-up">
        <Link to="/candidate/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Link>
        <Card className="p-6 sm:p-8 space-y-5">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-accent uppercase tracking-wider">
            <Code2 className="h-3.5 w-3.5" /> DSA + Coding round · Secured
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">DSA &amp; Coding Examination</h1>
          <p className="text-muted-foreground">
            Two-phase secured exam: {DSA_QUESTIONS.length} DSA multiple-choice, then {PROBLEMS.length} coding problems with multi-language compiler (JavaScript, Python, C, C++). Total time {TOTAL_MINUTES} minutes.
          </p>
          <ul className="text-sm space-y-2">
            <li className="flex items-start gap-2"><Maximize2 className="h-4 w-4 text-primary mt-0.5" /> Exam runs in <b>fullscreen</b>. Exiting fullscreen auto-submits.</li>
            <li className="flex items-start gap-2"><ShieldCheck className="h-4 w-4 text-accent mt-0.5" /> AI proctoring monitors face presence, frame coverage, and unusual motion.</li>
            <li className="flex items-start gap-2"><AlertTriangle className="h-4 w-4 text-warning mt-0.5" /> One strict warning per violation. Second violation auto-submits the exam.</li>
            <li className="flex items-start gap-2"><Lock className="h-4 w-4 text-success mt-0.5" /> Right-click, copy/paste, dev tools, tab-switch and view-source are blocked.</li>
            <li className="flex items-start gap-2"><Timer className="h-4 w-4 text-primary mt-0.5" /> Single shared timer; auto-submit at 00:00.</li>
          </ul>

          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-accent" /> AI Proctoring · Live camera required
            </div>
            <div className="grid sm:grid-cols-[180px_1fr] gap-3 items-start">
              <div className="aspect-video w-full sm:w-[180px] rounded-md overflow-hidden bg-black/70 grid place-items-center text-xs text-white/60">
                <video ref={proctorVideoRef} className={`w-full h-full object-cover ${cameraReady ? "" : "hidden"}`} muted playsInline />
                {!cameraReady && <span>Camera off</span>}
              </div>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>Enable your camera. AI proctor will issue a strict warning for face cover, mobile in frame, or misbehavior — and auto-submit on a second offense.</p>
                {cameraError && <p className="text-destructive">{cameraError}</p>}
                {!cameraReady ? (
                  <Button size="sm" onClick={enableCamera}><ShieldCheck className="h-4 w-4 mr-1" />Enable camera & AI proctor</Button>
                ) : (
                  <span className="inline-flex items-center gap-1 text-success font-medium"><CheckCircle2 className="h-3.5 w-3.5" /> Camera live</span>
                )}
              </div>
            </div>
          </div>

          <Button size="lg" className="w-full sm:w-auto" disabled={!cameraReady} onClick={startExam}>
            <Maximize2 className="mr-2 h-4 w-4" /> Enter fullscreen &amp; start exam
          </Button>
          {!cameraReady && <p className="text-xs text-muted-foreground">Enable the camera to unlock the Start button.</p>}
        </Card>
      </div>
    );
  }

  if (phase === "done") {
    const totalQ = DSA_QUESTIONS.length + PROBLEMS.length;
    const totalScore = dsaScore + codeScore;
    const pct = totalQ ? Math.round((totalScore / totalQ) * 100) : 0;
    const grade = pct >= 80 ? "Excellent" : pct >= 60 ? "Good" : pct >= 40 ? "Pass" : "Needs work";
    return (
      <div className="container mx-auto py-8 px-4 max-w-2xl animate-fade-up">
        <Card className="p-6 sm:p-8 space-y-5">
          <div className="text-center space-y-2">
            <CheckCircle2 className="h-12 w-12 mx-auto text-success" />
            <h1 className="text-2xl font-bold">Scorecard</h1>
            <p className="text-muted-foreground text-sm">{grade}</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">DSA</div><div className="text-2xl font-extrabold">{dsaScore}/{DSA_QUESTIONS.length}</div></div>
            <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">Coding</div><div className="text-2xl font-extrabold">{codeScore}/{PROBLEMS.length}</div></div>
            <div className="rounded-lg border p-3 bg-accent/5 border-accent/30"><div className="text-xs text-muted-foreground">Overall</div><div className="text-2xl font-extrabold">{pct}%</div></div>
          </div>
          {warnings > 0 && (
            <div className="text-xs rounded border border-destructive/40 bg-destructive/5 p-2 text-destructive text-center">
              {warnings} proctoring warning{warnings === 1 ? "" : "s"} recorded during this session.
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Link to="/candidate/dashboard"><Button variant="outline" className="w-full sm:w-auto">Back to dashboard</Button></Link>
            <Link to="/candidate/exams"><Button className="w-full sm:w-auto">My exams</Button></Link>
          </div>
        </Card>
      </div>
    );
  }

  const currentProblem = PROBLEMS[probIdx];
  const editorKey = `${currentProblem.id}:${lang}`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 select-none" onCopy={(e) => e.preventDefault()} onPaste={(e) => e.preventDefault()}>
      <ExamWatermark label={wmLabel} />
      {/* Live proctor PIP */}
      <div className="fixed bottom-3 right-3 z-40 w-28 sm:w-36 aspect-video rounded-md overflow-hidden border-2 border-accent shadow-elegant bg-black pointer-events-none">
        <video ref={proctorVideoRef} className="w-full h-full object-cover" muted playsInline />
        <div className="absolute top-0.5 left-0.5 text-[9px] px-1 rounded bg-destructive/80 text-white font-bold">REC</div>
      </div>

      {/* IDE-style top bar */}
      <div className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="container mx-auto max-w-6xl px-3 sm:px-4 py-2 flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Code2 className="h-4 w-4 text-accent" /> Pariksha Secured IDE
          </div>
          <Badge variant="secondary" className="gap-1 bg-slate-800 text-slate-100 border-slate-700"><Timer className="h-3 w-3" /> {mins}:{secs}</Badge>
          <Badge variant="outline" className="gap-1 border-slate-700 text-slate-200"><BookOpen className="h-3 w-3" /> DSA {Object.keys(dsaAnswers).length}/{DSA_QUESTIONS.length}</Badge>
          <Badge variant="outline" className="gap-1 border-slate-700 text-slate-200"><Code2 className="h-3 w-3" /> Code {codeScore}/{PROBLEMS.length}</Badge>
          {warnings > 0 && (
            <Badge className="gap-1 bg-destructive/20 text-destructive border-destructive/40"><AlertTriangle className="h-3 w-3" /> {warnings}/2 warnings</Badge>
          )}
          <div className="ml-auto flex gap-2">
            {phase === "dsa" && (
              <Button size="sm" variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800" onClick={() => setPhase("code")}>
                Skip to coding <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            )}
            <Button size="sm" variant="destructive" onClick={() => submitExam("Submitted by candidate")}>
              <Send className="mr-1 h-3 w-3" /> Submit
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-4 sm:py-6 px-3 sm:px-4 max-w-6xl">
        {phase === "dsa" && (
          <Card className="p-4 sm:p-6 space-y-4 bg-slate-900 border-slate-800 text-slate-100">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg sm:text-xl font-bold">DSA Question {dsaIdx + 1}/{DSA_QUESTIONS.length}</h2>
              <Progress value={((dsaIdx + 1) / DSA_QUESTIONS.length) * 100} className="h-2 max-w-[140px]" />
            </div>
            <p className="text-base">{DSA_QUESTIONS[dsaIdx].q}</p>
            <div className="grid gap-2">
              {DSA_QUESTIONS[dsaIdx].options.map((opt, i) => {
                const selected = dsaAnswers[DSA_QUESTIONS[dsaIdx].id] === i;
                return (
                  <button
                    key={i}
                    onClick={() => setDsaAnswers((a) => ({ ...a, [DSA_QUESTIONS[dsaIdx].id]: i }))}
                    className={`text-left rounded-md border px-3 py-2 text-sm transition ${selected ? "bg-accent text-accent-foreground border-accent" : "bg-slate-950 border-slate-700 hover:bg-slate-800"}`}
                  >
                    <span className="font-semibold mr-2">{String.fromCharCode(65 + i)}.</span>{opt}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800" disabled={dsaIdx === 0} onClick={() => setDsaIdx((i) => i - 1)}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Previous
              </Button>
              {dsaIdx < DSA_QUESTIONS.length - 1 ? (
                <Button onClick={() => setDsaIdx((i) => i + 1)}>
                  Next <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={() => setPhase("code")} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  Continue to coding <Code2 className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          </Card>
        )}

        {phase === "code" && (
          <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
            {/* problem panel */}
            <Card className="p-4 sm:p-5 space-y-3 bg-slate-900 border-slate-800 text-slate-100">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-accent text-accent-foreground">Problem {probIdx + 1}/{PROBLEMS.length}</Badge>
                <h2 className="text-lg font-bold">{currentProblem.title}</h2>
              </div>
              <p className="text-sm text-slate-300 whitespace-pre-wrap">{currentProblem.description}</p>
              <div className="text-xs uppercase font-semibold tracking-wide text-slate-400">Sample tests</div>
              <ul className="text-xs space-y-1 font-mono bg-slate-950 border border-slate-800 rounded p-2">
                {currentProblem.tests.map((t, i) => (
                  <li key={i} className="text-slate-300">
                    in: {JSON.stringify(t.input)} → out: {JSON.stringify(t.expected)}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="outline" size="sm" className="border-slate-700 text-slate-200 hover:bg-slate-800" disabled={probIdx === 0} onClick={() => setProbIdx((i) => i - 1)}>
                  <ArrowLeft className="mr-1 h-4 w-4" /> Prev
                </Button>
                {probIdx < PROBLEMS.length - 1 ? (
                  <Button size="sm" onClick={() => setProbIdx((i) => i + 1)}>
                    Next <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                ) : (
                  <Button size="sm" variant="destructive" onClick={() => submitExam("Submitted by candidate")}>
                    <Send className="mr-1 h-4 w-4" /> Final submit
                  </Button>
                )}
              </div>
            </Card>

            {/* workspace + compiler */}
            <Card className="p-3 sm:p-4 space-y-3 bg-slate-900 border-slate-800 text-slate-100">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs uppercase font-semibold tracking-wide text-slate-400 flex items-center gap-1">
                  <Code2 className="h-3.5 w-3.5" /> Workspace
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={lang}
                    onChange={(e) => setLang(e.target.value as Lang)}
                    className="bg-slate-950 border border-slate-700 text-slate-100 text-xs rounded px-2 py-1"
                    aria-label="Language"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python 3</option>
                    <option value="c">C</option>
                    <option value="cpp">C++</option>
                  </select>
                  <Button size="sm" disabled={running} onClick={() => runCode(currentProblem.id)}>
                    <Play className="mr-1 h-3.5 w-3.5" /> {running ? "Running…" : "Run"}
                  </Button>
                </div>
              </div>
              <div className="relative">
                <div className="absolute top-0 left-0 px-2 py-0.5 text-[10px] uppercase tracking-wider rounded-br bg-slate-800 text-slate-400 font-mono z-10">
                  {lang === "cpp" ? "main.cpp" : lang === "c" ? "main.c" : lang === "python" ? "main.py" : "main.js"}
                </div>
                <Textarea
                  value={codeByKey[editorKey] ?? ""}
                  onChange={(e) => setCodeByKey((c) => ({ ...c, [editorKey]: e.target.value }))}
                  spellCheck={false}
                  className="font-mono text-xs sm:text-sm min-h-[300px] sm:min-h-[400px] resize-y bg-slate-950 text-slate-100 border-slate-800 pt-6 leading-relaxed"
                />
              </div>
              <div>
                <div className="text-xs uppercase font-semibold tracking-wide text-slate-400 mb-1">Console output</div>
                <div className="font-mono text-xs bg-black text-slate-100 rounded p-2 min-h-[120px] whitespace-pre-wrap break-words border border-slate-800">
                  {results[currentProblem.id]?.logs.length
                    ? results[currentProblem.id].logs.map((l, i) => (
                        <div key={i} className="flex items-start gap-1">
                          {l.startsWith("✓")
                            ? <CheckCircle2 className="h-3 w-3 text-success mt-0.5 shrink-0" />
                            : <XCircle className="h-3 w-3 text-destructive mt-0.5 shrink-0" />}
                          <span>{l.slice(2)}</span>
                        </div>
                      ))
                    : <span className="text-slate-500">$ run to compile and execute against test cases…</span>}
                </div>
                {results[currentProblem.id] && (
                  <div className="text-xs text-slate-400 mt-1">
                    Passed {results[currentProblem.id].passed}/{results[currentProblem.id].total} cases.
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
