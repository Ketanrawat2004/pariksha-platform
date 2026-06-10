import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Shield, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — Pariksha" },
      { name: "description", content: "Forgot your Pariksha password? Enter your email and we'll send a secure reset link so you can regain access to your exam account." },
      { property: "og:title", content: "Reset your password — Pariksha" },
      { property: "og:description", content: "Request a secure password reset link for your Pariksha account." },
      { property: "og:url", content: "/forgot-password" },
    ],
    links: [{ rel: "canonical", href: "/forgot-password" }],
  }),
  component: ForgotPasswordPage,
});

const schema = z.object({ email: z.string().trim().email().max(255) });
type FormData = z.infer<typeof schema>;

function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setSent(true);
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
        {sent ? (
          <div className="text-center">
            <Mail className="mx-auto h-14 w-14 text-success mb-3" />
            <h1 className="text-2xl font-bold">Email sent</h1>
            <p className="mt-2 text-muted-foreground">Check your inbox for a password reset link.</p>
            <Button asChild className="mt-6 w-full"><Link to="/login">Back to login</Link></Button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-center">Reset your password</h1>
            <p className="text-center text-sm text-muted-foreground mt-1">We'll email you a link.</p>
            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register("email")} aria-invalid={!!errors.email} />
                {errors.email && <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send reset link
              </Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
