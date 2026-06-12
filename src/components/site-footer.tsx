import { Link } from "@tanstack/react-router";
import { ParikshaLogo } from "@/components/pariksha-logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 grid gap-8 sm:grid-cols-2 md:grid-cols-4 text-sm">
        <div className="sm:col-span-2 md:col-span-2">
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
            <li><Link to="/status" className="hover:text-foreground">System Status</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Account &amp; Legal</h4>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/login" className="hover:text-foreground">Login</Link></li>
            <li><Link to="/register" className="hover:text-foreground">Register</Link></li>
            <li><Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-foreground">Terms of Service</Link></li>
            <li><Link to="/sitemap" className="hover:text-foreground">Sitemap</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 px-4 py-3 text-center text-[11px] leading-relaxed text-muted-foreground/80">
        If you are a student affected by the NEET 2026 cancellation and you're struggling, iCall offers free, confidential support: <a href="tel:+919152987821" className="underline underline-offset-2 hover:text-foreground">9152987821</a>. Please call.
      </div>
      <div className="border-t border-border/60 py-4 px-4 text-center text-xs text-muted-foreground">© 2026 Pariksha. Built for FAR AWAY Hackathon · All marks, earned.</div>
    </footer>
  );
}
