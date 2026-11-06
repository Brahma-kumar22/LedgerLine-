"""
transactions/services/idempotency_service.py

Idempotency enforcement for MONVEX financial operations.

PROTOCOL:
---------
Every money-moving API call must supply an Idempotency-Key header (UUID).
The service layer processes it as follows:

    STEP 1 — compute_request_hash(payload)
        Produce a SHA-256 hex digest of the canonicalised request payload
        (sorted keys, no whitespace).  Used to detect same-key/different-
        payload reuse.

    STEP 2 — check_or_create(user, key, hash)
        Inside a SAVEPOINT:
        a. Try to INSERT a new IdempotencyRecord with status=IN_PROGRESS.
        b. If INSERT succeeds → first request, proceed with processing.
        c. If INSERT fails (unique violation on user+key) → duplicate:
              - Fetch the existing record.
              - If hash differs → raise IdempotencyMismatchError (422).
              - If status=IN_PROGRESS → raise IdempotencyConflictError (409).
              - If status=COMPLETED → return (record, True) for replay.
              - If status=FAILED → return (record, False) for replay.

    STEP 3 — mark_completed(record, response_body, status_code)
        After successful processing: persist response for future replays.

    STEP 4 — mark_failed(record, reason)
        After a processing error: record the failure.

TRANSACTION BOUNDARY NOTE:
---------------------------
check_or_create() uses a SAVEPOINT (via atomic(savepoint=True)) rather than
a full outer transaction.  This lets the caller wrap the entire financial
operation in its own atomic() block while still using a nested savepoint
for the idempotency INSERT.  If the outer transaction rolls back, so does
the idempotency record — which is correct.

The audit log for a refused/failed attempt must be written OUTSIDE the
financial transaction so it survives a rollback.  The service methods
handle this boundary explicitly.
"""

import hashlib
import json
import uuid as uuid_module
from typing import Any

from django.db import IntegrityError, transaction

from transactions.idempotency import IdempotencyRecord
from users.models import User

from .exceptions import IdempotencyConflictError, IdempotencyMismatchError


def compute_request_hash(payload: dict) -> str:
    """
    Produce a stable SHA-256 hex digest for a request payload dict.

    Keys are sorted and the dict is serialised to compact JSON before hashing.
    This ensures the same logical payload always produces the same hash
    regardless of key ordering in the client request.

    The raw payload is NOT stored — only the hash is persisted.
    """
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode()).hexdigest()


def check_or_create(
    user: User,
    idempotency_key: str,
    request_hash: str,
) -> tuple[IdempotencyRecord, bool]:
    """
    Enforce idempotency for a financial request.

    Returns:
        (record, is_new):
            is_new=True  — first request; caller should proceed with processing.
            is_new=False — duplicate of a COMPLETED or FAILED request;
                           caller should return the stored response.

    Raises:
        IdempotencyConflictError  — a request with this key is IN_PROGRESS.
        IdempotencyMismatchError  — key exists but payload hash differs.
    """
    # Validate key is a valid UUID.
    try:
        key_uuid = uuid_module.UUID(str(idempotency_key))
    except (ValueError, AttributeError):
        raise IdempotencyMismatchError("Idempotency-Key must be a valid UUID.")

    try:
        # Use a savepoint so a unique-violation rollback doesn't kill
        # the surrounding atomic block (if any).
        with transaction.atomic(savepoint=True):
            record = IdempotencyRecord.objects.create(
                user=user,
                idempotency_key=key_uuid,
                request_hash=request_hash,
                status=IdempotencyRecord.Status.IN_PROGRESS,
            )
        return record, True  # First request — proceed.

    except IntegrityError:
        # A record for (user, key) already exists.
        pass

    # Fetch the existing record — must be inside a transaction for select_for_update.
    try:
        with transaction.atomic(savepoint=True):
            existing = IdempotencyRecord.objects.select_for_update().get(
                user=user,
                idempotency_key=key_uuid,
            )
    except IdempotencyRecord.DoesNotExist:
        # Extremely unlikely race: created then deleted between our two queries.
        # Treat as new request.
        with transaction.atomic(savepoint=True):
            record = IdempotencyRecord.objects.create(
                user=user,
                idempotency_key=key_uuid,
                request_hash=request_hash,
                status=IdempotencyRecord.Status.IN_PROGRESS,
            )
        return record, True

    # Payload hash mismatch — caller is reusing key for a different operation.
    if existing.request_hash != request_hash:
        raise IdempotencyMismatchError()

    # In-progress — another request is processing right now.
    if existing.status == IdempotencyRecord.Status.IN_PROGRESS:
        raise IdempotencyConflictError()

    # Completed or Failed — return the stored result for replay.
    return existing, False


def mark_completed(
    record: IdempotencyRecord,
    transaction_obj: Any,
    response_body: dict,
    response_status_code: int,
) -> None:
    """
    Mark an idempotency record as COMPLETED after successful processing.
    Stores the response body for future replays.
    """
    # Direct update — bypasses the immutability signal because
    # IdempotencyRecord is mutable (unlike LedgerEntry / AuditLog).
    IdempotencyRecord.objects.filter(pk=record.pk).update(
        status=IdempotencyRecord.Status.COMPLETED,
        transaction=transaction_obj,
        response_body=response_body,
        response_status_code=response_status_code,
    )


def mark_failed(record: IdempotencyRecord, reason: str) -> None:
    """
    Mark an idempotency record as FAILED.
    Stores the failure reason so callers can see why their request failed.
    A new idempotency key must be used to retry.
    """
    IdempotencyRecord.objects.filter(pk=record.pk).update(
        status=IdempotencyRecord.Status.FAILED,
        response_body={"error": reason},
        response_status_code=400,
    )
