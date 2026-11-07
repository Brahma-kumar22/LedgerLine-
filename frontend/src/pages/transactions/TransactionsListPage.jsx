/**
 * pages/transactions/TransactionsListPage.jsx
 *
 * Lists transactions visible to the current user with quick action buttons
 * for deposit, withdraw, and transfer.
 */

import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Inbox,
  ChevronLeft,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
} from 'lucide-react'

import { apiClient, ApiError } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import {
  PageHeader,
  Card,
  Button,
  Spinner,
  ErrorState,
  EmptyState,
  TransactionStatusBadge,
} from '../../components/ui'
import { formatCurrency, formatDate, capitalize } from '../../lib/utils'

export default function TransactionsListPage() {
  const { isAccountHolder } = useAuth()
  const [transactions, setTransactions] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)

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

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div>
        <PageHeader title="Transactions" />
        <div className="mt-6 flex min-h-[300px] items-center justify-center">
          <Spinner size="xl" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Transactions" />
        <ErrorState message={error} onRetry={fetchData} className="mt-6" />
      </div>
    )
  }

  const txns = transactions?.results || []
  const hasNext = transactions?.next
  const hasPrev = transactions?.previous || page > 1

  return (
    <div>
      <PageHeader
        title="Transactions"
        subtitle={txns.length > 0 ? `${transactions?.count || txns.length} total` : undefined}
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

      {txns.length === 0 ? (
        <Card padded className="mt-6">
          <EmptyState
            icon={Inbox}
            title="No transactions yet"
            message="Your transaction history will appear here once you make deposits, withdrawals, or transfers."
            action={
              isAccountHolder && (
                <Link to="/transactions/deposit">
                  <Button variant="secondary" size="sm" icon={ArrowDownLeft}>
                    Make a deposit
                  </Button>
                </Link>
              )
            }
          />
        </Card>
      ) : (
        <Card padded className="mt-6">
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
                {txns.map((txn) => {
                  const isCredit =
                    txn.transaction_type === 'DEPOSIT' ||
                    (txn.transaction_type === 'TRANSFER' && !txn.source_account)
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
                        {formatDate(txn.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {(hasNext || hasPrev) && (
            <div className="mt-4 flex items-center justify-between">
              <Button
                variant="secondary"
                size="sm"
                disabled={!hasPrev}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm text-slate-500">Page {page}</span>
              <Button
                variant="secondary"
                size="sm"
                disabled={!hasNext}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
