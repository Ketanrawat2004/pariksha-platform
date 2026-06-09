import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileLock2, KeyRound, ShieldCheck, Fingerprint, Eye, Award, Play, Pause, RotateCcw, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/trishield-vault")({
  head: () => ({
    meta: [
      { title: "TriShield Vault — Pariksha" },
      { name: "description", content: "TriShield Vault: the anti-leak engine behind Pariksha. SHA-256 paper sealing, AES-256-GCM encryption, time-locked release." },
      { property: "og:title", content: "TriShield Vault — Pariksha" },
      { property: "og:description", content: "Six steps. Zero leaks. The cryptographic vault that makes paper leaks mathematically impossible." },
    ],
  }),
  component: VaultPage,
});

interface Step {
  icon: typeof FileLock2;
  title: string;
  detail: string;
  hash: string;
}

const STEPS: Step[] = [
  { icon: FileLock2, title: "Paper Authored", detail: "Examiner uploads question paper to the vault. Encrypted client-side before transit.", hash: "0x8f4e…2a1c" },
  { icon: KeyRound, title: "SHA-256 Sealed", detail: "Cryptographic fingerprint computed. Any byte changed, the seal breaks instantly.", hash: "0xc91a…6b07" },
  { icon: ShieldCheck, title: "AES-256-GCM Encrypted", detail: "Paper encrypted with a one-time key, sharded across three regions. No single node holds the plaintext.", hash: "0x3d72…ff09" },
  { icon: Fingerprint, title: "Time-Locked", detail: "Decryption keys released only at T-15 minutes from the official start. Earlier access is impossible.", hash: "0x1bc4…d83e" },
  { icon: Eye, title: "Live Anomaly Watch", detail: "Hash matching scans the open web every 60s. Any leak surfaces within minutes, not days.", hash: "0xa50f…7e22" },
  { icon: Award, title: "Verified Delivery", detail: "Candidates receive the verified paper inside the lockdown browser. Audit trail signed end-to-end.", hash: "0x6e93…0c58" },
];

function VaultPage() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const tick = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          if (step >= STEPS.length - 1) { setPlaying(false); return 100; }
          setStep((s) => s + 1);
          return 0;
        }
        return p + 4;
      });
    }, 80); // ~50 frames per step => ~4s per step, ~24s total
    return () => clearInterval(tick);
  }, [playing, step]);

  const reset = () => { setStep(0); setProgress(0); setPlaying(false); };

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground">
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
          <div className="relative mx-auto max-w-5xl px-4 sm:px-6 py-20 md:py-28 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur px-4 py-1.5 text-xs font-medium mb-6">
              <span className="h-2 w-2 rounded-full bg-accent animate-pulse" /> The Anti-Leak Engine
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">TriShield Vault</h1>
            <p className="mt-6 mx-auto max-w-2xl text-lg text-primary-foreground/80">
              Three layers of cryptography. Six steps from author to candidate. Zero paper leaks since launch — by mathematical guarantee, not by promise.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" variant="secondary" onClick={() => { setPlaying(true); if (step >= STEPS.length - 1) reset(); }} className="shadow-elegant">
                {playing ? <><Pause className="mr-2 h-5 w-5" />Pause walkthrough</> : <><Play className="mr-2 h-5 w-5" />Play the 6-step demo</>}
              </Button>
              <Button size="lg" variant="outline" onClick={reset} className="border-white/30 bg-white/5 text-primary-foreground hover:bg-white/10">
                <RotateCcw className="mr-2 h-4 w-4" /> Reset
              </Button>
            </div>
          </div>
        </section>

        {/* Walkthrough */}
        <section className="py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
              {/* Step list */}
              <ol className="space-y-2" aria-label="TriShield six-step process">
                {STEPS.map((s, i) => {
                  const Active = i === step;
                  const Done = i < step;
                  return (
                    <li key={s.title}>
                      <button
                        onClick={() => { setStep(i); setProgress(0); }}
                        className={`w-full text-left rounded-lg border p-4 transition flex items-start gap-3 ${
                          Active ? "border-accent bg-accent/5 shadow-elegant"
                          : Done ? "border-success/30 bg-success/5"
                          : "border-border bg-card hover:border-accent/40"
                        }`}
                        aria-current={Active ? "step" : undefined}
                      >
                        <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold text-sm ${
                          Done ? "bg-success text-success-foreground"
                          : Active ? "bg-accent text-accent-foreground"
                          : "bg-muted text-muted-foreground"
                        }`}>
                          {Done ? <CheckCircle2 className="h-5 w-5" /> : i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm">{s.title}</div>
                          <div className="text-xs text-muted-foreground truncate">{s.detail}</div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ol>

              {/* Active panel */}
              <Card className="p-8 relative overflow-hidden bg-gradient-to-br from-primary/[0.03] to-accent/[0.05] border-accent/20 shadow-elegant min-h-[420px]">
                <div className="absolute top-0 left-0 right-0 h-1 bg-muted">
                  <div className="h-full bg-gradient-accent transition-all duration-100" style={{ width: `${progress}%` }} />
                </div>
                <div key={step} className="animate-fade-up">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-hero text-primary-foreground shadow-elegant">
                      {(() => { const Ic = STEPS[step].icon; return <Ic className="h-7 w-7" />; })()}
                    </span>
                    <div>
                      <div className="text-xs uppercase tracking-wider text-accent font-bold">Step {step + 1} of {STEPS.length}</div>
                      <h2 className="text-2xl font-bold">{STEPS[step].title}</h2>
                    </div>
                  </div>
                  <p className="text-base leading-relaxed text-muted-foreground mb-6">{STEPS[step].detail}</p>

                  <div className="rounded-lg bg-foreground text-background p-4 font-mono text-sm overflow-x-auto">
                    <div className="text-muted-foreground/70 text-xs mb-1">{`// ${STEPS[step].title.toUpperCase()}`}</div>
                    <div className="text-success">trishield://vault/sealed</div>
                    <div className="opacity-80 mt-1">  hash: <span className="text-accent">{STEPS[step].hash}</span></div>
                    <div className="opacity-80">  algo: <span className="text-warning">{step < 2 ? "SHA-256" : step < 4 ? "AES-256-GCM" : "HMAC-SHA-512"}</span></div>
                    <div className="opacity-80">  status: <span className="text-success">VERIFIED</span></div>
                  </div>

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

        {/* Promise */}
        <section className="py-16 bg-card">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold">The mathematical promise</h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              A SHA-256 hash collision is computationally infeasible. Combined with time-locked AES-256-GCM and live web anomaly watch, the probability of an undetected leak approaches zero — and that's the only acceptable number.
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
