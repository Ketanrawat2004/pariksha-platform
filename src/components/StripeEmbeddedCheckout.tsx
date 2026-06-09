import { useCallback, useMemo, useState } from "react";
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
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const fetchClientSecret = useCallback(async (): Promise<string> => {
    setCheckoutError(null);
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
    if ("error" in result) {
      setCheckoutError(result.error);
      throw new Error(result.error);
    }
    if (!result.clientSecret) {
      const message = "Stripe did not return a client secret";
      setCheckoutError(message);
      throw new Error(message);
    }
    return result.clientSecret;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const options = useMemo(() => ({ fetchClientSecret }), [fetchClientSecret]);
  const stripePromise = useMemo(() => getStripe(), []);

  return (
    <div id="checkout" className="min-h-[500px]">
      {checkoutError && (
        <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {checkoutError}
        </div>
      )}
      <EmbeddedCheckoutProvider stripe={stripePromise} options={options}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
