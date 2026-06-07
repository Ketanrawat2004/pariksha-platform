import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Shield, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { defaultLandingFor } from "@/lib/auth/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login — Pariksha" }, { name: "description", content: "Sign in to Pariksha." }] }),
  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(1, "Password required").max(128),
});
type FormData = z.infer<typeof schema>;

function LoginPage() {
  const navigate = useNavigate();
  const { roles } = useAuth();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    const { error, data: result } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    // Fetch roles fresh
    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", result.user!.id);
    const userRoles = (roleData ?? []).map((r) => r.role as "candidate" | "admin" | "superadmin" | "invigilator");
    toast.success("Welcome back!");
    navigate({ to: defaultLandingFor(userRoles.length ? userRoles : roles) });
  };

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 bg-gradient-to-br from-background to-secondary">
      <Card className="w-full max-w-md p-8 shadow-elegant">
        <Link to="/" className="flex items-center justify-center gap-2 font-bold text-xl mb-6">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-gradient-hero text-primary-foreground">
            <Shield className="h-5 w-5" />
          </span>
          Pariksha
        </Link>
        <h1 className="text-2xl font-bold text-center">Welcome back</h1>
        <p className="text-center text-sm text-muted-foreground mt-1">Sign in to continue</p>

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

        <div className="mt-6 rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
          <div className="font-semibold text-foreground mb-1">Demo accounts (password: Demo@1234)</div>
          <div>super@pariksha.in · admin@pariksha.in · invig@pariksha.in · candidate@pariksha.in</div>
        </div>
      </Card>
    </div>
  );
}
