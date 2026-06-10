import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Pariksha" },
      { name: "description", content: "How Pariksha collects, uses, secures, and shares your personal data, biometric verification photos, and exam activity." },
      { property: "og:title", content: "Privacy Policy — Pariksha" },
      { property: "og:description", content: "How Pariksha handles your personal and biometric data." },
      { property: "og:url", content: "/privacy" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 sm:px-6 py-10 md:py-16 prose prose-sm sm:prose-base dark:prose-invert">
        <h1 className="text-3xl sm:text-4xl font-bold">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">Last updated: 10 June 2026</p>

        <h2 className="text-xl font-semibold mt-8">1. What we collect</h2>
        <ul className="list-disc pl-6 space-y-1 text-sm">
          <li><b>Identity:</b> full name, date of birth, gender, phone, state, email.</li>
          <li><b>Aadhaar:</b> stored as a SHA-256 hash on the client before submission; we never store raw Aadhaar numbers.</li>
          <li><b>Biometric:</b> registration face photo and live exam-camera frames used solely for face-match and proctoring.</li>
          <li><b>Exam activity:</b> answers, integrity events (tab-switch, copy attempts, suspicious objects), timing, and results.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8">2. How we use your data</h2>
        <p className="text-sm">To verify identity, deliver exams securely, detect proxy/impersonation, generate certificates, and meet legal/audit obligations of the examining authority.</p>

        <h2 className="text-xl font-semibold mt-8">3. Security</h2>
        <ul className="list-disc pl-6 space-y-1 text-sm">
          <li>All traffic is TLS-encrypted; HSTS preload requested.</li>
          <li>Row-level security on every personal-data table; encrypted question banks are isolated from regular reads.</li>
          <li>Per-candidate watermarking, screenshot/print blocking, and tamper-evident audit logs during exams.</li>
          <li>TriShield three-party witness recordings are write-once — overwrites are forbidden at the storage layer.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8">4. Sharing</h2>
        <p className="text-sm">We share data only with the examining authority you registered with, your invigilator/admin staff, and verified law-enforcement requests. We never sell personal data.</p>

        <h2 className="text-xl font-semibold mt-8">5. Retention</h2>
        <p className="text-sm">Identity and result records: 7 years (legal retention). Live proctoring video frames: deleted within 90 days unless flagged for incident review.</p>

        <h2 className="text-xl font-semibold mt-8">6. Your rights</h2>
        <p className="text-sm">You may request access, correction, or deletion of your personal data by emailing <a href="mailto:privacy@pariksha.in" className="text-accent hover:underline">privacy@pariksha.in</a>. Some records may be retained where examination law requires.</p>

        <h2 className="text-xl font-semibold mt-8">7. Contact</h2>
        <p className="text-sm">Data Protection Officer · <a href="mailto:dpo@pariksha.in" className="text-accent hover:underline">dpo@pariksha.in</a></p>
      </main>
      <SiteFooter />
    </div>
  );
}
