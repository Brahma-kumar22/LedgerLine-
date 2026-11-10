/**
 * pages/dashboard/DashboardPage.jsx
 *
 * Premium financial dashboard — balanced responsive layout.
 *
 * Layout structure:
 *   Row 1: 4 stat cards (full width)
 *   Row 2: Recent Transactions (8 cols) | Quick Actions (4 cols)
 *   Row 3: Accounts section (full width, multi-column card grid)
 *
 * The Accounts section is full-width on its own row so it is never
 * squeezed into a narrow right column.
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
  CreditCard,
  PiggyBank,
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
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tabular-nums leading-none text-slate-900">
            {value}
          </p>
          {sub && <p className="mt-1.5 text-xs text-slate-400">{sub}</p>}
        </div>
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', iconBg)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  )
}

// ── Quick action row ──────────────────────────────────────────────────────────

function QuickAction({ to, icon: Icon, label, description, color }) {
  return (
    <Link to={to} className="group">
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all duration-150 hover:border-indigo-200 hover:bg-indigo-50/40 hover:shadow-sm">
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', color)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800 group-hover:text-indigo-700">{label}</p>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-slate-300 group-hover:text-indigo-400" />
      </div>
    </Link>
  )
}

// ── Account summary card (in the bottom row) ──────────────────────────────────

const TYPE_ICON  = { CHECKING: CreditCard, SAVINGS: PiggyBank, WALLET: Wallet }
const TYPE_COLOR = {
  CHECKING: 'bg-indigo-50 text-indigo-600',
  SAVINGS:  'bg-emerald-50 text-emerald-600',
  WALLET:   'bg-amber-50 text-amber-600',
}

function AccountCard({ account }) {
  const Icon  = TYPE_ICON[account.account_type]  || Wallet
  const color = TYPE_COLOR[account.account_type] || 'bg-slate-100 text-slate-600'

  return (
    <Link to={`/accounts/${account.id}`} className="group block">
      <Card padded={false} className="overflow-hidden transition-all duration-150 hover:border-indigo-200 hover:shadow-sm">
        {/* Top accent */}
        <div className={cn('h-1', account.is_active
          ? 'bg-gradient-to-r from-indigo-500 to-violet-500'
          : 'bg-slate-200'
        )} />
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', color)}>
              <Icon className="h-4 w-4" />
            </div>
            <Badge color={account.is_active ? 'success' : 'neutral'} size="xs">
              {account.is_active ? 'Active' : 'Closed'}
            </Badge>
          </div>
          <p className="mt-3 font-semibold text-slate-900 group-hover:text-indigo-700 truncate">
            {account.name}
          </p>
          <p className="text-xs text-slate-400">{capitalize(account.account_type)} · {account.currency}</p>
          <p className="mt-3 text-xl font-bold tabular-nums text-slate-900">
            {formatCurrency(account.balance, account.currency)}
          </p>
          <p className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-400 truncate">
            {account.account_number}
          </p>
        </div>
      </Card>
    </Link>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, isAccountHolder, isAdmin, isAuditor } = useAuth()
  const [accounts,     setAccounts]     = useState(null)
  const [transactions, setTransactions] = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)

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

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          subtitle={`Welcome back, ${user?.first_name || user?.username || ''}`}
        />
        <div className="flex justify-center pt-16"><Spinner size="xl" /></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" />
        <ErrorState message={error} onRetry={fetchData} className="mt-8" />
      </div>
    )
  }

  // ── Metrics ────────────────────────────────────────────────────────────────
  const customerAccounts = (accounts || []).filter((a) => !a.is_system_account)
  const activeAccounts   = customerAccounts.filter((a) => a.is_active)
  const totalBalance     = customerAccounts.reduce((s, a) => s + parseFloat(a.balance || 0), 0)
  const recentTxns       = (transactions || []).slice(0, 6)
  const txnTotal         = transactions?.length ?? 0
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
        subtitle={`Welcome back, ${user?.first_name || user?.username || ''}`}
      />

      {/* ── Row 1: stat cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Balance"
          value={formatCurrency(totalBalance)}
          icon={TrendingUp}
          iconBg="bg-emerald-50 text-emerald-600"
          sub={`${activeAccounts.length} active account${activeAccounts.length !== 1 ? 's' : ''}`}
        />
        <StatCard
          label="Accounts"
          value={customerAccounts.length}
          icon={Wallet}
          iconBg="bg-indigo-50 text-indigo-600"
          sub={activeAccounts.length === customerAccounts.length
            ? 'All active'
            : `${activeAccounts.length} of ${customerAccounts.length} active`}
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

      {/* ── Row 2: recent transactions + quick actions ────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">

        {/* Recent transactions — 8 cols on desktop */}
        <div className="lg:col-span-8">
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
                action={isAccountHolder && (
                  <Link to="/transactions/deposit">
                    <Button size="sm" icon={ArrowDownLeft} variant="secondary">
                      Make your first deposit
                    </Button>
                  </Link>
                )}
                className="py-14"
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
                        <div className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                          isCredit ? 'bg-emerald-50' : 'bg-red-50'
                        )}>
                          {isCredit
                            ? <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                            : <ArrowUpRight  className="h-4 w-4 text-red-500" />
                          }
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-800">{txn.reference}</p>
                          <p className="text-xs text-slate-400">
                            {capitalize(txn.transaction_type)} · {formatDate(txn.created_at, false)}
                          </p>
                        </div>
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

        {/* Quick actions — 4 cols on desktop */}
        <div className="lg:col-span-4">
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
        </div>
      </div>

      {/* ── Row 3: accounts — full width, multi-column card grid ──────────── */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Your Accounts</h2>
          <Link to="/accounts" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
            View all
          </Link>
        </div>

        {customerAccounts.length === 0 ? (
          <Card padded className="text-center">
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50">
                <Wallet className="h-7 w-7 text-indigo-500" />
              </div>
              <div>
                <p className="text-base font-semibold text-slate-700">No accounts yet</p>
                <p className="mt-1 text-sm text-slate-500">
                  Create your first account to start making deposits, withdrawals, and transfers.
                </p>
              </div>
              {isAccountHolder && (
                <Link to="/accounts">
                  <Button size="sm" icon={Plus} variant="secondary">
                    Create Account
                  </Button>
                </Link>
              )}
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {customerAccounts.map((acc) => (
              <AccountCard key={acc.id} account={acc} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
