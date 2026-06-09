import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { rateLimit, tooManyRequests } from "@/lib/backend/rate-limit";

const InputSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  admit_card_number: z.string().trim().min(4).max(64),
  dob: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  aadhaar_last4: z
    .string()
    .regex(/^\d{4}$/)
    .optional()
    .nullable(),
});

/**
 * Public verification endpoint for the anonymous "Give Exam" flow.
 * Hard-rate-limited per IP. All input is Zod-validated.
 */
export const Route = createFileRoute("/api/public/give-exam-verify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!(await rateLimit({ request, key: "give-exam-verify", max: 5, windowSeconds: 60 }))) {
          return tooManyRequests();
        }

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return new Response("Bad request", { status: 400 });
        }
        const parsed = InputSchema.safeParse(raw);
        if (!parsed.success) {
          return new Response("Invalid input", { status: 400 });
        }
        const { full_name, admit_card_number, dob, aadhaar_last4 } = parsed.data;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("verify_admit_anonymous" as any, {
          _full_name: full_name,
          _dob: dob ?? null,
          _aadhaar_last4: aadhaar_last4 ?? null,
          _admit_card_number: admit_card_number,
        } as any);
        if (error) {
          console.error("verify_admit_anonymous error", error.message);
          return new Response("Verification failed", { status: 400 });
        }
        const row = (data as any[])?.[0];
        if (!row) {
          return Response.json({ ok: false, message: "No matching registration" }, { status: 404 });
        }

        let signedPhotoUrl: string | null = null;
        const m: RegExpMatchArray | null = row.photo_url
          ? String(row.photo_url).match(/\/face-photos\/(.+?)(?:\?|$)/)
          : null;
        if (m) {
          const path = decodeURIComponent(m[1]);
          const { data: s } = await supabaseAdmin.storage
            .from("face-photos")
            .createSignedUrl(path, 600);
          signedPhotoUrl = s?.signedUrl ?? null;
        }

        return Response.json({
          ok: true,
          registration_id: row.registration_id,
          exam_title: row.exam_title,
          exam_date: row.exam_date,
          full_name: row.full_name,
          photo_url: signedPhotoUrl,
        });
      },
    },
  },
});
