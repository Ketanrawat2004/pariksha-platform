import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Activity, AlertTriangle, RefreshCw } from "lucide-react";
import { getStatusMetrics, recordPing, type StatusMetrics } from "@/lib/status/status.functions";

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "System Status — Pariksha" },
      { name: "description", content: "Live operational status, uptime, p95 latency, and incident history for Pariksha." },
      { property: "og:title", content: "System Status — Pariksha" },
      { property: "og:description", content: "Real-time uptime, latency, and incident history for Pariksha." },
      { property: "og:url", content: "/status" },
    ],
    links: [{ rel: "canonical", href: "/status" }],
  }),
  component: StatusPage,
});

function dotClass(ok: boolean) {
  return ok ? "bg-success" : "bg-destructive";
}

async function measureAndRecord() {
  const t0 = performance.now();
  let ok = true;
  try {
    const res = await fetch("/api/public/ping", { cache: "no-store" });
    ok = res.ok;
  } catch {
    ok = false;
  }
  const latency_ms = Math.min(59999, Math.max(0, Math.round(performance.now() - t0)));
  try {
    await recordPing({ data: { component: "web", latency_ms, ok } });
  } catch {
    /* ignore */
  }
}

function StatusPage() {
  const qc = useQueryClient();
  const [measuring, setMeasuring] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["status-metrics"],
    queryFn: () => getStatusMetrics(),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      await measureAndRecord();
      if (mounted) qc.invalidateQueries({ queryKey: ["status-metrics"] });
    })();
    const id = setInterval(async () => {
      await measureAndRecord();
      qc.invalidateQueries({ queryKey: ["status-metrics"] });
    }, 60_000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [qc]);

  const m: StatusMetrics =
    data ?? { uptimePct: 100, p95Ms: 0, p50Ms: 0, openIncidents: 0, totalPings: 0, components: [], incidents: [] };
  const allOk = m.components.every((c) => c.ok) && m.openIncidents === 0;

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="main-content" className="flex-1">
        <section className={`border-b border-border ${allOk ? "bg-success/5" : "bg-warning/5"}`}>
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${allOk ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
                  <CheckCircle2 className="h-6 w-6" />
                </span>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold">{allOk ? "All systems operational" : "Some systems degraded"}</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Measured from {m.totalPings.toLocaleString()} live checks over the last 90 days.{" "}
                    <button
                      className="inline-flex items-center gap-1 text-accent hover:underline"
                      onClick={async () => {
                        setMeasuring(true);
                        await measureAndRecord();
                        await qc.invalidateQueries({ queryKey: ["status-metrics"] });
                        setMeasuring(false);
                      }}
                    >
                      <RefreshCw className={`h-3 w-3 ${measuring ? "animate-spin" : ""}`} /> Run check
                    </button>
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-4 w-full sm:w-auto">
                <Stat label="Uptime · 90d" value={isLoading ? "…" : `${m.uptimePct.toFixed(2)}%`} />
                <Stat label="p95 · 24h" value={isLoading ? "…" : `${m.p95Ms} ms`} />
                <Stat label="Open" value={`${m.openIncidents}`} />
              </div>
            </div>
          </div>
        </section>

        <section className="py-10 sm:py-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-xl font-bold mb-4">Components</h2>
            <Card className="divide-y">
              {m.components.map((c) => (
                <div key={c.name} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4">
                  <Activity className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{c.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Uptime {c.uptimePct.toFixed(2)}% · p95 {c.p95Ms || "—"} ms
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${dotClass(c.ok)} animate-pulse`} />
                    <Badge variant="outline" className="capitalize hidden sm:inline-flex">
                      {c.ok ? "operational" : "degraded"}
                    </Badge>
                  </div>
                </div>
              ))}
              {m.components.length === 0 && (
                <div className="p-6 text-sm text-muted-foreground text-center">Gathering first measurements…</div>
              )}
            </Card>
          </div>
        </section>

        <section className="py-10 sm:py-12 bg-card border-t border-border">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Incident history</h2>
              <span className="text-xs text-muted-foreground">Latest 20</span>
            </div>
            <div className="space-y-3 sm:space-y-4">
              {m.incidents.length === 0 ? (
                <Card className="p-6 text-sm text-muted-foreground text-center">
                  No incidents recorded. 🎉
                </Card>
              ) : (
                m.incidents.map((i) => (
                  <Card key={i.id} className="p-4 sm:p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={i.severity === "critical" ? "destructive" : i.severity === "major" ? "destructive" : "secondary"}>
                        <AlertTriangle className="h-3 w-3 mr-1" /> {i.severity}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">
                        {new Date(i.started_at).toISOString().slice(0, 10)}
                      </span>
                      <Badge variant="outline" className="capitalize">{i.status}</Badge>
                      {i.resolved_at && <Badge variant="outline" className="text-success border-success/40">Resolved</Badge>}
                    </div>
                    <h3 className="mt-2 font-semibold">{i.title}</h3>
                    {i.summary && <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{i.summary}</p>}
                  </Card>
                ))
              )}
            </div>
            <p className="mt-6 text-xs text-muted-foreground">
              Need to report an incident? Email{" "}
              <a className="text-accent hover:underline" href="mailto:status@pariksha.in">status@pariksha.in</a>{" "}
              or open a <Link to="/login" className="text-accent hover:underline">support ticket</Link>.
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
    <div className="rounded-lg border border-border bg-background px-3 sm:px-4 py-2 sm:py-3 text-center min-w-[80px]">
      <div className="text-base sm:text-xl font-extrabold tabular-nums">{value}</div>
      <div className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
