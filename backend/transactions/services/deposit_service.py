"""
transactions/services/deposit_service.py

Deposit service for MONVEX.

A deposit credits a customer account with funds from outside the system.
The corresponding DEBIT is posted to the EXTERNAL_FUNDING notional account.

ATOMIC SEQUENCE:
    1.  Validate amount > 0.
    2.  Check idempotency (outside atomic block to avoid locking issues).
    3.  Check account exists and user is authorized.
    4.  Lock the destination account (SELECT FOR UPDATE).
    5.  Create Transaction (PENDING).
    6.  Post ledger entries (DEBIT external_funding, CREDIT destination).
    7.  Assert ledger balance == 0 net for this transaction.
    8.  Mark transaction COMPLETED.
    9.  Commit (atomic block exits).
    10. Update idempotency record → COMPLETED (outside atomic).
    11. Record successful attempt (outside atomic).

Steps 4–8 are inside a single django.db.transaction.atomic() call.
Steps 2, 10, 11 are outside the atomic block intentionally.
Refused-attempt records (steps 2 and 3 failures) are written outside
the financial block so they survive any rollback.
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
from .authorization import check_deposit_authorization, get_account_or_raise
from .exceptions import (
    AccountInactiveError,
    AccountNotFoundError,
    AuthorizationError,
    InvalidAmountError,
)
from .idempotency_service import (
    check_or_create,
    compute_request_hash,
    mark_completed,
    mark_failed,
)
from .ledger_service import post_deposit
from .reference import generate_reference


def deposit(
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
    Perform a deposit into `account_id` for `user`.

    Returns the completed Transaction.
    Raises a FinancialError subclass on any failure.

    The caller (view) is responsible for:
        - Converting the raw request amount to Decimal.
        - Extracting the Idempotency-Key header.
        - Mapping exceptions to HTTP responses.
    """
    # ------------------------------------------------------------------
    # 1. Validate amount.
    # ------------------------------------------------------------------
    if not isinstance(amount, Decimal) or amount <= Decimal("0"):
        raise InvalidAmountError()

    # ------------------------------------------------------------------
    # 2. Build payload hash for idempotency.
    # ------------------------------------------------------------------
    payload = {
        "operation":  "deposit",
        "account_id": str(account_id),
        "amount":     str(amount),
        "currency":   currency,
    }
    request_hash = compute_request_hash(payload)

    # ------------------------------------------------------------------
    # 3. Check idempotency (outside atomic — survives rollback).
    # ------------------------------------------------------------------
    idem_record, is_new = check_or_create(
        user=user,
        idempotency_key=idempotency_key,
        request_hash=request_hash,
    )

    if not is_new:
        # Duplicate request — return the original result.
        record_idempotency_replay(
            user=user,
            idempotency_record=idem_record,
            ip_address=ip_address,
        )
        if idem_record.transaction_id:
            return Transaction.objects.get(pk=idem_record.transaction_id)
        # Was a failed request — re-raise with the original reason.
        from .exceptions import FinancialError
        reason = (idem_record.response_body or {}).get("error", "Previous request failed.")
        raise FinancialError(reason)

    # ------------------------------------------------------------------
    # 4. Authorisation checks (before entering atomic block).
    # ------------------------------------------------------------------
    try:
        account = get_account_or_raise(account_id, user)
        check_deposit_authorization(account, user)
    except (AccountNotFoundError, AccountInactiveError, AuthorizationError) as exc:
        mark_failed(idem_record, exc.message)
        record_refused_attempt(
            user=user,
            transaction_type="DEPOSIT",
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
            # Re-fetch with SELECT FOR UPDATE inside the atomic block.
            locked_account = Account.objects.select_for_update().get(pk=account.pk)

            txn = Transaction.objects.create(
                reference=txn_reference,
                transaction_type=Transaction.TransactionType.DEPOSIT,
                amount=amount,
                currency=currency,
                source_account=None,
                destination_account=locked_account,
                initiated_by=user,
                status=Transaction.Status.PENDING,
            )

            post_deposit(
                transaction=txn,
                destination_account=locked_account,
                amount=amount,
                initiated_by=user,
            )

            # Mark COMPLETED — immutability trigger fires from here on.
            txn.status = Transaction.Status.COMPLETED
            txn.save(update_fields=["status", "updated_at"])

    except Exception as exc:
        mark_failed(idem_record, str(exc))
        record_refused_attempt(
            user=user,
            transaction_type="DEPOSIT",
            account=account,
            amount=amount,
            currency=currency,
            reason=str(exc),
            idempotency_record=idem_record,
            ip_address=ip_address,
        )
        raise

    # ------------------------------------------------------------------
    # 10–11. Post-commit bookkeeping.
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
        transaction_type="DEPOSIT",
        transaction_obj=txn,
        account=account,
        amount=amount,
        currency=currency,
        idempotency_record=idem_record,
    )

    return txn
