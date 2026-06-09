import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FaceCapture } from "@/components/face-capture";
import { Loader2, ShieldCheck, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/give-exam")({
  head: () => ({
    meta: [
      { title: "Give Exam — Pariksha" },
      { name: "description", content: "Anonymous exam entry: verify your admit card and face-match to start." },
    ],
  }),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: PublicGiveExam,
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

function PublicGiveExam() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [aadhaar4, setAadhaar4] = useState("");
  const [admitNo, setAdmitNo] = useState("");
  const [livePhoto, setLivePhoto] = useState("");
  const [busy, setBusy] = useState(false);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [verified, setVerified] = useState<{ regId: string; title: string } | null>(null);

  async function verify() {
    if (!fullName || !dob || !admitNo || !livePhoto) {
      return toast.error("Fill name, date of birth, admit number and capture a live photo");
    }
    setBusy(true);
    setConfidence(null);
    try {
      const { data, error } = await supabase.rpc("verify_admit_anonymous" as any, {
        _full_name: fullName,
        _dob: dob,
        _aadhaar_last4: aadhaar4 || null,
        _admit_card_number: admitNo.trim(),
      } as any);
      if (error) throw error;
      const row = (data as any[])?.[0];
      if (!row) throw new Error("No matching registration. Check your name, date of birth, Aadhaar and admit number.");
      if (!row.photo_url) throw new Error("Registered photo not on file. Contact your institute.");

      toast.message("Loading face-match models (first time can take ~10s)…");
      const faceapi = await loadModels();
      const [liveImg, refImg] = await Promise.all([loadImg(livePhoto), loadImg(row.photo_url)]);
      const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 });
      const [liveDet, refDet] = await Promise.all([
        faceapi.detectSingleFace(liveImg, opts).withFaceLandmarks().withFaceDescriptor(),
        faceapi.detectSingleFace(refImg, opts).withFaceLandmarks().withFaceDescriptor(),
      ]);
      if (!liveDet) throw new Error("No face detected in your live photo. Retake in good light.");
      if (!refDet) throw new Error("No face detected in the registered photo on file.");

      const distance = faceapi.euclideanDistance(liveDet.descriptor, refDet.descriptor);
      const conf = Math.max(0, Math.min(100, Math.round((1 - distance / 1.0) * 100)));
      setConfidence(conf);
      if (distance > 0.6) {
        throw new Error(`Face does not match registration (${conf}% match). Please retake.`);
      }
      setVerified({ regId: row.registration_id, title: row.exam_title });
      toast.success(`Identity verified · ${conf}% match`);
      setTimeout(() => navigate({ to: "/exam/$registrationId", params: { registrationId: row.registration_id } }), 900);
    } catch (e: any) {
      toast.error(e?.message ?? "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-secondary/30">
      <SiteHeader />
      <main className="flex-1 py-10 px-4">
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
                <h1 className="text-2xl font-bold">Give Exam · Anonymous Entry</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Enter the details from your admit card. We face-match your live photo against the photo you submitted at registration — no sign-in required.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="name">Full name (as on admit card)</Label>
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={busy || !!verified} />
              </div>
              <div>
                <Label htmlFor="dob">Date of birth</Label>
                <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} disabled={busy || !!verified} />
              </div>
              <div>
                <Label htmlFor="aadhaar">Aadhaar (last 4 digits)</Label>
                <Input id="aadhaar" inputMode="numeric" maxLength={4} value={aadhaar4} onChange={(e) => setAadhaar4(e.target.value.replace(/\D/g, "").slice(0, 4))} disabled={busy || !!verified} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="admit">Admit card / Registration number</Label>
                <Input id="admit" value={admitNo} onChange={(e) => setAdmitNo(e.target.value)} placeholder="PRK-… / KNS-…" disabled={busy || !!verified} />
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
                <CheckCircle2 className="h-5 w-5" /> Verified — launching {verified.title}…
              </div>
            ) : (
              <Button onClick={verify} disabled={busy} size="lg" className="w-full bg-accent hover:bg-accent/90 shadow-elegant">
                {busy ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <ArrowRight className="h-5 w-5 mr-2" />}
                Verify identity & start exam
              </Button>
            )}
          </Card>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
