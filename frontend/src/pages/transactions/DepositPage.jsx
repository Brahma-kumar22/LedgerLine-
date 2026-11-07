/**
 * pages/transactions/DepositPage.jsx
 *
 * Deposit form that calls POST /api/transactions/deposit/ with an
 * auto-generated Idempotency-Key header.
 *
 * Flow:
 *   1. User selects one of their accounts and enters an amount.
 *   2. Frontend validates (positive amount, account selected).
 *   3. A fresh UUID is generated as the idempotency key for this submission.
 *   4. apiClient.transactions.deposit() sends the request.
 *   5. On success: toast notification, redirect to the account detail page.
 *   6. On error: inline error display (insufficient auth, invalid amount, etc.)
 */

import { useCallback, useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowDownLeft, AlertCircle, ChevronLeft } from 'lucide-react'

import { apiClient, ApiError } from '../../lib/api'
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
  Spinner,
  ErrorState,
  useToast,
} from '../../components/ui'
import { formatCurrency, generateUUID } from '../../lib/utils'

export default function DepositPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [accounts, setAccounts] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formData, setFormData] = useState({ account_id: '', amount: '', currency: 'USD' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchAccounts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiClient.accounts.list({ page: 1 })
      const allAccounts = res.results || res
      setAccounts(allAccounts.filter((a) => !a.is_system_account && a.is_active))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load accounts')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  function handleChange(e) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  function validate() {
    const errs = {}
    if (!formData.account_id) errs.account_id = 'Select an account'
    const amt = parseFloat(formData.amount)
    if (!formData.amount || isNaN(amt) || amt <= 0) {
      errs.amount = 'Enter a positive amount'
    }
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      return
    }

    setIsSubmitting(true)
    const idemKey = generateUUID()
    try {
      const txn = await apiClient.transactions.deposit(
        {
          account_id: formData.account_id,
          amount: formData.amount,
          currency: formData.currency,
        },
        idemKey
      )
      toast.success(`Deposit of ${formatCurrency(txn.amount, txn.currency)} completed — ${txn.reference}`)
      navigate(`/accounts/${formData.account_id}`)
    } catch (err) {
      if (err instanceof ApiError && err.data) {
        const fe = {}
        for (const [k, v] of Object.entries(err.data)) {
          fe[k] = Array.isArray(v) ? v[0] : v
        }
        if (Object.keys(fe).length > 0) {
          setFieldErrors(fe)
        } else {
          setFormError(err.message)
        }
      } else {
        setFormError(err instanceof ApiError ? err.message : 'Deposit failed')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Deposit" />
        <div className="mt-6 flex min-h-[300px] items-center justify-center">
          <Spinner size="xl" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Deposit" />
        <ErrorState message={error} onRetry={fetchAccounts} className="mt-6" />
      </div>
    )
  }

  if (!accounts || accounts.length === 0) {
    return (
      <div>
        <PageHeader title="Deposit" />
        <Card padded className="mt-6">
          <div className="py-8 text-center">
            <ArrowDownLeft className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-700">No active accounts available</p>
            <p className="mt-1 text-sm text-slate-500">Create an account first to make a deposit.</p>
            <Link to="/accounts" className="mt-4 inline-block">
              <Button variant="secondary" size="sm">Go to Accounts</Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <Link to="/transactions" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ChevronLeft className="h-4 w-4" /> Back to transactions
      </Link>

      <PageHeader title="Deposit" subtitle="Add funds to one of your accounts" />

      <Card padded className="mt-6 max-w-md">
        <form onSubmit={handleSubmit} noValidate>
          {formError && (
            <div className="mb-4 flex items-start gap-2 rounded-md bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-4">
            <Select
              label="Destination Account"
              name="account_id"
              value={formData.account_id}
              onChange={handleChange}
              error={fieldErrors.account_id}
              placeholder="Select an account"
              required
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} — {formatCurrency(a.balance, a.currency)} ({a.account_number})
                </option>
              ))}
            </Select>

            <Input
              label="Amount"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={formData.amount}
              onChange={handleChange}
              error={fieldErrors.amount}
              placeholder="100.00"
            />

            <Select
              label="Currency"
              name="currency"
              value={formData.currency}
              onChange={handleChange}
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </Select>
          </div>

          <Button type="submit" className="mt-6 w-full" loading={isSubmitting} icon={ArrowDownLeft}>
            {isSubmitting ? 'Processing…' : 'Deposit Funds'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
