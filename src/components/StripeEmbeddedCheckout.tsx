import { useCallback, useMemo } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createCheckoutSession } from "@/utils/payments.functions";

interface Props {
  priceId: string;
  examId?: string;
  paperSubmissionId?: string;
  candidateFullName?: string;
  candidateDob?: string;
  candidatePhone?: string;
  returnUrl?: string;
}

export function StripeEmbeddedCheckoutForm({
  priceId,
  examId,
  paperSubmissionId,
  candidateFullName,
  candidateDob,
  candidatePhone,
  returnUrl,
}: Props) {
  const fetchClientSecret = useCallback(async (): Promise<string> => {
    const url = returnUrl || `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`;
    const result = await createCheckoutSession({
      data: {
        priceId,
        examId,
        paperSubmissionId,
        candidateFullName,
        candidateDob,
        candidatePhone,
        returnUrl: url,
        environment: getStripeEnvironment(),
      },
    });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error("Stripe did not return a client secret");
    return result.clientSecret;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const options = useMemo(() => ({ fetchClientSecret }), [fetchClientSecret]);
  const stripePromise = useMemo(() => getStripe(), []);

  return (
    <div id="checkout" className="min-h-[500px]">
      <EmbeddedCheckoutProvider stripe={stripePromise} options={options}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
