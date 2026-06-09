import type { RefObject } from "react";

interface Props {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  position?: "top-center" | "top-right" | "bottom-right";
}

export function LiveWatchPreview({ videoRef, canvasRef, position = "top-right" }: Props) {
  const posClass =
    position === "top-center"
      ? "top-20 left-1/2 -translate-x-1/2"
      : position === "top-right"
        ? "top-20 right-4"
        : "bottom-4 right-4";
  return (
    <div
      className={`fixed ${posClass} z-[1000] rounded-lg overflow-hidden border-2 border-destructive shadow-xl bg-slate-900`}
      style={{ width: 220, height: 165 }}
      aria-label="TriShield live camera preview"
    >
      <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
      <canvas ref={canvasRef} className="hidden" />
      <div className="absolute top-1 left-1 flex items-center gap-1 bg-destructive/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
        </span>
        REC
      </div>
    </div>
  );
}
