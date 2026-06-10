import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Shield, Eye, Lock, Zap, FileCheck, Globe, ArrowRight, CheckCircle2,
  UserCheck, MonitorCheck, GraduationCap, MonitorPlay, ShieldCheck, Camera, Wifi, PlayCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ChatbotWidget } from "@/components/chatbot-widget";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pariksha — Every mark, earned." },
      { name: "description", content: "India's national exam integrity platform. 2.4M+ candidates protected. Zero paper leaks." },
      { property: "og:title", content: "Pariksha — Every mark, earned." },
      { property: "og:description", content: "India's national exam integrity platform." },
    ],
  }),
  component: LandingPage,
});

function useCounter(target: number, duration = 2000) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setValue(Math.floor(p * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

const features = [
  { icon: FileCheck, title: "Anti-Leak Paper System", desc: "Every question paper hashed with SHA-256. Any leak detected the instant it surfaces." },
  { icon: UserCheck, title: "AI Proxy Detection", desc: "Real-time face matching with face-api.js. Silent verification every 5 minutes during the exam." },
  { icon: MonitorCheck, title: "Live Integrity Monitor", desc: "Realtime feed of every tab switch, copy attempt, and fullscreen exit. Severity-scored." },
  { icon: Lock, title: "Encrypted Questions", desc: "AES-256-GCM encryption. Question content never touches the client until the session is verified." },
  { icon: Zap, title: "Instant Results", desc: "Auto-graded the moment you submit. Rank, percentile, certificate — all generated instantly." },
  { icon: Globe, title: "National Scale", desc: "Built for millions. Multi-center, multi-role, multi-language ready from day one." },
];

const steps = [
  { n: 1, title: "Register", desc: "Sign up with email, Aadhaar (hashed client-side), and a verified face photo.", icon: GraduationCap },
  { n: 2, title: "Verify", desc: "Identity confirmed at the exam center. Get your admit card with QR.", icon: UserCheck },
  { n: 3, title: "Examine", desc: "Take the exam in our locked-down browser with live integrity scoring.", icon: MonitorCheck },
  { n: 4, title: "Result", desc: "Score, rank, and a verifiable certificate — minutes after submission.", icon: CheckCircle2 },
];

const testimonials = [
  { quote: "Pariksha is the most comprehensive integrity stack we have evaluated. Anti-leak detection is industry-leading.", who: "Selection Board — Civil Services" },
  { quote: "Zero proxy candidates flagged after rollout in 12 districts. The face verification just works.", who: "State Recruitment Commission" },
  { quote: "We piloted Pariksha for our medical entrance and the integrity dashboard caught patterns we'd never seen.", who: "National Testing Body" },
];

function LandingPage() {
  const candidates = useCounter(2_400_000);
  const uptime = useCounter(997);
  const leaks = useCounter(0);

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-hero opacity-[0.03] pointer-events-none" />
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 md:py-32 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground mb-6 animate-fade-up">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              Live · 2.4M candidates protected today
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight animate-fade-up">
              <span className="text-gradient-hero">Pariksha</span>
              <span className="block mt-3 text-3xl md:text-5xl text-foreground">
                Every mark,{" "}
                <span className="relative inline-block">
                  earned
                  <span className="absolute -bottom-2 left-0 right-0 h-1.5 bg-accent rounded-full animate-underline" />
                </span>
                .
              </span>
            </h1>
            <p className="mt-8 mx-auto max-w-2xl text-lg text-muted-foreground animate-fade-up" style={{ animationDelay: "0.1s" }}>
              India's national examination integrity platform. Cryptographic anti-leak, AI proxy detection, and real-time monitoring — built for the scale of a billion.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-up" style={{ animationDelay: "0.2s" }}>
              <Button size="lg" asChild className="bg-accent hover:bg-accent/90 shadow-elegant">
                <Link to="/give-exam"><PlayCircle className="mr-2 h-5 w-5" /> Give Exam</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/register">Register as Candidate <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="ghost" asChild>
                <Link to="/login">Institution Login</Link>
              </Button>
            </div>

            {/* Counters */}
            <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <Card className="p-6 shadow-elegant">
                <div className="text-4xl font-extrabold text-gradient-hero">
                  {(candidates / 1_000_000).toFixed(1)}M+
                </div>
                <div className="mt-2 text-sm text-muted-foreground">Candidates protected</div>
              </Card>
              <Card className="p-6 shadow-elegant">
                <div className="text-4xl font-extrabold text-gradient-hero">{(uptime / 10).toFixed(1)}%</div>
                <div className="mt-2 text-sm text-muted-foreground">Platform uptime</div>
              </Card>
              <Card className="p-6 shadow-elegant">
                <div className="text-4xl font-extrabold text-accent">{leaks}</div>
                <div className="mt-2 text-sm text-muted-foreground">Paper leaks since launch</div>
              </Card>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-20 bg-card">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold">Six pillars of exam integrity</h2>
              <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">Every feature designed for one outcome: results you can trust.</p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <Card key={f.title} className="p-6 hover:shadow-elegant transition-shadow group">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-hero text-primary-foreground mb-4 group-hover:scale-105 transition-transform">
                    <f.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Exam Mode */}
        <section id="exam-mode" className="py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent mb-3">
                <MonitorPlay className="h-3.5 w-3.5" /> Exam Mode
              </div>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">A lockdown browser that watches the room.</h2>
              <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
                The moment the exam starts, Pariksha takes over the tab — fullscreen, copy-disabled, devtools-blocked, with continuous face verification and a per-second integrity score.
              </p>
            </div>
            <div className="grid gap-6 lg:grid-cols-5 items-stretch">
              {/* Mock browser */}
              <Card className="lg:col-span-3 p-0 overflow-hidden shadow-elegant">
                <div className="flex items-center gap-2 border-b border-border bg-muted/60 px-4 py-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
                  <span className="ml-3 flex-1 rounded bg-background px-2 py-1 text-[11px] font-mono text-muted-foreground truncate">
                    pariksha.app/exam/locked • secured session
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">
                    <ShieldCheck className="h-3 w-3" /> LOCKED
                  </span>
                </div>
                <div className="grid gap-0 sm:grid-cols-[1fr,180px]">
                  <div className="p-5">
                    <div className="text-xs text-muted-foreground">Question 14 / 60</div>
                    <h3 className="mt-1 font-bold">If the SHA-256 hash of a question paper changes after publication, the platform should…</h3>
                    <ul className="mt-4 space-y-2 text-sm">
                      {["Auto-cancel the exam center-wide","Notify only the proctor","Suspend the candidate's session","Flag the paper as tampered and freeze results"].map((o, i) => (
                        <li key={i} className={`rounded-lg border px-3 py-2 ${i===3?"border-accent bg-accent/10":"border-border"}`}>
                          <span className="mr-2 font-mono text-xs text-muted-foreground">{String.fromCharCode(65+i)}.</span>{o}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <aside className="border-t sm:border-t-0 sm:border-l border-border bg-card p-4 space-y-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Time left</div>
                      <div className="font-mono text-2xl font-extrabold">01:42:18</div>
                    </div>
                    <div className="rounded-lg border border-border p-2">
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                        <Camera className="h-3 w-3" /> Identity
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                        <span className="text-xs font-semibold">Match · 98%</span>
                      </div>
                    </div>
                    <div className="rounded-lg border border-border p-2">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Integrity</div>
                      <div className="mt-1 text-xs font-bold text-success">100 / 100</div>
                    </div>
                  </aside>
                </div>
              </Card>

              {/* Side rules */}
              <div className="lg:col-span-2 grid gap-3">
                {[
                  { icon: Lock, t: "Fullscreen lockdown", d: "Exit attempts pause the timer and log an event." },
                  { icon: Camera, t: "Continuous face match", d: "Re-verified every 5 minutes via face-api.js." },
                  { icon: Wifi, t: "Offline-resilient", d: "Answers queue locally and resync on reconnect." },
                  { icon: Eye, t: "Anti-cheat heuristics", d: "Tab-switch, copy, devtools, mouse-exit — all scored." },
                ].map((r) => (
                  <Card key={r.t} className="p-4 flex gap-3 items-start">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <r.icon className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="font-semibold text-sm">{r.t}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{r.d}</div>
                    </div>
                  </Card>
                ))}
                <Button asChild className="mt-1 bg-accent hover:bg-accent/90"><Link to="/give-exam"><PlayCircle className="mr-2 h-4 w-4" /> Give Exam</Link></Button>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold">From sign-up to certificate</h2>
              <p className="mt-3 text-muted-foreground">Four steps. Zero compromises.</p>
            </div>
            <div className="grid gap-6 md:gap-4 md:grid-cols-4 relative">
              {steps.map((s, i) => (
                <div key={s.n} className="relative">
                  <Card className="p-6 h-full">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground font-bold shadow-md">{s.n}</span>
                      <s.icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <h3 className="font-bold text-lg">{s.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
                  </Card>
                  {i < steps.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="hidden md:flex absolute top-1/2 -right-2 -translate-y-1/2 translate-x-1/2 z-10 h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-md ring-2 ring-background"
                    >
                      <ArrowRight className="h-4 w-4" strokeWidth={3} />
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20 bg-card">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold">Trusted by examining bodies</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {testimonials.map((t) => (
                <Card key={t.who} className="p-6">
                  <Shield className="h-6 w-6 text-accent mb-4" />
                  <p className="italic text-foreground">"{t.quote}"</p>
                  <p className="mt-4 text-sm font-semibold text-muted-foreground">— {t.who}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
            <h2 className="text-3xl md:text-5xl font-bold">Stop the cheating. Start the trust.</h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">Join the institutions building India's next generation of fair, verifiable examinations.</p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" asChild className="shadow-elegant"><Link to="/register">Register as Candidate</Link></Button>
              <Button size="lg" variant="outline" asChild><Link to="/login">Institution Login</Link></Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
      <ChatbotWidget />
    </div>
  );
}
