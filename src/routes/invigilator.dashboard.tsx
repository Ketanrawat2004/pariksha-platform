import { createFileRoute } from "@tanstack/react-router";
import { ProtectedShell } from "@/components/protected-shell";
import { Card } from "@/components/ui/card";
import { Construction } from "lucide-react";
import { ActivityReportButton } from "@/components/activity-report-button";

export const Route = createFileRoute("/invigilator/dashboard")({
  head: () => ({ meta: [{ title: "Invigilator — Pariksha" }] }),
  component: () => (
    <ProtectedShell requireRoles={["invigilator", "admin", "superadmin"]}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-3xl font-bold">Invigilator dashboard</h1>
        <ActivityReportButton role="invigilator" />
      </div>
      <Card className="p-12 text-center border-dashed mt-6"><Construction className="mx-auto h-10 w-10 text-muted-foreground mb-3" /><p className="text-muted-foreground">Center overview ships next.</p></Card>
    </ProtectedShell>
  ),
});
