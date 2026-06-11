import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type StatusMetrics = {
  uptimePct: number;
  p95Ms: number;
  p50Ms: number;
  openIncidents: number;
  totalPings: number;
  components: Array<{ name: string; uptimePct: number; p95Ms: number; ok: boolean }>;
  incidents: Array<{
    id: string;
    title: string;
    severity: string;
    status: string;
    summary: string;
    started_at: string;
    resolved_at: string | null;
  }>;
};

const COMPONENT_LABELS: Record<string, string> = {
  web: "Web & SSR (Edge)",
  db: "Database (Postgres + RLS)",
  auth: "Auth & Session",
  vault: "TriShield Vault API",
  integrity: "Live Integrity Stream",
  jobs: "Background Jobs / Cron",
};

function percentile(values: number[], p: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

export const getStatusMetrics = createServerFn({ method: "GET" }).handler(
  async (): Promise<StatusMetrics> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const since90d = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [pings90, pings24, incidentsRes] = await Promise.all([
      supabaseAdmin
        .from("status_pings")
        .select("component, ok, latency_ms")
        .gte("created_at", since90d)
        .limit(50000),
      supabaseAdmin
        .from("status_pings")
        .select("component, ok, latency_ms")
        .gte("created_at", since24h)
        .limit(20000),
      supabaseAdmin
        .from("incidents")
        .select("id, title, severity, status, summary, started_at, resolved_at")
        .order("started_at", { ascending: false })
        .limit(20),
    ]);

    const all90 = pings90.data ?? [];
    const all24 = pings24.data ?? [];
    const incidents = incidentsRes.data ?? [];

    const okCount = all90.filter((p) => p.ok).length;
    const uptimePct = all90.length > 0 ? (okCount / all90.length) * 100 : 100;
    const lat24 = all24.map((p) => p.latency_ms).filter((n) => Number.isFinite(n));
    const p95 = percentile(lat24, 95);
    const p50 = percentile(lat24, 50);

    const componentNames = Array.from(
      new Set([...Object.keys(COMPONENT_LABELS), ...all90.map((p) => p.component)]),
    );
    const components = componentNames.map((c) => {
      const rows = all90.filter((p) => p.component === c);
      const ok = rows.filter((p) => p.ok).length;
      const recent24 = all24.filter((p) => p.component === c).map((p) => p.latency_ms);
      const lastHourRows = rows.slice(-20);
      const recentlyOk = lastHourRows.length === 0 || lastHourRows.some((r) => r.ok);
      return {
        name: COMPONENT_LABELS[c] ?? c,
        uptimePct: rows.length > 0 ? (ok / rows.length) * 100 : 100,
        p95Ms: percentile(recent24, 95),
        ok: recentlyOk,
      };
    });

    const openIncidents = incidents.filter((i) => i.status !== "resolved").length;

    return {
      uptimePct,
      p95Ms: p95,
      p50Ms: p50,
      openIncidents,
      totalPings: all90.length,
      components,
      incidents,
    };
  },
);

export const recordPing = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        component: z.string().trim().min(1).max(32).default("web"),
        latency_ms: z.number().int().min(0).max(59999),
        ok: z.boolean().default(true),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("status_pings").insert({
      component: data.component,
      latency_ms: data.latency_ms,
      ok: data.ok,
    });
    if (error) throw new Error("ping_failed");
    return { ok: true as const };
  });
