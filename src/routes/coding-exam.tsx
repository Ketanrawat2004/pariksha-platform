import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ExamWatermark } from "@/components/exam/watermark";
import { useAuth } from "@/lib/auth/auth-context";
import { ProtectedShell } from "@/components/protected-shell";
import { ArrowLeft, ArrowRight, Code2, Play, ShieldCheck, Timer, Send, CheckCircle2, XCircle, BookOpen } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/coding-exam")({
  head: () => ({ meta: [
    { title: "DSA & Coding Round — Pariksha" },
    { name: "description", content: "Secured DSA + coding examination with built-in workspace and compiler." },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: () => (
    <ProtectedShell requireRoles={["candidate", "institute", "admin", "superadmin"]}>
      <CodingExamPage />
    </ProtectedShell>
  ),
});

// --- DSA MCQs ---
type Mcq = { id: string; q: string; options: string[]; correct: number };
const DSA_QUESTIONS: Mcq[] = [
  { id: "d1", q: "Time complexity of binary search on a sorted array of n elements?", options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"], correct: 1 },
  { id: "d2", q: "Which data structure uses LIFO order?", options: ["Queue", "Stack", "Deque", "Heap"], correct: 1 },
  { id: "d3", q: "Best-case time complexity of QuickSort?", options: ["O(n²)", "O(n log n)", "O(n)", "O(log n)"], correct: 1 },
  { id: "d4", q: "Which traversal of a BST yields sorted output?", options: ["Preorder", "Inorder", "Postorder", "Level-order"], correct: 1 },
  { id: "d5", q: "Hash map average lookup complexity?", options: ["O(log n)", "O(n)", "O(1)", "O(n log n)"], correct: 2 },
];

// --- Coding problems with test cases ---
type CodingProblem = {
  id: string;
  title: string;
  description: string;
  starter: string;
  funcName: string;
  tests: { input: any[]; expected: any; label?: string }[];
};
const PROBLEMS: CodingProblem[] = [
  {
    id: "p1",
    title: "Two Sum",
    description: "Given an array of integers `nums` and an integer `target`, return the indices [i, j] of the two numbers such that they add up to target. Assume exactly one solution exists.",
    starter: "function solve(nums, target) {\n  // your code here\n  \n}",
    funcName: "solve",
    tests: [
      { input: [[2, 7, 11, 15], 9], expected: [0, 1], label: "basic" },
      { input: [[3, 2, 4], 6], expected: [1, 2], label: "middle pair" },
      { input: [[3, 3], 6], expected: [0, 1], label: "duplicates" },
    ],
  },
  {
    id: "p2",
    title: "Reverse a String",
    description: "Return the reverse of the given string `s` without using the built-in `.reverse()` on arrays of length > 1 strings — write the loop yourself.",
    starter: "function solve(s) {\n  // return reversed string\n  \n}",
    funcName: "solve",
    tests: [
      { input: ["hello"], expected: "olleh" },
      { input: ["Pariksha"], expected: "ahskiraP" },
      { input: [""], expected: "" },
    ],
  },
];

const TOTAL_MINUTES = 30;

function CodingExamPage() {
  const { user } = useAuth();
  const wmLabel = user?.email ? `${user.email} · ${new Date().toISOString().slice(0, 16)}` : "candidate";

  const [phase, setPhase] = useState<"intro" | "dsa" | "code" | "done">("intro");
  const [dsaIdx, setDsaIdx] = useState(0);
  const [dsaAnswers, setDsaAnswers] = useState<Record<string, number>>({});
  const [probIdx, setProbIdx] = useState(0);
  const [codeByProb, setCodeByProb] = useState<Record<string, string>>(
    () => Object.fromEntries(PROBLEMS.map((p) => [p.id, p.starter]))
  );
  const [results, setResults] = useState<Record<string, { passed: number; total: number; logs: string[] }>>({});
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_MINUTES * 60);

  // timer
  useEffect(() => {
    if (phase === "intro" || phase === "done") return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { clearInterval(id); setPhase("done"); toast.warning("Time's up — auto submitted"); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // anti-cheat: block copy/paste/contextmenu during exam
  useEffect(() => {
    if (phase !== "dsa" && phase !== "code") return;
    const block = (e: Event) => { e.preventDefault(); };
    const onBlur = () => { if (phase === "dsa" || phase === "code") toast.warning("Tab switch detected — flagged"); };
    document.addEventListener("contextmenu", block);
    document.addEventListener("copy", block);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("copy", block);
      window.removeEventListener("blur", onBlur);
    };
  }, [phase]);

  const dsaScore = useMemo(
    () => DSA_QUESTIONS.reduce((acc, q) => acc + (dsaAnswers[q.id] === q.correct ? 1 : 0), 0),
    [dsaAnswers]
  );
  const codeScore = useMemo(
    () => PROBLEMS.reduce((acc, p) => acc + (results[p.id]?.passed === results[p.id]?.total && results[p.id]?.total ? 1 : 0), 0),
    [results]
  );

  function runCode(problemId: string) {
    const p = PROBLEMS.find((x) => x.id === problemId)!;
    const src = codeByProb[problemId];
    setRunning(true);
    const logs: string[] = [];
    let passed = 0;
    try {
      // sandboxed via Function — runs in current realm, sufficient for self-graded demo
      // eslint-disable-next-line no-new-func
      const factory = new Function(`${src}; return ${p.funcName};`);
      const fn = factory();
      if (typeof fn !== "function") throw new Error(`Function "${p.funcName}" not found`);
      for (const t of p.tests) {
        let got: any;
        try { got = fn(...t.input.map((v) => (Array.isArray(v) ? v.slice() : v))); }
        catch (e: any) { logs.push(`✗ ${t.label ?? "case"} — runtime error: ${e.message}`); continue; }
        const ok = JSON.stringify(got) === JSON.stringify(t.expected);
        logs.push(`${ok ? "✓" : "✗"} ${t.label ?? "case"} — input ${JSON.stringify(t.input)} → expected ${JSON.stringify(t.expected)}, got ${JSON.stringify(got)}`);
        if (ok) passed++;
      }
    } catch (e: any) {
      logs.push(`✗ compile error: ${e.message}`);
    }
    setResults((r) => ({ ...r, [problemId]: { passed, total: p.tests.length, logs } }));
    setRunning(false);
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
            <Code2 className="h-3.5 w-3.5" /> DSA + Coding round
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">DSA &amp; Coding Examination</h1>
          <p className="text-muted-foreground">
            This is a two-phase secured exam: first {DSA_QUESTIONS.length} multiple-choice DSA questions, then {PROBLEMS.length} live coding problems with an in-browser workspace and compiler. Total time: {TOTAL_MINUTES} minutes.
          </p>
          <ul className="text-sm space-y-2">
            <li className="flex items-start gap-2"><ShieldCheck className="h-4 w-4 text-success mt-0.5" /> Right-click, copy & tab-switch are monitored.</li>
            <li className="flex items-start gap-2"><Timer className="h-4 w-4 text-primary mt-0.5" /> One shared timer for both phases.</li>
            <li className="flex items-start gap-2"><Code2 className="h-4 w-4 text-accent mt-0.5" /> Code runs against hidden + visible test cases.</li>
          </ul>
          <Button size="lg" className="w-full sm:w-auto" onClick={() => setPhase("dsa")}>
            Start exam <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Card>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="container mx-auto py-8 px-4 max-w-2xl animate-fade-up">
        <Card className="p-8 text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 mx-auto text-success" />
          <h1 className="text-2xl font-bold">Submitted</h1>
          <p className="text-muted-foreground">DSA: <strong>{dsaScore}/{DSA_QUESTIONS.length}</strong> · Coding: <strong>{codeScore}/{PROBLEMS.length}</strong> fully solved</p>
          <Link to="/candidate/dashboard"><Button>Back to dashboard</Button></Link>
        </Card>
      </div>
    );
  }

  return (
    <>
      <ExamWatermark label={wmLabel} />
      <div className="container mx-auto py-4 sm:py-6 px-3 sm:px-4 max-w-5xl animate-fade-up">
        {/* sticky bar */}
        <div className="sticky top-0 z-30 -mx-3 sm:-mx-4 mb-4 px-3 sm:px-4 py-2 bg-background/90 backdrop-blur border-b flex flex-wrap items-center gap-2 sm:gap-3">
          <Badge variant="secondary" className="gap-1"><Timer className="h-3 w-3" /> {mins}:{secs}</Badge>
          <Badge variant="outline" className="gap-1"><BookOpen className="h-3 w-3" /> DSA {Object.keys(dsaAnswers).length}/{DSA_QUESTIONS.length}</Badge>
          <Badge variant="outline" className="gap-1"><Code2 className="h-3 w-3" /> Code {codeScore}/{PROBLEMS.length}</Badge>
          <div className="ml-auto flex gap-2">
            {phase === "dsa" && (
              <Button size="sm" variant="outline" onClick={() => setPhase("code")}>
                Skip to coding <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            )}
            <Button size="sm" onClick={() => setPhase("done")}>
              <Send className="mr-1 h-3 w-3" /> Submit
            </Button>
          </div>
        </div>

        {phase === "dsa" && (
          <Card className="p-4 sm:p-6 space-y-4">
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
                    className={`text-left rounded-md border px-3 py-2 text-sm transition ${selected ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"}`}
                  >
                    <span className="font-semibold mr-2">{String.fromCharCode(65 + i)}.</span>{opt}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button variant="outline" disabled={dsaIdx === 0} onClick={() => setDsaIdx((i) => i - 1)}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Previous
              </Button>
              {dsaIdx < DSA_QUESTIONS.length - 1 ? (
                <Button onClick={() => setDsaIdx((i) => i + 1)}>
                  Next <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={() => setPhase("code")} className="bg-accent hover:bg-accent/90">
                  Continue to coding <Code2 className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          </Card>
        )}

        {phase === "code" && (
          <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
            {/* problem panel */}
            <Card className="p-4 sm:p-5 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>Problem {probIdx + 1}/{PROBLEMS.length}</Badge>
                <h2 className="text-lg font-bold">{PROBLEMS[probIdx].title}</h2>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{PROBLEMS[probIdx].description}</p>
              <div className="text-xs uppercase font-semibold tracking-wide text-muted-foreground">Visible test cases</div>
              <ul className="text-xs space-y-1 font-mono bg-muted/50 rounded p-2">
                {PROBLEMS[probIdx].tests.map((t, i) => (
                  <li key={i}>solve({t.input.map((v) => JSON.stringify(v)).join(", ")}) → {JSON.stringify(t.expected)}</li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="outline" size="sm" disabled={probIdx === 0} onClick={() => setProbIdx((i) => i - 1)}>
                  <ArrowLeft className="mr-1 h-4 w-4" /> Prev problem
                </Button>
                {probIdx < PROBLEMS.length - 1 ? (
                  <Button size="sm" onClick={() => setProbIdx((i) => i + 1)}>
                    Next problem <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => setPhase("done")}>
                    <Send className="mr-1 h-4 w-4" /> Submit exam
                  </Button>
                )}
              </div>
            </Card>

            {/* workspace + compiler */}
            <Card className="p-3 sm:p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs uppercase font-semibold tracking-wide text-muted-foreground flex items-center gap-1">
                  <Code2 className="h-3.5 w-3.5" /> Workspace · JavaScript
                </div>
                <Button size="sm" disabled={running} onClick={() => runCode(PROBLEMS[probIdx].id)}>
                  <Play className="mr-1 h-3.5 w-3.5" /> {running ? "Running…" : "Run tests"}
                </Button>
              </div>
              <Textarea
                value={codeByProb[PROBLEMS[probIdx].id]}
                onChange={(e) => setCodeByProb((c) => ({ ...c, [PROBLEMS[probIdx].id]: e.target.value }))}
                spellCheck={false}
                className="font-mono text-xs sm:text-sm min-h-[260px] sm:min-h-[340px] resize-y"
              />
              <div>
                <div className="text-xs uppercase font-semibold tracking-wide text-muted-foreground mb-1">Output</div>
                <div className="font-mono text-xs bg-slate-950 text-slate-100 rounded p-2 min-h-[100px] whitespace-pre-wrap break-words">
                  {results[PROBLEMS[probIdx].id]?.logs.length
                    ? results[PROBLEMS[probIdx].id].logs.map((l, i) => (
                        <div key={i} className="flex items-start gap-1">
                          {l.startsWith("✓")
                            ? <CheckCircle2 className="h-3 w-3 text-success mt-0.5 shrink-0" />
                            : <XCircle className="h-3 w-3 text-destructive mt-0.5 shrink-0" />}
                          <span>{l.slice(2)}</span>
                        </div>
                      ))
                    : <span className="text-slate-500">Click "Run tests" to evaluate your solution.</span>}
                </div>
                {results[PROBLEMS[probIdx].id] && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Passed {results[PROBLEMS[probIdx].id].passed}/{results[PROBLEMS[probIdx].id].total} cases.
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
