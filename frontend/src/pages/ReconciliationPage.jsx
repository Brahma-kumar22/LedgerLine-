/**
 * pages/ReconciliationPage.jsx
 *
 * Reconciliation report from GET /api/reconciliation/.
 *
 * Shows:
 *   - Overall status (pass/fail)
 *   - Balance discrepancies (cached vs ledger-derived)
 *   - Double-entry violations (debit != credit)
 *   - Orphan transactions (completed with no ledger entries)
 *
 * Read-only — never modifies financial data.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'

import { apiClient, ApiError } from '../lib/api'
import {
  PageHeader,
  Card,
  Button,
  Spinner,
  ErrorState,
} from '../components/ui'
import { formatCurrency } from '../lib/utils'

export default function ReconciliationPage() {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchReport = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.reconciliation.run()
      setReport(res)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to run reconciliation')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  if (loading) {
    return (
      <div>
        <PageHeader title="Reconciliation" subtitle="Ledger integrity verification" />
        <div className="mt-6 flex min-h-[300px] items-center justify-center">
          <Spinner size="xl" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Reconciliation" subtitle="Ledger integrity verification" />
        <ErrorState message={error} onRetry={fetchReport} className="mt-6" />
      </div>
    )
  }

  const allClear = !report?.has_discrepancies

  return (
    <div>
      <PageHeader
        title="Reconciliation"
        subtitle="Ledger integrity verification"
        actions={
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={fetchReport}>
            Re-run
          </Button>
        }
      />

      {/* Status banner */}
      <Card padded className="mt-6">
        {allClear ? (
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900">All checks passed</p>
              <p className="text-sm text-slate-500">
                No discrepancies found. Account balances match ledger entries and all transactions are balanced.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900">Discrepancies detected</p>
              <p className="text-sm text-slate-500">
                Review the issues below. Corrections require explicit, authorized reversal transactions.
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Balance discrepancies */}
      {report?.balance_discrepancies?.length > 0 && (
        <Card padded className="mt-6">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">
            Balance Discrepancies ({report.balance_discrepancies.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="pb-3 pr-4">Account</th>
                  <th className="pb-3 pr-4">Cached Balance</th>
                  <th className="pb-3 pr-4">Ledger-Derived</th>
                  <th className="pb-3 pr-4">Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.balance_discrepancies.map((d) => (
                  <tr key={d.account_id} className="hover:bg-slate-50">
                    <td className="py-3 pr-4 text-sm font-medium text-slate-700">
                      {d.account_number}
                    </td>
                    <td className="py-3 pr-4 text-sm tabular-nums text-slate-700">
                      {formatCurrency(d.cached_balance)}
                    </td>
                    <td className="py-3 pr-4 text-sm tabular-nums text-slate-700">
                      {formatCurrency(d.ledger_balance)}
                    </td>
                    <td className="py-3 pr-4 text-sm tabular-nums">
                      <span className="font-medium text-red-600">{formatCurrency(d.delta)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Double-entry violations */}
      {report?.double_entry_violations?.length > 0 && (
        <Card padded className="mt-6">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">
            Double-Entry Violations ({report.double_entry_violations.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="pb-3 pr-4">Reference</th>
                  <th className="pb-3 pr-4">Debit Total</th>
                  <th className="pb-3 pr-4">Credit Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.double_entry_violations.map((v) => (
                  <tr key={v.transaction_id} className="hover:bg-slate-50">
                    <td className="py-3 pr-4 text-sm font-medium text-slate-700">
                      {v.reference}
                    </td>
                    <td className="py-3 pr-4 text-sm tabular-nums text-slate-700">
                      {formatCurrency(v.debit_total)}
                    </td>
                    <td className="py-3 pr-4 text-sm tabular-nums text-slate-700">
                      {formatCurrency(v.credit_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Orphan transactions */}
      {report?.orphan_transactions?.length > 0 && (
        <Card padded className="mt-6">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">
            Orphan Transactions ({report.orphan_transactions.length})
          </h3>
          <ul className="space-y-2">
            {report.orphan_transactions.map((ref) => (
              <li key={ref} className="flex items-center gap-2 text-sm text-slate-600">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                {ref}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
