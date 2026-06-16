import { createFileRoute, Link } from "@tanstack/react-router";
import { ProtectedShell } from "@/components/protected-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ActivityReportButton } from "@/components/activity-report-button";
import {
  Users, Camera, AlertTriangle, ClipboardCheck, ShieldCheck,
  MonitorPlay, FileWarning, ArrowRight, Activity, Timer,
} from "lucide-react";

export const Route = createFileRoute("/invigilator/dashboard")({
  head: () => ({
    meta: [
      { title: "Invigilator — Pariksha" },
      { name: "description", content: "Pariksha invigilator console — monitor live sessions, log incidents, verify attendance, and view candidate seating." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: InvigilatorDashboard,
});

const STATS = [
  { label: "Active sessions", value: "—", icon: MonitorPlay, hint: "Live now" },
  { label: "Candidates present", value: "—", icon: Users, hint: "Across centers" },
  { label: "Open incidents", value: "—", icon: AlertTriangle, hint: "Requires action" },
  { label: "Integrity score", value: "—", icon: ShieldCheck, hint: "Center average" },
];

const QUICK_ACTIONS = [
  { to: "/invigilator/live-monitor", label: "Live monitor", desc: "Real-time camera + activity feed for every candidate.", icon: Camera },
  { to: "/invigilator/attendance", label: "Attendance", desc: "Mark present / absent / no-show against the roster.", icon: ClipboardCheck },
  { to: "/invigilator/seating", label: "Seating plan", desc: "Center seating chart with candidate IDs.", icon: Users },
  { to: "/invigilator/incidents", label: "Incidents", desc: "Log misconduct, equipment failure, or security alerts.", icon: FileWarning },
];

function InvigilatorDashboard() {
  return (
    <ProtectedShell requireRoles={["invigilator", "admin", "superadmin"]}>
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold sm:text-3xl">Invigilator console</h1>
          <p className="text-muted-foreground mt-1">Monitor live exam sessions, manage attendance, and respond to integrity alerts.</p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
          <Badge variant="outline" className="gap-1"><Activity className="h-3 w-3 text-success" /> On duty</Badge>
          <ActivityReportButton role="invigilator" />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATS.map((s) => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center justify-between">
              <span className="min-w-0 truncate text-xs uppercase tracking-wide text-muted-foreground">{s.label}</span>
              <s.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
            <div className="text-3xl font-extrabold mt-2">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.hint}</div>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {QUICK_ACTIONS.map((a) => (
          <Card key={a.to} className="p-5 hover:shadow-elegant transition-shadow">
            <Link to={a.to} className="group flex min-w-0 items-start gap-4">
              <span className="shrink-0 rounded-md bg-accent/10 p-3 text-accent"><a.icon className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold flex items-center gap-2">{a.label}
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </div>
                <p className="text-sm text-muted-foreground mt-1">{a.desc}</p>
              </div>
            </Link>
          </Card>
        ))}
      </div>

      <Card className="mt-6 p-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 mb-3">
          <h2 className="min-w-0 truncate font-semibold flex items-center gap-2"><Timer className="h-4 w-4 shrink-0" /> Today's shift</h2>
          <Button asChild size="sm" variant="outline"><Link to="/invigilator/live-monitor">Open monitor</Link></Button>
        </div>
        <p className="text-sm text-muted-foreground">Realtime session counts populate once candidates start their exams. Use the quick actions above to jump into a workflow.</p>
      </Card>
    </ProtectedShell>
  );
}
