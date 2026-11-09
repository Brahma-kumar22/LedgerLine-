/**
 * pages/transactions/WithdrawPage.jsx
 *
 * Premium withdrawal workflow — real API, idempotency key, success state.
 */

import { useCallback, useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowUpRight, AlertCircle, ChevronLeft, CheckCircle2, CreditCard } from 'lucide-react'

import { apiClient, ApiError } from '../../lib/api'
import {
  PageHeader, Card, Button, Input, Select, Spinner, ErrorState, useToast,
} from '../../components/ui'
import { formatCurrency, generateUUID } from '../../lib/utils'

const CURRENCIES = ['USD', 'EUR', 'GBP']

export default function WithdrawPage() {
  const navigate = useNavigate()
  const toast    = useToast()
  const [accounts, setAccounts]     = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [formData, setFormData]     = useState({ account_id: '', amount: '', currency: 'USD' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError]   = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [completedTxn, setCompletedTxn] = useState(null)

  const fetchAccounts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiClient.accounts.list({ page: 1 })
      setAccounts((res.results ?? res).filter((a) => !a.is_system_account && a.is_active))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load accounts')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAccounts() }, [fetchAccounts])

  const selectedAccount = accounts?.find((a) => a.id === formData.account_id)

  function handleChange(e) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  function validate() {
    const errs = {}
    if (!formData.account_id) errs.account_id = 'Select a source account'
    const amt = parseFloat(formData.amount)
    if (!formData.amount || isNaN(amt) || amt <= 0) {
      errs.amount = 'Enter a valid positive amount'
    } else if (selectedAccount && amt > parseFloat(selectedAccount.balance)) {
      errs.amount = `Insufficient funds (balance: ${formatCurrency(selectedAccount.balance, selectedAccount.currency)})`
    }
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)
    const errs = validate()
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return }

    setIsSubmitting(true)
    try {
      const txn = await apiClient.transactions.withdraw(
        { account_id: formData.account_id, amount: formData.amount, currency: formData.currency },
        generateUUID()
      )
      setCompletedTxn(txn)
      toast.success(`Withdrawal of ${formatCurrency(txn.amount, txn.currency)} completed`)
    } catch (err) {
      if (err instanceof ApiError && err.data) {
        const fe = {}
        for (const [k, v] of Object.entries(err.data)) fe[k] = Array.isArray(v) ? v[0] : String(v)
        if (Object.keys(fe).length > 0) setFieldErrors(fe)
        else setFormError(err.message)
      } else {
        setFormError(err instanceof ApiError ? err.message : 'Withdrawal failed')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) return <div><PageHeader title="Withdraw" /><div className="mt-10 flex items-center justify-center"><Spinner size="xl" /></div></div>
  if (error)   return <div><PageHeader title="Withdraw" /><ErrorState message={error} onRetry={fetchAccounts} className="mt-8" /></div>

  if (completedTxn) {
    return (
      <div className="space-y-6">
        <PageHeader title="Withdraw" />
        <Card padded className="max-w-md">
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 className="h-7 w-7 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Withdrawal Successful</h3>
              <p className="mt-1 text-sm text-slate-500">
                {formatCurrency(completedTxn.amount, completedTxn.currency)} has been withdrawn.
              </p>
            </div>
            <div className="w-full rounded-lg bg-slate-50 p-4 text-left">
              <p className="text-xs text-slate-400">Reference</p>
              <p className="mt-0.5 font-mono text-sm font-medium text-slate-700">{completedTxn.reference}</p>
            </div>
            <div className="flex w-full gap-3">
              <Button variant="secondary" size="sm" className="flex-1"
                onClick={() => navigate(`/accounts/${formData.account_id}`)}>View Account</Button>
              <Button size="sm" className="flex-1"
                onClick={() => navigate('/transactions')}>All Transactions</Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  if (!accounts || accounts.length === 0) {
    return (
      <div className="space-y-6"><PageHeader title="Withdraw" />
        <Card padded className="max-w-md">
          <div className="py-4 text-center">
            <p className="text-sm text-slate-500">No active accounts available.</p>
            <Link to="/accounts" className="mt-4 inline-block"><Button variant="secondary" size="sm">Go to Accounts</Button></Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div><Link to="/transactions" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"><ChevronLeft className="h-4 w-4" /> Back</Link></div>
      <PageHeader title="Withdraw Funds" subtitle="Move funds from one of your accounts" />
      <div className="max-w-lg">
        <Card padded>
          {selectedAccount && (
            <div className="mb-5 flex items-center gap-3 rounded-xl bg-amber-50 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                <CreditCard className="h-4.5 w-4.5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-amber-700">Available Balance — {selectedAccount.name}</p>
                <p className="text-lg font-bold tabular-nums text-amber-800">
                  {formatCurrency(selectedAccount.balance, selectedAccount.currency)}
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {formError && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{formError}</span>
              </div>
            )}

            <Select label="Source Account" name="account_id" required
              value={formData.account_id} onChange={handleChange}
              error={fieldErrors.account_id} placeholder="Choose an account">
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} — {formatCurrency(a.balance, a.currency)} ({a.account_number})
                </option>
              ))}
            </Select>

            <div className="grid grid-cols-2 gap-3">
              <Input label="Amount" name="amount" type="number" step="0.01" min="0.01" required
                value={formData.amount} onChange={handleChange}
                error={fieldErrors.amount} placeholder="0.00" />
              <Select label="Currency" name="currency" value={formData.currency} onChange={handleChange}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>

            {formData.account_id && formData.amount && parseFloat(formData.amount) > 0 && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-sm">
                <p className="text-slate-500">You are withdrawing</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{formatCurrency(parseFloat(formData.amount), formData.currency)}</p>
                <p className="text-xs text-slate-400">from {selectedAccount?.name} · {selectedAccount?.account_number}</p>
              </div>
            )}

            <Button type="submit" className="w-full" loading={isSubmitting} icon={ArrowUpRight}>
              {isSubmitting ? 'Processing withdrawal…' : 'Withdraw Funds'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
