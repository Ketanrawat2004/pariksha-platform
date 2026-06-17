import { createFileRoute } from "@tanstack/react-router";
import { ProtectedShell } from "@/components/protected-shell";
import { StaffWatchBanner } from "@/components/trishield/staff-watch-banner";
import { EditRequestsInbox } from "@/components/admin/edit-requests-inbox";
import { ActivityReportButton } from "@/components/activity-report-button";

export const Route = createFileRoute("/superadmin/dashboard")({
  head: () => ({ meta: [
    { title: "Superadmin — Pariksha" },
    { name: "description", content: "Pariksha superadmin console — platform control, audit log, and TriShield oversight." },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: () => (
    <ProtectedShell requireRoles={["superadmin"]}>
      <StaffWatchBanner party="superadmin" />
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold sm:text-3xl">National overview</h1>
          <p className="text-muted-foreground mt-1">Review paper edit requests and oversee TriShield sessions across the network.</p>
        </div>
        <ActivityReportButton role="superadmin" />
      </div>
      <EditRequestsInbox />
    </ProtectedShell>
  ),
});
