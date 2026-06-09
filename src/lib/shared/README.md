# `src/lib/shared`

Pure, environment-agnostic modules — types, Zod schemas, formatters.
No `process.env`, no `window`, no browser- or server-only APIs.

Existing helpers keep their original paths so every route stays stable;
this folder is the discovery point for new shared code.

- `@/lib/utils` — `cn()` class merger
