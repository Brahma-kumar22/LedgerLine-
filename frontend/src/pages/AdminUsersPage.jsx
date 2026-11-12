/**
 * pages/AdminUsersPage.jsx
 *
 * User management page — accessible to ADMIN and AUDITOR.
 *
 * PERMISSION MODEL (mirrors the backend):
 *   ADMIN   — list, view detail, create any role, update role/status
 *   AUDITOR — list, view detail, create ACCOUNT_HOLDER and AUDITOR only
 *
 * The backend enforces these rules on every API call.
 * The frontend merely hides controls the user cannot use — it is NOT the
 * security boundary.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  Shield,
} from 'lucide-react'

import { useAuth } from '../context/AuthContext'
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
  useToast,
} from '../components/ui'
import { formatDate, capitalize } from '../lib/utils'

// ── Role badge colours ────────────────────────────────────────────────────────

const ROLE_BADGE = {
  ADMIN:          'danger',
  ACCOUNT_HOLDER: 'info',
  AUDITOR:        'warning',
}

// ── Create user modal ─────────────────────────────────────────────────────────

function CreateUserModal({ isOpen, onClose, onCreated, viewerRole }) {
  const toast = useToast()

  const [formData, setFormData] = useState({
    username: '', email: '', password: '', confirmPassword: '',
    first_name: '', last_name: '',
    role: viewerRole === 'ADMIN' ? 'ACCOUNT_HOLDER' : 'ACCOUNT_HOLDER',
    is_active: true,
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError,   setFormError]   = useState(null)
  const [submitting,  setSubmitting]  = useState(false)
  const [success,     setSuccess]     = useState(null)

  // Roles this viewer is permitted to assign
  const assignableRoles = viewerRole === 'ADMIN'
    ? [
        { value: 'ACCOUNT_HOLDER', label: 'Account Holder' },
        { value: 'AUDITOR',        label: 'Auditor' },
        { value: 'ADMIN',          label: 'Admin' },
      ]
    : [
        { value: 'ACCOUNT_HOLDER', label: 'Account Holder' },
        { value: 'AUDITOR',        label: 'Auditor' },
      ]

  function handleChange(e) {
    const { name, value } = e.target
    setFormData((p) => ({ ...p, [name]: value }))
    if (fieldErrors[name]) setFieldErrors((p) => ({ ...p, [name]: undefined }))
  }

  function validate() {
    const errs = {}
    if (!formData.username.trim())       errs.username = 'Required'
    else if (formData.username.length < 3) errs.username = 'At least 3 characters'
    if (!formData.email.trim())          errs.email = 'Required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = 'Invalid email'
    if (!formData.password)              errs.password = 'Required'
    else if (formData.password.length < 8) errs.password = 'At least 8 characters'
    if (formData.password !== formData.confirmPassword)
      errs.confirmPassword = 'Passwords do not match'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)
    const errs = validate()
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return }

    setSubmitting(true)
    try {
      const created = await apiClient.admin.users.create({
        username:   formData.username.trim(),
        email:      formData.email.trim(),
        password:   formData.password,
        first_name: formData.first_name.trim() || undefined,
        last_name:  formData.last_name.trim()  || undefined,
        role:       formData.role,
        is_active:  formData.is_active,
      })
      setSuccess(created)
      toast.success(`User "${created.username}" created successfully`)
      onCreated?.()
    } catch (err) {
      if (err instanceof ApiError && err.data) {
        const fe = {}
        for (const [k, v] of Object.entries(err.data)) {
          fe[k] = Array.isArray(v) ? v[0] : String(v)
        }
        if (Object.keys(fe).length > 0) setFieldErrors(fe)
        else setFormError(err.message)
      } else {
        setFormError(err instanceof ApiError ? err.message : 'Failed to create user')
      }
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose() {
    setFormData({
      username: '', email: '', password: '', confirmPassword: '',
      first_name: '', last_name: '', role: 'ACCOUNT_HOLDER', is_active: true,
    })
    setFieldErrors({})
    setFormError(null)
    setSuccess(null)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create User" size="md">
      {success ? (
        /* ── Success state ── */
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-7 w-7 text-emerald-500" />
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-900">User Created</p>
            <p className="mt-1 text-sm text-slate-500">
              <span className="font-medium">{success.username}</span> can now sign in with the password you set.
            </p>
          </div>
          <div className="w-full rounded-lg bg-slate-50 p-4 text-left">
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-400">Username</dt>
                <dd className="font-medium text-slate-700">{success.username}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Email</dt>
                <dd className="text-slate-700">{success.email}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Role</dt>
                <dd>
                  <Badge color={ROLE_BADGE[success.role] || 'neutral'} size="xs">
                    {capitalize(success.role)}
                  </Badge>
                </dd>
              </div>
            </dl>
          </div>
          <Button onClick={handleClose} className="w-full">Done</Button>
        </div>
      ) : (
        /* ── Create form ── */
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {formError && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input label="First name" name="first_name" value={formData.first_name}
              onChange={handleChange} error={fieldErrors.first_name} placeholder="Jane" />
            <Input label="Last name" name="last_name" value={formData.last_name}
              onChange={handleChange} error={fieldErrors.last_name} placeholder="Doe" />
          </div>

          <Input label="Username" name="username" required value={formData.username}
            onChange={handleChange} error={fieldErrors.username} placeholder="jane.doe" />

          <Input label="Email" name="email" type="email" required value={formData.email}
            onChange={handleChange} error={fieldErrors.email} placeholder="jane@example.com" />

          <div className="grid grid-cols-2 gap-3">
            <Input label="Password" name="password" type="password" required
              value={formData.password} onChange={handleChange}
              error={fieldErrors.password} placeholder="••••••••" hint="Min. 8 characters" />
            <Input label="Confirm password" name="confirmPassword" type="password" required
              value={formData.confirmPassword} onChange={handleChange}
              error={fieldErrors.confirmPassword} placeholder="••••••••" />
          </div>

          <Select label="Role" name="role" value={formData.role} onChange={handleChange}>
            {assignableRoles.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </Select>

          {/* Warning when ADMIN is creating another ADMIN */}
          {viewerRole === 'ADMIN' && formData.role === 'ADMIN' && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-700">
              <Shield className="mt-0.5 h-4 w-4 shrink-0" />
              <span>You are creating an ADMIN account with full system access.</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={handleClose} disabled={submitting}>Cancel</Button>
            <Button type="submit" loading={submitting} icon={UserPlus}>
              {submitting ? 'Creating…' : 'Create User'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}

// ── Update role / status modal ────────────────────────────────────────────────

function UpdateUserModal({ user, isOpen, onClose, onUpdated }) {
  const toast = useToast()
  const [formData, setFormData] = useState({
    role: user?.role || 'ACCOUNT_HOLDER',
    is_active: user?.is_active ?? true,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // Sync form data when user prop changes
  useEffect(() => {
    if (user) setFormData({ role: user.role, is_active: user.is_active })
  }, [user])

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setFormData((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await apiClient.admin.users.update(user.id, formData)
      toast.success(`User "${user.username}" updated`)
      onUpdated?.()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Update failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit — ${user.username}`} size="sm">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span>
          </div>
        )}

        <Select label="Role" name="role" value={formData.role} onChange={handleChange}>
          <option value="ACCOUNT_HOLDER">Account Holder</option>
          <option value="AUDITOR">Auditor</option>
          <option value="ADMIN">Admin</option>
        </Select>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="is_active"
            checked={formData.is_active}
            onChange={handleChange}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600"
          />
          <span className="text-sm font-medium text-slate-700">Account Active</span>
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button type="submit" loading={submitting}>Save Changes</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const { user: currentUser, isAdmin } = useAuth()
  const viewerRole = currentUser?.role

  const [users,         setUsers]         = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)
  const [page,          setPage]          = useState(1)
  const [search,        setSearch]        = useState('')
  const [roleFilter,    setRoleFilter]    = useState('')

  const [selectedUser,  setSelectedUser]  = useState(null)
  const [detailUser,    setDetailUser]    = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [showCreate,    setShowCreate]    = useState(false)
  const [editUser,      setEditUser]      = useState(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = { page }
      if (search)     params.search = search
      if (roleFilter) params.role   = roleFilter
      const res = await apiClient.admin.users.list(params)
      setUsers(res)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [page, search, roleFilter])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  async function handleRowClick(user) {
    setSelectedUser(user)
    setDetailUser(null)
    setDetailLoading(true)
    try {
      const detail = await apiClient.admin.users.get(user.id)
      setDetailUser(detail)
    } catch {
      setDetailUser(user)
    } finally {
      setDetailLoading(false)
    }
  }

  function handleSearchChange(e) { setSearch(e.target.value); setPage(1) }
  function handleRoleFilter(e)   { setRoleFilter(e.target.value); setPage(1) }

  const userList = users?.results || []
  const hasNext  = !!users?.next
  const hasPrev  = !!users?.previous || page > 1

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        subtitle="Manage users, roles and access"
        actions={
          /* ADMIN and AUDITOR can create users (role restrictions enforced by backend) */
          <Button size="sm" icon={UserPlus} onClick={() => setShowCreate(true)}>
            Create User
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-64">
          <Input
            name="search" type="text" icon={Search}
            placeholder="Search username or email…"
            value={search} onChange={handleSearchChange}
          />
        </div>
        <div className="w-44">
          <Select name="role" value={roleFilter} onChange={handleRoleFilter}>
            <option value="">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="ACCOUNT_HOLDER">Account Holder</option>
            <option value="AUDITOR">Auditor</option>
          </Select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center"><Spinner size="xl" /></div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchUsers} />
      ) : userList.length === 0 ? (
        <Card padded>
          <EmptyState
            icon={Users}
            title="No users found"
            message={search || roleFilter ? 'No users match your filters.' : 'No users yet.'}
            action={<Button size="sm" icon={UserPlus} onClick={() => setShowCreate(true)}>Create User</Button>}
          />
        </Card>
      ) : (
        <Card padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-5 pb-3 pt-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">User</th>
                  <th className="px-5 pb-3 pt-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Role</th>
                  <th className="px-5 pb-3 pt-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-5 pb-3 pt-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Accounts</th>
                  <th className="px-5 pb-3 pt-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Joined</th>
                  {isAdmin && (
                    <th className="px-5 pb-3 pt-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {userList.map((u) => (
                  <tr
                    key={u.id}
                    className="cursor-pointer transition-colors hover:bg-slate-50"
                    onClick={() => handleRowClick(u)}
                  >
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{u.username}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge color={ROLE_BADGE[u.role] || 'neutral'} size="xs">
                        {capitalize(u.role)}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge color={u.is_active ? 'success' : 'neutral'} size="xs">
                        {u.is_active ? 'Active' : 'Disabled'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-sm tabular-nums text-slate-600">
                      {u.account_count ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-500">
                      {formatDate(u.date_joined, false)}
                    </td>
                    {isAdmin && (
                      <td className="px-5 py-3.5 text-right">
                        <Button
                          variant="ghost" size="xs"
                          onClick={(e) => { e.stopPropagation(); setEditUser(u) }}
                        >
                          Edit
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(hasNext || hasPrev) && (
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
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

      {/* Detail modal (read-only) */}
      <Modal
        isOpen={!!selectedUser && !editUser}
        onClose={() => { setSelectedUser(null); setDetailUser(null) }}
        title="User Details"
        size="lg"
      >
        {detailLoading ? (
          <div className="flex justify-center py-8"><Spinner size="md" /></div>
        ) : detailUser ? (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            {[
              ['Username',    detailUser.username],
              ['Email',       detailUser.email],
              ['First Name',  detailUser.first_name || '—'],
              ['Last Name',   detailUser.last_name  || '—'],
              ['Joined',      formatDate(detailUser.date_joined)],
              ['Last Login',  detailUser.last_login ? formatDate(detailUser.last_login) : 'Never'],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
                <dd className="mt-1 text-sm text-slate-700">{value}</dd>
              </div>
            ))}
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Role</dt>
              <dd className="mt-1">
                <Badge color={ROLE_BADGE[detailUser.role] || 'neutral'} size="sm">
                  {capitalize(detailUser.role)}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Status</dt>
              <dd className="mt-1">
                <Badge color={detailUser.is_active ? 'success' : 'neutral'} size="sm">
                  {detailUser.is_active ? 'Active' : 'Disabled'}
                </Badge>
              </dd>
            </div>
          </dl>
        ) : null}
      </Modal>

      {/* Create user modal */}
      <CreateUserModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => { fetchUsers(); setShowCreate(false) }}
        viewerRole={viewerRole}
      />

      {/* Edit user modal — ADMIN only */}
      {editUser && (
        <UpdateUserModal
          user={editUser}
          isOpen={!!editUser}
          onClose={() => setEditUser(null)}
          onUpdated={() => { fetchUsers(); setEditUser(null) }}
        />
      )}
    </div>
  )
}
