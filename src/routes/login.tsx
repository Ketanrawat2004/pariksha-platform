import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Crown, ShieldCheck, Eye, GraduationCap, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { defaultLandingFor, type AppRole } from "@/lib/auth/auth-context";
import { toast } from "sonner";
import { ParikshaLogo } from "@/components/pariksha-logo";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login — Pariksha" }] }),
  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(1, "Password required").max(128),
});
type FormData = z.infer<typeof schema>;

const DEMO = [
  { role: "superadmin" as AppRole, email: "super@pariksha.in", label: "Superadmin", icon: Crown, color: "from-purple-500/15 to-purple-500/5 text-purple-700 dark:text-purple-300" },
  { role: "admin" as AppRole, email: "admin@pariksha.in", label: "Admin", icon: ShieldCheck, color: "from-primary/15 to-primary/5 text-primary" },
  { role: "invigilator" as AppRole, email: "invig@pariksha.in", label: "Invigilator", icon: Eye, color: "from-warning/15 to-warning/5 text-warning" },
  { role: "candidate" as AppRole, email: "candidate@pariksha.in", label: "Candidate", icon: GraduationCap, color: "from-accent/15 to-accent/5 text-accent" },
  { role: "institute" as AppRole, email: "institute@pariksha.in", label: "Institute", icon: Building2, color: "from-success/15 to-success/5 text-success" },
];

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const signIn = async (email: string, password: string) => {
    const { error, data: result } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
      return null;
    }
    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", result.user!.id);
    const userRoles = (roleData ?? []).map((r) => r.role as AppRole);
    toast.success("Signed in");
    navigate({ to: defaultLandingFor(userRoles) });
    return result;
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    await signIn(data.email, data.password);
    setLoading(false);
  };

  const oneClick = async (email: string) => {
    setDemoLoading(email);
    await signIn(email, "Demo@1234");
    setDemoLoading(null);
  };

  return (
    <div className="min-h-dvh grid lg:grid-cols-2 bg-gradient-to-br from-background to-secondary">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-hero text-primary-foreground">
        <Link to="/" className="flex items-center gap-3">
          <ParikshaLogo className="h-12 w-12 bg-white/10 backdrop-blur rounded-lg p-1" />
          <span className="text-xl font-bold">Pariksha</span>
        </Link>
        <div className="space-y-4">
          <h2 className="text-4xl font-bold leading-tight">Every mark, earned.</h2>
          <p className="text-primary-foreground/80 max-w-md">India's national exam integrity platform — anti-leak paper system, live biometric verification, and 24/7 monitoring.</p>
        </div>
        <p className="text-xs text-primary-foreground/60">© 2026 Pariksha · Built for FAR AWAY Hackathon</p>
      </div>

      <div className="flex flex-col justify-center px-4 sm:px-8 py-10">
        <div className="mx-auto w-full max-w-md">
          <Link to="/" className="flex lg:hidden items-center justify-center gap-2 font-bold text-xl mb-6">
            <ParikshaLogo className="h-10 w-10" /> Pariksha
          </Link>

          <Card className="p-6 mb-6 border-accent/30 bg-gradient-to-br from-accent/5 to-transparent">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold tracking-wider uppercase text-accent">Demo · One-click sign in</span>
              <span className="text-xs text-muted-foreground">password: Demo@1234</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DEMO.map((d) => (
                <button
                  key={d.email}
                  onClick={() => oneClick(d.email)}
                  disabled={!!demoLoading}
                  className={`group relative rounded-lg border border-border bg-gradient-to-br ${d.color} p-3 text-left transition hover:shadow-elegant hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-accent`}
                  aria-label={`Sign in as demo ${d.label}`}
                >
                  <d.icon className="h-5 w-5 mb-1.5" />
                  <div className="font-semibold text-sm text-foreground">{d.label}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{d.email}</div>
                  {demoLoading === d.email && (
                    <Loader2 className="absolute top-2 right-2 h-3 w-3 animate-spin" />
                  )}
                </button>
              ))}
            </div>
          </Card>

          <h1 className="text-2xl font-bold">Sign in</h1>
          <p className="text-sm text-muted-foreground mt-1">Or use your real account credentials.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...register("email")} aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-err" : undefined} />
              {errors.email && <p id="email-err" className="mt-1 text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-xs text-accent hover:underline">Forgot?</Link>
              </div>
              <Input id="password" type="password" autoComplete="current-password" {...register("password")} aria-invalid={!!errors.password} aria-describedby={errors.password ? "pw-err" : undefined} />
              {errors.password && <p id="pw-err" className="mt-1 text-sm text-destructive">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign in
            </Button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-background px-2 text-muted-foreground">or</span></div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={async () => {
              const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
              if (result.error) toast.error(result.error.message ?? "Google sign-in failed");
            }}
          >
            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.09a6.59 6.59 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
            Continue with Google
          </Button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            New here? <Link to="/register" className="text-accent hover:underline font-medium">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
