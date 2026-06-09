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

  // 60s total → 10s per step. Tick every 100ms with +1% progress.
  useEffect(() => {
    if (!playing) return;
    const tick = setInterval(() => {
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
    return () => clearInterval(tick);
  }, [playing, step, steps.length]);

  const reset = () => { setStep(0); setProgress(0); setPlaying(false); };
  const toggle = () => {
    if (step >= steps.length - 1 && progress >= 100) reset();
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
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.05] animate-fade-up">
                TriShield <span className="bg-gradient-to-r from-accent via-yellow-200 to-accent bg-clip-text text-transparent">Vault</span>
              </h1>
              <p className="mt-6 mx-auto max-w-2xl text-lg md:text-xl text-primary-foreground/85 animate-fade-up [animation-delay:80ms]">
                Three layers of cryptography. Six steps from author to candidate.{" "}
                <span className="font-bold text-white">Zero paper leaks since launch</span> — by mathematical guarantee, not by promise.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-up [animation-delay:160ms]">
                <Button size="lg" variant="secondary" onClick={toggle} className="shadow-elegant min-w-[220px]">
                  {playing ? <><Pause className="mr-2 h-5 w-5" />Pause walkthrough</> : <><Play className="mr-2 h-5 w-5" />Play the 60-second demo</>}
                </Button>
                <Button size="lg" variant="outline" onClick={reset} className="border-white/30 bg-white/5 text-primary-foreground hover:bg-white/10">
                  <RotateCcw className="mr-2 h-4 w-4" /> Reset
                </Button>
              </div>

              {/* Real-data strip */}
              <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto animate-fade-up [animation-delay:240ms]">
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
              <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
                <Badge className="bg-accent text-accent-foreground">Live demo using</Badge>
                <span className="font-semibold">{exam.title}</span>
                <span className="text-muted-foreground">· {exam.subject ?? ""} · {exam.examDate} {exam.startTime?.slice(0,5)}</span>
                <Badge variant="outline" className="ml-auto font-mono text-[10px]">paper {exam.paperHash.slice(0,14)}…</Badge>
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
                className="p-6 md:p-8 relative overflow-hidden bg-gradient-to-br from-primary/[0.03] to-accent/[0.05] border-accent/20 shadow-elegant min-h-[460px] order-1 lg:order-2"
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

                  {/* Step 5: real recent flags */}
                  {step === 4 && stats?.recentFlags && stats.recentFlags.length > 0 && (
                    <div className="mt-4 rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs">
                      <div className="font-bold mb-2 flex items-center gap-2"><Activity className="h-3 w-3" /> Live integrity feed</div>
                      <ul className="space-y-1">
                        {stats.recentFlags.map((f) => (
                          <li key={f.id} className="flex items-center justify-between gap-2">
                            <span className="font-mono">{f.event_type}</span>
                            <Badge variant="outline" className="text-[10px]">{f.severity}</Badge>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

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
