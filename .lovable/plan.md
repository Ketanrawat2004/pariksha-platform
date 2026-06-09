## Goal
Charge each candidate a one-time fee (₹500 INR, test mode) on exam registration, persist purchases, gate the registration on a successful charge, and add the missing account-management surface (billing portal, delete account, Google sign-in, leaked-password protection).

## What's broken today
- No `stripe.server.ts`, checkout fn, webhook, return page, or test-mode banner.
- No products in Stripe catalog; no `payments` table.
- `candidate.exams.tsx` creates `registrations` rows for free — nothing links a registration to a paid receipt.
- No billing portal / cancel / delete-account UI.
- Google OAuth and HIBP password-leak check are off.

## Implementation

### 1. Stripe foundation
- Install `stripe@22.0.2`, `@stripe/stripe-js@9.2.0`, `@stripe/react-stripe-js@6.2.0`.
- Create `src/lib/stripe.server.ts` (gateway-proxied `createStripeClient`, `verifyWebhook`, `getStripeErrorMessage`) — verbatim from the shared utility knowledge.
- Create `src/lib/stripe.ts` (browser `getStripe`, `getStripeEnvironment` derived from the token prefix; throws on missing token).
- Create product `exam_registration_fee` → price `exam_registration_500` (₹500 INR, one-time) via `payments--batch_create_product`.

### 2. Database
New migration creating `public.payments`:
```
id, user_id (auth.users), registration_id (nullable), exam_id,
stripe_session_id (unique), stripe_payment_intent_id, stripe_customer_id,
amount_cents, currency, status (pending|paid|failed|refunded),
environment, created_at, updated_at
```
RLS: user reads own rows; service_role writes. GRANT + RLS per the public-schema rules.

Add `paid` boolean + `payment_id` FK to `public.registrations` (default false).

### 3. Checkout
- `src/utils/payments.functions.ts` exports `createCheckoutSession`, `createPortalSession` (both with `requireSupabaseAuth`).
  - `createCheckoutSession` takes `{ examId, environment, returnUrl }`, resolves a Stripe Customer with `metadata.userId`, creates a pending `payments` row, returns `clientSecret`.
- `src/components/StripeEmbeddedCheckout.tsx`, `src/hooks/useStripeCheckout.tsx` per the embedded-checkout pattern.

### 4. Webhook
- `src/routes/api/public/payments/webhook.ts` — POST handler, `verifyWebhook`, handles:
  - `checkout.session.completed` → mark `payments.status='paid'`, INSERT into `registrations` with `paid=true`, send confirmation email via existing notifications system if present.
  - `payment_intent.payment_failed` → mark `failed`.
  - `charge.refunded` → mark `refunded`, soft-cancel the registration.

### 5. Return + test-mode banner
- `src/routes/checkout.return.tsx` — reads `session_id`, polls `payments` until `status='paid'`, then navigates to `/candidate/exams`.
- `src/components/PaymentTestModeBanner.tsx` mounted in `__root.tsx`.

### 6. Wire into the exam flow
In `src/routes/candidate.exams.tsx`, replace the silent free `insert into registrations` with a "Register & Pay ₹500" button → `useStripeCheckout` → embedded Stripe form. Show "Paid ✓" badge for exams where `registrations.paid=true`.

### 7. Account management
- `src/routes/candidate.billing.tsx` — lists past `payments`, "Manage subscription / update card" → opens portal in new tab.
- Add Delete-account card on `candidate.profile.tsx` → `deleteAccount` server fn (requireSupabaseAuth + supabaseAdmin to call `auth.admin.deleteUser`).

### 8. Auth upgrades
- Enable Google sign-in (`configure_social_auth`); add "Continue with Google" button on `login.tsx` and `register.tsx` using the Lovable broker.
- Enable HIBP via `configure_auth` (`password_hibp_enabled: true`).

## Out of scope (not needed for the stated model)
- Subscriptions, tiered pricing, institute billing — single one-time per-exam fee only.
- Production go-live (we stay in sandbox until you publish).

## Test plan (after deploy)
1. Open `/candidate/exams` while signed in; orange "test mode" banner shows.
2. Click "Register & Pay ₹500" → Stripe embedded form mounts inline.
3. Use card `4242 4242 4242 4242`, any future expiry, any 3-digit CVC.
4. After "Payment complete", return page → `/candidate/exams` shows "Paid ✓" and the exam appears in upcoming list.
5. Try `4000 0000 0000 0002` on a second exam → decline; no registration created.
6. Try `4000 0025 0000 3155` → 3DS challenge; complete it → paid.
7. Visit `/candidate/billing` → see all three attempts (1 paid, 1 failed, 1 paid).
8. Click "Manage billing" → Stripe portal opens in new tab; update card.
9. `candidate.profile` → Delete account → session invalidates, redirect to `/`.
10. Sign up a new user via Google → lands on `/candidate/dashboard`.
11. Try password `password123` on signup → HIBP rejects.

## Notes
- Fee defaults to ₹500. Change in one place (the `batch_create_product` call / price metadata) and re-run if you want a different amount.
- Webhook is registered automatically by the Lovable Stripe integration — no action needed in the Stripe dashboard.
