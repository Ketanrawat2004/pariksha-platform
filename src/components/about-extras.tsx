import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Cpu, TrendingUp, Users, Award } from "lucide-react";

export default function AboutExtras() {
  return (
    <>
      <section className="py-16 bg-gradient-to-b from-background to-secondary/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-10">
            <Badge variant="outline" className="mb-3"><Cpu className="h-3.5 w-3.5 mr-1" /> Capacity at a glance</Badge>
            <h2 className="text-3xl md:text-4xl font-bold">Built to carry a nation on exam day</h2>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
              Pariksha is engineered for the worst-case spike — millions of candidates clicking "Start" in the same minute. Edge-served SSR, autoscaling Postgres, and a stateless integrity pipeline keep latency flat under load.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { v: "1M+", l: "Concurrent candidates", d: "Tested ceiling per exam window with horizontally scaled SSR workers." },
              { v: "10K", l: "RPS sustained", d: "Cloudflare edge absorbs bursts; origin queries cached at the read replica." },
              { v: "< 120ms", l: "p95 API latency", d: "Postgres read replicas + connection pooling per region." },
              { v: "200+", l: "Centres in parallel", d: "Per-centre integrity streams multiplexed over a single invigilator console." },
              { v: "5 min", l: "Bio re-verify cycle", d: "On-device face-api inference — no server round-trip per check." },
              { v: "3×", l: "Geo redundancy", d: "Shamir 3-of-3 key shards in independent regions. No single region can decrypt alone." },
            ].map((s) => (
              <Card key={s.l} className="p-6">
                <div className="text-3xl font-extrabold text-accent">{s.v}</div>
                <div className="mt-1 font-semibold">{s.l}</div>
                <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
              </Card>
            ))}
          </div>

          <Card className="mt-8 p-6 bg-card/60">
            <h3 className="font-bold flex items-center gap-2"><TrendingUp className="h-5 w-5 text-accent" /> How the server holds up under peak load</h3>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 text-sm text-muted-foreground">
              <li>• Stateless SSR on Cloudflare Workers — autoscales horizontally to absorb T-0 spikes.</li>
              <li>• Postgres with row-level security + read replicas; writes batched, reads cached at the edge.</li>
              <li>• Biometric inference runs in the candidate's browser — zero server CPU per heartbeat.</li>
              <li>• Anomaly events stream through a back-pressured queue so invigilator dashboards never block.</li>
              <li>• Static assets (admit cards, syllabus, certificates) pre-rendered and served from CDN.</li>
              <li>• Graceful degradation: if AI-vision is throttled, integrity scoring falls back to behavioural signals.</li>
            </ul>
          </Card>
        </div>
      </section>

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
    </>
  );
}
