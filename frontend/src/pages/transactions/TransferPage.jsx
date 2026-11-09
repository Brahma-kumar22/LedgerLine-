/**
 * pages/transactions/TransferPage.jsx
 *
 * Premium transfer workflow — real API, idempotency key, success state.
 */

import { useCallback, useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeftRight, AlertCircle, ChevronLeft, CheckCircle2, ArrowRight } from 'lucide-react'

import { apiClient, ApiError } from '../../lib/api'
import {
  PageHeader, Card, Button, Input, Select, Spinner, ErrorState, useToast,
} from '../../components/ui'
import { formatCurrency, generateUUID } from '../../lib/utils'

const CURRENCIES = ['USD', 'EUR', 'GBP']

export default function TransferPage() {
  const navigate = useNavigate()
  const toast    = useToast()
  const [accounts, setAccounts]     = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [formData, setFormData]     = useState({
    source_account_id: '', destination_account_id: '', amount: '', currency: 'USD',
  })
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

  const srcAccount  = accounts?.find((a) => a.id === formData.source_account_id)
  const dstAccount  = accounts?.find((a) => a.id === formData.destination_account_id)

  function handleChange(e) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  function validate() {
    const errs = {}
    if (!formData.source_account_id)      errs.source_account_id      = 'Select source account'
    if (!formData.destination_account_id) errs.destination_account_id = 'Select destination account'
    if (formData.source_account_id &&
        formData.destination_account_id &&
        formData.source_account_id === formData.destination_account_id) {
      errs.destination_account_id = 'Source and destination must be different'
    }
    const amt = parseFloat(formData.amount)
    if (!formData.amount || isNaN(amt) || amt <= 0) {
      errs.amount = 'Enter a valid positive amount'
    } else if (srcAccount && amt > parseFloat(srcAccount.balance)) {
      errs.amount = `Insufficient funds (balance: ${formatCurrency(srcAccount.balance, srcAccount.currency)})`
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
      const txn = await apiClient.transactions.transfer(
        {
          source_account_id:      formData.source_account_id,
          destination_account_id: formData.destination_account_id,
          amount:   formData.amount,
          currency: formData.currency,
        },
        generateUUID()
      )
      setCompletedTxn(txn)
      toast.success(`Transfer of ${formatCurrency(txn.amount, txn.currency)} completed`)
    } catch (err) {
      if (err instanceof ApiError && err.data) {
        const fe = {}
        for (const [k, v] of Object.entries(err.data)) fe[k] = Array.isArray(v) ? v[0] : String(v)
        if (Object.keys(fe).length > 0) setFieldErrors(fe)
        else setFormError(err.message)
      } else {
        setFormError(err instanceof ApiError ? err.message : 'Transfer failed')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) return <div><PageHeader title="Transfer" /><div className="mt-10 flex items-center justify-center"><Spinner size="xl" /></div></div>
  if (error)   return <div><PageHeader title="Transfer" /><ErrorState message={error} onRetry={fetchAccounts} className="mt-8" /></div>

  if (completedTxn) {
    return (
      <div className="space-y-6">
        <PageHeader title="Transfer" />
        <Card padded className="max-w-md">
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 className="h-7 w-7 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Transfer Successful</h3>
              <p className="mt-1 text-sm text-slate-500">
                {formatCurrency(completedTxn.amount, completedTxn.currency)} transferred.
              </p>
            </div>
            <div className="w-full rounded-lg bg-slate-50 p-4 text-left">
              <p className="text-xs text-slate-400">Reference</p>
              <p className="mt-0.5 font-mono text-sm font-medium text-slate-700">{completedTxn.reference}</p>
            </div>
            <div className="flex w-full gap-3">
              <Button variant="secondary" size="sm" className="flex-1"
                onClick={() => navigate(`/accounts/${formData.source_account_id}`)}>View Account</Button>
              <Button size="sm" className="flex-1"
                onClick={() => navigate('/transactions')}>All Transactions</Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  if (!accounts || accounts.length < 1) {
    return (
      <div className="space-y-6"><PageHeader title="Transfer" />
        <Card padded className="max-w-md">
          <div className="py-4 text-center">
            <p className="text-sm text-slate-500">You need at least two active accounts to transfer.</p>
            <Link to="/accounts" className="mt-4 inline-block"><Button variant="secondary" size="sm">Go to Accounts</Button></Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div><Link to="/transactions" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"><ChevronLeft className="h-4 w-4" /> Back</Link></div>
      <PageHeader title="Transfer Funds" subtitle="Move funds between your accounts" />
      <div className="max-w-lg">
        <Card padded>
          {/* Account flow preview */}
          {srcAccount && dstAccount && (
            <div className="mb-5 flex items-center gap-2 rounded-xl bg-slate-50 p-4">
              <div className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white p-3 text-center">
                <p className="text-xs text-slate-400">From</p>
                <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">{srcAccount.name}</p>
                <p className="text-xs text-slate-500">{formatCurrency(srcAccount.balance, srcAccount.currency)}</p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-indigo-400" />
              <div className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white p-3 text-center">
                <p className="text-xs text-slate-400">To</p>
                <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">{dstAccount.name}</p>
                <p className="text-xs text-slate-500">{formatCurrency(dstAccount.balance, dstAccount.currency)}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {formError && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{formError}</span>
              </div>
            )}

            <Select label="From Account" name="source_account_id" required
              value={formData.source_account_id} onChange={handleChange}
              error={fieldErrors.source_account_id} placeholder="Source account">
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name} — {formatCurrency(a.balance, a.currency)}</option>
              ))}
            </Select>

            <Select label="To Account" name="destination_account_id" required
              value={formData.destination_account_id} onChange={handleChange}
              error={fieldErrors.destination_account_id} placeholder="Destination account">
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name} — {formatCurrency(a.balance, a.currency)}</option>
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

            {formData.source_account_id && formData.destination_account_id &&
             formData.amount && parseFloat(formData.amount) > 0 &&
             formData.source_account_id !== formData.destination_account_id && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-sm">
                <p className="text-slate-500">Transferring</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{formatCurrency(parseFloat(formData.amount), formData.currency)}</p>
                <p className="text-xs text-slate-400">{srcAccount?.name} → {dstAccount?.name}</p>
              </div>
            )}

            <Button type="submit" className="w-full" loading={isSubmitting} icon={ArrowLeftRight}>
              {isSubmitting ? 'Processing transfer…' : 'Transfer Funds'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
