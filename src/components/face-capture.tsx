import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw, Loader2 } from "lucide-react";

interface FaceCaptureProps {
  onCapture: (dataUrl: string) => void;
  initial?: string | null;
  className?: string;
  autoStart?: boolean;
}

/** Reusable in-browser webcam capture. Returns a JPEG data URL. */
export function FaceCapture({ onCapture, initial, className, autoStart = false }: FaceCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const autoStartedRef = useRef(false);
  const [photo, setPhoto] = useState<string | null>(initial ?? null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [starting, setStarting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => () => stopStream(), []);

  useEffect(() => {
    if (!autoStart || autoStartedRef.current || photo || stream || starting) return;
    autoStartedRef.current = true;
    void start();
  }, [autoStart, photo, stream, starting]);

  // Attach stream when both <video> element and stream are ready
  useEffect(() => {
    const v = videoRef.current;
    if (v && stream && v.srcObject !== stream) {
      v.srcObject = stream;
      v.play().catch(() => { /* autoplay may need another tick */ });
    }
  }, [stream]);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStream(null);
  }

  async function start() {
    setErr(null);
    setStarting(true);
    try {
      // Call getUserMedia synchronously inside the click gesture — no awaits before it
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: 480, height: 360, facingMode: "user" },
        audio: false,
      });
      streamRef.current = s;
      setStream(s); // triggers effect that attaches to <video>
    } catch (e: any) {
      const name = e?.name ?? "";
      if (name === "NotAllowedError") setErr("Permission denied. Allow camera access in your browser settings.");
      else if (name === "NotFoundError" || name === "DevicesNotFoundError") setErr("No camera detected on this device.");
      else if (name === "NotReadableError" || name === "TrackStartError") setErr("Camera is busy in another app. Close other tabs/apps and retry.");
      else setErr(e?.message ?? "Could not access camera");
    } finally {
      setStarting(false);
    }
  }

  function snap() {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;
    const w = v.videoWidth || 480;
    const h = v.videoHeight || 360;
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, w, h);
    const url = c.toDataURL("image/jpeg", 0.85);
    setPhoto(url);
    onCapture(url);
    stopStream();
  }

  function retake() {
    setPhoto(null);
    onCapture("");
    start();
  }

  const streaming = !!stream;

  return (
    <div className={className}>
      <div className="rounded-lg border border-border bg-muted/30 overflow-hidden aspect-[4/3] flex items-center justify-center">
        {photo ? (
          <img src={photo} alt="Captured face" className="h-full w-full object-cover" />
        ) : streaming ? (
          <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
        ) : (
          <div className="text-center text-sm text-muted-foreground p-6">
            <Camera className="h-8 w-8 mx-auto mb-2 opacity-50" />
            Click "Start camera" to capture your photo
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>
      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
      <div className="mt-3 flex gap-2">
        {!photo && !streaming && (
          <Button type="button" onClick={start} disabled={starting} size="sm">
            {starting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Camera className="h-4 w-4 mr-1.5" />}
            Start camera
          </Button>
        )}
        {streaming && (
          <Button type="button" onClick={snap} size="sm">
            <Camera className="h-4 w-4 mr-1.5" /> Capture
          </Button>
        )}
        {photo && (
          <Button type="button" onClick={retake} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-1.5" /> Retake
          </Button>
        )}
      </div>
    </div>
  );
}

/** Helper: convert data URL to Blob for storage upload. */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(",");
  const mime = /data:(.*?);base64/.exec(meta)?.[1] ?? "image/jpeg";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
