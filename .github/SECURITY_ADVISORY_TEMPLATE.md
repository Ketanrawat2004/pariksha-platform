# How to publish a security advisory

GitHub shows the warning **"There aren't any published security advisories"** until at least one advisory is published from this repository. Advisories cannot be created by committing a file — they must be drafted from GitHub's UI. Here is the exact flow plus a ready-to-paste starter advisory for the hardening work already shipped in this repo.

## Steps

1. Open the repository on GitHub.
2. Click **Security** → **Advisories** → **New draft security advisory**.
3. Paste the template below into the form.
4. Click **Publish advisory** (you can publish without a CVE).

Once published, the warning disappears and a green ✅ "Security policy" + advisory badge appears on the repo home.

---

## Starter advisory: GHSA-pariksha-0001

**Title**
Hardened Row-Level Security, TriShield decrypt authorization, and report-mutation gating

**Ecosystem**
Other (web application — not distributed as a package)

**Affected versions**
`< commit hardening-2026-06-10`

**Patched versions**
`>= commit hardening-2026-06-10` (current `main`)

**Severity**
High (CVSS ~7.5 — authenticated privilege issues, no remote unauthenticated impact)

**CWE**
- CWE-285: Improper Authorization
- CWE-639: Authorization Bypass Through User-Controlled Key

**Description**

Pariksha is a hackathon-stage online examination platform. Three internal review findings were addressed in the same hardening pass:

1. **RLS gaps on audit and TriShield tables.** Earlier migrations enabled RLS but missed explicit policies on a subset of audit tables. They have been replaced with role-scoped policies (`has_role(auth.uid(), 'admin' | 'superadmin' | 'institute')`) and matching `GRANT`s.
2. **`generateSessionReport` server function lacked a role check.** Any authenticated user could in principle call the RPC and overwrite a TriShield session report. The function now requires `admin`, `superadmin`, or `institute` role, and institute users are scoped to sessions they initiated.
3. **Default light-mode landing** and consistent CSRF-safe server-function middleware (`requireSupabaseAuth` + `attachSupabaseAuth`) to remove ambiguity on which endpoints require a session.

**Impact**
Pre-patch, a signed-in non-staff user could attempt to call privileged server functions or read selected audit rows. No exploitation in the wild is known; this project is not yet in production use.

**Patches**
All fixes are on `main`. Pull the latest commit and re-deploy.

**Workarounds**
None — upgrade.

**Credits**
Reported and patched by the project maintainer during an internal security pass.

---

After publishing this first advisory, future vulnerabilities follow the process in [`SECURITY.md`](../SECURITY.md).
