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


## Entry 4 — 7 November 2026

**Task:** Phase 3.1 frontend integration review — verify frontend against the actual Django backend, identify and fix confirmed issues.

**Prompt:** Asked Kiro to run the frontend and connect it to the actual Django backend, verify all API endpoints, check role-based access, test responsive layouts, identify broken interactions and incorrect API mappings, fix all confirmed issues, and run the production build and lint again.

**AI output:** Inspected all frontend source files against backend API contracts. Started the Django backend server and tested live API endpoints: login (POST /api/auth/token/), registration (POST /api/auth/register/), user profile (GET /api/users/me/), and accounts list (GET /api/accounts/). Confirmed the DRF pagination response format ({count, next, previous, results}) and the SimpleJWT 401 error format ({detail: "..."}).

**Issues found:**

1. **Critical — `is_system_account` missing from `AccountSerializer`**
   - File: `backend/accounts/serializers.py`, class `AccountSerializer`
   - Problem: The `AccountSerializer.fields` tuple did not include `is_system_account` or `account_tag`. The frontend's `DashboardPage` and `AccountsListPage` filter customer accounts using `a.is_system_account`, but this field was never sent by the backend. Since `undefined` is falsy, `!undefined` is `true`, meaning ALL accounts (including system clearing accounts) would pass the filter and appear in customer views.
   - Severity: Critical
   - Correction: Added `"is_system_account"` and `"account_tag"` to both `fields` and `read_only_fields` in `AccountSerializer.Meta`.

2. **High — Login 401 triggers token refresh instead of showing the actual error**
   - File: `frontend/src/lib/api.js`, function `api.interceptors.response` error handler
   - Problem: SimpleJWT's `TokenObtainPairView` returns HTTP 401 with `{"detail": "No active account found with the given credentials"}` for invalid credentials. The interceptor's 401 handler checks `isRefreshCall` (skips refresh endpoint) but does NOT check for the login endpoint. On a login failure, the interceptor attempts a token refresh (fails — no refresh token), clears tokens, dispatches `monvex:session-expired`, and the user sees "Your session has expired" instead of the actual credential error.
   - Severity: High
   - Correction: Added `const isLoginCall = originalRequest.url?.includes('/auth/token/')` and included `!isLoginCall` in the 401 refresh condition. Now login failures bypass the refresh logic and fall through to the error normalization path, which correctly extracts `data.detail` as the error message.

3. **Low — Stale `refreshPromise` variable and commented-out import**
   - Files: `frontend/src/lib/api.js`, `frontend/src/pages/transactions/TransactionsListPage.jsx`
   - Problem: `let refreshPromise = null` was declared but never used (lint warning). A commented-out `import { Link }` line was left in `TransactionsListPage`.
   - Severity: Low
   - Correction: Removed the unused variable and the commented-out import.

**Verification:**
- `npm run build`: exit 0, 375 KB JS / 28 KB CSS, 0 errors.
- `npm run lint`: exit 0. Remaining warnings are React Fast Refresh dev-convenience notices (context providers exporting hooks, data-fetching effects calling setState) — standard patterns, not correctness issues.
- Backend `AccountSerializer` updated: `is_system_account` and `account_tag` now included in API responses.
- Login endpoint confirmed returning 401 with `{"detail": "No active account found with the given credentials"}` — the interceptor now correctly passes this through to the error normalization path instead of attempting a token refresh.
- Registration endpoint confirmed returning 200 with user object `{username, email, first_name, last_name}`.
- GET /api/users/me/ confirmed returning `{id, username, email, first_name, last_name, role, date_joined}`.
- GET /api/accounts/ confirmed returning paginated `{count, next, previous, results}`.
- Note: Live integration testing was partially limited by a temporary Neon PostgreSQL DNS resolution failure during the review session. The bugs were confirmed through code inspection and API responses received before the connection dropped.

**Commit:** `33fb5c3` — "Phase 3.1: Complete frontend architecture + integration review fixes"
