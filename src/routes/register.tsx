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
  head: () => ({ meta: [{ title: "Register — Pariksha" }] }),
  component: RegisterPage,
});

const ROLES = ["candidate", "invigilator", "admin", "superadmin", "institute"] as const;
type Role = (typeof ROLES)[number];

// Staff access codes — shown on the page; required for any non-candidate role.
const STAFF_CODES: Record<Exclude<Role, "candidate">, string> = {
  invigilator: "INVIG-2026",
  admin: "ADMIN-2026",
  superadmin: "SUPER-2026",
  institute: "INST-2026",
};

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
    (d) => d.role === "candidate" ||
      (d.staffCode != null && STAFF_CODES[d.role as Exclude<Role, "candidate">] === d.staffCode.trim().toUpperCase()),
    { message: "Invalid access code for the selected role", path: ["staffCode"] },
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
      // Manually enforce staff-code rule before allowing step 2 (schema refine
      // runs only on full submit, not on per-field trigger()).
      const r = getValues("role") as Role | undefined;
      if (!r) { toast.error("Select a role to continue"); return; }
      if (r !== "candidate") {
        const code = (getValues("staffCode") ?? "").trim().toUpperCase();
        const expected = STAFF_CODES[r as Exclude<Role, "candidate">];
        if (code !== expected) {
          form.setError("staffCode", { message: "Invalid access code for the selected role" });
          toast.error("Enter the correct staff access code to continue");
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
    const aadhaarHash = await sha256(data.aadhaar);
    const redirectUrl = `${window.location.origin}/verify-email`;
    const { data: result, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: data.fullName },
      },
    });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }
    if (result.user) {
      let photo_url: string | null = null;
      try {
        const path = `candidates/${result.user.id}/profile.jpg`;
        const blob = dataUrlToBlob(photo);
        const { error: upErr } = await supabase.storage.from("face-photos").upload(path, blob, { contentType: "image/jpeg", upsert: true });
        if (!upErr) {
          photo_url = supabase.storage.from("face-photos").getPublicUrl(path).data.publicUrl;
        }
      } catch { /* ignore */ }

      await supabase.from("profiles").update({
        phone: data.phone,
        date_of_birth: data.dateOfBirth,
        gender: data.gender,
        state: data.state,
        aadhaar_hash: aadhaarHash,
        photo_url,
      }).eq("id", result.user.id);

      const { error: roleErr } = await supabase.rpc("assign_signup_role" as any, {
        _role: data.role as any,
        _staff_code: data.role === "candidate" ? null : (data.staffCode ?? null),
      });
      if (roleErr) throw roleErr;
    }
    setLoading(false);
    setDone(true);
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
    <div className="min-h-dvh flex items-center justify-center px-4 py-10 bg-gradient-to-br from-background to-secondary">
      <Card className="w-full max-w-2xl p-8 shadow-elegant">
        <Link to="/" className="flex items-center justify-center gap-2 font-bold text-xl mb-4">
          <ParikshaLogo className="h-10 w-10" />
          <span>Pariksha</span>
        </Link>
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
              <div className="grid sm:grid-cols-2 gap-3">
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
                    Non-candidate roles need an authorisation code. Codes are issued per role; candidates do not need one.
                  </p>
                  <ul className="text-xs grid sm:grid-cols-2 gap-1.5">
                    <li><b>Invigilator:</b> <code className="font-mono">INVIG-2026</code></li>
                    <li><b>Admin:</b> <code className="font-mono">ADMIN-2026</code></li>
                    <li><b>Super Admin:</b> <code className="font-mono">SUPER-2026</code></li>
                    <li><b>Institute:</b> <code className="font-mono">INST-2026</code></li>
                  </ul>
                  <div>
                    <Label htmlFor="staffCode">Enter the code for "{ROLE_META[role].title}"</Label>
                    <Input id="staffCode" {...register("staffCode")} placeholder="e.g. ADMIN-2026" aria-invalid={!!errors.staffCode} />
                    {errors.staffCode && <p className="mt-1 text-sm text-destructive">{errors.staffCode.message as string}</p>}
                  </div>
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
              <div className="grid sm:grid-cols-2 gap-4">
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
              <div className="grid sm:grid-cols-2 gap-4">
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
                <div key={k} className="flex justify-between border-b border-border/60 py-1.5">
                  <span className="text-muted-foreground">{k}</span><span className="font-medium capitalize">{v}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between pt-4 gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}>Back</Button>
            {step < STEPS.length ? (
              <Button type="button" onClick={next}>Continue</Button>
            ) : (
              <Button type="submit" disabled={loading}>
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
