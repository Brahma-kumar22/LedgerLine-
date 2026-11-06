"""
transactions/idempotency.py

IdempotencyRecord model for MONVEX.

PURPOSE:
--------
Idempotency ensures that retrying a failed API request (e.g. after a network
timeout) does not create a second financial transaction.

The caller supplies an idempotency_key (UUID) in the request header or body.
The server uses it as follows:

    1. FIRST REQUEST:
       No IdempotencyRecord exists for (user, key).
       Create a record with status=IN_PROGRESS.
       Process the transaction inside atomic().
       On success: set status=COMPLETED, store the serialised response.
       On failure: set status=FAILED, store the failure reason.

    2. RETRY — SAME KEY, SAME PAYLOAD:
       A record exists with status=COMPLETED.
       Return the stored response immediately.  No second transaction created.

    3. RETRY — SAME KEY, DIFFERENT PAYLOAD:
       The request_hash does not match the stored hash.
       Reject with HTTP 422 Unprocessable Entity.
       This prevents accidentally reusing a key for a different operation.

    4. CONCURRENT REQUEST — SAME KEY:
       A record exists with status=IN_PROGRESS.
       Reject with HTTP 409 Conflict.
       The caller should wait and retry.

    5. FAILED REQUEST — SAME KEY:
       A record exists with status=FAILED.
       Return the stored failure response.
       The caller must use a NEW key to attempt the operation again.

UNIQUENESS SCOPE:
-----------------
The unique constraint is on (user, idempotency_key), not just idempotency_key.
This means two different users can use the same UUID as their key without
collision.  Within a single user's scope, keys must be unique.

PAYLOAD HASH:
-------------
request_hash is a SHA-256 hex digest of the canonicalised request body.
It is used to detect same-key / different-payload misuse (case 3 above).
The hash is computed before storing; the raw payload is NOT stored to
avoid retaining sensitive financial data unnecessarily.

CONCURRENCY SAFETY:
-------------------
When creating an IdempotencyRecord, use get_or_create() inside atomic().
The unique constraint provides the race-condition safety net: if two
concurrent requests both try to create the same (user, key) record,
PostgreSQL will reject one with an IntegrityError, which the service
layer converts to a 409 response.
"""

import uuid

from django.conf import settings
from django.db import models


class IdempotencyRecord(models.Model):
    """
    Tracks in-progress, completed, and failed idempotent API requests.
    """

    class Status(models.TextChoices):
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        COMPLETED   = "COMPLETED",   "Completed"
        FAILED      = "FAILED",      "Failed"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="idempotency_records",
        help_text="The user who submitted the request.",
    )

    # The caller-supplied idempotency key.
    # Unique per user (see unique_together below).
    idempotency_key = models.UUIDField(
        db_index=True,
        help_text="Caller-supplied UUID. Unique within a user's scope.",
    )

    # SHA-256 hex digest of the canonicalised request payload.
    # Used to detect same-key / different-payload misuse.
    # NOT the raw payload — we do not store raw financial request bodies.
    request_hash = models.CharField(
        max_length=64,
        help_text="SHA-256 hex digest of the request payload for conflict detection.",
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.IN_PROGRESS,
        db_index=True,
    )

    # FK to the Transaction created by this request.
    # Null until processing completes (or if the request failed before
    # a Transaction row was written).
    transaction = models.ForeignKey(
        "transactions.Transaction",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="idempotency_records",
        help_text="The Transaction produced by this request. Null if not yet created.",
    )

    # Serialised JSON response to replay for subsequent identical requests.
    # Null for in-progress or failed records.
    response_body = models.JSONField(
        null=True,
        blank=True,
        help_text="Stored response to return for duplicate requests. Never store secrets here.",
    )

    # HTTP status code of the stored response.
    response_status_code = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text="HTTP status code of the stored response (e.g. 201).",
    )

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    # ------------------------------------------------------------------
    # String representation
    # ------------------------------------------------------------------

    def __str__(self) -> str:
        return f"IdempotencyRecord({self.user_id}, {self.idempotency_key}) [{self.status}]"

    # ------------------------------------------------------------------
    # Meta
    # ------------------------------------------------------------------

    class Meta:
        verbose_name = "Idempotency Record"
        verbose_name_plural = "Idempotency Records"
        ordering = ["-created_at"]
        # Core uniqueness: one record per (user, key) pair.
        unique_together = [("user", "idempotency_key")]
        indexes = [
            models.Index(fields=["user", "idempotency_key"], name="idem_user_key_idx"),
            models.Index(fields=["status"],                  name="idem_status_idx"),
        ]
