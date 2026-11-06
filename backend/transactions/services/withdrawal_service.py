"""
transactions/services/withdrawal_service.py

Withdrawal service for MONVEX.

A withdrawal debits a customer account and credits the EXTERNAL_SETTLEMENT
notional account (money leaving the system).

CONCURRENCY SAFETY:
-------------------
The source account is locked with SELECT FOR UPDATE *before* the balance
check.  This prevents two concurrent withdrawals from both reading the same
balance and both passing the check, which would allow a negative balance.

Without locking, the sequence:
    Thread A: reads balance=100, checks 100>=80 → passes
    Thread B: reads balance=100, checks 100>=80 → passes
    Thread A: debits 80, balance=20
    Thread B: debits 80, balance=-60  ← WRONG
Is prevented by PostgreSQL row-level locking:
    Thread A: SELECT FOR UPDATE → lock acquired
    Thread B: SELECT FOR UPDATE → blocks until A releases
    Thread A: balance=100, checks 100>=80, debits 80, balance=20, commit
    Thread B: re-reads balance=20, checks 20>=80 → FAILS → InsufficientFunds
"""

from decimal import Decimal

from django.db import transaction

from accounts.models import Account
from transactions.models import Transaction
from users.models import User

from .audit_service import (
    record_access_denied,
    record_idempotency_replay,
    record_refused_attempt,
    record_successful_attempt,
)
from .authorization import check_withdrawal_authorization, get_account_or_raise
from .exceptions import (
    AccountInactiveError,
    AccountNotFoundError,
    AuthorizationError,
    FinancialError,
    InsufficientFundsError,
    InvalidAmountError,
)
from .idempotency_service import (
    check_or_create,
    compute_request_hash,
    mark_completed,
    mark_failed,
)
from .ledger_service import post_withdrawal
from .reference import generate_reference


def withdraw(
    *,
    user: User,
    account_id: str,
    amount: Decimal,
    currency: str = "USD",
    idempotency_key: str,
    reference: str | None = None,
    ip_address: str | None = None,
) -> Transaction:
    """
    Perform a withdrawal from `account_id` for `user`.

    Returns the completed Transaction.
    Raises a FinancialError subclass on any failure.
    """
    # ------------------------------------------------------------------
    # 1. Validate amount.
    # ------------------------------------------------------------------
    if not isinstance(amount, Decimal) or amount <= Decimal("0"):
        raise InvalidAmountError()

    # ------------------------------------------------------------------
    # 2. Build payload hash.
    # ------------------------------------------------------------------
    payload = {
        "operation":  "withdrawal",
        "account_id": str(account_id),
        "amount":     str(amount),
        "currency":   currency,
    }
    request_hash = compute_request_hash(payload)

    # ------------------------------------------------------------------
    # 3. Check idempotency.
    # ------------------------------------------------------------------
    idem_record, is_new = check_or_create(
        user=user,
        idempotency_key=idempotency_key,
        request_hash=request_hash,
    )

    if not is_new:
        record_idempotency_replay(
            user=user,
            idempotency_record=idem_record,
            ip_address=ip_address,
        )
        if idem_record.transaction_id:
            return Transaction.objects.get(pk=idem_record.transaction_id)
        reason = (idem_record.response_body or {}).get("error", "Previous request failed.")
        raise FinancialError(reason)

    # ------------------------------------------------------------------
    # 4. Authorization checks.
    # ------------------------------------------------------------------
    try:
        account = get_account_or_raise(account_id, user)
        check_withdrawal_authorization(account, user)
    except (AccountNotFoundError, AccountInactiveError, AuthorizationError) as exc:
        mark_failed(idem_record, exc.message)
        record_refused_attempt(
            user=user,
            transaction_type="WITHDRAWAL",
            account=None,
            amount=amount,
            currency=currency,
            reason=exc.message,
            idempotency_record=idem_record,
            ip_address=ip_address,
        )
        raise

    # ------------------------------------------------------------------
    # 5–9. Atomic financial block.
    # ------------------------------------------------------------------
    txn_reference = reference or generate_reference()
    try:
        with transaction.atomic():
            # Lock the source account row before reading balance.
            # Any concurrent withdrawal on the same account blocks here
            # until this transaction commits or rolls back.
            locked_account = Account.objects.select_for_update().get(pk=account.pk)

            # Check active status again under the lock (may have changed).
            if not locked_account.is_active:
                raise AccountInactiveError()

            # Balance check AFTER acquiring the lock.
            if locked_account.balance < amount:
                raise InsufficientFundsError(
                    f"Insufficient funds: balance={locked_account.balance}, "
                    f"requested={amount}."
                )

            txn = Transaction.objects.create(
                reference=txn_reference,
                transaction_type=Transaction.TransactionType.WITHDRAWAL,
                amount=amount,
                currency=currency,
                source_account=locked_account,
                destination_account=None,
                initiated_by=user,
                status=Transaction.Status.PENDING,
            )

            post_withdrawal(
                transaction=txn,
                source_account=locked_account,
                amount=amount,
                initiated_by=user,
            )

            txn.status = Transaction.Status.COMPLETED
            txn.save(update_fields=["status", "updated_at"])

    except InsufficientFundsError as exc:
        mark_failed(idem_record, exc.message)
        record_refused_attempt(
            user=user,
            transaction_type="WITHDRAWAL",
            account=account,
            amount=amount,
            currency=currency,
            reason=exc.message,
            idempotency_record=idem_record,
            ip_address=ip_address,
        )
        raise
    except Exception as exc:
        mark_failed(idem_record, str(exc))
        record_refused_attempt(
            user=user,
            transaction_type="WITHDRAWAL",
            account=account,
            amount=amount,
            currency=currency,
            reason=str(exc),
            idempotency_record=idem_record,
            ip_address=ip_address,
        )
        raise

    # ------------------------------------------------------------------
    # 10–11. Post-commit.
    # ------------------------------------------------------------------
    response_body = {
        "id":        str(txn.id),
        "reference": txn.reference,
        "status":    txn.status,
        "amount":    str(amount),
        "currency":  currency,
    }
    mark_completed(idem_record, txn, response_body, 201)
    record_successful_attempt(
        user=user,
        transaction_type="WITHDRAWAL",
        transaction_obj=txn,
        account=account,
        amount=amount,
        currency=currency,
        idempotency_record=idem_record,
    )

    return txn
