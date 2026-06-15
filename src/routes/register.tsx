import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, CheckCircle2, Camera } from "lucide-react";
import { ParikshaLogo } from "@/components/pariksha-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FaceCapture, dataUrlToBlob } from "@/components/face-capture";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create your account — Pariksha" },
      { name: "description", content: "Register as a candidate, invigilator, institute, admin, or super admin on Pariksha — India's secure exam platform with face-verified identity and live integrity monitoring." },
      { property: "og:title", content: "Create your account — Pariksha" },
      { property: "og:description", content: "Register as a candidate or staff member on Pariksha — India's secure exam platform with face-verified identity and live integrity monitoring." },
      { property: "og:url", content: "/register" },
    ],
    links: [{ rel: "canonical", href: "/register" }],
  }),
  component: RegisterPage,
});

const ROLES = ["candidate", "invigilator", "admin", "superadmin", "institute"] as const;
type Role = (typeof ROLES)[number];

const schema = z.object({
  role: z.enum(ROLES, { required_error: "Choose a role" }),
  fullName: z.string().trim().min(2, "Min 2 characters").max(120),
  dateOfBirth: z.string().min(1, "Required"),
  gender: z.string().min(1, "Required"),
  phone: z.string().trim().regex(/^[0-9]{10}$/, "Enter 10-digit phone"),
  state: z.string().min(2, "Required").max(80),
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(8, "Min 8 chars").max(128).regex(/[A-Z]/, "Need uppercase").regex(/[0-9]/, "Need number").regex(/[^A-Za-z0-9]/, "Need symbol"),
  confirmPassword: z.string(),
  aadhaar: z.string().regex(/^[0-9]{12}$/, "Enter 12-digit Aadhaar"),
  staffCode: z.string().optional(),
})
  .refine((d) => d.password === d.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] })
  .refine(
    (d) => d.role === "candidate" || (d.staffCode != null && d.staffCode.trim().length > 0),
    { message: "Access code is required for staff roles", path: ["staffCode"] },
  );

type FormData = z.infer<typeof schema>;

