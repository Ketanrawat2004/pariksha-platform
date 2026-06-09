# `src/lib/backend`

Server-only helpers — read `process.env`, use the service-role Supabase
client, talk to Stripe's secret API. Must never be imported from client
components. Files named `*.server.ts` are blocked from client bundles by
import protection.

Existing server helpers keep their original paths; this folder is the
discovery point for new ones.

- `@/lib/backend/rate-limit` — IP/key rate limiting backed by
  `public.check_rate_limit`
- `@/lib/stripe.server` — Stripe SDK with secret key
- `@/lib/config.server` — env-derived runtime config
- `@/integrations/supabase/client.server` — service-role Supabase client
</content>
</invoke>