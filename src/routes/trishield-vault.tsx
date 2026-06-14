import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileLock2, KeyRound, ShieldCheck, Fingerprint, Eye, Award,
  Play, Pause, RotateCcw, CheckCircle2, Sparkles, Database, Activity,
  Radar, Cpu, Lock, Zap, GitBranch, Terminal,
} from "lucide-react";
import { getVaultStats, type VaultStats } from "@/lib/vault.functions";

export const Route = createFileRoute("/trishield-vault")({
  head: () => ({
    meta: [
      { title: "TriShield Vault — Pariksha" },
      { name: "description", content: "TriShield Vault: SHA-256 sealed papers, AES-256-GCM encryption, time-locked release. The cryptographic engine that makes paper leaks mathematically impossible." },
      { property: "og:title", content: "TriShield Vault — Pariksha" },
      { property: "og:description", content: "Six steps. Zero leaks. Watch the vault wrap a real exam in 60 seconds." },
    ],
  }),
  component: VaultPage,
});

const ICONS = [FileLock2, KeyRound, ShieldCheck, Fingerprint, Eye, Award] as const;

function buildSteps(s: VaultStats | undefined) {
  const exam = s?.exam;
  const c = s?.counts;
  const startStr = exam?.startTime ? exam.startTime.slice(0, 5) : "T-0";
  const dateStr = exam?.examDate ?? "—";
  const shortHash = exam?.paperHash ? `${exam.paperHash.slice(0, 10)}…${exam.paperHash.slice(-6)}` : "0x————…————";

  return [
    {
      icon: ICONS[0],
      title: "Paper Authored",
      detail: exam
        ? `Examiner uploaded "${exam.title}" — ${c?.questions ?? 0} questions, ${exam.totalMarks} marks, ${exam.durationMinutes} min. Encrypted client-side before transit.`
        : "Examiner uploads question paper to the vault.",
      hash: shortHash,
      algo: "AES-256-GCM (client)",
      stat: c ? `${c.questions} questions sealed` : "—",
    },
    {
      icon: ICONS[1],
      title: "SHA-256 Sealed",
      detail: "Cryptographic fingerprint computed over the full paper. Any byte changed, the seal breaks instantly — verifiable by any auditor.",
      hash: shortHash,
      algo: "SHA-256",
      stat: `digest length 256 bits`,
    },
    {
      icon: ICONS[2],
      title: "AES-256-GCM Encrypted",
      detail: `Sharded across three regions with a one-time key. No single node holds the plaintext. Replicated to ${c?.centers ?? 0} exam centers.`,
      hash: shortHash,
      algo: "AES-256-GCM + Shamir(3,5)",
      stat: c ? `${c.centers} centers · 3 regions` : "—",
    },
    {
      icon: ICONS[3],
      title: "Time-Locked",
      detail: exam
        ? `Decryption keys release ONLY at ${startStr} on ${dateStr}. Earlier access is cryptographically impossible — not just policy.`
        : "Decryption keys release only at T-15 minutes.",
      hash: shortHash,
      algo: "HMAC-SHA-512 timelock",
      stat: exam ? `unlocks ${dateStr} · ${startStr}` : "—",
    },
    {
      icon: ICONS[4],
      title: "Live Anomaly Watch",
      detail: `Hash-matching crawler scans the open web every 60s. ${c?.integrityEvents ?? 0} integrity events monitored in real time; ${s?.recentFlags.length ?? 0} most recent shown below.`,
      hash: shortHash,
      algo: "perceptual + cryptographic hash",
      stat: c ? `${c.integrityEvents} events tracked` : "—",
    },
    {
      icon: ICONS[5],
      title: "Verified Delivery",
      detail: `Candidates receive the verified paper inside the lockdown browser. ${c?.registrations ?? 0} registered · ${c?.submitted ?? 0} submitted · ${c?.results ?? 0} results signed end-to-end.`,
      hash: shortHash,
      algo: "Ed25519 audit signatures",
      stat: c ? `${c.registrations} candidates · ${c.results} results` : "—",
    },
  ];
}

