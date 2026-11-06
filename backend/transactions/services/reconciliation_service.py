"""
transactions/services/reconciliation_service.py

Reconciliation service for MONVEX.

WHAT IT CHECKS:
---------------
1. For each Account: cached balance == ledger-derived balance.
   Derived = sum(CREDIT amounts) - sum(DEBIT amounts) for all entries
   on that account.

2. For each completed Transaction: debit total == credit total.
   Any transaction where debits != credits is a double-entry violation.

3. Orphan detection: completed transactions with zero ledger entries.

WHAT IT DOES NOT DO:
--------------------
- It does NOT silently correct balances.
- It does NOT delete or modify any rows.
- Any detected discrepancy is reported and logged as a
  LEDGER_INTEGRITY_VIOLATION audit event for manual review.
- Corrections must be made through explicit, authorised reversal transactions.

USAGE:
------
    from transactions.services.reconciliation_service import run_reconciliation
    report = run_reconciliation()
    if report.has_discrepancies:
        # alert ops team
"""

from dataclasses import dataclass, field
from decimal import Decimal

from django.db.models import Sum, Value
from django.db.models.functions import Coalesce

from accounts.models import Account
from audit.models import AuditLog
from ledger.models import LedgerEntry
from transactions.models import Transaction


@dataclass
class ReconciliationReport:
    balance_discrepancies: list[dict] = field(default_factory=list)
    double_entry_violations: list[dict] = field(default_factory=list)
    orphan_transactions: list[str] = field(default_factory=list)

    @property
    def has_discrepancies(self) -> bool:
        return bool(
            self.balance_discrepancies
            or self.double_entry_violations
            or self.orphan_transactions
        )

    def summary(self) -> str:
        lines = ["=== MONVEX RECONCILIATION REPORT ==="]
        if not self.has_discrepancies:
            lines.append("ALL CHECKS PASSED — no discrepancies found.")
            return "\n".join(lines)

        if self.balance_discrepancies:
            lines.append(f"\nBALANCE DISCREPANCIES ({len(self.balance_discrepancies)}):")
            for d in self.balance_discrepancies:
                lines.append(
                    f"  Account {d['account_number']}: "
                    f"cached={d['cached_balance']} "
                    f"ledger_derived={d['ledger_balance']} "
                    f"delta={d['delta']}"
                )

        if self.double_entry_violations:
            lines.append(f"\nDOUBLE-ENTRY VIOLATIONS ({len(self.double_entry_violations)}):")
            for v in self.double_entry_violations:
                lines.append(
                    f"  Transaction {v['reference']}: "
                    f"debits={v['debit_total']} credits={v['credit_total']}"
                )

        if self.orphan_transactions:
            lines.append(f"\nORPHAN TRANSACTIONS ({len(self.orphan_transactions)}):")
            for ref in self.orphan_transactions:
                lines.append(f"  {ref}")

        return "\n".join(lines)


def run_reconciliation(account_ids: list | None = None) -> ReconciliationReport:
    """
    Run reconciliation checks.

    If `account_ids` is provided, check only those accounts.
    Otherwise check all accounts.

    Returns a ReconciliationReport.  Writes AuditLog entries for every
    discrepancy found.
    """
    report = ReconciliationReport()

    # ------------------------------------------------------------------
    # 1. Balance check: cached vs ledger-derived.
    # ------------------------------------------------------------------
    qs = Account.objects.all()
    if account_ids:
        qs = qs.filter(pk__in=account_ids)

    for account in qs.iterator():
        ledger_balance = _derive_balance_from_ledger(account)
        if ledger_balance != account.balance:
            delta = account.balance - ledger_balance
            report.balance_discrepancies.append({
                "account_id":      str(account.pk),
                "account_number":  account.account_number,
                "cached_balance":  account.balance,
                "ledger_balance":  ledger_balance,
                "delta":           delta,
            })
            _log_integrity_violation(
                event="BALANCE_MISMATCH",
                resource_id=str(account.pk),
                metadata={
                    "account_number": account.account_number,
                    "cached":         str(account.balance),
                    "ledger_derived": str(ledger_balance),
                    "delta":          str(delta),
                },
            )

    # ------------------------------------------------------------------
    # 2. Double-entry check: every completed transaction must balance.
    # ------------------------------------------------------------------
    completed_txns = Transaction.objects.filter(
        status=Transaction.Status.COMPLETED
    )
    if account_ids:
        completed_txns = completed_txns.filter(
            ledger_entries__account__in=account_ids
        ).distinct()

    for txn in completed_txns.iterator():
        totals = (
            LedgerEntry.objects
            .filter(transaction=txn)
            .values("entry_type")
            .annotate(total=Sum("amount"))
        )
        totals_map = {row["entry_type"]: row["total"] for row in totals}
        debit_total  = totals_map.get(LedgerEntry.EntryType.DEBIT,  Decimal("0"))
        credit_total = totals_map.get(LedgerEntry.EntryType.CREDIT, Decimal("0"))

        if debit_total != credit_total:
            report.double_entry_violations.append({
                "transaction_id": str(txn.pk),
                "reference":      txn.reference,
                "debit_total":    debit_total,
                "credit_total":   credit_total,
            })
            _log_integrity_violation(
                event="DOUBLE_ENTRY_VIOLATION",
                resource_id=str(txn.pk),
                metadata={
                    "reference":    txn.reference,
                    "debit_total":  str(debit_total),
                    "credit_total": str(credit_total),
                },
            )

        # Orphan: completed transaction with no ledger entries.
        if not totals:
            report.orphan_transactions.append(txn.reference)
            _log_integrity_violation(
                event="ORPHAN_TRANSACTION",
                resource_id=str(txn.pk),
                metadata={"reference": txn.reference},
            )

    return report


def _derive_balance_from_ledger(account: Account) -> Decimal:
    """
    Compute the expected account balance from ledger entries.

    balance = sum(CREDIT amounts) - sum(DEBIT amounts)
    """
    agg = (
        LedgerEntry.objects
        .filter(account=account)
        .aggregate(
            total_credits=Coalesce(
                Sum("amount", filter=__import__("django.db.models", fromlist=["Q"]).Q(entry_type=LedgerEntry.EntryType.CREDIT)),
                Value(Decimal("0"))
            ),
            total_debits=Coalesce(
                Sum("amount", filter=__import__("django.db.models", fromlist=["Q"]).Q(entry_type=LedgerEntry.EntryType.DEBIT)),
                Value(Decimal("0"))
            ),
        )
    )
    return agg["total_credits"] - agg["total_debits"]


def _log_integrity_violation(event: str, resource_id: str, metadata: dict) -> None:
    """Write an AuditLog entry for any detected integrity violation."""
    try:
        AuditLog.objects.create(
            actor=None,
            event_type=AuditLog.EventType.LEDGER_INTEGRITY_VIOLATION,
            resource_type="Reconciliation",
            resource_id=resource_id,
            metadata={"event": event, **metadata},
        )
    except Exception:
        pass