async function sha256(text: string) {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const ROLE_META: Record<Role, { title: string; desc: string }> = {
  candidate: { title: "Candidate", desc: "Take exams, view admit cards & results" },
  invigilator: { title: "Invigilator", desc: "Monitor live sessions & log incidents" },
  admin: { title: "Admin", desc: "Manage exams, centers, candidates & reports" },
  superadmin: { title: "Super Admin", desc: "Full platform control & audit log" },
  institute: { title: "Institute", desc: "Run institute papers & rosters" },
};

const STAFF_DEMO_CODES: Partial<Record<Role, { code?: string; note: string }>> = {
  invigilator: { code: "PRK-INVIG-9F4K2-2026", note: "Use this demo access code to continue as an invigilator." },
  institute: { code: "PRK-INST-7H2M8-2026", note: "Use this demo access code to continue as an institute." },
  admin: { note: "Admin accounts are approval-only. Use the Admin demo sign-in on the login page." },
  superadmin: { note: "Super Admin accounts are approval-only. Use the Superadmin demo sign-in on the login page." },
};

function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [photo, setPhoto] = useState<string>("");
  const form = useForm<FormData>({ resolver: zodResolver(schema), mode: "onBlur", defaultValues: { role: "candidate" } });
  const { register, handleSubmit, formState: { errors }, trigger, getValues, watch, setValue } = form;
  const aadhaar = watch("aadhaar") ?? "";
  const role = (watch("role") ?? "candidate") as Role;

  const STEPS = ["Role", "Personal", "Account", "Identity", "Face photo", "Review"];

  const next = async () => {
    const fields: (keyof FormData)[][] = [
      ["role", "staffCode"],
      ["fullName", "dateOfBirth", "gender", "phone", "state"],
      ["email", "password", "confirmPassword"],
      ["aadhaar"],
      [],
      [],
    ];
    if (step === 1) {
      const r = getValues("role") as Role | undefined;
      if (!r) { toast.error("Select a role to continue"); return; }
      if (r === "admin" || r === "superadmin") {
        toast.error(`${ROLE_META[r].title} registration is approval-only. Use demo sign-in on the login page.`);
        return;
      }
      if (r !== "candidate") {
        const code = (getValues("staffCode") ?? "").trim();
        if (!code) {
          form.setError("staffCode", { message: "Access code is required for staff roles" });
          toast.error("Enter your staff access code to continue");
          return;
        }
      }
    }
    if (step === 5 && !photo) { toast.error("Please capture your face photo"); return; }
    const ok = await trigger(fields[step - 1]);
    if (ok) setStep(step + 1);
  };


  const onSubmit = async (data: FormData) => {
    if (!photo) { toast.error("Face photo is required"); setStep(5); return; }
    setLoading(true);
    try {
      const aadhaarHash = await sha256(data.aadhaar);
      const redirectUrl = `${window.location.origin}/verify-email`;
      const { data: result, error } = await supabase.auth.signUp({
        email: data.email.trim().toLowerCase(),
        password: data.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: data.fullName.trim(),
            phone: data.phone.trim(),
            date_of_birth: data.dateOfBirth,
            gender: data.gender,
            state: data.state.trim(),
            aadhaar_hash: aadhaarHash,
            registration_role: data.role,
            staff_code: data.role === "candidate" ? null : (data.staffCode ?? "").trim().toUpperCase(),
          },
        },
      });
      if (error) throw error;

      if (result.session && result.user) {
        try {
          const path = `${result.user.id}/profile.jpg`;
          const blob = dataUrlToBlob(photo);
          const { error: upErr } = await supabase.storage.from("face-photos").upload(path, blob, { contentType: "image/jpeg", upsert: true });
          if (!upErr) {
            const photo_url = supabase.storage.from("face-photos").getPublicUrl(path).data.publicUrl;
            await supabase.from("profiles").update({ photo_url }).eq("id", result.user.id);
          }
        } catch { /* photo upload can be completed after verification */ }
      }
      toast.success("Verification email sent");
      setDone(true);
    } catch (err: any) {
      toast.error(err?.message ?? "Could not create account. Please check your details and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-4 bg-gradient-to-br from-background to-secondary">
        <Card className="w-full max-w-md p-8 text-center shadow-elegant">
          <CheckCircle2 className="mx-auto h-16 w-16 text-success mb-4" />
          <h1 className="text-2xl font-bold">Check your email</h1>
          <p className="mt-2 text-muted-foreground">We sent a verification link to <span className="font-semibold text-foreground">{getValues("email")}</span>. Click it to activate your account.</p>
          <Button className="mt-6 w-full" onClick={() => navigate({ to: "/login" })}>Go to login</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-start justify-center px-3 py-6 bg-gradient-to-br from-background to-secondary sm:px-4 sm:py-10 lg:items-center">
      <Card className="w-full max-w-3xl p-4 shadow-elegant sm:p-8">
        <Link to="/" className="flex items-center justify-center gap-2 font-bold text-xl mb-2">
          <ParikshaLogo className="h-10 w-10" />
          <span>Pariksha</span>
        </Link>
        <h1 className="text-center text-2xl font-bold tracking-tight mb-1">Create your Pariksha account</h1>
        <p className="text-center text-sm text-muted-foreground mb-6">Register as a candidate or staff member to take or run secure online exams.</p>
        <div className="mb-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Step {step} of {STEPS.length}</span>
            <span>{STEPS[step - 1]}</span>
          </div>
          <Progress value={(step / STEPS.length) * 100} />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {step === 1 && (
            <div className="space-y-3">
              <Label className="text-base">I want to register as</Label>
              <p className="text-xs text-muted-foreground">Choose the account type that matches your work. Staff roles still require approval at sign-in.</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {ROLES.map((r) => {
                  const active = role === r;
                  return (
                    <button
                      type="button"
                      key={r}
                      onClick={() => setValue("role", r, { shouldValidate: true })}
                      className={`text-left rounded-lg border p-3 transition ${active ? "border-accent bg-accent/5 shadow-elegant" : "border-border hover:border-accent/40"}`}
                    >
                      <div className="font-bold text-sm">{ROLE_META[r].title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{ROLE_META[r].desc}</div>
                    </button>
                  );
                })}
              </div>
              {errors.role && <p className="mt-1 text-sm text-destructive">{errors.role.message as string}</p>}

              {role !== "candidate" && (
                <div className="mt-4 rounded-lg border border-accent/30 bg-accent/5 p-4 space-y-3">
                  <div className="text-sm font-bold">Staff access code required</div>
                  <p className="text-xs text-muted-foreground">
                    Non-candidate roles need an authorisation code issued by Pariksha. If you don't have one, contact your administrator. Candidates do not need a code.
                  </p>
                  {STAFF_DEMO_CODES[role]?.code ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setValue("staffCode", STAFF_DEMO_CODES[role]?.code ?? "", { shouldValidate: true })}
                        className="w-full rounded-md border border-accent/40 bg-background px-3 py-2 text-left text-xs transition hover:bg-accent/5"
                      >
                        <span className="block font-semibold text-foreground">Demo code: {STAFF_DEMO_CODES[role]?.code}</span>
                        <span className="text-muted-foreground">Tap to fill this code and continue.</span>
                      </button>
                      <div>
                        <Label htmlFor="staffCode">Enter your access code for "{ROLE_META[role].title}"</Label>
                        <Input id="staffCode" {...register("staffCode")} placeholder="Enter the code you were issued" aria-invalid={!!errors.staffCode} autoComplete="off" />
                        {errors.staffCode && <p className="mt-1 text-sm text-destructive">{errors.staffCode.message as string}</p>}
                      </div>
                    </>
                  ) : (
                    <div className="rounded-md border border-border bg-background p-3 text-xs text-muted-foreground">
                      {STAFF_DEMO_CODES[role]?.note} <Link to="/login" className="font-semibold text-accent hover:underline">Open demo sign-in</Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <>
              <div>
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" {...register("fullName")} aria-invalid={!!errors.fullName} />
                {errors.fullName && <p className="mt-1 text-sm text-destructive">{errors.fullName.message}</p>}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="dateOfBirth">Date of birth</Label>
                  <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} aria-invalid={!!errors.dateOfBirth} />
                  {errors.dateOfBirth && <p className="mt-1 text-sm text-destructive">{errors.dateOfBirth.message}</p>}
                </div>
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <select id="gender" {...register("gender")} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">Select…</option>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                  {errors.gender && <p className="mt-1 text-sm text-destructive">{errors.gender.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" type="tel" maxLength={10} {...register("phone")} aria-invalid={!!errors.phone} />
                  {errors.phone && <p className="mt-1 text-sm text-destructive">{errors.phone.message}</p>}
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input id="state" {...register("state")} aria-invalid={!!errors.state} />
                  {errors.state && <p className="mt-1 text-sm text-destructive">{errors.state.message}</p>}
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register("email")} aria-invalid={!!errors.email} />
                {errors.email && <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>}
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" {...register("password")} aria-invalid={!!errors.password} />
                <p className="mt-1 text-xs text-muted-foreground">8+ chars, 1 uppercase, 1 number, 1 symbol</p>
                {errors.password && <p className="mt-1 text-sm text-destructive">{errors.password.message}</p>}
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input id="confirmPassword" type="password" {...register("confirmPassword")} aria-invalid={!!errors.confirmPassword} />
                {errors.confirmPassword && <p className="mt-1 text-sm text-destructive">{errors.confirmPassword.message}</p>}
              </div>
            </>
          )}

          {step === 4 && (
            <div>
              <Label htmlFor="aadhaar">Aadhaar number</Label>
              <Input id="aadhaar" inputMode="numeric" maxLength={12} {...register("aadhaar")} aria-invalid={!!errors.aadhaar} />
              <p className="mt-1 text-xs text-muted-foreground">
                Hashed on your device with SHA-256 before transmission. Last 4 visible: {aadhaar.length === 12 ? `XXXX-XXXX-${aadhaar.slice(-4)}` : "—"}
              </p>
              {errors.aadhaar && <p className="mt-1 text-sm text-destructive">{errors.aadhaar.message}</p>}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-accent" />
                <Label className="text-base">Capture your face photo</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                This photo is your identity baseline. It will be matched against your live face on every exam and appear on your admit card.
              </p>
              <FaceCapture onCapture={setPhoto} initial={photo || null} />
            </div>
          )}

          {step === 6 && (
            <div className="space-y-2 text-sm">
              <div className="font-semibold text-base mb-2">Review your details</div>
              {photo && (
                <div className="flex justify-center mb-3">
                  <img src={photo} alt="Your face" className="h-28 w-28 rounded-lg object-cover border-2 border-accent" />
                </div>
              )}
              {[
                ["Role", getValues("role")],
                ["Name", getValues("fullName")],
                ["DOB", getValues("dateOfBirth")],
                ["Gender", getValues("gender")],
                ["Phone", getValues("phone")],
                ["State", getValues("state")],
                ["Email", getValues("email")],
                ["Aadhaar", `XXXX-XXXX-${(getValues("aadhaar") ?? "").slice(-4)}`],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-3 border-b border-border/60 py-1.5 sm:flex sm:justify-between">
                  <span className="text-muted-foreground">{k}</span><span className="min-w-0 break-words text-right font-medium capitalize">{v}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col-reverse justify-between gap-2 pt-4 sm:flex-row">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}>Back</Button>
            {step < STEPS.length ? (
              <Button type="button" className="w-full sm:w-auto" onClick={next}>Continue</Button>
            ) : (
              <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create account
              </Button>
            )}
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account? <Link to="/login" className="text-accent hover:underline font-medium">Sign in</Link>
        </p>
      </Card>
    </div>
  );
}
