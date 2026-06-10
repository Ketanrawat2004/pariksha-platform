import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { defaultLandingFor } from "@/lib/auth/auth-context";
import { ParikshaLogo } from "@/components/pariksha-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Menu } from "lucide-react";

export function SiteHeader() {
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur" role="banner">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 gap-2">
        <Link to="/" className="flex items-center gap-2 font-bold text-base sm:text-lg shrink-0" aria-label="Pariksha home">
          <ParikshaLogo className="h-8 w-8 sm:h-9 sm:w-9" aria-hidden="true" />
          <span>Pariksha</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm" aria-label="Primary navigation">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition" activeProps={{ className: "text-foreground font-semibold" }} activeOptions={{ exact: true }}>Home</Link>
          <Link to="/about" className="text-muted-foreground hover:text-foreground transition" activeProps={{ className: "text-foreground font-semibold" }}>About</Link>
          <Link to="/trishield-vault" className="text-muted-foreground hover:text-foreground transition" activeProps={{ className: "text-foreground font-semibold" }}>TriShield Vault</Link>
          <a href="/#features" className="text-muted-foreground hover:text-foreground transition">Features</a>
          <Link to="/sitemap" className="text-muted-foreground hover:text-foreground transition" activeProps={{ className: "text-foreground font-semibold" }}>Sitemap</Link>
        </nav>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          <div className="hidden sm:flex items-center gap-2">
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
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[80vw] max-w-sm">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-1 text-base" aria-label="Mobile navigation">
                <Link to="/" onClick={close} className="rounded-md px-3 py-3 hover:bg-muted">Home</Link>
                <Link to="/about" onClick={close} className="rounded-md px-3 py-3 hover:bg-muted">About</Link>
                <Link to="/trishield-vault" onClick={close} className="rounded-md px-3 py-3 hover:bg-muted">TriShield Vault</Link>
                <a href="/#features" onClick={close} className="rounded-md px-3 py-3 hover:bg-muted">Features</a>
                <Link to="/sitemap" onClick={close} className="rounded-md px-3 py-3 hover:bg-muted">Sitemap</Link>
              </nav>
              <div className="mt-6 flex flex-col gap-2 border-t pt-4">
                {user ? (
                  <>
                    <Button onClick={() => { close(); navigate({ to: defaultLandingFor(roles) }); }}>Dashboard</Button>
                    <Button variant="outline" onClick={() => { close(); signOut(); navigate({ to: "/" }); }}>Sign out</Button>
                  </>
                ) : (
                  <>
                    <Button asChild><Link to="/login" onClick={close}>Login</Link></Button>
                    <Button variant="outline" asChild><Link to="/register" onClick={close}>Register</Link></Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
