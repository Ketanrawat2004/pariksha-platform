import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Crown, ShieldCheck, Eye, GraduationCap, Building2, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, defaultLandingFor, type AppRole } from "@/lib/auth/auth-context";
import { toast } from "sonner";
import { ParikshaLogo } from "@/components/pariksha-logo";

export const Route = createFileRoute("/choose-role")({
  head: () => ({
    meta: [
      { title: "Choose your role — Pariksha" },
      { name: "description", content: "Pick how you want to use Pariksha after signing in: candidate, invigilator, institute, admin, or superadmin." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ChooseRolePage,
});

type Pick = {
  role: AppRole;
  label: string;
  desc: string;
  icon: typeof Crown;
  accent: string;
  needsCode?: boolean;
  selfBlocked?: boolean;
};

const PICKS: Pick[] = [
  { role: "candidate", label: "Candidate", desc: "Take exams, view admit cards, results & certificates.", icon: GraduationCap, accent: "text-accent" },
  { role: "invigilator", label: "Invigilator", desc: "Monitor live exam sessions and log incidents.", icon: Eye, accent: "text-warning", needsCode: true },
  { role: "institute", label: "Institute", desc: "Submit papers, manage registrations, release admits.", icon: Building2, accent: "text-success", needsCode: true },
  { role: "admin", label: "Admin", desc: "Platform operations console.", icon: ShieldCheck, accent: "text-primary", selfBlocked: true },
  { role: "superadmin", label: "Superadmin", desc: "Highest-trust governance console.", icon: Crown, accent: "text-purple-600 dark:text-purple-300", selfBlocked: true },
];

function ChooseRolePage() {
  const navigate = useNavigate();
  const { user, roles, loading, rolesLoading } = useAuth();
  const [submitting, setSubmitting] = useState<AppRole | null>(null);
  const [codeFor, setCodeFor] = useState<AppRole | null>(null);
  const [staffCode, setStaffCode] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  const goTo = (role: AppRole) => navigate({ to: defaultLandingFor([role]) });

  const claim = async (role: AppRole, code?: string) => {
    if (!user) return;
    setSubmitting(role);
    const { error } = await supabase.rpc("assign_signup_role", {
      _role: role,
      _staff_code: code ?? undefined,
    });
    setSubmitting(null);
    if (error) {
      toast.error(error.message || "Could not assign role");
      return;
    }
    toast.success(`Signed in as ${role}`);
    goTo(role);
  };

  const onPick = (p: Pick) => {
    if (p.selfBlocked) {
      toast.error("Admin & Superadmin must be granted by an existing superadmin.");
      return;
    }
    if (roles.includes(p.role)) {
      goTo(p.role);
      return;
    }
    if (p.needsCode) {
      setCodeFor(p.role);
      setStaffCode("");
      return;
    }
    void claim(p.role);
  };

  if (loading || rolesLoading) {
    return (
      <div className="min-h-dvh grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gradient-to-br from-background to-secondary py-10 px-4">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <ParikshaLogo className="h-10 w-10" />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">Welcome to Pariksha</h1>
            <p className="text-sm text-muted-foreground truncate">How would you like to continue, {user?.email}?</p>
          </div>
        </div>

        <div className="mb-6 rounded-lg border border-yellow-400/40 bg-yellow-50 dark:bg-yellow-500/10 p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-yellow-700 dark:text-yellow-300 mb-2">
            Hackathon demo — staff access codes
          </div>
          <p className="text-xs text-yellow-900/80 dark:text-yellow-100/80 mb-2">
            These shared codes are for panelist evaluation only. In production each
            staff member receives a unique code out-of-band.
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            <code className="rounded bg-yellow-100 dark:bg-yellow-500/20 px-2 py-1 font-mono">Invigilator: DEMO-INVIG-2026</code>
            <code className="rounded bg-yellow-100 dark:bg-yellow-500/20 px-2 py-1 font-mono">Institute: DEMO-INST-2026</code>
            <span className="rounded bg-yellow-100 dark:bg-yellow-500/20 px-2 py-1 font-mono">Admin / Superadmin: demo sign-in on /login</span>
          </div>
        </div>


        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PICKS.map((p) => {
            const Icon = p.icon;
            const already = roles.includes(p.role);
            return (
              <Card key={p.role} className="p-5 hover:shadow-md transition cursor-pointer flex flex-col" onClick={() => onPick(p)}>
                <div className="flex items-center justify-between mb-3">
                  <Icon className={`h-6 w-6 ${p.accent}`} />
                  {already && <span className="text-[10px] font-bold uppercase tracking-wider text-success">Active</span>}
                  {p.selfBlocked && <Lock className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div className="font-semibold">{p.label}</div>
                <p className="text-xs text-muted-foreground mt-1 flex-1">{p.desc}</p>
                <Button
                  size="sm"
                  variant={already ? "default" : "outline"}
                  className="mt-4 w-full"
                  disabled={submitting === p.role}
                  onClick={(e) => { e.stopPropagation(); onPick(p); }}
                >
                  {submitting === p.role ? <Loader2 className="h-4 w-4 animate-spin" /> :
                    already ? "Continue" : p.selfBlocked ? "Restricted" : p.needsCode ? "Enter staff code" : "Continue"}
                </Button>
              </Card>
            );
          })}
        </div>

        {codeFor && (
          <Card className="p-6 mt-6 max-w-md mx-auto">
            <div className="font-semibold mb-1">Staff access code</div>
            <p className="text-xs text-muted-foreground mb-4">
              Enter the {codeFor} access code provided by your administrator.
            </p>
            <Label htmlFor="code" className="sr-only">Staff code</Label>
            <Input id="code" value={staffCode} onChange={(e) => setStaffCode(e.target.value)} placeholder="STAFF-CODE" autoFocus />
            <div className="flex gap-2 mt-4">
              <Button variant="ghost" className="flex-1" onClick={() => setCodeFor(null)}>Cancel</Button>
              <Button
                className="flex-1"
                disabled={!staffCode.trim() || submitting === codeFor}
                onClick={() => claim(codeFor, staffCode.trim())}
              >
                {submitting === codeFor && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify & continue
              </Button>
            </div>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground mt-8">
          Admin and Superadmin roles can only be granted by an existing superadmin from the console.
        </p>
      </div>
    </div>
  );
}
