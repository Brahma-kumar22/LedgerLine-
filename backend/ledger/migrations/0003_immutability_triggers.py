"""
ledger/migrations/0002_immutability_triggers.py

Installs PostgreSQL triggers that enforce database-level immutability for:

    1. ledger_ledgerentry      — append-only, no UPDATE or DELETE.
    2. audit_auditlog          — append-only, no UPDATE or DELETE.
    3. transactions_transaction — COMPLETED and REVERSED rows cannot be
                                  modified or deleted.

WHY TRIGGERS IN ADDITION TO DJANGO SIGNALS?
--------------------------------------------
Django pre_save signals only fire when ORM methods are used (instance.save()).
They do NOT fire for:
    - QuerySet.update()
    - cursor.execute("UPDATE ...")
    - Raw SQL run via psql, migrations, or external tools

PostgreSQL triggers fire for ALL modifications to the table, regardless
of origin.  They are the only mechanism that provides a true database-level
guarantee.

REVERSIBILITY:
--------------
The reverse_sql drops all functions and triggers created by the forward SQL.
This means the migration can be reversed (rolled back) cleanly.

LIMITATION — MIGRATION ORDER:
-------------------------------
This migration must run AFTER the initial schema migrations for ledger,
audit, and transactions.  It declares the correct dependencies below.
If any initial migration is renamed or renumbered, update the dependencies
list accordingly.

TABLE NAMES:
------------
Django generates table names as <app_label>_<model_name_lower>.
    ledger app       → ledger_ledgerentry
    audit app        → audit_auditlog
    transactions app → transactions_transaction
"""

from django.db import migrations


# ---------------------------------------------------------------------------
# SQL — Forward (install triggers)
# ---------------------------------------------------------------------------

FORWARD_SQL = """
-- ===========================================================================
-- 1. LEDGER ENTRY IMMUTABILITY
--    Table: ledger_ledgerentry
--    Rule:  No UPDATE or DELETE is ever allowed.
-- ===========================================================================

CREATE OR REPLACE FUNCTION monvex_prevent_ledger_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION
        'MONVEX: LedgerEntry rows are immutable. '
        'UPDATE and DELETE are not permitted on ledger_ledgerentry. '
        'Attempted operation: % on row id=%',
        TG_OP, OLD.id;
END;
$$;

CREATE TRIGGER trg_ledger_immutability
BEFORE UPDATE OR DELETE
ON ledger_ledgerentry
FOR EACH ROW
EXECUTE FUNCTION monvex_prevent_ledger_modification();


-- ===========================================================================
-- 2. AUDIT LOG IMMUTABILITY
--    Table: audit_auditlog
--    Rule:  No UPDATE or DELETE is ever allowed.
-- ===========================================================================

CREATE OR REPLACE FUNCTION monvex_prevent_audit_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION
        'MONVEX: AuditLog rows are immutable. '
        'UPDATE and DELETE are not permitted on audit_auditlog. '
        'Attempted operation: % on row id=%',
        TG_OP, OLD.id;
END;
$$;

CREATE TRIGGER trg_audit_immutability
BEFORE UPDATE OR DELETE
ON audit_auditlog
FOR EACH ROW
EXECUTE FUNCTION monvex_prevent_audit_modification();


-- ===========================================================================
-- 3. COMPLETED / REVERSED TRANSACTION PROTECTION
--    Table: transactions_transaction
--    Rule:  Once status = 'COMPLETED' or 'REVERSED', the row is sealed.
--           No UPDATE or DELETE is permitted.
--
--    NOTE: PENDING → COMPLETED and PENDING → FAILED transitions are still
--          allowed because the status was not yet terminal when the row
--          was last written.  Only rows that ARE ALREADY terminal are blocked.
-- ===========================================================================

CREATE OR REPLACE FUNCTION monvex_protect_completed_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Block any operation on a row whose CURRENT status is terminal.
    IF OLD.status IN ('COMPLETED', 'REVERSED') THEN
        RAISE EXCEPTION
            'MONVEX: Transaction % is in terminal state ''%'' and cannot be '
            'modified or deleted. Create a REVERSAL transaction instead.',
            OLD.id, OLD.status;
    END IF;
    RETURN NEW;  -- Allow the operation (status was PENDING or FAILED).
END;
$$;

CREATE TRIGGER trg_transaction_immutability
BEFORE UPDATE OR DELETE
ON transactions_transaction
FOR EACH ROW
EXECUTE FUNCTION monvex_protect_completed_transaction();
"""


# ---------------------------------------------------------------------------
# SQL — Reverse (remove triggers and functions)
# ---------------------------------------------------------------------------

REVERSE_SQL = """
-- Drop triggers first, then functions.

DROP TRIGGER IF EXISTS trg_ledger_immutability        ON ledger_ledgerentry;
DROP TRIGGER IF EXISTS trg_audit_immutability         ON audit_auditlog;
DROP TRIGGER IF EXISTS trg_transaction_immutability   ON transactions_transaction;

DROP FUNCTION IF EXISTS monvex_prevent_ledger_modification();
DROP FUNCTION IF EXISTS monvex_prevent_audit_modification();
DROP FUNCTION IF EXISTS monvex_protect_completed_transaction();
"""


# ---------------------------------------------------------------------------
# Migration class
# ---------------------------------------------------------------------------

class Migration(migrations.Migration):

    dependencies = [
        # Must run after all schema migrations so all tables exist.
        ("ledger",       "0002_initial"),
        ("audit",        "0002_initial"),
        ("transactions", "0002_initial"),
    ]

    operations = [
        migrations.RunSQL(
            sql=FORWARD_SQL,
            reverse_sql=REVERSE_SQL,
        ),
    ]
