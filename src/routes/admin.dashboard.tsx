import { createFileRoute } from "@tanstack/react-router";
import { ProtectedShell } from "@/components/protected-shell";
import { StaffWatchBanner } from "@/components/trishield/staff-watch-banner";
import { EditRequestsInbox } from "@/components/admin/edit-requests-inbox";
import { ActivityReportButton } from "@/components/activity-report-button";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [
    { title: "Admin — Pariksha" },
    { name: "description", content: "Pariksha admin console — manage exams, centers, candidates, and integrity reports." },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: () => (
    <ProtectedShell requireRoles={["admin", "superadmin"]}>
      <StaffWatchBanner party="admin" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Admin dashboard</h1>
          <p className="text-muted-foreground mt-1">Approve paper edit requests from institutes and monitor TriShield activity.</p>
        </div>
        <ActivityReportButton role="admin" />
      </div>
      <EditRequestsInbox />
    </ProtectedShell>
  ),
});
