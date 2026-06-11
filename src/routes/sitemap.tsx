import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Map, Home, Info, Shield, LogIn, UserPlus, LayoutDashboard, GraduationCap, Users, Building2, Eye } from "lucide-react";

export const Route = createFileRoute("/sitemap")({
  head: () => ({
    meta: [
      { title: "Sitemap — Pariksha" },
      { name: "description", content: "Browse every public page of the Pariksha examination integrity platform." },
      { property: "og:title", content: "Sitemap — Pariksha" },
      { property: "og:description", content: "Browse every public page of the Pariksha examination integrity platform." },
      { property: "og:url", content: "/sitemap" },
    ],
    links: [{ rel: "canonical", href: "/sitemap" }],
  }),
  component: SitemapPage,
});

type Item = { to: string; label: string; desc: string };
type Section = { title: string; icon: React.ComponentType<{ className?: string }>; items: Item[] };

const sections: Section[] = [
  {
    title: "Public",
    icon: Home,
    items: [
      { to: "/", label: "Home", desc: "Landing, features, exam mode, how it works." },
      { to: "/about", label: "About", desc: "Mission, hackathon context, NEET-UG 2026 leak study, tech stack." },
      { to: "/trishield-vault", label: "TriShield Vault", desc: "6-step interactive demo of the secure paper vault." },
      { to: "/status", label: "System Status", desc: "Live uptime, p95 latency, and incident history." },
    ],
  },
  {
    title: "Account",
    icon: LogIn,
    items: [
      { to: "/login", label: "Login", desc: "Sign in to candidate / staff dashboards." },
      { to: "/register", label: "Register", desc: "Create an account with verified live photo capture." },
      { to: "/forgot-password", label: "Forgot password", desc: "Request a reset email." },
    ],
  },
  {
    title: "Candidate",
    icon: GraduationCap,
    items: [
      { to: "/candidate/dashboard", label: "Dashboard", desc: "Overview, avatar, upcoming demo exam." },
      { to: "/candidate/exams", label: "Exams", desc: "Registered & available exams, Give Exam." },
      { to: "/candidate/results", label: "Results", desc: "Scores, transcripts, certificate PDF." },
      { to: "/candidate/profile", label: "Profile", desc: "Identity, photo, account details." },
      { to: "/candidate/notifications", label: "Notifications", desc: "Exam, paper, and status alerts." },
    ],
  },
  {
    title: "Invigilator",
    icon: Eye,
    items: [
      { to: "/invigilator/dashboard", label: "Dashboard", desc: "Session overview & live signals." },
      { to: "/invigilator/attendance", label: "Attendance", desc: "Roster, face-match check-in." },
      { to: "/invigilator/live-monitor", label: "Live Monitor", desc: "Real-time integrity stream." },
      { to: "/invigilator/incidents", label: "Incidents", desc: "Log and review flags." },
      { to: "/invigilator/seating", label: "Seating", desc: "Center seat plan." },
    ],
  },
  {
    title: "Admin",
    icon: LayoutDashboard,
    items: [
      { to: "/admin/dashboard", label: "Dashboard", desc: "Operational overview." },
      { to: "/admin/exams", label: "Exams", desc: "Schedule and manage exams." },
      { to: "/admin/centers", label: "Centers", desc: "Manage test centers." },
      { to: "/admin/candidates", label: "Candidates", desc: "Candidate management." },
      { to: "/admin/integrity", label: "Integrity", desc: "Integrity review console." },
      { to: "/admin/reports", label: "Reports", desc: "Exports & analytics." },
    ],
  },
  {
    title: "Superadmin",
    icon: Users,
    items: [
      { to: "/superadmin/dashboard", label: "Overview", desc: "Platform-wide KPIs." },
      { to: "/superadmin/admins", label: "Admins", desc: "Manage admin accounts." },
      { to: "/superadmin/audit-log", label: "Audit Log", desc: "Tamper-evident events." },
      { to: "/superadmin/paper-leak-detector", label: "Leak Detector", desc: "TriShield AI investigator." },
      { to: "/superadmin/system", label: "System", desc: "Health, settings, keys." },
    ],
  },
  {
    title: "Institute",
    icon: Building2,
    items: [{ to: "/institute/dashboard", label: "Dashboard", desc: "Author, lock & publish papers." }],
  },
];

function SitemapPage() {
  return (
    <div className="min-h-dvh flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-gradient-to-b from-secondary/40 to-background">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-14 md:py-20">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-semibold text-muted-foreground">
              <Map className="h-3.5 w-3.5 text-accent" /> Sitemap
            </div>
            <h1 className="mt-4 text-3xl md:text-5xl font-bold tracking-tight">Every page in Pariksha</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">A complete map of public pages, dashboards, and tools across every role on the platform.</p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 sm:px-6 py-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sections.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.title} className="rounded-xl border border-border/60 bg-card p-5 hover:shadow-md transition">
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-accent/10 text-accent"><Icon className="h-4 w-4" /></span>
                  <h2 className="font-semibold">{s.title}</h2>
                </div>
                <ul className="space-y-3">
                  {s.items.map((it) => (
                    <li key={it.to}>
                      <Link to={it.to as any} className="group block">
                        <div className="text-sm font-medium text-foreground group-hover:text-accent transition">{it.label}</div>
                        <div className="text-xs text-muted-foreground">{it.desc}</div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>

        <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-16">
          <div className="rounded-xl border border-border/60 bg-secondary/30 p-5 text-sm text-muted-foreground flex flex-wrap items-center gap-3">
            <Shield className="h-4 w-4 text-accent" />
            For crawlers: <a href="/sitemap.xml" className="underline hover:text-foreground">/sitemap.xml</a>
            <span className="opacity-50">·</span>
            <a href="/robots.txt" className="underline hover:text-foreground">/robots.txt</a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
