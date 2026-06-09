import { createFileRoute } from "@tanstack/react-router";
import { ProtectedShell } from "@/components/protected-shell";
import { Card } from "@/components/ui/card";
import { Construction } from "lucide-react";
import { StaffWatchBanner } from "@/components/trishield/staff-watch-banner";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: "Admin — Pariksha" }] }),
  component: () => (
    <ProtectedShell requireRoles={["admin", "superadmin"]}>
      <StaffWatchBanner party="admin" />
      <h1 className="text-3xl font-bold">Admin dashboard</h1>
      <Card className="p-12 text-center border-dashed mt-6">
        <Construction className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Analytics dashboard ships next.</p>
      </Card>
    </ProtectedShell>
  ),
});
