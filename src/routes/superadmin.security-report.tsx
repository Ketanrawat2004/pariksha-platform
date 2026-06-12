import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";

export const Route = createFileRoute("/superadmin/security-report")({
  component: SecurityReport,
});

type Row = {
  id: string;
  scanner_name: string;
  internal_id: string;
  severity: string;
  title: string;
  description: string | null;
  status: "open" | "fixed" | "ignored";
  fix_ref: string | null;
  first_seen: string;
  last_seen: string;
  fixed_at: string | null;
};

function SecurityReport() {
  const { data, isLoading } = useQuery({
    queryKey: ["security_findings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("security_findings" as never)
        .select("*")
        .order("last_seen", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
    refetchInterval: 30_000,
  });

  const rows = data ?? [];
  const open = rows.filter((r) => r.status === "open");
  const fixed = rows.filter((r) => r.status === "fixed");
  const ignored = rows.filter((r) => r.status === "ignored");

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Security Report</h1>
        <p className="text-sm text-muted-foreground">
          Auto-generated from all scan results, including connector_security_scan.
          Re-scans run on schedule; new findings trigger email + in-app alerts.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat icon={<ShieldAlert className="text-destructive" />} label="Remaining" value={open.length} />
        <Stat icon={<ShieldCheck className="text-green-600" />} label="Fixed" value={fixed.length} />
        <Stat icon={<ShieldX className="text-muted-foreground" />} label="Ignored" value={ignored.length} />
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      <Section title="Remaining issues" rows={open} empty="No open findings 🎉" />
      <Section title="Fixed" rows={fixed} empty="No fixes recorded yet." />
      {ignored.length > 0 && <Section title="Ignored" rows={ignored} empty="" />}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">{icon}</div>
      <div>
        <div className="text-2xl font-semibold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </Card>
  );
}

function Section({ title, rows, empty }: { title: string; rows: Row[]; empty: string }) {
  return (
    <Card className="p-4">
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="border rounded-md p-3 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={sevVariant(r.severity)}>{r.severity}</Badge>
                  <Badge variant="outline">{r.scanner_name}</Badge>
                  <span className="font-medium truncate">{r.title}</span>
                </div>
                {r.description && <p className="text-sm text-muted-foreground mt-1">{r.description}</p>}
                {r.fix_ref && (
                  <p className="text-xs mt-1">
                    <span className="text-muted-foreground">Fix: </span>
                    <code className="bg-muted px-1 py-0.5 rounded">{r.fix_ref}</code>
                  </p>
                )}
              </div>
              <div className="text-xs text-muted-foreground whitespace-nowrap">
                {r.status === "fixed" && r.fixed_at
                  ? `Fixed ${new Date(r.fixed_at).toLocaleDateString()}`
                  : `Last seen ${new Date(r.last_seen).toLocaleDateString()}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function sevVariant(s: string): "destructive" | "secondary" | "default" {
  if (s === "critical" || s === "high") return "destructive";
  if (s === "medium") return "default";
  return "secondary";
}
