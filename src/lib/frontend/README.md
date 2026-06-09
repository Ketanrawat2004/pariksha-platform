# `src/lib/frontend`

Browser-only helpers — DOM, `window`, jsPDF, Stripe.js client, file
downloads. Must never be imported from server functions or server routes.

Existing helpers keep their original paths so every route stays stable;
this folder is the discovery point for new browser-only code.

- `@/lib/pdf/certificate` — `downloadCertificate()`
- `@/lib/pdf/admit-card` — `downloadAdmitCard()`
- `@/lib/storage/face-photo` — signed URL helpers
- `@/lib/stripe` — Stripe.js client loader
