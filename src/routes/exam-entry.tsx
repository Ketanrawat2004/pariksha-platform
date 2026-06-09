import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ProtectedShell } from "@/components/protected-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FaceCapture } from "@/components/face-capture";
import { Loader2, ShieldCheck, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/exam-entry")({
  head: () => ({ meta: [{ title: "Enter Exam — Pariksha" }] }),
  component: () => (
    <ProtectedShell requireRoles={["candidate"]}>
      <EntryGate />
    </ProtectedShell>
  ),
});

const MODEL_URL = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights";
let modelsLoaded = false;

async function loadModels() {
  const faceapi = await import("face-api.js");
  if (!modelsLoaded) {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    modelsLoaded = true;
  }
  return faceapi;
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load reference photo"));
    img.src = src;
  });
}

function EntryGate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [admitNo, setAdmitNo] = useState("");
  const [livePhoto, setLivePhoto] = useState("");
  const [busy, setBusy] = useState(false);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [verified, setVerified] = useState(false);

  async function verify() {
    if (!user) return;
    if (!fullName || !dob || !admitNo || !livePhoto) {
      return toast.error("Fill every field and capture a live photo");
    }
    setBusy(true);
    setConfidence(null);
    try {
      // 1) Match admit-card to a registration owned by this user
      const { data: reg, error: regErr } = await supabase
        .from("registrations")
        .select("id, admit_card_number, exams(title)")
        .eq("candidate_id", user.id)
        .eq("admit_card_number", admitNo.trim())
        .maybeSingle();
      if (regErr) throw regErr;
      if (!reg) throw new Error("Admit card number not found for your account");

      // 2) Compare name + DOB with registered profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, date_of_birth, photo_url")
        .eq("id", user.id)
        .maybeSingle();
      if (!profile?.photo_url) throw new Error("No registration photo on file. Update your profile photo first.");
      if (profile.full_name?.trim().toLowerCase() !== fullName.trim().toLowerCase()) {
        throw new Error("Name does not match registration record");
      }
      if (profile.date_of_birth && profile.date_of_birth !== dob) {
        throw new Error("Date of birth does not match registration record");
      }

      // 3) Real face match with face-api.js
      toast.message("Loading face-match models (first time can take ~10s)…");
      const faceapi = await loadModels();
      const [liveImg, refImg] = await Promise.all([loadImg(livePhoto), loadImg(profile.photo_url)]);
      const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 });
      const [liveDet, refDet] = await Promise.all([
        faceapi.detectSingleFace(liveImg, opts).withFaceLandmarks().withFaceDescriptor(),
        faceapi.detectSingleFace(refImg, opts).withFaceLandmarks().withFaceDescriptor(),
      ]);
      if (!liveDet) throw new Error("No face detected in live photo. Retake in good light.");
      if (!refDet) throw new Error("No face detected in your registration photo. Re-upload via profile.");

      const distance = faceapi.euclideanDistance(liveDet.descriptor, refDet.descriptor);
      // 0 = identical, ~0.6 typical match threshold
      const conf = Math.max(0, Math.min(100, Math.round((1 - distance / 1.0) * 100)));
      setConfidence(conf);

      if (distance > 0.6) {
        throw new Error(`Face does not match registration (distance ${distance.toFixed(2)}). Please retake your photo.`);
      }

      setVerified(true);
      toast.success(`Identity verified · ${conf}% match`);
      setTimeout(() => navigate({ to: "/exam/$registrationId", params: { registrationId: reg.id } }), 900);
    } catch (e: any) {
      toast.error(e.message ?? "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-secondary/30 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-4">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to home</Link>
        </div>
        <Card className="p-6 md:p-8 space-y-6 shadow-elegant">
          <div className="flex items-start gap-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Exam Entry · Identity Check</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Enter the same details as your admit card. Your live photo is matched against the photo you submitted at registration using face-api.js.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="name">Full name (as on admit card)</Label>
              <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={busy || verified} />
            </div>
            <div>
              <Label htmlFor="dob">Date of birth</Label>
              <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} disabled={busy || verified} />
            </div>
            <div>
              <Label htmlFor="admit">Admit card number</Label>
              <Input id="admit" value={admitNo} onChange={(e) => setAdmitNo(e.target.value)} placeholder="PRK-…" disabled={busy || verified} />
            </div>
          </div>

          <div>
            <Label>Live photo</Label>
            <p className="text-xs text-muted-foreground mb-2">Look straight into the camera. Avoid backlight.</p>
            <FaceCapture onCapture={setLivePhoto} />
          </div>

          {confidence !== null && (
            <div className={`rounded-lg border p-3 text-sm flex items-center justify-between ${verified ? "border-success/40 bg-success/10 text-success" : "border-border"}`}>
              <span>Face match confidence</span>
              <span className="font-bold tabular-nums">{confidence}%</span>
            </div>
          )}

          {verified ? (
            <div className="rounded-lg bg-success/10 text-success p-3 font-bold flex items-center justify-center gap-2">
              <CheckCircle2 className="h-5 w-5" /> Access granted — launching exam…
            </div>
          ) : (
            <Button onClick={verify} disabled={busy} size="lg" className="w-full bg-accent hover:bg-accent/90 shadow-elegant">
              {busy ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <ArrowRight className="h-5 w-5 mr-2" />}
              Verify identity & start exam
            </Button>
          )}
        </Card>
      </div>
    </div>
  );
}
