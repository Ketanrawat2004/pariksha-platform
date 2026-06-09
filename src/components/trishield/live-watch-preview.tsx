import { useEffect, useRef, useState, type RefObject } from "react";
import { GripVertical } from "lucide-react";

interface Props {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  position?: "top-center" | "top-right" | "bottom-right";
}

const STORAGE_KEY = "pariksha:livewatch-pos";

export function LiveWatchPreview({ videoRef, canvasRef, position = "top-right" }: Props) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);

  // Initial position: read from localStorage, else from `position` prop
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (typeof p?.x === "number" && typeof p?.y === "number") {
          setPos(p);
          return;
        }
      }
    } catch {}
    const W = 220, H = 165, M = 16;
    const vw = window.innerWidth, vh = window.innerHeight;
    const defaults: Record<string, { x: number; y: number }> = {
      "top-right": { x: vw - W - M, y: 80 },
      "top-center": { x: (vw - W) / 2, y: 80 },
      "bottom-right": { x: vw - W - M, y: vh - H - M },
    };
    setPos(defaults[position]);
  }, [position]);

  function onPointerDown(e: React.PointerEvent) {
    if (!pos) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const W = 220, H = 165;
    const nx = Math.max(0, Math.min(window.innerWidth - W, e.clientX - dragRef.current.dx));
    const ny = Math.max(0, Math.min(window.innerHeight - H, e.clientY - dragRef.current.dy));
    setPos({ x: nx, y: ny });
  }
  function onPointerUp() {
    if (dragRef.current && pos) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pos)); } catch {}
    }
    dragRef.current = null;
  }

  if (!pos) return null;

  return (
    <div
      className="fixed z-[1000] rounded-lg overflow-hidden border-2 border-destructive shadow-xl bg-slate-900 select-none"
      style={{ width: 220, height: 165, left: pos.x, top: pos.y, touchAction: "none" }}
      aria-label="TriShield live camera preview (draggable)"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <video ref={videoRef} className="w-full h-full object-cover pointer-events-none" muted playsInline />
      <canvas ref={canvasRef} className="hidden" />
      <div className="absolute top-1 left-1 flex items-center gap-1 bg-destructive/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
        </span>
        REC
      </div>
      <div className="absolute top-1 right-1 bg-black/60 text-white rounded p-0.5 cursor-grab active:cursor-grabbing">
        <GripVertical className="h-3 w-3" />
      </div>
    </div>
  );
}
