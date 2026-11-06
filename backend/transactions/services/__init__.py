"""
transactions/services

Public API for the MONVEX financial service layer.

Import from here rather than from individual modules to keep views clean:

    from transactions.services import deposit, withdraw, transfer
    from transactions.services.exceptions import InsufficientFundsError
"""

from .deposit_service import deposit
from .withdrawal_service import withdraw
from .transfer_service import transfer
from .reconciliation_service import run_reconciliation
from .idempotency_service import compute_request_hash
from .exceptions import (
    FinancialError,
    AuthorizationError,
    AccountNotFoundError,
    AccountInactiveError,
    InsufficientFundsError,
    SameAccountTransferError,
    InvalidAmountError,
    IdempotencyConflictError,
    IdempotencyMismatchError,
)

__all__ = [
    "deposit",
    "withdraw",
    "transfer",
    "run_reconciliation",
    "compute_request_hash",
    "FinancialError",
    "AuthorizationError",
    "AccountNotFoundError",
    "AccountInactiveError",
    "InsufficientFundsError",
    "SameAccountTransferError",
    "InvalidAmountError",
    "IdempotencyConflictError",
    "IdempotencyMismatchError",
]
