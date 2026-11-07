/**
 * pages/accounts/AccountsListPage.jsx
 *
 * Lists accounts visible to the current user with a working "New Account"
 * modal that calls POST /api/accounts/ and refreshes the list on success.
 */

import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Wallet, Plus } from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import { apiClient, ApiError } from '../../lib/api'
import {
  PageHeader,
  Card,
  Button,
  Badge,
  Spinner,
  ErrorState,
  EmptyState,
} from '../../components/ui'
import { formatCurrency, capitalize } from '../../lib/utils'
import CreateAccountModal from '../../components/accounts/CreateAccountModal'

export default function AccountsListPage() {
  const { isAccountHolder } = useAuth()
  const [accounts, setAccounts] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const fetchAccounts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.accounts.list({ page: 1 })
      setAccounts(res.results || res)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load accounts')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  if (loading) {
    return (
      <div>
        <PageHeader title="Accounts" />
        <div className="mt-6 flex min-h-[300px] items-center justify-center">
          <Spinner size="xl" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Accounts" />
        <ErrorState message={error} onRetry={fetchAccounts} className="mt-6" />
      </div>
    )
  }

  const accountList = accounts || []
  const customerAccounts = accountList.filter((a) => !a.is_system_account)

  return (
    <div>
      <PageHeader
        title="Accounts"
        subtitle={customerAccounts.length > 0 ? `${customerAccounts.length} account${customerAccounts.length === 1 ? '' : 's'}` : undefined}
        actions={
          isAccountHolder && (
            <Button size="sm" icon={Plus} onClick={() => setShowCreateModal(true)}>
              New Account
            </Button>
          )
        }
      />

      {customerAccounts.length === 0 ? (
        <Card padded className="mt-6">
          <EmptyState
            icon={Wallet}
            title="No accounts yet"
            message="Create your first account to start using MONVEX."
            action={
              isAccountHolder && (
                <Button size="sm" icon={Plus} onClick={() => setShowCreateModal(true)}>
                  Create Account
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {customerAccounts.map((account) => (
            <Link key={account.id} to={`/accounts/${account.id}`} className="block">
              <Card padded className="transition-all hover:border-indigo-300 hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50">
                      <Wallet className="h-4 w-4 text-indigo-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{account.name}</p>
                      <p className="text-xs text-slate-400">{capitalize(account.account_type)}</p>
                    </div>
                  </div>
                  <Badge color={account.is_active ? 'success' : 'neutral'} size="xs">
                    {account.is_active ? 'Active' : 'Closed'}
                  </Badge>
                </div>
                <p className="mt-4 text-2xl font-semibold tabular-nums text-slate-900">
                  {formatCurrency(account.balance, account.currency)}
                </p>
                <p className="mt-1 text-xs text-slate-400">{account.account_number}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <CreateAccountModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => fetchAccounts()}
      />
    </div>
  )
}
