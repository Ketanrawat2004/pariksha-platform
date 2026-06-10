# Security Policy

Pariksha handles exam papers, candidate identity data, and live proctoring streams. Security isn't a checkbox here — it's the entire reason the project exists. If you've found something that could put a candidate, an institute, or a paper at risk, I want to hear about it.

## Supported Versions

This is an actively developed hackathon project. Only the latest `main` branch (and the live deployment at https://pariksha-platform.lovable.app) receives security fixes.

| Version            | Supported |
| ------------------ | --------- |
| `main` (latest)    | ✅        |
| Older commits/tags | ❌        |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security problems.**

Instead, report privately through one of these channels:

1. **GitHub Private Vulnerability Reporting** (preferred)
   Go to the **Security** tab of this repository → **Report a vulnerability**.
   This creates a private advisory only the maintainers can see.

2. **Email**
   Send details to the maintainer listed on the GitHub profile attached to this repo. Use a subject line starting with `[Pariksha Security]`.

When you report, please include:

- A clear description of the issue and the impact you believe it has
- Steps to reproduce (URL, request payload, account role, etc.)
- Any proof-of-concept code, screenshots, or logs
- Your name/handle if you'd like to be credited

### What to expect

| Stage                  | Target time      |
| ---------------------- | ---------------- |
| Acknowledge your report| Within 48 hours  |
| Initial triage & severity | Within 5 days |
| Fix or mitigation      | Depends on severity — critical issues are patched as fast as humanly possible |
| Public disclosure      | Coordinated with you, after a fix ships |

I'll keep you in the loop the whole way through. If you don't hear back within 48 hours, please nudge me — messages get lost sometimes.

## Scope

In-scope for security reports:

- The Pariksha web app (`pariksha-platform.lovable.app` and preview URLs)
- Server functions under `src/lib/**/*.functions.ts` and `src/routes/api/**`
- Lovable Cloud (Supabase) schema, RLS policies, and database functions in `supabase/migrations/**`
- The TriShield Vault cryptographic flow (Shamir's Secret Sharing, AES-256-GCM, SHA-256 seals)
- Authentication, role checks (`has_role`), and the `user_roles` table

Out of scope:

- Findings that require physical access to a candidate's device
- Rate-limit or brute-force reports without a working PoC
- Vulnerabilities in third-party services (report those to the vendor)
- Self-XSS, missing security headers on non-sensitive marketing pages, or best-practice nits without a concrete impact

## What I take very seriously

If any of the following are possible, treat it as critical and report immediately:

- Reading or modifying another user's data through the public API or RLS bypass
- Decrypting or accessing a TriShield-locked paper before its unlock time
- Privilege escalation to `admin` or `superadmin` from a lower role
- Leaking service-role keys, JWT signing secrets, or vault key shares
- Tampering with audit logs or activity reports
- Bypassing exam-session integrity (camera, lock-ceremony witness, snapshot pipeline)

## Safe Harbor

If you make a good-faith effort to follow this policy, I will not pursue or support legal action against you. Please:

- Don't access, modify, or delete data that isn't yours
- Don't run automated scanners that degrade the service for real users
- Give me a reasonable window to fix the issue before public disclosure

Thank you for helping keep Pariksha — and the candidates who rely on it — safe.
