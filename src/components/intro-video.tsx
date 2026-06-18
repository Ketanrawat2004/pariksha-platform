import { useEffect, useRef, useState, type ReactNode } from "react";
import introAsset from "@/assets/intro.mp4.asset.json";
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "pariksha:intro-played";
const VISITED_KEY = "pariksha:tab-visited";

export function IntroVideo({ children }: { children: ReactNode }) {
  // Default to NOT playing during SSR / before mount to avoid hydration mismatch.
  const [playing, setPlaying] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [fading, setFading] = useState(false);
  const [muted, setMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setMounted(true);
    // Force a fresh sign-in per browser tab/device. If this tab hasn't been
    // marked as visited, sign out so the user must authenticate again.
    try {
      const visited = sessionStorage.getItem(VISITED_KEY);
      if (!visited) {
        sessionStorage.setItem(VISITED_KEY, "1");
        void supabase.auth.signOut().catch(() => {});
      }
    } catch { /* noop */ }

    try {
      const already = sessionStorage.getItem(SESSION_KEY);
      if (!already) setPlaying(true);
    } catch {
      setPlaying(true);
    }
  }, []);

  const finish = () => {
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* noop */ }
    setFading(true);
    setTimeout(() => setPlaying(false), 600);
  };

  useEffect(() => {
    if (!playing) return;
    const v = videoRef.current;
    if (!v) return;
    v.play().catch(() => {
      // Autoplay with audio blocked → retry muted
      v.muted = true;
      setMuted(true);
      v.play().catch(() => finish());
    });
  }, [playing]);

  return (
    <>
      {children}
      {mounted && playing && (
        <div
          className={`fixed inset-0 z-[9999] bg-black flex items-center justify-center transition-opacity duration-500 ${fading ? "opacity-0" : "opacity-100"}`}
        >
          <video
            ref={videoRef}
            src={introAsset.url}
            className="w-full h-full object-cover sm:object-contain"
            playsInline
            autoPlay
            onEnded={finish}
            onError={finish}
          />
          <button
            onClick={finish}
            className="absolute top-4 right-4 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur px-4 py-2 text-sm text-white font-medium transition"
            aria-label="Skip intro"
          >
            Skip ▸
          </button>
          {muted && videoRef.current && (
            <button
              onClick={() => {
                const v = videoRef.current!;
                v.muted = false;
                setMuted(false);
              }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur px-4 py-2 text-sm text-white font-medium transition"
            >
              🔊 Tap for sound
            </button>
          )}
        </div>
      )}
    </>
  );
}
