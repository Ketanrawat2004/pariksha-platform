import type { RefObject } from "react";

export function LiveWatchPreview({ videoRef, canvasRef }: { videoRef: RefObject<HTMLVideoElement | null>; canvasRef: RefObject<HTMLCanvasElement | null> }) {
  return (
    <div className="fixed top-20 right-4 z-[1000] w-40 h-30 rounded-lg overflow-hidden border-2 border-destructive shadow-xl bg-slate-900" style={{ width: 160, height: 120 }}>
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
