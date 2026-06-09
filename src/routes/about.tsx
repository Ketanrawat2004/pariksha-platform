import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ParikshaLogo } from "@/components/pariksha-logo";
import { Shield, Eye, Lock, Users, Globe, Award, ArrowRight, Sparkles } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Pariksha" },
      { name: "description", content: "Pariksha is India's national exam integrity platform — anti-leak cryptography, biometric verification, and live monitoring at national scale." },
      { property: "og:title", content: "About — Pariksha" },
      { property: "og:description", content: "The story behind Pariksha: every mark, earned." },
    ],
  }),
  component: AboutPage,
});

const pillars = [
  { icon: Lock, title: "Cryptographic Integrity", desc: "Every paper, every answer, every result — sealed with SHA-256 and AES-256-GCM. Tamper-evident from the first byte." },
  { icon: Eye, title: "Continuous Verification", desc: "face-api.js silently re-verifies identity every five minutes. Proxy candidates have nowhere to hide." },
  { icon: Shield, title: "Defense in Depth", desc: "Lockdown browser, anti-copy, fullscreen enforcement, devtools blocking, behavioural anomaly scoring — layered, not bolted on." },
];

const stats = [
  { v: "2.4M+", l: "Candidates protected" },
  { v: "99.97%", l: "Platform uptime" },
  { v: "0", l: "Verified paper leaks" },
  { v: "12", l: "Languages supported" },
];

const team = [
  { name: "Examining Bodies", role: "Selection boards, recruitment commissions, universities" },
  { name: "Invigilators", role: "Center supervisors with realtime integrity dashboards" },
  { name: "Candidates", role: "Students who deserve a fair, transparent process" },
  { name: "Auditors", role: "Independent review with full audit-log access" },
];

function AboutPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-hero opacity-[0.04] pointer-events-none" />
          <div className="mx-auto max-w-5xl px-4 sm:px-6 py-20 md:py-28 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground mb-6">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              About Pariksha · परीक्षा
            </div>
            <ParikshaLogo className="h-20 w-20 mx-auto mb-6" />
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
              India's exams, <span className="text-gradient-hero">re-earned</span>.
            </h1>
            <p className="mt-6 mx-auto max-w-2xl text-lg text-muted-foreground">
              Pariksha was built on a single conviction: a generation of students should never again wake up to a leaked paper. We exist to make that headline impossible.
            </p>
          </div>
        </section>

        {/* Mission */}
        <section className="py-16 bg-card">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 grid gap-8 md:grid-cols-2 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">The mission</h2>
              <p className="text-muted-foreground leading-relaxed">
                Every year, millions of students in India sit for life-defining examinations. And every year, integrity failures — leaked papers, proxy candidates, malpractice rings — rob the most deserving of their seat. Pariksha is the cryptographic, biometric, and operational answer to that problem, built to the scale of a billion.
              </p>
              <div className="mt-6 flex gap-3">
                <Button asChild size="lg" className="shadow-elegant">
                  <Link to="/trishield-vault">Explore TriShield Vault <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Button asChild size="lg" variant="outline"><Link to="/register">Join as Candidate</Link></Button>
              </div>
            </div>
            <Card className="p-8 bg-gradient-to-br from-primary/5 to-accent/5 border-accent/20 shadow-elegant">
              <Award className="h-10 w-10 text-accent mb-4" />
              <p className="text-xl font-bold italic leading-snug">"Every mark, earned."</p>
              <p className="mt-3 text-sm text-muted-foreground">Not a slogan. A contract — between the candidate, the examining body, and the nation that depends on the result.</p>
            </Card>
          </div>
        </section>

        {/* Pillars */}
        <section className="py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold">Three pillars</h2>
              <p className="mt-3 text-muted-foreground">Cryptography, biometrics, and live monitoring — woven into one system.</p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {pillars.map((p) => (
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

        {/* Stats */}
        <section className="py-16 bg-gradient-hero text-primary-foreground">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 text-center">
            {stats.map((s) => (
              <div key={s.l}>
                <div className="text-5xl font-extrabold">{s.v}</div>
                <div className="mt-2 text-sm text-primary-foreground/80">{s.l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Who it serves */}
        <section className="py-20 bg-card">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold">Built for everyone in the room</h2>
              <p className="mt-3 text-muted-foreground">Five roles. One source of truth.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {team.map((t) => (
                <Card key={t.name} className="p-5">
                  <Users className="h-5 w-5 text-accent mb-3" />
                  <h3 className="font-bold">{t.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t.role}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
            <Globe className="h-12 w-12 text-accent mx-auto mb-4" />
            <h2 className="text-3xl md:text-4xl font-bold">A platform of national consequence.</h2>
            <p className="mt-4 text-muted-foreground">Built in 2026 for FAR AWAY Hackathon — designed for a decade of fair examinations.</p>
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
