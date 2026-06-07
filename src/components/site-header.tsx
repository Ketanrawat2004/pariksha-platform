import { Link } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { defaultLandingFor } from "@/lib/auth/auth-context";

export function SiteHeader() {
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-gradient-hero text-primary-foreground shadow-elegant">
            <Shield className="h-5 w-5" />
          </span>
          <span>Pariksha</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition" activeProps={{ className: "text-foreground font-semibold" }} activeOptions={{ exact: true }}>Home</Link>
          <a href="/#features" className="text-muted-foreground hover:text-foreground transition">Features</a>
          <a href="/#how" className="text-muted-foreground hover:text-foreground transition">How it works</a>
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate({ to: defaultLandingFor(roles) })}>Dashboard</Button>
              <Button variant="outline" size="sm" onClick={() => { signOut(); navigate({ to: "/" }); }}>Sign out</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild><Link to="/login">Login</Link></Button>
              <Button size="sm" asChild><Link to="/register">Register</Link></Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
