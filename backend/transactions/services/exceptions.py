"""
transactions/services/exceptions.py

All domain exceptions raised by the MONVEX financial service layer.

Views catch these and convert them to appropriate HTTP responses.
Never let internal exception detail leak to API consumers.

Hierarchy:
    FinancialError                  (base)
    ├── AuthorizationError          → HTTP 403
    ├── AccountError                → HTTP 400 / 404
    │   ├── AccountNotFoundError
    │   └── AccountInactiveError
    ├── ValidationError             → HTTP 400
    │   ├── InsufficientFundsError
    │   ├── SameAccountTransferError
    │   └── InvalidAmountError
    └── IdempotencyError            → HTTP 409 / 422
        ├── IdempotencyConflictError   (in-progress)  → 409
        └── IdempotencyMismatchError   (hash differs)  → 422
"""


class FinancialError(Exception):
    """Base class for all MONVEX service-layer errors."""
    default_message = "A financial processing error occurred."

    def __init__(self, message: str = ""):
        self.message = message or self.default_message
        super().__init__(self.message)


# ---------------------------------------------------------------------------
# Authorization
# ---------------------------------------------------------------------------

class AuthorizationError(FinancialError):
    """Caller does not have permission to operate on the requested account."""
    default_message = "You are not authorised to perform this operation."


# ---------------------------------------------------------------------------
# Account errors
# ---------------------------------------------------------------------------

class AccountError(FinancialError):
    """Base class for account-related errors."""


class AccountNotFoundError(AccountError):
    """The requested account does not exist or is not visible to this user."""
    default_message = "Account not found."


class AccountInactiveError(AccountError):
    """The account exists but is closed / inactive."""
    default_message = "This account is inactive and cannot be used for transactions."


# ---------------------------------------------------------------------------
# Validation / business-rule errors
# ---------------------------------------------------------------------------

class ValidationError(FinancialError):
    """A business rule was violated."""


class InsufficientFundsError(ValidationError):
    """The source account does not have enough balance for this operation."""
    default_message = "Insufficient funds."


class SameAccountTransferError(ValidationError):
    """Source and destination accounts are the same."""
    default_message = "Source and destination accounts must be different."


class InvalidAmountError(ValidationError):
    """The requested amount is not a positive number."""
    default_message = "Amount must be a positive number."


# ---------------------------------------------------------------------------
# Idempotency errors
# ---------------------------------------------------------------------------

class IdempotencyError(FinancialError):
    """Base class for idempotency-related errors."""


class IdempotencyConflictError(IdempotencyError):
    """
    A request with this key is already IN_PROGRESS.
    The caller should wait and retry.
    Maps to HTTP 409 Conflict.
    """
    default_message = (
        "A request with this idempotency key is already being processed. "
        "Please wait and retry."
    )


class IdempotencyMismatchError(IdempotencyError):
    """
    A completed/failed record exists for this key but the payload hash differs.
    The caller is reusing a key with a different operation — rejected.
    Maps to HTTP 422 Unprocessable Entity.
    """
    default_message = (
        "This idempotency key has already been used for a different request. "
        "Use a new idempotency key for a different operation."
    )
