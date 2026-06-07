import { createFileRoute } from "@tanstack/react-router";
import { ProtectedShell } from "@/components/protected-shell";
import { Card } from "@/components/ui/card";
import { Construction } from "lucide-react";
import type { AppRole } from "@/lib/auth/auth-context";

export function makeStub(path: string, title: string, roles: AppRole[], description: string) {
  return createFileRoute(path as never)({
    head: () => ({ meta: [{ title: `${title} — Pariksha` }] }),
    component: () => (
      <ProtectedShell requireRoles={roles}>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">{title}</h1>
            <p className="text-muted-foreground mt-1">{description}</p>
          </div>
          <Card className="p-12 text-center border-dashed">
            <Construction className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
            <h2 className="font-bold text-lg">Coming in the next build pass</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              The data layer, RLS policies, and route are ready. This screen will be wired up in the next iteration.
            </p>
          </Card>
        </div>
      </ProtectedShell>
    ),
  });
}

// Sentinel export to satisfy router file requirement
export const Route = createFileRoute("/_stub-helper")({ component: () => null });
