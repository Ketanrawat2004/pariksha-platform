import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

export const Route = createFileRoute("/checkout/return")({
  head: () => ({ meta: [{ title: "Payment — Pariksha" }] }),
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  component: ReturnPage,
});

function ReturnPage() {
  const { session_id } = Route.useSearch();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"pending" | "paid" | "failed">("pending");

  useEffect(() => {
    if (!session_id) { setStatus("failed"); return; }
    let cancelled = false;
    let attempts = 0;
    const poll = async () => {
      attempts += 1;
      const { data } = await supabase
        .from("payments")
        .select("status")
        .eq("stripe_session_id", session_id)
        .maybeSingle();
      if (cancelled) return;
      if (data?.status === "paid") { setStatus("paid"); return; }
      if (data?.status === "failed") { setStatus("failed"); return; }
      if (attempts < 20) setTimeout(poll, 1500);
    };
    poll();
    return () => { cancelled = true; };
  }, [session_id]);

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 bg-gradient-to-br from-background to-secondary">
      <Card className="w-full max-w-md p-8 text-center">
        {status === "pending" && (<><Loader2 className="mx-auto h-12 w-12 animate-spin text-accent mb-4" /><h1 className="text-xl font-bold">Confirming payment…</h1><p className="text-sm text-muted-foreground mt-2">This usually takes a few seconds.</p></>)}
        {status === "paid" && (<><CheckCircle2 className="mx-auto h-14 w-14 text-success mb-4" /><h1 className="text-2xl font-bold">Payment successful</h1><p className="text-sm text-muted-foreground mt-2">Your exam registration is confirmed.</p><Button className="mt-6 w-full" onClick={() => navigate({ to: "/candidate/exams" })}>Go to my exams</Button></>)}
        {status === "failed" && (<><XCircle className="mx-auto h-14 w-14 text-destructive mb-4" /><h1 className="text-2xl font-bold">Payment not completed</h1><p className="text-sm text-muted-foreground mt-2">No charge was made. Please try again.</p><Button asChild className="mt-6 w-full"><Link to="/candidate/exams">Back to exams</Link></Button></>)}
      </Card>
    </div>
  );
}
