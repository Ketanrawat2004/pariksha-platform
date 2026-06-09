import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

async function getSupabase() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

async function handleCheckoutCompleted(session: any, env: StripeEnv) {
  const sb = await getSupabase();
  const userId = session.metadata?.userId || null;
  const examId = session.metadata?.examId || null;
  const paperSubmissionId = session.metadata?.paperSubmissionId || null;
  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;

  // Mark payment paid and pull the candidate details we stashed at checkout time.
  const { data: payment } = await sb
    .from("payments")
    .update({
      status: "paid",
      stripe_payment_intent_id: paymentIntentId ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_session_id", session.id)
    .eq("environment", env)
    .select("id, candidate_full_name, candidate_dob, candidate_phone")
    .maybeSingle();

  // Institute paper purchase → create/flip the paper_registrations row.
  if (userId && paperSubmissionId) {
    const { data: existing } = await sb
      .from("paper_registrations")
      .select("id")
      .eq("candidate_id", userId)
      .eq("paper_submission_id", paperSubmissionId)
      .maybeSingle();
    const admit = `PRK-${Math.random().toString(36).slice(2, 12).toUpperCase()}`;
    if (!existing) {
      await sb.from("paper_registrations").insert({
        candidate_id: userId,
        paper_submission_id: paperSubmissionId,
        full_name: payment?.candidate_full_name ?? "",
        date_of_birth: payment?.candidate_dob ?? null,
        phone: payment?.candidate_phone ?? null,
        paid: true,
        cancelled: false,
        payment_id: payment?.id ?? null,
        admit_released: true,
        admit_card_number: admit,
      });
    } else {
      const upd: any = { paid: true, cancelled: false, payment_id: payment?.id ?? null, admit_released: true };
      const { data: cur } = await sb.from("paper_registrations").select("admit_card_number").eq("id", existing.id).maybeSingle();
      if (!cur?.admit_card_number) upd.admit_card_number = admit;
      await sb.from("paper_registrations").update(upd).eq("id", existing.id);
    }
    return;
  }

  // Legacy: direct exam purchase (admin-published exams table).
  if (userId && examId) {
    const { data: existing } = await sb
      .from("registrations")
      .select("id")
      .eq("candidate_id", userId)
      .eq("exam_id", examId)
      .maybeSingle();
    if (!existing) {
      const admit = `PRK-${Math.random().toString(36).slice(2, 12).toUpperCase()}`;
      await sb.from("registrations").insert({
        candidate_id: userId,
        exam_id: examId,
        admit_card_number: admit,
        status: "confirmed",
        paid: true,
        payment_id: payment?.id ?? null,
      });
    } else {
      await sb.from("registrations").update({ paid: true, payment_id: payment?.id ?? null }).eq("id", existing.id);
    }
  }
}

async function handlePaymentFailed(intent: any, env: StripeEnv) {
  const sb = await getSupabase();
  await sb.from("payments")
    .update({ status: "failed", updated_at: new Date().toISOString() })
    .eq("stripe_payment_intent_id", intent.id)
    .eq("environment", env);
}

async function handleRefunded(charge: any, env: StripeEnv) {
  const sb = await getSupabase();
  const piId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!piId) return;
  const { data: payment } = await sb.from("payments")
    .update({ status: "refunded", updated_at: new Date().toISOString() })
    .eq("stripe_payment_intent_id", piId)
    .eq("environment", env)
    .select("id")
    .maybeSingle();
  if (payment?.id) {
    await sb.from("registrations").update({ status: "rejected" }).eq("payment_id", payment.id);
    await sb.from("paper_registrations").update({ cancelled: true }).eq("payment_id", payment.id);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          return Response.json({ received: true, ignored: "invalid env" });
        }
        const env: StripeEnv = rawEnv;
        try {
          const event = await verifyWebhook(request, env);

          // Idempotency — Stripe retries; never double-process the same event.
          const sb = await getSupabase();
          const { error: dupErr } = await sb
            .from("processed_webhook_events")
            .insert({ event_id: (event as any).id ?? `${env}:${Date.now()}`, source: `stripe:${env}` });
          if (dupErr && (dupErr as any).code === "23505") {
            return Response.json({ received: true, duplicate: true });
          }

          switch (event.type) {
            case "checkout.session.completed":
              await handleCheckoutCompleted(event.data.object, env);
              break;
            case "payment_intent.payment_failed":
              await handlePaymentFailed(event.data.object, env);
              break;
            case "charge.refunded":
              await handleRefunded(event.data.object, env);
              break;
            default:
              console.log("Unhandled event:", event.type);
          }
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
