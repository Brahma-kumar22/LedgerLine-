# PROMPTS.md

This file records how AI tools were used during MONVEX development, the issues found in their output, and how those issues were corrected.

## Entry 1 — 6 November 2026

**Task:** Implement ledger immutability.

**Prompt:** Asked Kiro to prevent modification and deletion of ledger entries using Django signals and PostgreSQL triggers.

**AI output:** Generated immutability signal handlers and database triggers.

**Issue found:** New ledger entries were also getting blocked because UUIDs were assigned before insertion.

**Correction:** Replaced the primary-key check with Django's `instance._state.adding` check.

**Verification:** Reran the PostgreSQL immutability tests. New entries could be created, while updates and deletions were rejected.

**Commit:** [Add actual GitHub commit link]

## Entry 2 — 6 November 2026

**Task:** Implement idempotency and concurrency protection.

**Prompt:** Asked Kiro to prevent duplicate financial transactions during retries and simultaneous requests.

**AI output:** Generated idempotency handling using database constraints and row locking.

**Issues found:**
- One `select_for_update()` query was executed outside an atomic transaction.
- Some refused authorization attempts were not recorded.

**Correction:** Fixed the transaction boundary and updated all three financial services to record refused attempts.

**Verification:** Tested duplicate requests, concurrent withdrawals, transfers, and failed requests against Neon PostgreSQL.

**Result:** 54 tests passed, 0 failed.

**Commit:** [Add actual GitHub commit link]

## AI Usage Principle

AI is used to assist with development, debugging, and analysis. All critical financial logic is reviewed and tested before acceptance. AI must never independently authorize or execute financial transactions.


## Entry 3 — 6 November 2026

**Task:** Implement complete frontend architecture and design system for MONVEX.

**Prompt:** Asked Kiro to implement a production-grade React frontend with Tailwind CSS, centralized API client, JWT authentication, role-based routing, and a reusable component library matching the verified backend API contracts.

**AI output:** Generated the following:
- Tailwind v4 design system with navy/indigo/semantic color tokens, typography scale, shadows, and z-index layers in `index.css`.
- 14 reusable UI components: Button, Input, PasswordInput, Select, Card, Badge, Spinner, Skeleton, EmptyState, ErrorState, Toast (context-based), Modal (portal with focus trap), TransactionStatusBadge, PageHeader.
- Centralized Axios API client (`src/lib/api.js`) with JWT access/refresh token interceptors, duplicate-refresh prevention, error normalization, and idempotency-key header injection for money-moving endpoints.
- AuthContext with session restoration, useAuth hook, and session-expired event listener.
- Route guards: ProtectedRoute, RoleRoute (with AccessDenied page), PublicRoute.
- Application shell: midnight-navy sidebar with role-aware navigation, off-canvas mobile drawer, top navigation with user profile dropdown, auto-derived breadcrumbs.
- Full routing in App.jsx with BrowserRouter wrapping AuthProvider + ToastProvider.
- Login page (username/password, field validation, error display, redirect preservation).
- Register page (username/email/password/confirm, field-level backend error display, success state with redirect).
- Dashboard page (summary cards, recent transactions, accounts overview, empty states).
- Accounts list and detail pages (account cards, statement table with pagination).
- Transactions list page (transaction table, pagination, empty state).
- Placeholder pages for deferred routes (Audit, Users, Reconciliation, Settings).
- 404 NotFound page.

**Issues found:**
1. Tailwind v4 was installed but initially without the `@tailwindcss/vite` plugin — the CSS `@import "tailwindcss"` would not have compiled without it.
2. Several unused imports and variables were generated (e.g. `useLocation` in `RoleRoute`, `User` icon in `TopNav`, `refreshPromise` variable in `api.js`).
3. The `App.css` file from the Vite starter template was left in place after it was no longer needed.
4. `.env.local` was not initially included in `.gitignore`.

**Corrections:**
1. Installed `@tailwindcss/vite` and added the `tailwindcss()` plugin to `vite.config.js`.
2. Removed all unused imports and variables identified by oxlint.
3. Deleted `App.css` and removed its import from `main.jsx`.
4. Added `.env`, `.env.local`, and `.env.*.local` patterns to `.gitignore`.

**Verification:**
- `npm run build` succeeded: 375 KB JS, 28 KB CSS, gzip 117 KB, 0 errors.
- `npm run lint` passed with exit code 0. Remaining warnings are React Fast Refresh dev-convenience notices (context providers exporting hooks, data-fetching effects calling setState) — standard patterns, not correctness issues.
- All API endpoints in `src/lib/api.js` match the verified backend contracts from Phase 2.1 inspection.

**Commit:** [Add actual GitHub commit link]
