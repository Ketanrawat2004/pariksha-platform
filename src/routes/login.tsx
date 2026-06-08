import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Crown, ShieldCheck, Eye, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
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

          <p className="mt-6 text-center text-sm text-muted-foreground">
            New here? <Link to="/register" className="text-accent hover:underline font-medium">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
