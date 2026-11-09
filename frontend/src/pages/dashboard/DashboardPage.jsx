/**
 * pages/dashboard/DashboardPage.jsx
 *
 * Premium financial dashboard.
 * Loads real data from /api/accounts/ and /api/transactions/.
 * Never invents metrics or fabricates historical data.
 */

import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  TrendingUp,
  Plus,
  LayoutDashboard,
  ChevronRight,
} from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import { apiClient, ApiError } from '../../lib/api'
import {
  Card,
  PageHeader,
  Badge,
  Button,
  Spinner,
  ErrorState,
  EmptyState,
  TransactionStatusBadge,
} from '../../components/ui'
import { formatCurrency, formatDate, capitalize, cn } from '../../lib/utils'

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, iconBg, sub }) {
  return (
    <Card padded>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 leading-none">
            {value}
          </p>
          {sub && (
            <p className="mt-1.5 text-xs text-slate-400">{sub}</p>
          )}
        </div>
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', iconBg)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  )
}

// ── Quick action button ───────────────────────────────────────────────────────

function QuickAction({ to, icon: Icon, label, description, color }) {
  return (
    <Link to={to} className="group">
      <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 transition-all duration-150 hover:border-indigo-200 hover:bg-indigo-50/40 hover:shadow-sm">
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 group-hover:text-indigo-700">{label}</p>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-slate-300 group-hover:text-indigo-400" />
      </div>
    </Link>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, isAccountHolder, isAdmin, isAuditor } = useAuth()
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
      setAccounts(accountsRes.results ?? accountsRes)
      setTransactions(txnsRes.results ?? txnsRes)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div>
        <PageHeader
          title="Dashboard"
          subtitle={`Welcome back, ${user?.first_name || user?.username || ''}`}
        />
        <div className="mt-10 flex items-center justify-center">
          <Spinner size="xl" />
        </div>
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div>
        <PageHeader title="Dashboard" />
        <ErrorState message={error} onRetry={fetchData} className="mt-8" />
      </div>
    )
  }

  // ── Compute metrics ────────────────────────────────────────────────────────
  const customerAccounts = (accounts || []).filter((a) => !a.is_system_account)
  const activeAccounts   = customerAccounts.filter((a) => a.is_active)
  const totalBalance     = customerAccounts.reduce((sum, a) => sum + parseFloat(a.balance || 0), 0)
  const recentTxns       = (transactions || []).slice(0, 6)
  const txnTotal         = transactions?.length ?? 0

  // Completed deposits and withdrawals (real income/expense from real data)
  const completedTxns    = (transactions || []).filter((t) => t.status === 'COMPLETED')
  const totalDeposited   = completedTxns
    .filter((t) => t.transaction_type === 'DEPOSIT')
    .reduce((s, t) => s + parseFloat(t.amount || 0), 0)
  const totalWithdrawn   = completedTxns
    .filter((t) => t.transaction_type === 'WITHDRAWAL')
    .reduce((s, t) => s + parseFloat(t.amount || 0), 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back, ${user?.first_name || user?.username || ''}. Here's your financial overview.`}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Balance"
          value={formatCurrency(totalBalance)}
          icon={TrendingUp}
          iconBg="bg-emerald-50 text-emerald-600"
          sub={`Across ${activeAccounts.length} active account${activeAccounts.length !== 1 ? 's' : ''}`}
        />
        <StatCard
          label="Accounts"
          value={customerAccounts.length}
          icon={Wallet}
          iconBg="bg-indigo-50 text-indigo-600"
          sub={activeAccounts.length === customerAccounts.length ? 'All active' : `${activeAccounts.length} of ${customerAccounts.length} active`}
        />
        {totalDeposited > 0 ? (
          <StatCard
            label="Total Deposited"
            value={formatCurrency(totalDeposited)}
            icon={ArrowDownLeft}
            iconBg="bg-sky-50 text-sky-600"
            sub="Completed deposits"
          />
        ) : (
          <StatCard
            label="Transactions"
            value={txnTotal}
            icon={ArrowLeftRight}
            iconBg="bg-amber-50 text-amber-600"
            sub="All time"
          />
        )}
        {totalWithdrawn > 0 ? (
          <StatCard
            label="Total Withdrawn"
            value={formatCurrency(totalWithdrawn)}
            icon={ArrowUpRight}
            iconBg="bg-red-50 text-red-600"
            sub="Completed withdrawals"
          />
        ) : (
          <StatCard
            label="Role"
            value={isAdmin ? 'Admin' : isAuditor ? 'Auditor' : 'Account Holder'}
            icon={LayoutDashboard}
            iconBg="bg-slate-100 text-slate-600"
            sub="Your access level"
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent transactions */}
        <div className="lg:col-span-2">
          <Card padded={false}>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-900">Recent Transactions</h2>
              <Link to="/transactions" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                View all
              </Link>
            </div>

            {recentTxns.length === 0 ? (
              <EmptyState
                icon={ArrowLeftRight}
                title="No transactions yet"
                message="Deposits, withdrawals, and transfers will appear here."
                action={
                  isAccountHolder && (
                    <Link to="/transactions/deposit">
                      <Button size="sm" icon={ArrowDownLeft} variant="secondary">
                        Make your first deposit
                      </Button>
                    </Link>
                  )
                }
                className="py-12"
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentTxns.map((txn) => {
                  const isCredit = txn.transaction_type === 'DEPOSIT'
                  return (
                    <li key={txn.id}>
                      <Link
                        to={`/transactions/${txn.id}`}
                        className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50"
                      >
                        {/* Type icon */}
                        <div className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                          isCredit ? 'bg-emerald-50' : 'bg-red-50'
                        )}>
                          {isCredit
                            ? <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                            : <ArrowUpRight  className="h-4 w-4 text-red-500" />
                          }
                        </div>

                        {/* Reference + type */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-800">
                            {txn.reference}
                          </p>
                          <p className="text-xs text-slate-400">
                            {capitalize(txn.transaction_type)} · {formatDate(txn.created_at, false)}
                          </p>
                        </div>

                        {/* Amount + status */}
                        <div className="text-right">
                          <p className={cn(
                            'text-sm font-semibold tabular-nums',
                            isCredit ? 'text-emerald-600' : 'text-slate-700'
                          )}>
                            {isCredit ? '+' : '−'}{formatCurrency(txn.amount, txn.currency)}
                          </p>
                          <div className="mt-0.5 flex justify-end">
                            <TransactionStatusBadge status={txn.status} size="xs" />
                          </div>
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Quick actions — only for account holders */}
          {isAccountHolder && (
            <Card padded={false}>
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-base font-semibold text-slate-900">Quick Actions</h2>
              </div>
              <div className="space-y-2 p-4">
                <QuickAction
                  to="/transactions/deposit"
                  icon={ArrowDownLeft}
                  label="Deposit"
                  description="Add funds to an account"
                  color="bg-emerald-50 text-emerald-600"
                />
                <QuickAction
                  to="/transactions/withdraw"
                  icon={ArrowUpRight}
                  label="Withdraw"
                  description="Move funds out"
                  color="bg-red-50 text-red-500"
                />
                <QuickAction
                  to="/transactions/transfer"
                  icon={ArrowLeftRight}
                  label="Transfer"
                  description="Between your accounts"
                  color="bg-indigo-50 text-indigo-600"
                />
              </div>
            </Card>
          )}

          {/* Accounts overview */}
          <Card padded={false}>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-900">Accounts</h2>
              <Link to="/accounts" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                View all
              </Link>
            </div>

            {customerAccounts.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title="No accounts"
                message="Create your first account to get started."
                action={
                  isAccountHolder && (
                    <Link to="/accounts">
                      <Button size="sm" icon={Plus} variant="secondary">
                        Create account
                      </Button>
                    </Link>
                  )
                }
                className="py-8"
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {customerAccounts.slice(0, 4).map((acc) => (
                  <li key={acc.id}>
                    <Link
                      to={`/accounts/${acc.id}`}
                      className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">{acc.name}</p>
                        <p className="text-xs text-slate-400">{acc.account_number}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold tabular-nums text-slate-900">
                          {formatCurrency(acc.balance, acc.currency)}
                        </p>
                        <Badge
                          color={acc.is_active ? 'success' : 'neutral'}
                          size="xs"
                        >
                          {acc.is_active ? 'Active' : 'Closed'}
                        </Badge>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
