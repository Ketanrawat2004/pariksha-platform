import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

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
      { name: "description", content: "Verify your name and admit card number, then face-match to start your exam." },
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
    if (!fullName || !admitNo || !livePhoto) {
      return toast.error("Fill name, admit number and capture a live photo");
    }
    setBusy(true);
    setConfidence(null);
    try {
      const isDemo = admitNo.trim().toUpperCase() === "DEMO-0000";
      let photoUrl: string | null = null;
      let regId = "demo";
      let title = "Demo Exam";

      if (isDemo) {
        // Anonymous demo: match against the live capture stored on the
        // candidate profile page (base64 data URL in localStorage).
        try { photoUrl = localStorage.getItem("pariksha:demo-profile-photo"); } catch {}
      } else {
        const res = await fetch("/api/public/give-exam-verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            full_name: fullName,
            dob: dob || null,
            aadhaar_last4: aadhaar4 || null,
            admit_card_number: admitNo.trim(),
          }),
        });
        if (!res.ok) {
          if (res.status === 404) throw new Error("No matching registration. Check your name, date of birth, Aadhaar and admit number. Tip: use admit DEMO-0000 to try the demo exam.");
          throw new Error(`Verification failed (${res.status})`);
        }
        const row = await res.json();
        photoUrl = row.photo_url;
        regId = row.registration_id;
        title = row.exam_title;
      }

      if (photoUrl) {
        toast.message("Loading face-match models (first time can take ~10s)…");
        const faceapi = await loadModels();
        const [liveImg, refImg] = await Promise.all([loadImg(livePhoto), loadImg(photoUrl)]);
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
      } else if (isDemo) {
        toast.message("No reference photo yet — demo entry granted without face match.");
      }

      setVerified({ regId, title });
      toast.success(`Identity verified · launching ${title}`);
      setTimeout(() => navigate({ to: "/exam/$registrationId", params: { registrationId: regId } }), 900);
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
                <h1 className="text-2xl font-bold">Give Exam · Identity Check</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Enter the exact name and admit card number issued to you. Both must match our records before the live face-match begins.
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
                <Input id="admit" value={admitNo} onChange={(e) => setAdmitNo(e.target.value)} placeholder="PRK-… / KNS-… / DEMO-0000" disabled={busy || !!verified} />
                <p className="text-[11px] text-muted-foreground mt-1">No admit card? Use <button type="button" className="underline" onClick={() => setAdmitNo("DEMO-0000")}>DEMO-0000</button> to try the demo exam.</p>
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
