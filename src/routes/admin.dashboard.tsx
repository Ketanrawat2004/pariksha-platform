import { createFileRoute, Link } from "@tanstack/react-router";
import { ProtectedShell } from "@/components/protected-shell";
import { StaffWatchBanner } from "@/components/trishield/staff-watch-banner";
import { EditRequestsInbox } from "@/components/admin/edit-requests-inbox";
import { ActivityReportButton } from "@/components/activity-report-button";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [
    { title: "Admin — Pariksha" },
    { name: "description", content: "Pariksha admin console — manage exams, centers, candidates, and integrity reports." },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: () => (
    <ProtectedShell requireRoles={["admin", "superadmin"]}>
      <StaffWatchBanner party="admin" />
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold sm:text-3xl">Admin dashboard</h1>
          <p className="text-muted-foreground mt-1">Approve paper edit requests from institutes and monitor TriShield activity.</p>
        </div>
        <div className="flex min-w-0 flex-wrap gap-2 sm:justify-end">
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/incidents"><AlertTriangle className="h-4 w-4 mr-1" /> Incidents</Link>
          </Button>
          <ActivityReportButton role="admin" />
        </div>
      </div>
      <EditRequestsInbox />
    </ProtectedShell>
  ),
});
