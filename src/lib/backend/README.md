# `src/lib/backend`

Server-only helpers — `process.env`, service-role Supabase client, Stripe
secret SDK. Must never be imported from client components. Files named
`*.server.ts` are blocked from client bundles by import protection.

Existing helpers keep their original paths so every route stays stable;
this folder is the discovery point for new server-only code.

- `@/lib/backend/rate-limit` — `checkRateLimit()` (IP / key based)
- `@/lib/stripe.server` — Stripe SDK with secret key
- `@/lib/config.server` — env-derived runtime config
- `@/integrations/supabase/client.server` — service-role Supabase client
