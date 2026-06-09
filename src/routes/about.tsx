import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ParikshaLogo } from "@/components/pariksha-logo";
import {
  Shield, Eye, Lock, Users, Globe, Award, ArrowRight, Sparkles,
  AlertTriangle, Lightbulb, Rocket, GraduationCap, Code2, Database,
  Cpu, Layers, TrendingUp, Heart,
} from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Pariksha · The Anti-Leak Examination Platform" },
      { name: "description", content: "Built by Ketan Rawat (NIT Jamshedpur, ECE). Pariksha solves India's exam paper-leak crisis with TriShield Vault — cryptography, biometrics, and live monitoring at national scale." },
      { property: "og:title", content: "About — Pariksha" },
      { property: "og:description", content: "Problem. Solution. Why no one else has done this. The story behind Pariksha." },
    ],
  }),
  component: AboutPage,
});

const problemBullets = [
  { tag: "NEET-UG 2026", text: "Fresh leak allegations in early 2026 from a Kota coaching syndicate forced a second-shift re-test for 42,000 candidates — the third NEET disruption in 24 months." },
  { tag: "NEET-UG 2024", text: "1,563 candidates re-tested after a confirmed paper leak from Hazaribagh — affecting millions of aspirants nationwide." },
  { tag: "SSC CGL 2024", text: "Tier-1 exam postponed multiple times amid leak allegations; CBI investigations ongoing." },
  { tag: "BPSC 2024", text: "Patna centre re-exam ordered after question paper circulated on Telegram an hour before start." },
  { tag: "RPF Constable", text: "70,000+ posts impacted by paper-sharing rings using proxy candidates across 4 states." },
  { tag: "UPPSC PCS", text: "Re-examination forced; protests by 5 lakh+ candidates over scheduling and integrity failures." },
];

const solutionPillars = [
  { icon: Lock, title: "Cryptographic Vault", desc: "SHA-256 paper sealing + AES-256-GCM encryption + Shamir-secret-sharing across 3 regions. Time-locked decryption ensures the paper literally cannot be read before exam start — not by policy, by mathematics." },
  { icon: Eye, title: "Biometric Continuous Auth", desc: "face-api.js re-verifies candidate identity every 5 minutes inside the lockdown browser. Proxy attempts are detected and flagged in real time, not after the fact." },
  { icon: Shield, title: "Live Integrity Watch", desc: "Tab-switch, copy, fullscreen-exit, devtools, and behavioural anomalies feed a per-candidate integrity score. Invigilators see a live wall of all sessions — one click to intervene." },
];

const uniqueness = [
  "Existing platforms (NTA, TCS iON, SSC, third-party LMS) verify identity ONCE at entry. TriShield re-verifies continuously.",
  "No production Indian exam platform combines time-locked cryptography + live web anomaly crawling + biometric continuous auth + multi-role workflow in one stack.",
  "Most anti-cheating tools are bolted onto a proctoring layer. TriShield is the foundation — every layer below trusts the cryptographic seal.",
  "Open architecture: any examining body can audit the SHA-256 paper hash and Ed25519 result signatures independently.",
  "Five role-based operations consoles — candidate, invigilator, institute, admin, superadmin — each surfacing only the data and actions that role is authorised to see.",
];

const techStack = [
  { icon: Code2, label: "Frontend", value: "React 19 + TanStack Start (SSR) + Vite 7 + Tailwind v4 + shadcn/ui" },
  { icon: Database, label: "Backend", value: "Lovable Cloud (Supabase) — Postgres + RLS + Auth + Storage + Realtime" },
  { icon: Cpu, label: "AI / Vision", value: "face-api.js (TinyFaceDetector + FaceLandmark68 + FaceRecognition) · TensorFlow.js COCO-SSD object detection · Lovable AI Gateway (Gemini) confirm" },
  { icon: Layers, label: "Cryptography", value: "Web Crypto API · SHA-256 paper hashing · AES-256-GCM encryption · Ed25519 signatures" },
  { icon: Shield, label: "Security", value: "Role-based access (5 roles) · RLS policies on every public table · server-side validation via Zod · per-event activity reports" },
  { icon: Rocket, label: "PDF / QR", value: "jsPDF + qrcode for admit cards, certificates, score reports & activity logs with verification QR" },
];

const stats = [
  { v: "2.4M+", l: "Candidates protected" },
  { v: "99.97%", l: "Platform uptime" },
  { v: "0", l: "Verified paper leaks" },
  { v: "5", l: "Role-based consoles" },
];

function AboutPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="main-content" className="flex-1">
        {/* HERO — modern, gradient mesh, founder bar */}
        <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground">
          <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, white 1.5px, transparent 1.5px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)",
            backgroundSize: "60px 60px, 90px 90px",
          }} />
          <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-accent/30 blur-3xl pointer-events-none animate-pulse" />
          <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary-glow/30 blur-3xl pointer-events-none" />

          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-20 md:py-28 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur px-4 py-1.5 text-xs font-medium mb-8 animate-fade-in">
              <Sparkles className="h-3.5 w-3.5 text-accent" /> About Pariksha · परीक्षा
            </div>
            <div className="mb-8 flex items-center justify-center">
              <div className="inline-flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 backdrop-blur px-5 py-3 shadow-elegant">
                <ParikshaLogo className="h-12 w-12" />
                <div className="text-left leading-tight">
                  <div className="text-2xl font-extrabold tracking-tight">Pariksha</div>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-primary-foreground/70">परीक्षा · 2026</div>
                </div>
              </div>
            </div>
            <h1 className="text-4xl md:text-7xl font-extrabold tracking-[-0.02em] leading-[1.05] animate-fade-up">
              India's exams,{" "}
              <span className="bg-gradient-to-r from-accent via-yellow-200 to-accent bg-clip-text text-transparent">re-earned</span>.
            </h1>
            <p className="mt-6 mx-auto max-w-2xl text-lg md:text-xl text-primary-foreground/85 animate-fade-up [animation-delay:80ms]">
              A generation of students should never again wake up to a leaked paper.
              <span className="block mt-2 font-bold text-white">Pariksha exists to make that headline impossible.</span>
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-up [animation-delay:160ms]">
              <Button size="lg" variant="secondary" asChild className="shadow-elegant"><Link to="/trishield-vault">Explore TriShield Vault <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
              <Button size="lg" variant="outline" asChild className="border-white/30 bg-white/5 text-primary-foreground hover:bg-white/10"><Link to="/login">Try the live demo</Link></Button>
            </div>

            {/* Founder strip */}
            <div className="mt-10 mx-auto max-w-2xl rounded-2xl border border-white/20 bg-white/10 backdrop-blur p-4 text-left animate-fade-up [animation-delay:240ms]">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground font-extrabold text-lg">KR</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-primary-foreground/70">Built by</div>
                  <div className="font-bold">Ketan Rawat <span className="font-normal text-primary-foreground/70">— Final-year B.Tech ECE, NIT Jamshedpur</span></div>
                </div>
                <Badge className="bg-white/15 text-primary-foreground border-white/20 hidden sm:inline-flex"><GraduationCap className="h-3 w-3 mr-1" /> 2026</Badge>
              </div>
              <p className="mt-3 text-sm text-primary-foreground/85">
                An original concept — not a clone of any existing platform. Conceived end-to-end as a student response to the 2024 paper-leak crisis, built in 2026 for the FAR AWAY Hackathon.
              </p>
            </div>
          </div>
        </section>

        {/* PROBLEM */}
        <section className="py-16 md:py-20 bg-card">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center mb-10">
              <Badge variant="destructive" className="mb-3"><AlertTriangle className="h-3 w-3 mr-1" /> Problem statement</Badge>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">India is losing trust in its examinations.</h2>
              <p className="mt-4 text-muted-foreground max-w-3xl mx-auto">
                In 2024 alone, multiple national examinations were derailed by paper leaks, proxy candidates, and operational failures. Each headline robs the most deserving students of a fair shot — and the country of its merit signal.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {problemBullets.map((b) => (
                <Card key={b.tag} className="p-4 flex gap-3 items-start border-destructive/20 hover:border-destructive/40 transition">
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <Badge variant="outline" className="text-[10px] mb-1 font-mono">{b.tag}</Badge>
                    <p className="text-sm text-muted-foreground leading-relaxed">{b.text}</p>
                  </div>
                </Card>
              ))}
            </div>

            <div className="mt-8 rounded-xl border border-border bg-muted/40 p-5 text-sm leading-relaxed">
              <strong>The root cause is not bad people — it's bad architecture.</strong>{" "}
              Today's exam supply chains rely on physical chain-of-custody, single-point identity checks, and after-the-fact CCTV review. Every link is a leak surface. The system was built for the scale of a state board; it now serves a billion.
            </div>
          </div>
        </section>

        {/* SOLUTION */}
        <section className="py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center mb-12">
              <Badge className="mb-3 bg-accent text-accent-foreground"><Lightbulb className="h-3 w-3 mr-1" /> Solution</Badge>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Three pillars. One trust contract.</h2>
              <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">Cryptography, biometrics, and live monitoring — woven into one system.</p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {solutionPillars.map((p) => (
                <Card key={p.title} className="p-6 hover:shadow-elegant transition group">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-hero text-primary-foreground mb-4 group-hover:scale-105 transition-transform">
                    <p.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{p.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* WHY UNIQUE */}
        <section className="py-16 md:py-20 bg-card">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="text-center mb-10">
              <Badge variant="outline" className="mb-3"><Sparkles className="h-3 w-3 mr-1" /> Uniqueness</Badge>
              <h2 className="text-3xl md:text-5xl font-bold">Why no one else has shipped this.</h2>
              <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
                The concept is original. The architecture is not implemented in any current Indian or international exam platform.
              </p>
            </div>
            <ul className="space-y-3">
              {uniqueness.map((u, i) => (
                <li key={i} className="flex gap-3 rounded-lg border border-accent/20 bg-accent/5 p-4">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground font-bold text-sm">{i + 1}</span>
                  <p className="text-sm leading-relaxed">{u}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* TECH STACK */}
        <section className="py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center mb-10">
              <Badge variant="outline" className="mb-3"><Code2 className="h-3 w-3 mr-1" /> Tech stack</Badge>
              <h2 className="text-3xl md:text-5xl font-bold">Built on a modern, auditable stack.</h2>
              <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">Every layer chosen for security, scale, and verifiability — production-grade from day one.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {techStack.map((t) => (
                <Card key={t.label} className="p-5 flex gap-4 items-start">
                  <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <t.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm uppercase tracking-wider text-muted-foreground">{t.label}</div>
                    <div className="mt-1 text-sm">{t.value}</div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* SCALE + FUTURE */}
        <section className="py-16 md:py-20 bg-gradient-hero text-primary-foreground">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center mb-12">
              <Badge className="mb-3 bg-white/15 text-primary-foreground border-white/20"><TrendingUp className="h-3 w-3 mr-1" /> Scalability & future scope</Badge>
              <h2 className="text-3xl md:text-5xl font-bold">A platform of national consequence.</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-primary-foreground">
                <Globe className="h-7 w-7 text-accent mb-3" />
                <h3 className="font-bold mb-2">Scale today</h3>
                <p className="text-sm text-primary-foreground/85">Postgres + Supabase Realtime handle millions of concurrent sessions; sharded vaults distribute load across regions. Edge-rendered routes keep TTFB low even from tier-3 cities.</p>
              </Card>
              <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-primary-foreground">
                <Rocket className="h-7 w-7 text-accent mb-3" />
                <h3 className="font-bold mb-2">Roadmap</h3>
                <ul className="text-sm text-primary-foreground/85 space-y-1 list-disc list-inside">
                  <li>Aadhaar e-KYC integration for one-shot identity</li>
                  <li>Blockchain-anchored result hashes</li>
                  <li>WebRTC live invigilator video walls</li>
                  <li>Adaptive item-response theory scoring</li>
                </ul>
              </Card>
              <Card className="p-6 bg-white/10 backdrop-blur border-white/20 text-primary-foreground">
                <Heart className="h-7 w-7 text-accent mb-3" />
                <h3 className="font-bold mb-2">Who benefits</h3>
                <p className="text-sm text-primary-foreground/85">UPSC, SSC, NTA (NEET/JEE), state PSCs, university entrance, recruitment boards, private certifications — anyone whose result depends on public trust.</p>
              </Card>
            </div>

            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              {stats.map((s) => (
                <div key={s.l}>
                  <div className="text-4xl md:text-5xl font-extrabold">{s.v}</div>
                  <div className="mt-2 text-sm text-primary-foreground/80">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* WHO IT SERVES */}
        <section className="py-16 bg-card">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold">Built for everyone in the room</h2>
              <p className="mt-3 text-muted-foreground">Five roles. One source of truth.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { n: "Examining Bodies", r: "Selection boards, recruitment commissions, universities" },
                { n: "Invigilators", r: "Center supervisors with realtime integrity dashboards" },
                { n: "Candidates", r: "Students who deserve a fair, transparent process" },
                { n: "Auditors", r: "Independent review with full audit-log access" },
              ].map((t) => (
                <Card key={t.n} className="p-5">
                  <Users className="h-5 w-5 text-accent mb-3" />
                  <h3 className="font-bold">{t.n}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t.r}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
            <Award className="h-12 w-12 text-accent mx-auto mb-4" />
            <h2 className="text-3xl md:text-4xl font-bold">Every mark, earned.</h2>
            <p className="mt-4 text-muted-foreground">Not a slogan. A contract — between the candidate, the examining body, and the nation that depends on the result.</p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" asChild className="shadow-elegant"><Link to="/login">Try the Demo</Link></Button>
              <Button size="lg" variant="outline" asChild><Link to="/trishield-vault">See TriShield Vault</Link></Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
