import { useEffect, useState, useCallback } from "react";
import { Sun, Moon } from "lucide-react";

const KEY = "pariksha:a11y";

type Prefs = { theme?: "light" | "dark"; [k: string]: unknown };

function readPrefs(): Prefs {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Prefs;
  } catch {}
  return {};
}

function applyTheme(theme: "light" | "dark") {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readPrefs();
    // First-time visitors always land in light mode; only respect an explicit
    // saved preference on return visits. System dark-mode is ignored by design.
    const initial: "light" | "dark" =
      stored.theme === "dark" || stored.theme === "light" ? stored.theme : "light";
    setTheme(initial);
    applyTheme(initial);
    setReady(true);

    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY || !e.newValue) return;
      try {
        const p = JSON.parse(e.newValue) as Prefs;
        if (p.theme === "light" || p.theme === "dark") {
          setTheme(p.theme);
          applyTheme(p.theme);
        }
      } catch {}
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggle = useCallback(() => {
    const next: "light" | "dark" = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    try {
      const cur = readPrefs();
      localStorage.setItem(KEY, JSON.stringify({ ...cur, theme: next }));
    } catch {}
  }, [theme]);

  if (!ready) {
    return (
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-md opacity-0 ${className}`}
      />
    );
  }

  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-foreground hover:bg-muted transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`}
    >
      {isDark ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
    </button>
  );
}
