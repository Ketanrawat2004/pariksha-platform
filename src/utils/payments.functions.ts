import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

type CheckoutSessionResult = { clientSecret: string } | { error: string };
type PortalSessionResult = { url: string } | { error: string };
type DeleteAccountResult = { ok: true } | { error: string };

/**
 * Anti-open-redirect guard. The Stripe checkout / billing portal `return_url`
 * is rendered after a real payment flow on stripe.com, so an attacker-supplied
 * URL would be a high-trust phishing vector. Allow only same-origin URLs that
 * we control.
 */
const ALLOWED_RETURN_ORIGINS = new Set<string>([
  "https://pariksha-platform.lovable.app",
  "http://localhost:8080",
  "http://localhost:5173",
]);
function assertSafeReturnUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid returnUrl");
  }
  const ok =
    ALLOWED_RETURN_ORIGINS.has(parsed.origin) ||
    /^https:\/\/[a-z0-9-]+\.lovable\.app$/i.test(parsed.origin) ||
    /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/i.test(parsed.origin);
  if (!ok) throw new Error("returnUrl origin is not allowed");
  return parsed.toString();
}


async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId?: string; name?: string },
): Promise<string> {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) {
    throw new Error("Invalid userId");
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0];
      if ((options.userId && customer.metadata?.userId !== options.userId) || (options.name && customer.name !== options.name)) {
        await stripe.customers.update(customer.id, {
          ...(options.name && { name: options.name }),
          ...(options.userId && { metadata: { ...customer.metadata, userId: options.userId } }),
        });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    ...(options.name && { name: options.name }),
    ...(options.userId && { metadata: { userId: options.userId } }),
  });
  return created.id;
}

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    priceId: string;
    examId?: string;
    paperSubmissionId?: string;
    candidateFullName?: string;
    candidateDob?: string;
    candidatePhone?: string;
    returnUrl: string;
    environment: StripeEnv;
  }) => {
    if (!/^[a-zA-Z0-9_-]+$/.test(data.priceId)) throw new Error("Invalid priceId");
    const safeReturn = assertSafeReturnUrl(data.returnUrl);
    if (!safeReturn) throw new Error("returnUrl is required");
    return { ...data, returnUrl: safeReturn };
  })
  .handler(async ({ data, context }): Promise<CheckoutSessionResult> => {
    try {
      const stripe = createStripeClient(data.environment);
      const userId = context.userId;
      const email = context.claims?.email as string | undefined;

      const prices = await stripe.prices.list({ lookup_keys: [data.priceId] });
      if (!prices.data.length) throw new Error("Price not found");
      const stripePrice = prices.data[0];

      const customerId = await resolveOrCreateCustomer(stripe, {
        email,
        userId,
        name: data.candidateFullName?.trim() || undefined,
      });

      const productId = typeof stripePrice.product === "string" ? stripePrice.product : stripePrice.product.id;
      const product = await stripe.products.retrieve(productId);
      const productDescription = product.name;

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: stripePrice.id, quantity: 1 }],
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        billing_address_collection: "required",
        customer_update: { address: "auto", name: "auto" },
        payment_intent_data: { description: productDescription },
        metadata: {
          userId,
          examId: data.examId ?? "",
          paperSubmissionId: data.paperSubmissionId ?? "",
        },
      });

      const amount = stripePrice.unit_amount ?? 0;
      const currency = stripePrice.currency ?? "inr";
      await context.supabase.from("payments").insert({
        user_id: userId,
        exam_id: data.examId ?? null,
        paper_submission_id: data.paperSubmissionId ?? null,
        candidate_full_name: data.candidateFullName ?? null,
        candidate_dob: data.candidateDob || null,
        candidate_phone: data.candidatePhone ?? null,
        stripe_session_id: session.id,
        stripe_customer_id: customerId,
        amount_cents: amount,
        currency,
        status: "pending",
        environment: data.environment,
      } as any);

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { returnUrl?: string; environment: StripeEnv }) => ({
    ...data,
    returnUrl: assertSafeReturnUrl(data.returnUrl),
  }))
  .handler(async ({ data, context }): Promise<PortalSessionResult> => {
    const { supabase, userId } = context;
    const { data: pay } = await supabase
      .from("payments")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .not("stripe_customer_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!pay?.stripe_customer_id) return { error: "No billing history found yet." };
    try {
      const stripe = createStripeClient(data.environment);
      const portal = await stripe.billingPortal.sessions.create({
        customer: pay.stripe_customer_id,
        ...(data.returnUrl && { return_url: data.returnUrl }),
      });
      return { url: portal.url };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DeleteAccountResult> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
      if (error) return { error: error.message };
      return { ok: true };
    } catch (e: any) {
      return { error: e?.message ?? "Failed to delete account" };
    }
  });

/**
 * Active reconciliation fallback. The return page polls the local `payments`
 * row, which is normally flipped to `paid` by the Stripe webhook. When the
 * webhook is delayed (network, retries, async payment methods) this server
 * function queries Stripe directly for the checkout session and, if paid,
 * applies the same side-effects the webhook would — so the candidate does
 * not stare at "Confirming payment…" indefinitely.
 */
type ReconcileResult = { status: "paid" | "pending" | "failed" } | { error: string };

export const reconcileCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { sessionId: string; environment: StripeEnv }) => {
    if (!/^[a-zA-Z0-9_-]+$/.test(data.sessionId)) throw new Error("Invalid sessionId");
    return data;
  })
  .handler(async ({ data, context }): Promise<ReconcileResult> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const sb = supabaseAdmin as any;

      // Only allow the buyer (or admin) to reconcile their own session.
      const { data: pay } = await sb
        .from("payments")
        .select("id, user_id, status, exam_id, paper_submission_id, candidate_full_name, candidate_dob, candidate_phone")
        .eq("stripe_session_id", data.sessionId)
        .eq("environment", data.environment)
        .maybeSingle();
      if (!pay) return { error: "Payment record not found" };
      if (pay.user_id !== context.userId) return { error: "Forbidden" };
      if (pay.status === "paid") return { status: "paid" };
      if (pay.status === "failed") return { status: "failed" };

      const stripe = createStripeClient(data.environment);
      const session = await stripe.checkout.sessions.retrieve(data.sessionId);
      const paymentStatus = session.payment_status;

      if (paymentStatus !== "paid" && paymentStatus !== "no_payment_required") {
        return { status: "pending" };
      }

      const paymentIntentId = typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

      // Atomic claim — only flip pending→paid so the webhook can't double-process.
      const { data: claimed } = await sb
        .from("payments")
        .update({
          status: "paid",
          stripe_payment_intent_id: paymentIntentId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pay.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      if (!claimed) return { status: "paid" }; // webhook beat us — already done

      const userId = pay.user_id;
      const admit = `PRK-${Math.random().toString(36).slice(2, 12).toUpperCase()}`;

      if (pay.paper_submission_id) {
        const { data: existing } = await sb
          .from("paper_registrations")
          .select("id, admit_card_number")
          .eq("candidate_id", userId)
          .eq("paper_submission_id", pay.paper_submission_id)
          .maybeSingle();
        if (!existing) {
          await sb.from("paper_registrations").insert({
            candidate_id: userId,
            paper_submission_id: pay.paper_submission_id,
            full_name: pay.candidate_full_name ?? "",
            date_of_birth: pay.candidate_dob ?? null,
            phone: pay.candidate_phone ?? null,
            paid: true,
            cancelled: false,
            payment_id: pay.id,
            admit_released: true,
            admit_card_number: admit,
          });
        } else {
          const upd: any = { paid: true, cancelled: false, payment_id: pay.id, admit_released: true };
          if (!existing.admit_card_number) upd.admit_card_number = admit;
          await sb.from("paper_registrations").update(upd).eq("id", existing.id);
        }
      } else if (pay.exam_id) {
        const { data: existing } = await sb
          .from("registrations")
          .select("id")
          .eq("candidate_id", userId)
          .eq("exam_id", pay.exam_id)
          .maybeSingle();
        if (!existing) {
          await sb.from("registrations").insert({
            candidate_id: userId,
            exam_id: pay.exam_id,
            admit_card_number: admit,
            status: "confirmed",
            paid: true,
            payment_id: pay.id,
          });
        } else {
          await sb.from("registrations").update({ paid: true, payment_id: pay.id }).eq("id", existing.id);
        }
      }

      return { status: "paid" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
