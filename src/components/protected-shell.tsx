import { ReactNode, useEffect } from "react";
import { useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { useAuth, type AppRole } from "@/lib/auth/auth-context";
import { LogOut, Loader2, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StaffSigninGate } from "@/components/staff-signin-gate";
import { ParikshaLogo } from "@/components/pariksha-logo";

interface NavItem { to: string; label: string }

const navByRole: Record<AppRole, NavItem[]> = {
  candidate: [
    { to: "/candidate/dashboard", label: "Dashboard" },
    { to: "/candidate/exams", label: "Exams" },
    { to: "/candidate/results", label: "Results" },
    { to: "/candidate/profile", label: "Profile" },
    { to: "/candidate/notifications", label: "Notifications" },
  ],
  invigilator: [
    { to: "/invigilator/dashboard", label: "Dashboard" },
    { to: "/invigilator/attendance", label: "Attendance" },
    { to: "/invigilator/live-monitor", label: "Live Monitor" },
    { to: "/invigilator/incidents", label: "Incidents" },
    { to: "/invigilator/seating", label: "Seating" },
  ],
  admin: [
    { to: "/admin/dashboard", label: "Dashboard" },
    { to: "/admin/exams", label: "Exams" },
    { to: "/admin/centers", label: "Centers" },
    { to: "/admin/candidates", label: "Candidates" },
    { to: "/admin/integrity", label: "Integrity" },
    { to: "/admin/reports", label: "Reports" },
  ],
  superadmin: [
    { to: "/superadmin/dashboard", label: "Overview" },
    { to: "/superadmin/admins", label: "Admins" },
    { to: "/superadmin/audit-log", label: "Audit Log" },
    { to: "/superadmin/paper-leak-detector", label: "Leak Detector" },
    { to: "/superadmin/system", label: "System" },
  ],
  institute: [
    { to: "/institute/dashboard", label: "Dashboard" },
  ],
};

export function ProtectedShell({ children, requireRoles }: { children: ReactNode; requireRoles: AppRole[] }) {
  const { user, loading, roles, signOut, hasAnyRole } = useAuth();
  const navigate = useNavigate();
  const { location } = useRouterState();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate({ to: "/login" });
      } else if (!hasAnyRole(requireRoles)) {
        navigate({ to: "/" });
      }
    }
  }, [loading, user, roles, navigate, requireRoles, hasAnyRole]);

  if (loading || !user || !hasAnyRole(requireRoles)) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const primaryRole = requireRoles.find((r) => roles.includes(r)) ?? roles[0]!;
  const nav = navByRole[primaryRole] ?? [];

  return (
    <div className="min-h-dvh flex flex-col bg-secondary/30">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold">
            <ParikshaLogo className="h-9 w-9" />
            <span>Pariksha</span>
            <span className="hidden sm:inline-block ml-2 text-xs uppercase tracking-wider rounded-full bg-accent/10 text-accent px-2 py-0.5 font-semibold">{primaryRole}</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/candidate/notifications" aria-label="Notifications" className="p-2 rounded-md hover:bg-muted">
              <Bell className="h-4 w-4" />
            </Link>
            <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate({ to: "/" }); }}>
              <LogOut className="h-4 w-4 mr-1" /> Sign out
            </Button>
          </div>
        </div>
        <nav className="border-t border-border/60 bg-background">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 flex gap-1 overflow-x-auto text-sm">
            {nav.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link key={item.to} to={item.to}
                  className={`px-3 py-3 whitespace-nowrap border-b-2 transition ${active ? "border-accent text-foreground font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>
      <main id="main-content" className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 py-8">
        <StaffSigninGate>{children}</StaffSigninGate>
      </main>
    </div>
  );
}
