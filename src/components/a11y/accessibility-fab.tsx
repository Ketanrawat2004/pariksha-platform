import { useEffect, useState, useCallback } from "react";
import { Accessibility, Sun, Moon, Type, Contrast, MousePointer2, Sparkles, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Prefs = {
  theme: "light" | "dark";
  fontScale: number; // 1, 1.15, 1.3
  highContrast: boolean;
  dyslexic: boolean;
  reduceMotion: boolean;
  underlineLinks: boolean;
  largeCursor: boolean;
};

const DEFAULTS: Prefs = {
  theme: "light",
  fontScale: 1,
  highContrast: false,
  dyslexic: false,
  reduceMotion: false,
  underlineLinks: false,
  largeCursor: false,
};

const KEY = "pariksha:a11y";

function load(): Prefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  // Auto dark mode from system
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  return { ...DEFAULTS, theme: prefersDark ? "dark" : "light" };
}

function apply(p: Prefs) {
  const root = document.documentElement;
  root.classList.toggle("dark", p.theme === "dark");
  root.classList.toggle("a11y-contrast", p.highContrast);
  root.classList.toggle("a11y-dyslexic", p.dyslexic);
  root.classList.toggle("a11y-motion-reduce", p.reduceMotion);
  root.classList.toggle("a11y-underline", p.underlineLinks);
  root.classList.toggle("a11y-cursor", p.largeCursor);
  root.style.fontSize = `${p.fontScale * 100}%`;
}

export function AccessibilityFab() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const p = load();
    setPrefs(p);
    apply(p);
    setReady(true);
  }, []);

  const update = useCallback((patch: Partial<Prefs>) => {
    setPrefs((cur) => {
      const next = { ...cur, ...patch };
      apply(next);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  if (!ready) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open accessibility & theme settings"
        aria-expanded={open}
        className="fixed bottom-4 left-4 z-[60] h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-elegant flex items-center justify-center hover:scale-105 transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Accessibility className="h-6 w-6" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Accessibility settings"
          className="fixed bottom-20 left-4 z-[60] w-[19rem] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-popover text-popover-foreground shadow-elegant p-4 space-y-3 animate-fade-up"
        >
          <div className="flex items-center justify-between">
            <div className="font-bold flex items-center gap-2"><Accessibility className="h-4 w-4" /> Accessibility</div>
            <button aria-label="Close" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>

          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Theme</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => update({ theme: "light" })}
                aria-pressed={prefs.theme === "light"}
                className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition ${prefs.theme === "light" ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"}`}
              ><Sun className="h-4 w-4" /> Light</button>
              <button
                onClick={() => update({ theme: "dark" })}
                aria-pressed={prefs.theme === "dark"}
                className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition ${prefs.theme === "dark" ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"}`}
              ><Moon className="h-4 w-4" /> Dark</button>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide flex items-center gap-1"><Type className="h-3 w-3" /> Text size</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { v: 1, l: "A" },
                { v: 1.15, l: "A+" },
                { v: 1.3, l: "A++" },
              ].map((o) => (
                <button
                  key={o.v}
                  onClick={() => update({ fontScale: o.v })}
                  aria-pressed={prefs.fontScale === o.v}
                  className={`rounded-md border px-2 py-2 text-sm font-bold transition ${prefs.fontScale === o.v ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"}`}
                >{o.l}</button>
              ))}
            </div>
          </div>

          <ToggleRow icon={<Contrast className="h-4 w-4" />} label="High contrast" checked={prefs.highContrast} onChange={(v) => update({ highContrast: v })} />
          <ToggleRow icon={<Sparkles className="h-4 w-4" />} label="Dyslexia-friendly font" checked={prefs.dyslexic} onChange={(v) => update({ dyslexic: v })} />
          <ToggleRow icon={<Sparkles className="h-4 w-4" />} label="Reduce motion" checked={prefs.reduceMotion} onChange={(v) => update({ reduceMotion: v })} />
          <ToggleRow icon={<Type className="h-4 w-4" />} label="Underline links" checked={prefs.underlineLinks} onChange={(v) => update({ underlineLinks: v })} />
          <ToggleRow icon={<MousePointer2 className="h-4 w-4" />} label="Large cursor" checked={prefs.largeCursor} onChange={(v) => update({ largeCursor: v })} />

          <Button variant="outline" size="sm" className="w-full" onClick={() => { setPrefs(DEFAULTS); apply(DEFAULTS); try { localStorage.removeItem(KEY); } catch {} }}>
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
        </div>
      )}
    </>
  );
}

function ToggleRow({ icon, label, checked, onChange }: { icon: React.ReactNode; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer rounded-md px-1 py-1 hover:bg-muted/60">
      <span className="flex items-center gap-2 text-sm">{icon}{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition ${checked ? "bg-primary" : "bg-muted-foreground/30"}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
      </button>
    </label>
  );
}
