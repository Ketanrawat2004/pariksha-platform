import { createFileRoute } from "@tanstack/react-router";
import { ProtectedShell } from "@/components/protected-shell";
import { Card } from "@/components/ui/card";
import { Construction } from "lucide-react";
import { StaffWatchBanner } from "@/components/trishield/staff-watch-banner";

export const Route = createFileRoute("/superadmin/dashboard")({
  head: () => ({ meta: [{ title: "Superadmin — Pariksha" }] }),
  component: () => (
    <ProtectedShell requireRoles={["superadmin"]}>
      <StaffWatchBanner party="superadmin" />
      <h1 className="text-3xl font-bold">National overview</h1>
      <Card className="p-12 text-center border-dashed mt-6">
        <Construction className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">National dashboard ships next.</p>
      </Card>
    </ProtectedShell>
  ),
});
