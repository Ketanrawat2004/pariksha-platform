import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, ArrowRight, CheckCircle2, LogIn } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/give-exam")({
  head: () => ({
    meta: [
      { title: "Give Exam — Pariksha" },
      { name: "description", content: "Enter your admit card to start your exam." },
    ],
  }),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: PublicGiveExam,
});

function PublicGiveExam() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [admitNo, setAdmitNo] = useState("");
  const [verified, setVerified] = useState<{ title: string; date: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function lookup() {
    if (!admitNo.trim()) return toast.error("Enter your admit card number");
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("verify_admit_card" as any, { _admit_card_number: admitNo.trim() } as any);
      if (error) throw error;
      const row = (data as any[])?.[0];
      if (!row?.valid) throw new Error("Admit card not found");
      setVerified({ title: row.exam_title, date: row.exam_date });
      toast.success("Admit card verified");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not verify admit card");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-secondary/30">
      <SiteHeader />
      <main className="flex-1 py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="p-6 md:p-8 space-y-6 shadow-elegant">
            <div className="flex items-start gap-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Give Exam</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Anyone with a valid admit card can verify here. Identity face-match and proctoring start after sign-in.
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="admit">Admit card number</Label>
              <Input
                id="admit"
                value={admitNo}
                onChange={(e) => setAdmitNo(e.target.value)}
                placeholder="PRK-…"
                disabled={busy || !!verified}
              />
            </div>

            {!verified ? (
              <Button onClick={lookup} disabled={busy} size="lg" className="w-full bg-accent hover:bg-accent/90">
                {busy ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <ArrowRight className="h-5 w-5 mr-2" />}
                Verify admit card
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border border-success/40 bg-success/10 text-success p-4 flex items-center gap-2 text-sm font-medium">
                  <CheckCircle2 className="h-5 w-5" /> {verified.title} · {verified.date}
                </div>
                {user ? (
                  <Button size="lg" className="w-full" onClick={() => navigate({ to: "/exam-entry" })}>
                    Continue to identity check <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                ) : (
                  <div className="rounded-lg border p-4 space-y-3">
                    <p className="text-sm">
                      For audit & integrity, the live face-match and proctored exam runtime require a signed-in account.
                      Use the same email you registered with.
                    </p>
                    <div className="flex gap-2">
                      <Button asChild size="lg" className="flex-1">
                        <Link to="/login"><LogIn className="h-4 w-4 mr-2" />Sign in</Link>
                      </Button>
                      <Button asChild size="lg" variant="outline" className="flex-1">
                        <Link to="/register">Register</Link>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
