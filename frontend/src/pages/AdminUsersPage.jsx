/**
 * pages/AdminUsersPage.jsx
 *
 * Admin user management page.
 *
 * Features:
 *   - Paginated user list with search
 *   - Filter by role
 *   - User detail modal
 *   - ADMIN only (enforced by RoleRoute + backend)
 */

import { useCallback, useEffect, useState } from 'react'
import { Users, Search, ChevronLeft, ChevronRight } from 'lucide-react'

import { apiClient, ApiError } from '../lib/api'
import {
  PageHeader,
  Card,
  Badge,
  Button,
  Input,
  Select,
  Spinner,
  ErrorState,
  EmptyState,
  Modal,
} from '../components/ui'
import { formatDate, capitalize } from '../lib/utils'

const ROLE_COLORS = {
  ADMIN: 'danger',
  ACCOUNT_HOLDER: 'info',
  AUDITOR: 'warning',
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [userDetail, setUserDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = { page }
      if (search) params.search = search
      if (roleFilter) params.role = roleFilter
      const res = await apiClient.admin.users.list(params)
      setUsers(res)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [page, search, roleFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleRowClick(user) {
    setSelectedUser(user)
    setUserDetail(null)
    setDetailLoading(true)
    try {
      const detail = await apiClient.admin.users.get(user.id)
      setUserDetail(detail)
    } catch {
      // Use the list data as fallback
      setUserDetail(user)
    } finally {
      setDetailLoading(false)
    }
  }

  function handleSearchChange(e) {
    setSearch(e.target.value)
    setPage(1)
  }

  function handleRoleFilterChange(e) {
    setRoleFilter(e.target.value)
    setPage(1)
  }

  const userList = users?.results || []
  const hasNext = users?.next
  const hasPrev = users?.previous || page > 1

  return (
    <div>
      <PageHeader title="User Management" subtitle="Manage users, roles, and access" />

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="w-64">
          <Input
            name="search"
            type="text"
            icon={Search}
            placeholder="Search by username or email…"
            value={search}
            onChange={handleSearchChange}
          />
        </div>
        <div className="w-48">
          <Select name="role" value={roleFilter} onChange={handleRoleFilterChange}>
            <option value="">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="ACCOUNT_HOLDER">Account Holder</option>
            <option value="AUDITOR">Auditor</option>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 flex min-h-[300px] items-center justify-center">
          <Spinner size="xl" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchData} className="mt-6" />
      ) : userList.length === 0 ? (
        <Card padded className="mt-6">
          <EmptyState
            icon={Users}
            title="No users found"
            message={search || roleFilter ? 'No users match your filters.' : 'No users have registered yet.'}
          />
        </Card>
      ) : (
        <Card padded className="mt-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="pb-3 pr-4">Username</th>
                  <th className="pb-3 pr-4">Email</th>
                  <th className="pb-3 pr-4">Role</th>
                  <th className="pb-3 pr-4">Accounts</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {userList.map((user) => (
                  <tr
                    key={user.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => handleRowClick(user)}
                  >
                    <td className="py-3 pr-4 text-sm font-medium text-slate-700">
                      {user.username}
                    </td>
                    <td className="py-3 pr-4 text-sm text-slate-500">
                      {user.email}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge color={ROLE_COLORS[user.role] || 'neutral'} size="xs">
                        {capitalize(user.role)}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-sm tabular-nums text-slate-700">
                      {user.account_count ?? '—'}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge color={user.is_active ? 'success' : 'neutral'} size="xs">
                        {user.is_active ? 'Active' : 'Disabled'}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-sm text-slate-500">
                      {formatDate(user.date_joined, false)}
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

      {/* User detail modal */}
      <Modal
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        title="User Details"
        size="lg"
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="md" />
          </div>
        ) : userDetail ? (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">Username</dt>
              <dd className="mt-1 text-sm text-slate-700">{userDetail.username}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">Email</dt>
              <dd className="mt-1 text-sm text-slate-700">{userDetail.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">Role</dt>
              <dd className="mt-1">
                <Badge color={ROLE_COLORS[userDetail.role] || 'neutral'} size="sm">
                  {capitalize(userDetail.role)}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">Status</dt>
              <dd className="mt-1">
                <Badge color={userDetail.is_active ? 'success' : 'neutral'} size="sm">
                  {userDetail.is_active ? 'Active' : 'Disabled'}
                </Badge>
              </dd>
            </div>
            {userDetail.full_name && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">Full Name</dt>
                <dd className="mt-1 text-sm text-slate-700">{userDetail.full_name}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">Date Joined</dt>
              <dd className="mt-1 text-sm text-slate-700">{formatDate(userDetail.date_joined)}</dd>
            </div>
            {userDetail.last_login && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">Last Login</dt>
                <dd className="mt-1 text-sm text-slate-700">{formatDate(userDetail.last_login)}</dd>
              </div>
            )}
          </dl>
        ) : null}
      </Modal>
    </div>
  )
}
