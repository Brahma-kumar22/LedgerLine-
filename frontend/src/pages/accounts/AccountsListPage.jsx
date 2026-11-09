/**
 * pages/accounts/AccountsListPage.jsx
 *
 * Premium account cards with real API data.
 */

import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Wallet, Plus, ChevronRight, CreditCard, PiggyBank } from 'lucide-react'

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
import { formatCurrency, capitalize, cn } from '../../lib/utils'
import CreateAccountModal from '../../components/accounts/CreateAccountModal'

const TYPE_ICON = {
  CHECKING: CreditCard,
  SAVINGS:  PiggyBank,
  WALLET:   Wallet,
}

const TYPE_COLORS = {
  CHECKING: 'bg-indigo-50 text-indigo-600',
  SAVINGS:  'bg-emerald-50 text-emerald-600',
  WALLET:   'bg-amber-50 text-amber-600',
}

export default function AccountsListPage() {
  const { isAccountHolder } = useAuth()
  const [accounts, setAccounts]       = useState(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const fetchAccounts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.accounts.list({ page: 1 })
      setAccounts(res.results ?? res)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load accounts')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAccounts() }, [fetchAccounts])

  const customerAccounts = (accounts || []).filter((a) => !a.is_system_account)

  if (loading) {
    return (
      <div>
        <PageHeader title="Accounts" />
        <div className="mt-10 flex items-center justify-center"><Spinner size="xl" /></div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Accounts" />
        <ErrorState message={error} onRetry={fetchAccounts} className="mt-8" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts"
        subtitle={customerAccounts.length > 0
          ? `${customerAccounts.length} account${customerAccounts.length !== 1 ? 's' : ''}`
          : undefined}
        actions={
          isAccountHolder && (
            <Button size="sm" icon={Plus} onClick={() => setShowCreateModal(true)}>
              New Account
            </Button>
          )
        }
      />

      {customerAccounts.length === 0 ? (
        <Card padded>
          <EmptyState
            icon={Wallet}
            title="No accounts yet"
            message="Create your first account to start making deposits, withdrawals, and transfers."
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {customerAccounts.map((account) => {
            const Icon   = TYPE_ICON[account.account_type] || Wallet
            const colors = TYPE_COLORS[account.account_type] || 'bg-slate-100 text-slate-600'
            return (
              <Link key={account.id} to={`/accounts/${account.id}`} className="group block">
                <Card
                  padded={false}
                  className="overflow-hidden transition-all duration-150 hover:border-indigo-200 hover:shadow-md"
                >
                  {/* Top accent line */}
                  <div className={cn(
                    'h-1',
                    account.is_active ? 'bg-gradient-to-r from-indigo-500 to-violet-500' : 'bg-slate-200'
                  )} />

                  <div className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', colors)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <Badge color={account.is_active ? 'success' : 'neutral'} size="xs">
                        {account.is_active ? 'Active' : 'Closed'}
                      </Badge>
                    </div>

                    {/* Name & type */}
                    <div className="mt-4">
                      <p className="font-semibold text-slate-900 group-hover:text-indigo-700">
                        {account.name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {capitalize(account.account_type)} · {account.currency}
                      </p>
                    </div>

                    {/* Balance */}
                    <div className="mt-4 flex items-end justify-between">
                      <div>
                        <p className="text-xs text-slate-400">Balance</p>
                        <p className="mt-0.5 text-xl font-bold tabular-nums text-slate-900">
                          {formatCurrency(account.balance, account.currency)}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                    </div>

                    {/* Account number */}
                    <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-400">
                      {account.account_number}
                    </p>
                  </div>
                </Card>
              </Link>
            )
          })}
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
