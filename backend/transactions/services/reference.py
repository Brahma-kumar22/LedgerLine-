"""
transactions/services/reference.py

Generates unique human-readable transaction references.

Format: TXN-YYYYMMDD-XXXXXXXX
    YYYYMMDD  — UTC date of the transaction
    XXXXXXXX  — 8 uppercase hex characters from a random UUID

Example: TXN-20261106-A3F9B12C

The Transaction.reference column has a UNIQUE constraint, so a collision
(astronomically unlikely with 8 hex chars = 2^32 space) is caught by the
database and the caller should retry with a new reference.
"""

import uuid
from datetime import datetime, timezone


def generate_reference() -> str:
    datestamp = datetime.now(timezone.utc).strftime("%Y%m%d")
    suffix = uuid.uuid4().hex[:8].upper()
    return f"TXN-{datestamp}-{suffix}"
