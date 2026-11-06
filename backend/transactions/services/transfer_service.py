"""
transactions/services/transfer_service.py

Internal transfer service for MONVEX.

An internal transfer moves money between two accounts inside MONVEX.
It produces exactly one DEBIT and one CREDIT entry of equal amounts.
The net effect on total system money is zero.

DEADLOCK PREVENTION:
--------------------
Locking two rows simultaneously creates deadlock risk if two concurrent
transfers involve the same pair of accounts in opposite order:

    Transfer A:  lock account_1, then lock account_2
    Transfer B:  lock account_2, then lock account_1
    → each waits for the other's lock → deadlock

Solution: always lock accounts in a deterministic order (sorted by UUID).
Both transfers will attempt to lock account_1 first.  One will block until
the other finishes, preventing the circular wait.

    Transfer A:  lock account_1, then account_2
    Transfer B:  lock account_1 (blocks until A commits), then account_2
    → no deadlock

ATOMIC SEQUENCE:
    1.  Validate amount > 0, accounts are different.
    2.  Check idempotency.
    3.  Check authorization for both accounts.
    4.  Enter atomic block.
    5.  Lock both accounts in sorted UUID order (SELECT FOR UPDATE).
    6.  Re-check active status and balance under locks.
    7.  Create Transaction (PENDING).
    8.  Post DEBIT → source, CREDIT → destination.
    9.  Assert debit == credit.
    10. Mark Transaction COMPLETED.
    11. Commit.
    12. Update idempotency record.
    13. Record successful attempt.
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
from .authorization import check_transfer_authorization, get_account_or_raise
from .exceptions import (
    AccountInactiveError,
    AccountNotFoundError,
    AuthorizationError,
    FinancialError,
    InsufficientFundsError,
    InvalidAmountError,
    SameAccountTransferError,
)
from .idempotency_service import (
    check_or_create,
    compute_request_hash,
    mark_completed,
    mark_failed,
)
from .ledger_service import post_transfer
from .reference import generate_reference


def transfer(
    *,
    user: User,
    source_account_id: str,
    destination_account_id: str,
    amount: Decimal,
    currency: str = "USD",
    idempotency_key: str,
    reference: str | None = None,
    ip_address: str | None = None,
) -> Transaction:
    """
    Perform an internal transfer from source to destination for `user`.

    Returns the completed Transaction.
    Raises a FinancialError subclass on any failure.
    """
    # ------------------------------------------------------------------
    # 1. Validate inputs.
    # ------------------------------------------------------------------
    if not isinstance(amount, Decimal) or amount <= Decimal("0"):
        raise InvalidAmountError()

    if str(source_account_id) == str(destination_account_id):
        raise SameAccountTransferError()

    # ------------------------------------------------------------------
    # 2. Build payload hash.
    # ------------------------------------------------------------------
    payload = {
        "operation":               "transfer",
        "source_account_id":      str(source_account_id),
        "destination_account_id": str(destination_account_id),
        "amount":                 str(amount),
        "currency":               currency,
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
        source_account      = get_account_or_raise(source_account_id, user)
        destination_account = get_account_or_raise(destination_account_id, user)
        check_transfer_authorization(source_account, user)
        check_transfer_authorization(destination_account, user)
    except (AccountNotFoundError, AccountInactiveError, AuthorizationError) as exc:
        mark_failed(idem_record, exc.message)
        record_refused_attempt(
            user=user,
            transaction_type="TRANSFER",
            account=None,
            amount=amount,
            currency=currency,
            reason=exc.message,
            idempotency_record=idem_record,
            ip_address=ip_address,
        )
        raise

    # ------------------------------------------------------------------
    # 5–11. Atomic financial block.
    # ------------------------------------------------------------------
    # Lock accounts in deterministic UUID order to prevent deadlocks.
    lock_order = sorted(
        [str(source_account.pk), str(destination_account.pk)]
    )

    txn_reference = reference or generate_reference()
    try:
        with transaction.atomic():
            # Acquire both locks in sorted order.
            locked = {
                str(a.pk): a
                for a in Account.objects.select_for_update().filter(
                    pk__in=lock_order
                ).order_by("id")  # consistent order at DB level
            }
            locked_source      = locked[str(source_account.pk)]
            locked_destination = locked[str(destination_account.pk)]

            # Re-check active status under locks.
            if not locked_source.is_active:
                raise AccountInactiveError(
                    f"Source account {locked_source.account_number} is inactive."
                )
            if not locked_destination.is_active:
                raise AccountInactiveError(
                    f"Destination account {locked_destination.account_number} is inactive."
                )

            # Balance check AFTER acquiring the lock.
            if locked_source.balance < amount:
                raise InsufficientFundsError(
                    f"Insufficient funds: balance={locked_source.balance}, "
                    f"requested={amount}."
                )

            txn = Transaction.objects.create(
                reference=txn_reference,
                transaction_type=Transaction.TransactionType.TRANSFER,
                amount=amount,
                currency=currency,
                source_account=locked_source,
                destination_account=locked_destination,
                initiated_by=user,
                status=Transaction.Status.PENDING,
            )

            post_transfer(
                transaction=txn,
                source_account=locked_source,
                destination_account=locked_destination,
                amount=amount,
                initiated_by=user,
            )

            txn.status = Transaction.Status.COMPLETED
            txn.save(update_fields=["status", "updated_at"])

    except InsufficientFundsError as exc:
        mark_failed(idem_record, exc.message)
        record_refused_attempt(
            user=user,
            transaction_type="TRANSFER",
            account=source_account,
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
            transaction_type="TRANSFER",
            account=source_account,
            amount=amount,
            currency=currency,
            reason=str(exc),
            idempotency_record=idem_record,
            ip_address=ip_address,
        )
        raise

    # ------------------------------------------------------------------
    # 12–13. Post-commit.
    # ------------------------------------------------------------------
    response_body = {
        "id":                     str(txn.id),
        "reference":              txn.reference,
        "status":                 txn.status,
        "amount":                 str(amount),
        "currency":               currency,
        "source_account":         str(source_account.pk),
        "destination_account":    str(destination_account.pk),
    }
    mark_completed(idem_record, txn, response_body, 201)
    record_successful_attempt(
        user=user,
        transaction_type="TRANSFER",
        transaction_obj=txn,
        account=source_account,
        amount=amount,
        currency=currency,
        idempotency_record=idem_record,
    )

    return txn
