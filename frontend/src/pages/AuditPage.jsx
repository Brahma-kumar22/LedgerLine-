/**
 * pages/AuditPage.jsx
 *
 * Audit log dashboard with real backend data from GET /api/audit/.
 *
 * Features:
 *   - Paginated audit log table
 *   - Filter by event_type
 *   - Event detail modal
 *   - ADMIN and AUDITOR only (enforced by RoleRoute + backend)
 */

import { useCallback, useEffect, useState } from 'react'
import { ScrollText, ChevronLeft, ChevronRight } from 'lucide-react'

import { apiClient, ApiError } from '../lib/api'
import {
  PageHeader,
  Card,
  Badge,
  Button,
  Spinner,
  ErrorState,
  EmptyState,
  Select,
  Modal,
} from '../components/ui'
import { formatDate } from '../lib/utils'

// Event type options for the filter dropdown
const EVENT_TYPES = [
  { value: '', label: 'All Events' },
  { value: 'USER_REGISTERED', label: 'User Registered' },
  { value: 'ACCOUNT_CREATED', label: 'Account Created' },
  { value: 'TRANSACTION_CREATED', label: 'Transaction Created' },
  { value: 'TRANSACTION_COMPLETED', label: 'Transaction Completed' },
  { value: 'TRANSACTION_FAILED', label: 'Transaction Failed' },
  { value: 'LEDGER_ENTRY_WRITTEN', label: 'Ledger Entry Written' },
  { value: 'LEDGER_INTEGRITY_VIOLATION', label: 'Ledger Integrity Violation' },
  { value: 'ACCESS_DENIED', label: 'Access Denied' },
  { value: 'BOOTSTRAP_ADMIN_CREATED', label: 'Bootstrap Admin Created' },
]

export default function AuditPage() {
  const [auditLogs, setAuditLogs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [eventTypeFilter, setEventTypeFilter] = useState('')
  const [selectedLog, setSelectedLog] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = { page }
      if (eventTypeFilter) params.event_type = eventTypeFilter
      const res = await apiClient.audit.list(params)
      setAuditLogs(res)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load audit log')
    } finally {
      setLoading(false)
    }
  }, [page, eventTypeFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function handleFilterChange(e) {
    setEventTypeFilter(e.target.value)
    setPage(1) // Reset to page 1 when filter changes
  }

  const logs = auditLogs?.results || []
  const hasNext = auditLogs?.next
  const hasPrev = auditLogs?.previous || page > 1

  return (
    <div>
      <PageHeader
        title="Audit Log"
        subtitle="System audit trail and compliance records"
        actions={
          <Select
            name="event_type"
            value={eventTypeFilter}
            onChange={handleFilterChange}
            className="w-auto"
          >
            {EVENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </Select>
        }
      />

      {loading ? (
        <div className="mt-6 flex min-h-[300px] items-center justify-center">
          <Spinner size="xl" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchData} className="mt-6" />
      ) : logs.length === 0 ? (
        <Card padded className="mt-6">
          <EmptyState
            icon={ScrollText}
            title="No audit records"
            message="Audit log entries will appear here as system events occur."
          />
        </Card>
      ) : (
        <Card padded className="mt-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="pb-3 pr-4">Event</th>
                  <th className="pb-3 pr-4">Actor</th>
                  <th className="pb-3 pr-4">Resource</th>
                  <th className="pb-3 pr-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="py-3 pr-4">
                      <Badge
                        color={log.event_type.includes('VIOLATION') || log.event_type.includes('DENIED') || log.event_type.includes('FAILED') ? 'danger' : log.event_type.includes('COMPLETED') || log.event_type.includes('SUCCESS') ? 'success' : 'neutral'}
                        size="xs"
                      >
                        {log.event_type.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-sm text-slate-600">
                      {log.actor_username || 'system'}
                    </td>
                    <td className="py-3 pr-4 text-sm text-slate-500">
                      {log.resource_type ? `${log.resource_type}` : '—'}
                      {log.resource_id && (
                        <span className="text-xs text-slate-400"> ({log.resource_id.slice(0, 8)}…)</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-sm text-slate-500">
                      {formatDate(log.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(hasNext || hasPrev) && (
            <div className="mt-4 flex items-center justify-between">
              <Button variant="secondary" size="sm" disabled={!hasPrev}
                onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <span className="text-sm text-slate-500">Page {page}</span>
              <Button variant="secondary" size="sm" disabled={!hasNext}
                onClick={() => setPage((p) => p + 1)}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Detail modal */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Audit Record"
        size="lg"
      >
        {selectedLog && (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">Event Type</dt>
              <dd className="mt-1">
                <Badge color="neutral" size="sm">{selectedLog.event_type.replace(/_/g, ' ')}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">Actor</dt>
              <dd className="mt-1 text-sm text-slate-700">{selectedLog.actor_username || 'system'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">Resource Type</dt>
              <dd className="mt-1 text-sm text-slate-700">{selectedLog.resource_type || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">Resource ID</dt>
              <dd className="mt-1 text-sm text-slate-700">{selectedLog.resource_id || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">IP Address</dt>
              <dd className="mt-1 text-sm text-slate-700">{selectedLog.ip_address || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">Timestamp</dt>
              <dd className="mt-1 text-sm text-slate-700">{formatDate(selectedLog.created_at)}</dd>
            </div>
            {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
              <div className="col-span-full">
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">Metadata</dt>
                <dd className="mt-1">
                  <pre className="overflow-x-auto rounded-md bg-slate-50 p-3 text-xs text-slate-600">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </dd>
              </div>
            )}
          </dl>
        )}
      </Modal>
    </div>
  )
}
