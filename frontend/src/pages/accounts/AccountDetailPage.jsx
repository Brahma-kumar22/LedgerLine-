/**
 * pages/accounts/AccountDetailPage.jsx
 *
 * Account detail page with statement (ledger entries).
 *
 * Shows:
 *   - Account header (number, type, status, balance)
 *   - Account statement (paginated ledger entries)
 *   - Empty state when no transactions exist
 */

import { useCallback, useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Inbox,
  ChevronLeft,
} from 'lucide-react'

import { apiClient, ApiError } from '../../lib/api'
import {
  Card,
  Badge,
  Spinner,
  ErrorState,
  EmptyState,
  Button,
} from '../../components/ui'
import { formatCurrency, formatDate, capitalize } from '../../lib/utils'

export default function AccountDetailPage() {
  const { id } = useParams()
  const [account, setAccount] = useState(null)
  const [statement, setStatement] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [acctRes, stmtRes] = await Promise.all([
        apiClient.accounts.get(id),
        apiClient.accounts.getStatement(id, { page }),
      ])
      setAccount(acctRes)
      setStatement(stmtRes)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load account')
    } finally {
      setLoading(false)
    }
  }, [id, page])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading && !account) {
    return (
      <div>
        <div className="mt-6 flex min-h-[300px] items-center justify-center">
          <Spinner size="xl" />
        </div>
      </div>
    )
  }

  if (error && !account) {
    return (
      <div>
        <ErrorState message={error} onRetry={fetchData} className="mt-6" />
      </div>
    )
  }

  const entries = statement?.results || []
  const hasNext = statement?.next
  const hasPrev = statement?.previous || page > 1

  return (
    <div>
      <Link to="/accounts" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ChevronLeft className="h-4 w-4" />
        Back to accounts
      </Link>

      {/* Account header */}
      <Card padded>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-slate-900">{account?.name}</h2>
              <Badge color={account?.is_active ? 'success' : 'neutral'} size="sm">
                {account?.is_active ? 'Active' : 'Closed'}
              </Badge>
              {account?.is_system_account && (
                <Badge color="info" size="sm">System</Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-400">{account?.account_number}</p>
            <p className="mt-1 text-sm text-slate-500">{capitalize(account?.account_type)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Current Balance</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-slate-900">
              {formatCurrency(account?.balance, account?.currency)}
            </p>
          </div>
        </div>
      </Card>

      {/* Statement */}
      <Card padded className="mt-6">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Account Statement</h3>

        {entries.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No transactions yet"
            message="Ledger entries will appear here once transactions are made on this account."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <th className="pb-3 pr-4">Type</th>
                    <th className="pb-3 pr-4">Amount</th>
                    <th className="pb-3 pr-4">Balance After</th>
                    <th className="pb-3 pr-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.map((entry) => {
                    const isCredit = entry.entry_type === 'CREDIT'
                    return (
                      <tr key={entry.id} className="hover:bg-slate-50">
                        <td className="py-3 pr-4">
                          <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                            {isCredit ? (
                              <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <ArrowUpRight className="h-3.5 w-3.5 text-red-500" />
                            )}
                            {capitalize(entry.entry_type)}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-sm tabular-nums font-medium text-slate-700">
                          {isCredit ? '+' : '−'}
                          {formatCurrency(entry.amount, entry.currency)}
                        </td>
                        <td className="py-3 pr-4 text-sm tabular-nums text-slate-500">
                          {formatCurrency(entry.balance_after, entry.currency)}
                        </td>
                        <td className="py-3 pr-4 text-sm text-slate-500">
                          {formatDate(entry.created_at)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {(hasNext || hasPrev) && (
              <div className="mt-4 flex items-center justify-between">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!hasPrev}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
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
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
