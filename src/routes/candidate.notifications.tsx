import { createFileRoute } from "@tanstack/react-router";
import { ProtectedShell } from "@/components/protected-shell";
import { Card } from "@/components/ui/card";
import { Bell } from "lucide-react";

export const Route = createFileRoute("/candidate/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Pariksha" }] }),
  component: () => (
    <ProtectedShell requireRoles={["candidate"]}>
      <h1 className="text-3xl font-bold">Notifications</h1>
      <Card className="p-12 text-center border-dashed mt-6"><Bell className="mx-auto h-10 w-10 text-muted-foreground mb-3" /><p className="text-muted-foreground">No notifications yet.</p></Card>
    </ProtectedShell>
  ),
});
