/**
 * pages/transactions/TransactionDetailPage.jsx
 *
 * Shows full details for a single transaction including its ledger entries.
 *
 * Calls:
 *   GET /api/transactions/{id}/ — transaction details
 *   GET /api/accounts/{id}/statement/ — to find ledger entries for this transaction
 *
 * The backend does not have a direct "get ledger entries for transaction"
 * endpoint, so we fetch the statement of both source and destination accounts
 * and filter by transaction_id.
 */

import { useCallback, useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  AlertCircle,
} from 'lucide-react'

import { apiClient, ApiError } from '../../lib/api'
import {
  Card,
  Badge,
  Spinner,
  ErrorState,
  TransactionStatusBadge,
  PageHeader,
} from '../../components/ui'
import { formatCurrency, formatDate, capitalize } from '../../lib/utils'

export default function TransactionDetailPage() {
  const { id } = useParams()
  const [txn, setTxn] = useState(null)
  const [ledgerEntries, setLedgerEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch the transaction
      const txnData = await apiClient.transactions.get(id)
      setTxn(txnData)

      // Fetch ledger entries from the source and/or destination account statements
      const accountIds = [
        txnData.source_account,
        txnData.destination_account,
      ].filter(Boolean)

      const entries = []
      for (const accountId of accountIds) {
        try {
          const stmt = await apiClient.accounts.getStatement(accountId, { page: 1 })
          const results = stmt.results || []
          // Filter to only entries for this transaction
          const matching = results.filter(
            (e) => e.transaction === txnData.id
          )
          entries.push(...matching)
        } catch {
          // Account may not be accessible — skip silently
        }
      }

      // Deduplicate by entry ID (an entry may appear in both account statements
      // only if source and destination are the same account, which is prevented
      // for transfers — but we deduplicate anyway for safety)
      const seen = new Set()
      const unique = entries.filter((e) => {
        if (seen.has(e.id)) return false
        seen.add(e.id)
        return true
      })

      setLedgerEntries(unique)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load transaction')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div>
        <div className="mt-6 flex min-h-[300px] items-center justify-center">
          <Spinner size="xl" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <Link to="/transactions" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ChevronLeft className="h-4 w-4" /> Back to transactions
        </Link>
        <ErrorState message={error} onRetry={fetchData} className="mt-6" />
      </div>
    )
  }

  if (!txn) return null

  const isCredit =
    txn.transaction_type === 'DEPOSIT' ||
    (txn.transaction_type === 'TRANSFER' && !txn.source_account)

  return (
    <div>
      <Link to="/transactions" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ChevronLeft className="h-4 w-4" /> Back to transactions
      </Link>

      <PageHeader
        title={txn.reference}
        subtitle={`${capitalize(txn.transaction_type)} · ${txn.currency}`}
        className="mb-6"
      />

      {/* Transaction header */}
      <Card padded>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isCredit ? 'bg-emerald-50' : 'bg-red-50'}`}>
                {isCredit ? (
                  <ArrowDownLeft className="h-5 w-5 text-emerald-500" />
                ) : (
                  <ArrowUpRight className="h-5 w-5 text-red-500" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {capitalize(txn.transaction_type)}
                </h2>
                <p className="mt-0.5 text-sm text-slate-400">{txn.reference}</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Amount</p>
            <p className={`mt-1 text-2xl font-semibold tabular-nums ${isCredit ? 'text-emerald-600' : 'text-slate-900'}`}>
              {isCredit ? '+' : '−'}{formatCurrency(txn.amount, txn.currency)}
            </p>
            <div className="mt-2">
              <TransactionStatusBadge status={txn.status} />
            </div>
          </div>
        </div>

        {txn.failure_reason && (
          <div className="mt-4 flex items-start gap-2 rounded-md bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{txn.failure_reason}</span>
          </div>
        )}
      </Card>

      {/* Transaction details */}
      <Card padded className="mt-6">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Details</h3>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">Reference</dt>
            <dd className="mt-1 text-sm font-medium text-slate-700">{txn.reference}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">Type</dt>
            <dd className="mt-1 text-sm text-slate-700">{capitalize(txn.transaction_type)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">Status</dt>
            <dd className="mt-1">
              <TransactionStatusBadge status={txn.status} />
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">Initiated By</dt>
            <dd className="mt-1 text-sm text-slate-700">{txn.initiated_by_username || '—'}</dd>
          </div>
          {txn.source_account && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">Source Account</dt>
              <dd className="mt-1">
                <Link to={`/accounts/${txn.source_account}`} className="text-sm text-indigo-600 hover:text-indigo-700">
                  {txn.source_account}
                </Link>
              </dd>
            </div>
          )}
          {txn.destination_account && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">Destination Account</dt>
              <dd className="mt-1">
                <Link to={`/accounts/${txn.destination_account}`} className="text-sm text-indigo-600 hover:text-indigo-700">
                  {txn.destination_account}
                </Link>
              </dd>
            </div>
          )}
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">Created</dt>
            <dd className="mt-1 text-sm text-slate-700">{formatDate(txn.created_at)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">Last Updated</dt>
            <dd className="mt-1 text-sm text-slate-700">{formatDate(txn.updated_at)}</dd>
          </div>
        </dl>
      </Card>

      {/* Ledger entries */}
      {ledgerEntries.length > 0 && (
        <Card padded className="mt-6">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Ledger Entries</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="pb-3 pr-4">Type</th>
                  <th className="pb-3 pr-4">Amount</th>
                  <th className="pb-3 pr-4">Balance After</th>
                  <th className="pb-3 pr-4">Account</th>
                  <th className="pb-3 pr-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledgerEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50">
                    <td className="py-3 pr-4">
                      <Badge color={entry.entry_type === 'CREDIT' ? 'success' : 'danger'} size="xs">
                        {capitalize(entry.entry_type)}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-sm tabular-nums font-medium text-slate-700">
                      {formatCurrency(entry.amount, entry.currency)}
                    </td>
                    <td className="py-3 pr-4 text-sm tabular-nums text-slate-500">
                      {formatCurrency(entry.balance_after, entry.currency)}
                    </td>
                    <td className="py-3 pr-4 text-sm text-slate-500">
                      {entry.account ? (
                        <Link to={`/accounts/${entry.account}`} className="text-indigo-600 hover:text-indigo-700">
                          {entry.account.slice(0, 8)}…
                        </Link>
                      ) : '—'}
                    </td>
                    <td className="py-3 pr-4 text-sm text-slate-500">
                      {formatDate(entry.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