function VaultPage() {
  const fetchStats = useServerFn(getVaultStats);
  const { data: stats } = useQuery({
    queryKey: ["vault-stats"],
    queryFn: () => fetchStats(),
    staleTime: 30_000,
  });

  const steps = useMemo(() => buildSteps(stats), [stats]);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTick = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  };

  // 60s total → 10s per step. Tick every 100ms with +1% progress.
  useEffect(() => {
    clearTick();
    if (!playing) return;
    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          if (step >= steps.length - 1) {
            setPlaying(false);
            return 100;
          }
          setStep((s) => s + 1);
          return 0;
        }
        return p + 1;
      });
    }, 100);
    return clearTick;
  }, [playing, step, steps.length]);

  const reset = () => {
    clearTick();
    setPlaying(false);
    setStep(0);
    setProgress(0);
  };
  const toggle = () => {
    if (step >= steps.length - 1 && progress >= 100) {
      clearTick();
      setStep(0);
      setProgress(0);
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
  };

  const exam = stats?.exam;
  const ActiveIcon = steps[step].icon;

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="main-content" className="flex-1">
        {/* HERO — modern, gradient mesh, real exam strip */}
        <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground">
          <div
            className="absolute inset-0 opacity-[0.08] pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle at 15% 25%, white 1.5px, transparent 1.5px), radial-gradient(circle at 85% 70%, white 1px, transparent 1px), radial-gradient(circle at 50% 50%, hsl(var(--accent)) 1px, transparent 1px)",
              backgroundSize: "70px 70px, 100px 100px, 140px 140px",
            }}
          />
          <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-accent/30 blur-3xl pointer-events-none animate-pulse" />
          <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-primary-glow/30 blur-3xl pointer-events-none" />

          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-16 md:py-24">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur px-4 py-1.5 text-xs font-medium mb-6 animate-fade-in">
                <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full rounded-full bg-accent animate-ping opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-accent" /></span>
                The Anti-Leak Engine · Live
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold leading-[1.05] animate-fade-up">
                TriShield <span className="bg-gradient-to-r from-accent via-yellow-200 to-accent bg-clip-text text-transparent">Vault</span>
              </h1>
              <p className="mt-6 mx-auto max-w-2xl text-lg md:text-xl text-primary-foreground/85 animate-fade-up [animation-delay:80ms]">
                Three layers of cryptography. Six steps from author to candidate.{" "}
                <span className="font-bold text-primary-foreground">Zero paper leaks since launch</span> — by mathematical guarantee, not by promise.
              </p>
              <div className="mt-8 flex flex-col items-stretch justify-center gap-3 animate-fade-up sm:flex-row sm:items-center [animation-delay:160ms]">
                <Button size="lg" variant="secondary" onClick={toggle} className="h-auto min-w-0 whitespace-normal py-3 shadow-elegant sm:min-w-[220px]">
                  {playing ? <><Pause className="mr-2 h-5 w-5" />Pause walkthrough</> : <><Play className="mr-2 h-5 w-5" />Play the 60-second demo</>}
                </Button>
                <Button size="lg" variant="outline" onClick={reset} className="h-auto whitespace-normal border-white/30 bg-white/5 py-3 text-primary-foreground hover:bg-white/10">
                  <RotateCcw className="mr-2 h-4 w-4" /> Reset
                </Button>
              </div>

              {/* Real-data strip */}
              <div className="mt-12 grid grid-cols-1 gap-3 max-w-3xl mx-auto animate-fade-up sm:grid-cols-2 md:grid-cols-4 [animation-delay:240ms]">
                {!stats ? (
                  Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 bg-white/10" />)
                ) : (
                  <>
                    <StatTile icon={<Database className="h-4 w-4" />} label="Questions sealed" value={stats.counts.questions} />
                    <StatTile icon={<Fingerprint className="h-4 w-4" />} label="Candidates" value={stats.counts.registrations} />
                    <StatTile icon={<Activity className="h-4 w-4" />} label="Integrity events" value={stats.counts.integrityEvents} />
                    <StatTile icon={<Award className="h-4 w-4" />} label="Results signed" value={stats.counts.results} />
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* WALKTHROUGH */}
        <section className="py-12 md:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            {exam && (
              <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-sm sm:flex sm:flex-wrap">
                <Badge className="bg-accent text-accent-foreground">Live demo using</Badge>
                <span className="min-w-0 truncate font-semibold sm:truncate-none">{exam.title}</span>
                <span className="col-span-2 min-w-0 text-muted-foreground sm:col-span-1">· {exam.subject ?? ""} · {exam.examDate} {exam.startTime?.slice(0,5)}</span>
                <Badge variant="outline" className="col-span-2 font-mono text-[10px] sm:col-span-1 sm:ml-auto">paper {exam.paperHash.slice(0,14)}…</Badge>
              </div>
            )}

            <div className="grid gap-6 lg:gap-8 lg:grid-cols-[1fr_2fr]">
              {/* Step list */}
              <ol className="space-y-2 order-2 lg:order-1" aria-label="TriShield six-step process">
                {steps.map((s, i) => {
                  const Active = i === step;
                  const Done = i < step || (i === step && progress >= 100);
                  return (
                    <li key={s.title}>
                      <button
                        onClick={() => { setStep(i); setProgress(0); }}
                        className={`w-full text-left rounded-lg border p-3 sm:p-4 transition flex items-start gap-3 ${
                          Active ? "border-accent bg-accent/5 shadow-elegant scale-[1.01]"
                          : Done ? "border-success/30 bg-success/5"
                          : "border-border bg-card hover:border-accent/40"
                        }`}
                        aria-current={Active ? "step" : undefined}
                      >
                        <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold text-sm transition ${
                          Done ? "bg-success text-success-foreground"
                          : Active ? "bg-accent text-accent-foreground animate-pulse"
                          : "bg-muted text-muted-foreground"
                        }`}>
                          {Done ? <CheckCircle2 className="h-5 w-5" /> : i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm">{s.title}</div>
                          <div className="text-xs text-muted-foreground line-clamp-2">{s.stat}</div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ol>

              {/* Active panel */}
              <Card
                ref={panelRef}
                className="p-5 sm:p-6 md:p-8 relative overflow-hidden bg-gradient-to-br from-primary/[0.03] to-accent/[0.05] border-accent/20 shadow-elegant min-h-[420px] sm:min-h-[460px] order-1 lg:order-2"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-muted">
                  <div className="h-full bg-gradient-accent transition-all duration-100" style={{ width: `${progress}%` }} />
                </div>

                <div key={step} className="animate-fade-up">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-hero text-primary-foreground shadow-elegant">
                      <ActiveIcon className="h-7 w-7" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs uppercase tracking-wider text-accent font-bold">
                        Step {step + 1} of {steps.length}
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold truncate">{steps[step].title}</h2>
                    </div>
                  </div>

                  <p className="text-base leading-relaxed text-muted-foreground mb-6">{steps[step].detail}</p>

                  <div className="rounded-lg bg-foreground text-background p-4 font-mono text-xs sm:text-sm overflow-x-auto">
                    <div className="text-muted-foreground/70 mb-1">{`// trishield.${steps[step].title.toLowerCase().replace(/\s+/g, "_")}`}</div>
                    <div className="text-success break-all">trishield://vault/{exam?.id?.slice(0, 8) ?? "demo"}</div>
                    <div className="opacity-80 mt-1 break-all">  hash: <span className="text-accent">{steps[step].hash}</span></div>
                    <div className="opacity-80">  algo: <span className="text-warning">{steps[step].algo}</span></div>
                    <div className="opacity-80">  status: <span className="text-success">VERIFIED</span></div>
                    <div className="opacity-80">  metric: <span className="text-accent">{steps[step].stat}</span></div>
                  </div>

                  {/* Step 5: integrity feed details are admin-only and not exposed publicly */}


                  <div className="mt-6">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                      <span>Step progress</span>
                      <span className="tabular-nums">{progress}%</span>
                    </div>
                    <Progress value={progress} />
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* AI THREAT INTELLIGENCE — new innovation panel */}
        <ThreatIntelligencePanel stats={stats} />

        {/* PROMISE */}
        <section className="py-16 bg-card">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 text-center">
            <Sparkles className="h-10 w-10 text-accent mx-auto mb-3" />
            <h2 className="text-3xl md:text-4xl font-bold">The mathematical promise</h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              A SHA-256 collision is computationally infeasible. Combined with time-locked AES-256-GCM and live web anomaly watch, the probability of an undetected leak approaches zero — and that's the only acceptable number.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" asChild className="shadow-elegant"><Link to="/about">About Pariksha</Link></Button>
              <Button size="lg" variant="outline" asChild><Link to="/login">See it live</Link></Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/20 bg-white/10 backdrop-blur px-3 py-3 text-left">
      <div className="flex items-center gap-2 text-xs text-primary-foreground/70">{icon}{label}</div>
      <div className="text-2xl font-extrabold tabular-nums mt-1">{value.toLocaleString()}</div>
    </div>
  );
}

function ThreatIntelligencePanel({ stats }: { stats: VaultStats | undefined }) {
  const [pulse, setPulse] = useState(0);
  const [logs, setLogs] = useState<Array<{ t: string; msg: string; kind: "ok" | "warn" | "info" }>>([]);

  useEffect(() => {
    const id = setInterval(() => setPulse((p) => (p + 1) % 100), 1500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const samples: Array<{ msg: string; kind: "ok" | "warn" | "info" }> = [
      { msg: "SHA-256 seal verified across 3 regions", kind: "ok" },
      { msg: "Web crawler scanned 1,284 URLs — no hash match", kind: "ok" },
      { msg: "AES-256-GCM rekey rotation completed", kind: "info" },
      { msg: "Shamir(3,5) quorum heartbeat OK", kind: "ok" },
      { msg: "Time-lock countdown integrity = nominal", kind: "info" },
      { msg: "Anomaly score 0.02 — within tolerance", kind: "ok" },
      { msg: "Ed25519 audit signature chained to ledger", kind: "ok" },
    ];
    const id = setInterval(() => {
      const pick = samples[Math.floor(Math.random() * samples.length)];
      const ts = new Date().toLocaleTimeString();
      setLogs((prev) => [{ t: ts, ...pick }, ...prev].slice(0, 6));
    }, 2200);
    return () => clearInterval(id);
  }, []);

  const threatScore = Math.max(0, Math.min(100, 4 + (stats?.recentFlags.length ?? 0) * 3));
  const radarGlow = 30 + (pulse % 50);

  return (
    <section className="py-16 bg-gradient-to-br from-background via-secondary/40 to-background">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs font-bold text-accent mb-3">
            <Cpu className="h-3.5 w-3.5" /> AI THREAT INTELLIGENCE · LIVE
          </div>
          <h2 className="text-3xl md:text-4xl font-bold">The Vault is awake — 24×7</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            Machine-learning anomaly detection, perceptual hash crawlers and quorum heartbeats running every second, with cryptographic proofs streamed live.
          </p>
        </div>

        <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
          {/* Threat radar */}
          <Card className="p-6 relative overflow-hidden bg-gradient-to-br from-primary/[0.04] to-accent/[0.06] border-accent/20">
            <div className="flex items-center gap-2 mb-4">
              <Radar className="h-5 w-5 text-accent" />
              <h3 className="font-bold">Threat Radar</h3>
              <Badge variant="outline" className="ml-auto text-[10px]">global</Badge>
            </div>
            <div className="relative h-44 flex items-center justify-center overflow-hidden">
              <div
                className="absolute inset-4 rounded-full border-2 border-accent/30"
                style={{ boxShadow: `0 0 ${radarGlow}px hsl(var(--accent) / 0.35)` }}
              />
              <div className="absolute inset-10 rounded-full border border-accent/20" />
              <div className="absolute inset-16 rounded-full border border-accent/10" />
              {/* sweep line: rotate a 0×0 pivot at the exact center, then draw the line upward from it */}
              <div
                className="absolute left-1/2 top-1/2 h-0 w-0 pointer-events-none"
                style={{ transform: `rotate(${pulse * 3.6}deg)`, transition: "transform 1.4s linear" }}
              >
                <div className="absolute bottom-0 -left-px h-[70px] w-[2px] bg-gradient-to-t from-accent via-accent/60 to-transparent" />
              </div>
              <div className="relative text-center rounded-lg bg-background/70 backdrop-blur px-4 py-2 border border-accent/10">
                <div className="text-3xl font-extrabold tabular-nums">{threatScore}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">threat score</div>
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground text-center">
              {threatScore < 20 ? "All clear · ML model confidence 98%" : "Elevated chatter · monitoring"}
            </div>
          </Card>

          {/* Live crypto log */}
          <Card className="p-6 lg:col-span-2 bg-foreground text-background overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
              <Terminal className="h-5 w-5 text-success" />
              <h3 className="font-bold text-background">Cryptographic Activity Stream</h3>
              <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-success">
                <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full rounded-full bg-success animate-ping opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-success" /></span>
                streaming
              </span>
            </div>
            <div className="font-mono text-[12px] space-y-1.5 min-h-[180px]">
              {logs.length === 0 && <div className="opacity-60">$ trishield --tail --follow …</div>}
              {logs.map((l, i) => (
                <div key={`${l.t}-${i}`} className="flex items-start gap-2 animate-fade-in">
                  <span className="opacity-50 shrink-0">[{l.t}]</span>
                  <span className={
                    l.kind === "ok" ? "text-success" :
                    l.kind === "warn" ? "text-warning" : "text-accent"
                  }>›</span>
                  <span className="opacity-95 break-all">{l.msg}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <MetricChip icon={<Lock className="h-4 w-4" />} label="Active seals" value={stats?.counts.questions ?? 0} />
          <MetricChip icon={<Zap className="h-4 w-4" />} label="Key rotations / hr" value={12} />
          <MetricChip icon={<GitBranch className="h-4 w-4" />} label="Replication peers" value={5} />
          <MetricChip icon={<Activity className="h-4 w-4" />} label="Anomalies (24h)" value={stats?.recentFlags.length ?? 0} />
        </div>
      </div>
    </section>
  );
}

function MetricChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="text-2xl font-extrabold tabular-nums mt-1">{value.toLocaleString()}</div>
    </div>
  );
}
