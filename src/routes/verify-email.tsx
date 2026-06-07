import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/verify-email")({
  head: () => ({ meta: [{ title: "Email verified — Pariksha" }] }),
  component: VerifyPage,
});

function VerifyPage() {
  return (
    <div className="min-h-dvh flex items-center justify-center px-4 bg-gradient-to-br from-background to-secondary">
      <Card className="w-full max-w-md p-8 text-center shadow-elegant">
        <Link to="/" className="flex items-center justify-center gap-2 font-bold text-xl mb-4">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-gradient-hero text-primary-foreground"><Shield className="h-5 w-5" /></span>
          Pariksha
        </Link>
        <CheckCircle2 className="mx-auto h-16 w-16 text-success mb-3" />
        <h1 className="text-2xl font-bold">Email verified</h1>
        <p className="mt-2 text-muted-foreground">Your account is now active. Sign in to continue.</p>
        <Button asChild className="mt-6 w-full"><Link to="/login">Sign in</Link></Button>
      </Card>
    </div>
  );
}
