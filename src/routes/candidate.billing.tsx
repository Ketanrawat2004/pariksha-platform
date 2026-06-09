import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProtectedShell } from "@/components/protected-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { createPortalSession } from "@/utils/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { CreditCard, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/candidate/billing")({
  head: () => ({ meta: [{ title: "Billing — Pariksha" }] }),
  component: () => <ProtectedShell requireRoles={["candidate"]}><Billing /></ProtectedShell>,
});

function Billing() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  const { data: payments, isLoading } = useQuery({
    queryKey: ["my-payments", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("*, exams(title)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return (data as any[]) ?? [];
    },
    enabled: !!user,
  });

  async function openPortal() {
    setBusy(true);
    try {
      const result = await createPortalSession({
        data: { environment: getStripeEnvironment(), returnUrl: window.location.href },
      });
      if ("error" in result) { toast.error(result.error); return; }
      window.open(result.url, "_blank");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <h1 className="text-3xl font-bold">Billing</h1>
          <p className="text-muted-foreground mt-1">Your payment history and billing settings.</p>
        </div>
        <Button onClick={openPortal} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
          Manage billing
        </Button>
      </div>

      {isLoading && <Card className="p-8 text-center text-muted-foreground">Loading…</Card>}
      {payments && payments.length === 0 && (
        <Card className="p-12 text-center border-dashed text-muted-foreground">No payments yet.</Card>
      )}
      <div className="grid gap-3">
        {(payments ?? []).map((p) => (
          <Card key={p.id} className="p-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="font-semibold truncate">{p.exams?.title ?? "Exam registration"}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {new Date(p.created_at).toLocaleString()} · {p.currency?.toUpperCase()} · {p.environment}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-bold">₹{(p.amount_cents / 100).toFixed(2)}</div>
              <div className={`text-xs font-semibold capitalize ${
                p.status === "paid" ? "text-success" :
                p.status === "failed" ? "text-destructive" :
                p.status === "refunded" ? "text-warning" : "text-muted-foreground"
              }`}>{p.status}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
