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