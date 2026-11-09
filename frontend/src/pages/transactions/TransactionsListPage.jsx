/**
 * pages/transactions/TransactionsListPage.jsx
 *
 * Premium transaction list with real API data, type icons and status badges.
 */

import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import { apiClient, ApiError } from '../../lib/api'
import {
  PageHeader,
  Card,
  Button,
  Spinner,
  ErrorState,
  EmptyState,
  TransactionStatusBadge,
  Badge,
} from '../../components/ui'
import { formatCurrency, formatDate, capitalize, cn } from '../../lib/utils'

const TXN_ICONS = {
  DEPOSIT:    { icon: ArrowDownLeft,  bg: 'bg-emerald-50', color: 'text-emerald-600' },
  WITHDRAWAL: { icon: ArrowUpRight,   bg: 'bg-red-50',     color: 'text-red-500'    },
  TRANSFER:   { icon: ArrowLeftRight, bg: 'bg-indigo-50',  color: 'text-indigo-600' },
  REVERSAL:   { icon: RotateCcw,      bg: 'bg-amber-50',   color: 'text-amber-600'  },
}

export default function TransactionsListPage() {
  const { isAccountHolder } = useAuth()
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState(null)
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [page, setPage]                 = useState(1)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.transactions.list({ page })
      setTransactions(res)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { fetchData() }, [fetchData])

  const txns    = transactions?.results || []
  const hasNext = !!transactions?.next
  const hasPrev = !!transactions?.previous || page > 1
  const total   = transactions?.count

  if (loading) {
    return (
      <div>
        <PageHeader title="Transactions" />
        <div className="mt-10 flex items-center justify-center"><Spinner size="xl" /></div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Transactions" />
        <ErrorState message={error} onRetry={fetchData} className="mt-8" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        subtitle={total != null ? `${total} transaction${total !== 1 ? 's' : ''}` : undefined}
        actions={
          isAccountHolder && (
            <div className="flex items-center gap-2">
              <Link to="/transactions/deposit">
                <Button size="sm" icon={ArrowDownLeft} variant="secondary">Deposit</Button>
              </Link>
              <Link to="/transactions/withdraw">
                <Button size="sm" icon={ArrowUpRight} variant="secondary">Withdraw</Button>
              </Link>
              <Link to="/transactions/transfer">
                <Button size="sm" icon={ArrowLeftRight}>Transfer</Button>
              </Link>
            </div>
          )
        }
      />

      <Card padded={false}>
        {txns.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No transactions yet"
            message="Your transaction history will appear here once you make deposits, withdrawals or transfers."
            action={
              isAccountHolder && (
                <Link to="/transactions/deposit">
                  <Button size="sm" icon={ArrowDownLeft} variant="secondary">
                    Make your first deposit
                  </Button>
                </Link>
              )
            }
            className="py-16"
          />
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-5 pb-3 pt-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Transaction
                    </th>
                    <th className="px-5 pb-3 pt-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Type
                    </th>
                    <th className="px-5 pb-3 pt-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Amount
                    </th>
                    <th className="px-5 pb-3 pt-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                    <th className="px-5 pb-3 pt-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {txns.map((txn) => {
                    const cfg     = TXN_ICONS[txn.transaction_type] || TXN_ICONS.TRANSFER
                    const Icon    = cfg.icon
                    const isCredit = txn.transaction_type === 'DEPOSIT'
                    return (
                      <tr
                        key={txn.id}
                        className="cursor-pointer transition-colors hover:bg-slate-50"
                        onClick={() => navigate(`/transactions/${txn.id}`)}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', cfg.bg)}>
                              <Icon className={cn('h-4 w-4', cfg.color)} />
                            </div>
                            <span className="text-sm font-medium text-slate-800">
                              {txn.reference}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge color="neutral" size="xs">
                            {capitalize(txn.transaction_type)}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className={cn(
                            'text-sm font-semibold tabular-nums',
                            isCredit ? 'text-emerald-600' : 'text-slate-700'
                          )}>
                            {isCredit ? '+' : '−'}{formatCurrency(txn.amount, txn.currency)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <TransactionStatusBadge status={txn.status} size="xs" />
                        </td>
                        <td className="px-5 py-3.5 text-sm text-slate-500">
                          {formatDate(txn.created_at)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {(hasNext || hasPrev) && (
              <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
                <Button
                  variant="secondary" size="sm"
                  disabled={!hasPrev}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <span className="text-sm text-slate-500">Page {page}</span>
                <Button
                  variant="secondary" size="sm"
                  disabled={!hasNext}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
