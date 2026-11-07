/**
 * pages/dashboard/DashboardPage.jsx
 *
 * Landing page after login.
 *
 * For ACCOUNT_HOLDER:
 *   - Summary cards: total balance across accounts, number of accounts
 *   - Recent transactions list (last 5)
 *   - Quick action buttons (deposit, withdraw, transfer)
 *   - Empty state if no accounts exist yet
 *
 * For ADMIN / AUDITOR:
 *   - Shows a different set of summary cards (system overview)
 *   - Recent transactions across all users
 *
 * All data is fetched from the real API. No fabricated numbers.
 */

import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Wallet,
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Inbox,
  Plus,
} from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import { apiClient, ApiError } from '../../lib/api'
import {
  PageHeader,
  Card,
  Spinner,
  ErrorState,
  EmptyState,
  TransactionStatusBadge,
  Button,
  Badge,
} from '../../components/ui'
import { formatCurrency, formatDate, capitalize } from '../../lib/utils'

export default function DashboardPage() {
  const { user, isAccountHolder } = useAuth()
  const [accounts, setAccounts] = useState(null)
  const [transactions, setTransactions] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [accountsRes, txnsRes] = await Promise.all([
        apiClient.accounts.list({ page: 1 }),
        apiClient.transactions.list({ page: 1 }),
      ])

      // Handle paginated or non-paginated responses
      setAccounts(accountsRes.results || accountsRes)
      setTransactions(txnsRes.results || txnsRes)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div>
        <PageHeader title="Dashboard" subtitle={`Welcome back, ${user?.first_name || user?.username}`} />
        <div className="mt-6 flex min-h-[300px] items-center justify-center">
          <Spinner size="xl" />
        </div>
      </div>
    )
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div>
        <PageHeader title="Dashboard" />
        <ErrorState message={error} onRetry={fetchData} className="mt-6" />
      </div>
    )
  }

  // ── Compute summary ───────────────────────────────────────────────────────
  // Filter out system accounts for customer-facing totals
  const customerAccounts = (accounts || []).filter(
    (a) => !a.is_system_account
  )
  const totalBalance = customerAccounts.reduce(
    (sum, a) => sum + parseFloat(a.balance || 0),
    0
  )
  const activeAccounts = customerAccounts.filter((a) => a.is_active)
  const recentTxns = (transactions || []).slice(0, 5)

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back, ${user?.first_name || user?.username}`}
        actions={
          isAccountHolder && (
            <div className="flex gap-2">
              <Link to="/transactions/deposit">
                <Button variant="secondary" size="sm" icon={ArrowDownLeft}>
                  Deposit
                </Button>
              </Link>
              <Link to="/transactions/withdraw">
                <Button variant="secondary" size="sm" icon={ArrowUpRight}>
                  Withdraw
                </Button>
              </Link>
              <Link to="/transactions/transfer">
                <Button variant="secondary" size="sm" icon={ArrowLeftRight}>
                  Transfer
                </Button>
              </Link>
            </div>
          )
        }
      />

      {/* Summary cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card padded>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Balance</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                {formatCurrency(totalBalance)}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </div>
          </div>
        </Card>

        <Card padded>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Active Accounts</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                {activeAccounts.length}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
              <Wallet className="h-5 w-5 text-indigo-500" />
            </div>
          </div>
        </Card>

        <Card padded>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Recent Transactions</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                {transactions?.length || 0}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <ArrowLeftRight className="h-5 w-5 text-amber-500" />
            </div>
          </div>
        </Card>
      </div>

      {/* Recent transactions */}
      <Card padded className="mt-6">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">
          Recent Transactions
        </h3>

        {recentTxns.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No transactions yet"
            message="When you make deposits, withdrawals, or transfers, they will appear here."
            action={
              isAccountHolder && (
                <Link to="/transactions">
                  <Button variant="secondary" size="sm">
                    Make a transaction
                  </Button>
                </Link>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="pb-3 pr-4">Reference</th>
                  <th className="pb-3 pr-4">Type</th>
                  <th className="pb-3 pr-4">Amount</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTxns.map((txn) => {
                  const isCredit =
                    txn.transaction_type === 'DEPOSIT' ||
                    (txn.transaction_type === 'TRANSFER' &&
                      !txn.source_account)
                  return (
                    <tr key={txn.id} className="hover:bg-slate-50">
                      <td className="py-3 pr-4 text-sm font-medium text-slate-700">
                        {txn.reference}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="flex items-center gap-1.5 text-sm text-slate-600">
                          {isCredit ? (
                            <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <ArrowUpRight className="h-3.5 w-3.5 text-red-500" />
                          )}
                          {capitalize(txn.transaction_type)}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-sm tabular-nums font-medium text-slate-700">
                        {isCredit ? '+' : '−'}
                        {formatCurrency(txn.amount, txn.currency)}
                      </td>
                      <td className="py-3 pr-4">
                        <TransactionStatusBadge status={txn.status} />
                      </td>
                      <td className="py-3 pr-4 text-sm text-slate-500">
                        {formatDate(txn.created_at, false)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Accounts overview (for account holders) */}
      {isAccountHolder && customerAccounts.length > 0 && (
        <Card padded className="mt-6">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Your Accounts</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {customerAccounts.slice(0, 3).map((account) => (
              <Link
                key={account.id}
                to={`/accounts/${account.id}`}
                className="block rounded-lg border border-slate-200 p-4 transition-colors hover:border-indigo-300 hover:bg-indigo-50/50"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">
                    {account.name}
                  </span>
                  <Badge color={account.is_active ? 'success' : 'neutral'} size="xs">
                    {account.is_active ? 'Active' : 'Closed'}
                  </Badge>
                </div>
                <p className="mt-2 text-lg font-semibold tabular-nums text-slate-900">
                  {formatCurrency(account.balance, account.currency)}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {account.account_number}
                </p>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Empty state: no accounts */}
      {isAccountHolder && customerAccounts.length === 0 && (
        <Card padded className="mt-6">
          <EmptyState
            icon={Wallet}
            title="No accounts yet"
            message="Create your first account to start making deposits, withdrawals, and transfers."
            action={
              <Link to="/accounts">
                <Button variant="secondary" size="sm" icon={Plus}>
                  Create Account
                </Button>
              </Link>
            }
          />
        </Card>
      )}
    </div>
  )
}
