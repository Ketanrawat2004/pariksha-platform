import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { defaultLandingFor } from "@/lib/auth/auth-context";
import { ParikshaLogo } from "@/components/pariksha-logo";

export function SiteHeader() {
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg" aria-label="Pariksha home">
          <ParikshaLogo className="h-9 w-9" />
          <span>Pariksha</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm" aria-label="Primary">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition" activeProps={{ className: "text-foreground font-semibold" }} activeOptions={{ exact: true }}>Home</Link>
          <Link to="/about" className="text-muted-foreground hover:text-foreground transition" activeProps={{ className: "text-foreground font-semibold" }}>About</Link>
          <Link to="/trishield-vault" className="text-muted-foreground hover:text-foreground transition" activeProps={{ className: "text-foreground font-semibold" }}>TriShield Vault</Link>
          <a href="/#features" className="text-muted-foreground hover:text-foreground transition">Features</a>
          <Link to="/sitemap" className="text-muted-foreground hover:text-foreground transition" activeProps={{ className: "text-foreground font-semibold" }}>Sitemap</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button size="sm" asChild className="bg-accent hover:bg-accent/90 shadow-elegant">
            <Link to="/exam-entry">Give Exam</Link>
          </Button>
          {user ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate({ to: defaultLandingFor(roles) })}>Dashboard</Button>
              <Button variant="outline" size="sm" onClick={() => { signOut(); navigate({ to: "/" }); }}>Sign out</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild><Link to="/login">Login</Link></Button>
              <Button size="sm" variant="outline" asChild><Link to="/register">Register</Link></Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
