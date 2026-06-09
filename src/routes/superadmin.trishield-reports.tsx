import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedShell } from "@/components/protected-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShieldCheck, ShieldAlert, FileText, Clock, Camera } from "lucide-react";

export const Route = createFileRoute("/superadmin/trishield-reports")({
  head: () => ({ meta: [{ title: "TriShield Session Reports — Pariksha" }] }),
  component: () => (
    <ProtectedShell requireRoles={["superadmin"]}>
      <ReportsPage />
    </ProtectedShell>
  ),
});

type Report = {
  id: string;
  session_id: string;
  exam_id: string | null;
  session_type: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  institute_snapshot_count: number;
  admin_snapshot_count: number;
  superadmin_snapshot_count: number;
  final_paper_hash: string | null;
  verification_status: "COMPLETE" | "INCOMPLETE" | null;
  incomplete_reason: string | null;
  created_at: string;
};

function ReportsPage() {
  const [selected, setSelected] = useState<Report | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["trishield-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trishield_session_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as Report[];
    },
  });

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
        <ShieldCheck className="h-7 w-7 text-accent" /> TriShield Session Reports
      </h1>
      <p className="text-muted-foreground mt-1 mb-6">
        Immutable audit trail of every TriShield LiveWatch session — paper-lock and paper-edit ceremonies across the network.
      </p>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : !data?.length ? (
        <Card className="p-12 text-center border-dashed">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No session reports yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((r) => (
            <Card key={r.id} className="p-4 flex flex-wrap items-center gap-4 hover:bg-muted/30 cursor-pointer" onClick={() => setSelected(r)}>
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2">
                  <Badge variant={r.verification_status === "COMPLETE" ? "default" : "destructive"}>
                    {r.verification_status === "COMPLETE" ? (
                      <><ShieldCheck className="h-3 w-3 mr-1" /> COMPLETE</>
                    ) : (
                      <><ShieldAlert className="h-3 w-3 mr-1" /> INCOMPLETE</>
                    )}
                  </Badge>
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">{r.session_type}</span>
                </div>
                <div className="text-sm font-mono mt-1 text-muted-foreground truncate">{r.session_id}</div>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> {formatDuration(r.duration_seconds)}
              </div>
              <div className="text-xs flex items-center gap-1.5">
                <Camera className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{r.institute_snapshot_count + r.admin_snapshot_count + r.superadmin_snapshot_count}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {r.created_at ? new Date(r.created_at).toLocaleString() : ""}
              </div>
            </Card>
          ))}
        </div>
      )}

      {selected && <ReportDetailDialog report={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function ReportDetailDialog({ report, onClose }: { report: Report; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {report.verification_status === "COMPLETE" ? (
              <ShieldCheck className="h-5 w-5 text-success" />
            ) : (
              <ShieldAlert className="h-5 w-5 text-destructive" />
            )}
            Session Report
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <Row label="Status">
            <Badge variant={report.verification_status === "COMPLETE" ? "default" : "destructive"}>
              {report.verification_status}
            </Badge>
            {report.incomplete_reason && (
              <span className="ml-2 text-xs text-muted-foreground">{report.incomplete_reason}</span>
            )}
          </Row>
          <Row label="Session ID"><code className="text-xs">{report.session_id}</code></Row>
          <Row label="Type">{report.session_type}</Row>
          <Row label="Started">{report.started_at ? new Date(report.started_at).toLocaleString() : "—"}</Row>
          <Row label="Ended">{report.ended_at ? new Date(report.ended_at).toLocaleString() : "—"}</Row>
          <Row label="Duration">{formatDuration(report.duration_seconds)}</Row>

          <div className="border-t pt-3">
            <h4 className="font-semibold mb-2">Snapshots captured</h4>
            <div className="grid grid-cols-3 gap-2">
              <StatBox label="Institute" value={report.institute_snapshot_count} />
              <StatBox label="Admin" value={report.admin_snapshot_count} />
              <StatBox label="SuperAdmin" value={report.superadmin_snapshot_count} />
            </div>
          </div>

          {report.final_paper_hash && (
            <Row label="Paper hash"><code className="text-xs break-all">{report.final_paper_hash}</code></Row>
          )}
        </div>
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 items-start">
      <span className="text-xs uppercase tracking-wide text-muted-foreground pt-0.5">{label}</span>
      <div>{children}</div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-3 text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function formatDuration(s: number | null) {
  if (s == null) return "—";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}
