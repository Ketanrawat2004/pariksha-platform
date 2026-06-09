# Implementation plan

You picked all four scope items + the refactor. I'll ship them in 5 waves so each can be verified before the next, instead of one giant change that risks breaking the live exam flow.

## Wave 1 — Backend security pass (no UI change)
- Audit & tighten RLS + GRANTs on `questions`, `answers`, `results`, `registrations`:
  - `questions`: candidates can only `SELECT` rows for an exam they have an active, paid registration for, and only while their session is open. Admin/superadmin full access.
  - `answers`: candidate can `INSERT/UPDATE` only their own `session_id` rows and only before submission; `SELECT` own. Service role full.
  - `results`: candidate `SELECT` own via registration. Only service role writes.
  - `registrations`: candidate `SELECT` own; only service role inserts/updates (webhook path already uses service role).
- Add a DB trigger `prevent_empty_question` on `questions` that blocks inserts/updates where `question_text_encrypted` or any option is null/blank, so empty rows can never reach candidates again.
- Add `published` boolean on `exams` (default false) and a check that an exam can't be set published if it has fewer than `(SELECT count(*) FROM questions WHERE exam_id = e.id AND question_text_encrypted <> '')` ≥ expected count.

## Wave 2 — /api/public hardening + rate limiting
- Add `public.rate_limits(key text, window_start timestamptz, count int)` table + `check_rate_limit(_key, _max, _window_seconds)` SQL function (atomic upsert, returns boolean).
- Wrap every `/api/public/*` handler with:
  - Zod input validation (replace ad-hoc `String(body?.x)` parsing).
  - IP-based rate limit (`x-forwarded-for` first hop) — 20 req/min default, 5/min for `give-exam-verify`.
  - Webhook handler keeps Stripe signature verification (already correct) + adds idempotency key check on `event.id` via a new `processed_webhook_events` table.
- Never leak provider error details — generic 400/401 to caller, full detail to server logs.

## Wave 3 — Certificate download on every candidate dashboard surface
- Reuse existing `src/lib/pdf/certificate.ts`.
- Add a `<CertificateButton />` component and surface it on:
  - `/candidate/dashboard` (recent results card)
  - `/candidate/exams` (completed exams row)
  - `/candidate/results` (already has it — refactor to shared component)
- Only enabled when `pass_fail = true` and a result row exists.

## Wave 4 — Exam page redesign (full-screen, functionally identical)
- Redesign `/exam/$registrationId` only — same submit/answer/lock-ceremony logic, new shell:
  - Sticky top bar: exam title, candidate name, server-time countdown, integrity status pill.
  - Left rail: question palette grid (answered / marked / not-visited) — collapses to drawer on mobile.
  - Center: question card with large legible type, A/B/C/D as keyboard-accessible buttons (1–4 hotkeys).
  - Bottom bar: Mark for review · Clear · Save & next · Submit.
  - True full-screen via `requestFullscreen()`; warn on exit.
- Responsive: rail becomes bottom drawer < 1024px; bar collapses to icon row < 640px.

## Wave 5 — Light folder reorg (non-breaking)
Routes must stay in `src/routes/` (TanStack file-based). I'll only move `src/lib/*` and `src/utils/*`:

```text
src/lib/
  shared/      → pure types, zod schemas, formatters (no env access)
  frontend/    → browser-only helpers (pdf, storage upload, stripe client)
  backend/     → server-only helpers (*.server.ts), createServerFn wrappers (*.functions.ts)
```

Updates done with codemod-style search/replace; auto-generated files (`routeTree.gen.ts`, supabase `client.ts`/`types.ts`) untouched.

## Out of scope (call out if you want them later)
- Anti-cheat: full proctoring rules engine, paste/screenshot blocking beyond what TriShield already does.
- Performance: image CDN / route-level code splitting beyond current Vite defaults.

## Risk & rollback
Each wave is one or two migrations + isolated code changes. If a wave breaks something, the previous wave is still valid on its own — we don't have to revert everything.

---

**Confirm and I'll start with Wave 1 (DB migration for RLS/GRANTs + empty-question trigger).** Reply "go" or tell me to reorder/drop waves.