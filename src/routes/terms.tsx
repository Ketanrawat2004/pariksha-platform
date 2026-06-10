import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Pariksha" },
      { name: "description", content: "The rules and code of conduct for candidates, invigilators, institutes, and admins using Pariksha." },
      { property: "og:title", content: "Terms of Service — Pariksha" },
      { property: "og:description", content: "Code of conduct and acceptable-use rules for Pariksha." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 sm:px-6 py-10 md:py-16">
        <h1 className="text-3xl sm:text-4xl font-bold">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mt-1">Last updated: 10 June 2026</p>

        <h2 className="text-xl font-semibold mt-8">1. Eligibility</h2>
        <p className="text-sm">You must be at least 13 years old, register with truthful information, and use Pariksha only for legitimate examination purposes.</p>

        <h2 className="text-xl font-semibold mt-8">2. Code of conduct during exams</h2>
        <ul className="list-disc pl-6 space-y-1 text-sm">
          <li>No copying, screen sharing, screenshots, printing, or external help.</li>
          <li>Phones, smartwatches, headphones, and secondary screens must be removed.</li>
          <li>Camera and microphone must remain available throughout the exam.</li>
          <li>Tab switching, leaving fullscreen, or hiding from camera triggers automatic submission.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8">3. Account security</h2>
        <p className="text-sm">You are responsible for keeping your password and any staff access code (admin, invigilator, institute, superadmin) confidential. Sharing a staff code is grounds for immediate revocation.</p>

        <h2 className="text-xl font-semibold mt-8">4. Intellectual property</h2>
        <p className="text-sm">Question papers, results, certificates, and the Pariksha platform are protected. You may not reproduce, distribute, or reverse-engineer exam content.</p>

        <h2 className="text-xl font-semibold mt-8">5. Suspension &amp; cancellation</h2>
        <p className="text-sm">Pariksha may invalidate results and suspend accounts where integrity violations are detected, with the option of appeal to the examining authority.</p>

        <h2 className="text-xl font-semibold mt-8">6. Limitation of liability</h2>
        <p className="text-sm">Pariksha is provided "as is". We are not liable for connectivity loss on the candidate's side, hardware failures, or third-party authentication outages, beyond the rescheduling remedies offered by the examining authority.</p>

        <h2 className="text-xl font-semibold mt-8">7. Contact</h2>
        <p className="text-sm">For questions about these Terms, email <a href="mailto:legal@pariksha.in" className="text-accent hover:underline">legal@pariksha.in</a>.</p>
      </main>
      <SiteFooter />
    </div>
  );
}
