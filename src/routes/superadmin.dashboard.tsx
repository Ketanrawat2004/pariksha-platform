import { createFileRoute } from "@tanstack/react-router";
import { ProtectedShell } from "@/components/protected-shell";
import { StaffWatchBanner } from "@/components/trishield/staff-watch-banner";
import { EditRequestsInbox } from "@/components/admin/edit-requests-inbox";

export const Route = createFileRoute("/superadmin/dashboard")({
  head: () => ({ meta: [{ title: "Superadmin — Pariksha" }] }),
  component: () => (
    <ProtectedShell requireRoles={["superadmin"]}>
      <StaffWatchBanner party="superadmin" />
      <h1 className="text-3xl font-bold">National overview</h1>
      <p className="text-muted-foreground mt-1">Review paper edit requests and oversee TriShield sessions across the network.</p>
      <EditRequestsInbox />
    </ProtectedShell>
  ),
});

