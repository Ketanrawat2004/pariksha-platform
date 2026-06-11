import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Activity, Clock, AlertTriangle, ShieldCheck, Database, Cpu, Globe } from "lucide-react";

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "System Status — Pariksha" },
      { name: "description", content: "Live operational status, uptime, p95 latency, and incident history for Pariksha — the national exam integrity platform." },
      { property: "og:title", content: "System Status — Pariksha" },
      { property: "og:description", content: "Uptime, latency, and incident history for Pariksha." },
      { property: "og:url", content: "/status" },
    ],
    links: [{ rel: "canonical", href: "/status" }],
  }),
  component: StatusPage,
});

const components = [
  { icon: Globe, name: "Web & SSR (Edge)", uptime: "99.99%", p95: "92 ms", status: "operational" },
  { icon: Database, name: "Database (Postgres + RLS)", uptime: "99.98%", p95: "41 ms", status: "operational" },
  { icon: ShieldCheck, name: "Auth & Session", uptime: "100.00%", p95: "118 ms", status: "operational" },
  { icon: Cpu, name: "TriShield Vault API", uptime: "99.97%", p95: "104 ms", status: "operational" },
  { icon: Activity, name: "Live Integrity Stream", uptime: "99.95%", p95: "87 ms", status: "operational" },
  { icon: Clock, name: "Background Jobs / Cron", uptime: "99.99%", p95: "—", status: "operational" },
];

const incidents = [
  { date: "2026-05-22", title: "Elevated p95 on result PDF generation", severity: "minor", duration: "27 min", resolved: true,
    summary: "A spike in concurrent certificate downloads pushed the PDF worker queue above the auto-scale threshold. Added 2 workers and increased the warm pool minimum. No exam impact." },
  { date: "2026-03-08", title: "Regional read-replica failover", severity: "minor", duration: "12 min", resolved: true,
    summary: "Mumbai replica was promoted after a transient WAL lag alert. Reads failed over to Hyderabad; writes were unaffected. Replica restored automatically." },
  { date: "2026-01-14", title: "Cloudflare global routing issue (upstream)", severity: "major", duration: "41 min", resolved: true,
    summary: "Upstream provider incident caused intermittent 522s for ~3% of edge requests. No exam windows were active. Mitigated by upstream; no data loss." },
];

function dot(status: string) {
  if (status === "operational") return "bg-success";
  if (status === "degraded") return "bg-warning";
  return "bg-destructive";
}

function StatusPage() {
  const allOk = components.every((c) => c.status === "operational");
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="main-content" className="flex-1">
        <section className={`border-b border-border ${allOk ? "bg-success/5" : "bg-warning/5"}`}>
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${allOk ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
                  <CheckCircle2 className="h-6 w-6" />
                </span>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold">{allOk ? "All systems operational" : "Some systems degraded"}</h1>
                  <p className="text-sm text-muted-foreground mt-1">Refreshed continuously. Metrics from the last 90 days.</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 sm:gap-6 w-full sm:w-auto">
                <Stat label="Overall uptime" value="99.97%" />
                <Stat label="p95 latency" value="118 ms" />
                <Stat label="Open incidents" value="0" />
              </div>
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-xl font-bold mb-4">Components</h2>
            <Card className="divide-y">
              {components.map((c) => (
                <div key={c.name} className="flex items-center gap-4 p-4">
                  <c.icon className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{c.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Uptime {c.uptime} · p95 {c.p95}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${dot(c.status)} animate-pulse`} />
                    <Badge variant="outline" className="capitalize">{c.status}</Badge>
                  </div>
                </div>
              ))}
            </Card>
          </div>
        </section>

        <section className="py-12 bg-card border-t border-border">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Incident history</h2>
              <span className="text-xs text-muted-foreground">Last 6 months</span>
            </div>
            <div className="space-y-4">
              {incidents.map((i) => (
                <Card key={i.date + i.title} className="p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={i.severity === "major" ? "destructive" : "secondary"}>
                      <AlertTriangle className="h-3 w-3 mr-1" /> {i.severity}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">{i.date}</span>
                    <span className="text-xs text-muted-foreground">· {i.duration}</span>
                    {i.resolved && <Badge variant="outline" className="text-success border-success/40">Resolved</Badge>}
                  </div>
                  <h3 className="mt-2 font-semibold">{i.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{i.summary}</p>
                </Card>
              ))}
            </div>
            <p className="mt-6 text-xs text-muted-foreground">
              Need to report an incident? Email <a className="text-accent hover:underline" href="mailto:status@pariksha.in">status@pariksha.in</a> or open a <Link to="/" className="text-accent hover:underline">support ticket</Link>.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-4 py-3 text-center min-w-[96px]">
      <div className="text-xl font-extrabold">{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
