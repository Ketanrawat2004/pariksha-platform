import { Shield } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 grid gap-8 md:grid-cols-3 text-sm">
        <div>
          <div className="flex items-center gap-2 font-bold">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-gradient-hero text-primary-foreground">
              <Shield className="h-4 w-4" />
            </span>
            Pariksha
          </div>
          <p className="mt-3 text-muted-foreground max-w-xs">परीक्षा — Every mark, earned. India's exam integrity platform.</p>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Platform</h4>
          <ul className="space-y-2 text-muted-foreground">
            <li>Anti-leak paper system</li>
            <li>AI proxy detection</li>
            <li>Live integrity monitor</li>
            <li>National scale</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Built for</h4>
          <p className="text-muted-foreground">FAR AWAY Hackathon 2026 — Examinations theme.</p>
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">© 2026 Pariksha. All marks, earned.</div>
    </footer>
  );
}
