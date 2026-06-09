import { Link } from "@tanstack/react-router";
import { ParikshaLogo } from "@/components/pariksha-logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 grid gap-8 md:grid-cols-4 text-sm">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 font-bold">
            <ParikshaLogo className="h-8 w-8" />
            <span>Pariksha</span>
          </div>
          <p className="mt-3 text-muted-foreground max-w-sm">परीक्षा — Every mark, earned. India's national examination integrity platform.</p>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Platform</h4>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/trishield-vault" className="hover:text-foreground">TriShield Vault</Link></li>
            <li><Link to="/about" className="hover:text-foreground">About</Link></li>
            <li><a href="/#features" className="hover:text-foreground">Features</a></li>
            <li><a href="/#how" className="hover:text-foreground">How it works</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Account</h4>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/login" className="hover:text-foreground">Login</Link></li>
            <li><Link to="/register" className="hover:text-foreground">Register</Link></li>
            <li><Link to="/sitemap" className="hover:text-foreground">Sitemap</Link></li>
            <li><a href="/sitemap.xml" className="hover:text-foreground">sitemap.xml</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">© 2026 Pariksha. Built for FAR AWAY Hackathon · All marks, earned.</div>
    </footer>
  );
}
