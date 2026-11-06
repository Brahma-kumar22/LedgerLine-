"""
transactions/migrations/0003_attempt_immutability_trigger.py

Adds a PostgreSQL BEFORE UPDATE/DELETE trigger on
transactions_transactionattempt to enforce append-only semantics at the
database level.

This supplements the Django pre_save signal in transactions/signals.py:
  - Signal catches ORM .save() calls.
  - Trigger catches QuerySet.update(), raw SQL, and any future code path
    that bypasses the ORM.

The trigger raises an exception with a clear MONVEX-prefixed message so
that the origin of the rejection is immediately identifiable in logs.

Reversible: reverse_sql drops the trigger and function.
"""

from django.db import migrations

FORWARD_SQL = """
CREATE OR REPLACE FUNCTION monvex_prevent_attempt_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION
        'MONVEX: TransactionAttempt rows are immutable (append-only). '
        'UPDATE and DELETE are not permitted on transactions_transactionattempt. '
        'Attempted operation: % on row id=%',
        TG_OP, OLD.id;
END;
$$;

CREATE TRIGGER trg_attempt_immutability
BEFORE UPDATE OR DELETE
ON transactions_transactionattempt
FOR EACH ROW
EXECUTE FUNCTION monvex_prevent_attempt_modification();
"""

REVERSE_SQL = """
DROP TRIGGER IF EXISTS trg_attempt_immutability ON transactions_transactionattempt;
DROP FUNCTION IF EXISTS monvex_prevent_attempt_modification();
"""


class Migration(migrations.Migration):

    dependencies = [
        ("transactions", "0002_initial"),
    ]

    operations = [
        migrations.RunSQL(sql=FORWARD_SQL, reverse_sql=REVERSE_SQL),
    ]
