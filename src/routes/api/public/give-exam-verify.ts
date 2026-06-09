import { createFileRoute } from "@tanstack/react-router";

/**
 * Public verification endpoint for the anonymous "Give Exam" flow.
 * Verifies admit details server-side and returns a short-lived signed URL
 * for the candidate's reference photo (face-photos bucket is private).
 */
export const Route = createFileRoute("/api/public/give-exam-verify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: any;
        try { body = await request.json(); } catch { return new Response("Bad request", { status: 400 }); }
        const fullName = String(body?.full_name ?? "").trim();
        const admit = String(body?.admit_card_number ?? "").trim();
        const dob = body?.dob ? String(body.dob) : null;
        const aad4 = body?.aadhaar_last4 ? String(body.aadhaar_last4) : null;
        if (!fullName || !admit) return new Response("Missing fields", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("verify_admit_anonymous" as any, {
          _full_name: fullName,
          _dob: dob,
          _aadhaar_last4: aad4,
          _admit_card_number: admit,
        } as any);
        if (error) return new Response(error.message, { status: 400 });
        const row = (data as any[])?.[0];
        if (!row) return Response.json({ ok: false, message: "No matching registration" }, { status: 404 });

        // Sign the reference photo for ~10 minutes so the browser can fetch it
        let signedPhotoUrl: string | null = null;
        const m: RegExpMatchArray | null = row.photo_url ? String(row.photo_url).match(/\/face-photos\/(.+?)(?:\?|$)/) : null;
        if (m) {
          const path = decodeURIComponent(m[1]);
          const { data: s } = await supabaseAdmin.storage.from("face-photos").createSignedUrl(path, 600);
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
