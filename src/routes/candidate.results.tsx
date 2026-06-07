import { createFileRoute } from "@tanstack/react-router";
import { ProtectedShell } from "@/components/protected-shell";
import { Card } from "@/components/ui/card";
import { Construction } from "lucide-react";

export const Route = createFileRoute("/candidate/results")({
  head: () => ({ meta: [{ title: "Results — Pariksha" }] }),
  component: () => (
    <ProtectedShell requireRoles={["candidate"]}>
      <h1 className="text-3xl font-bold">Your results</h1>
      <Card className="p-12 text-center border-dashed mt-6"><Construction className="mx-auto h-10 w-10 text-muted-foreground mb-3" /><p className="text-muted-foreground">Results & certificates ship in the next iteration.</p></Card>
    </ProtectedShell>
  ),
});
