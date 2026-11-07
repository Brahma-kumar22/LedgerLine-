/**
 * components/accounts/CreateAccountModal.jsx
 *
 * Modal form for creating a new bank account.
 *
 * Calls POST /api/accounts/ with {account_type, name, currency}.
 * Only ACCOUNT_HOLDER users may create accounts (enforced by the backend).
 *
 * On success:
 *   - Shows a toast notification
 *   - Calls onCreated() so the parent page can refresh its list
 *   - Closes the modal
 *
 * On error:
 *   - Displays backend validation errors inline
 *   - Prevents duplicate submissions (button shows loading state)
 */

import { useState } from 'react'
import { Wallet, AlertCircle } from 'lucide-react'

import { apiClient, ApiError } from '../../lib/api'
import { Modal, Button, Input, Select, useToast } from '../ui'

const ACCOUNT_TYPES = [
  { value: 'CHECKING', label: 'Checking' },
  { value: 'SAVINGS', label: 'Savings' },
  { value: 'WALLET', label: 'Wallet' },
]

const CURRENCIES = [
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
]

export default function CreateAccountModal({ isOpen, onClose, onCreated }) {
  const toast = useToast()
  const [formData, setFormData] = useState({
    name: '',
    account_type: 'CHECKING',
    currency: 'USD',
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  function handleChange(e) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  function resetForm() {
    setFormData({ name: '', account_type: 'CHECKING', currency: 'USD' })
    setErrors({})
    setFormError(null)
  }

  function handleClose() {
    resetForm()
    onClose()
  }

  function validate() {
    const errs = {}
    if (!formData.name.trim()) {
      errs.name = 'Account name is required'
    } else if (formData.name.trim().length > 100) {
      errs.name = 'Account name must be 100 characters or fewer'
    }
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)

    const fieldErrors = validate()
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      return
    }

    setIsSubmitting(true)
    try {
      const account = await apiClient.accounts.create({
        name: formData.name.trim(),
        account_type: formData.account_type,
        currency: formData.currency,
      })
      toast.success(`Account "${account.name}" created successfully`)
      resetForm()
      onCreated?.(account)
      onClose()
    } catch (err) {
      if (err instanceof ApiError && err.data) {
        // Backend field-level errors
        const fieldErrs = {}
        for (const [key, messages] of Object.entries(err.data)) {
          if (Array.isArray(messages) && messages.length > 0) {
            fieldErrs[key] = messages[0]
          } else if (typeof messages === 'string') {
            fieldErrs[key] = messages
          }
        }
        if (Object.keys(fieldErrs).length > 0) {
          setErrors(fieldErrs)
        } else {
          setFormError(err.message)
        }
      } else {
        setFormError(err instanceof ApiError ? err.message : 'Failed to create account')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New Account" size="md">
      <form onSubmit={handleSubmit} noValidate>
        {formError && (
          <div
            className="mb-4 flex items-start gap-2 rounded-md bg-red-50 px-3 py-2.5 text-sm text-red-700"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <div className="space-y-4">
          <Input
            label="Account Name"
            name="name"
            type="text"
            required
            value={formData.name}
            onChange={handleChange}
            error={errors.name}
            placeholder="My Savings"
            autoFocus
          />

          <Select
            label="Account Type"
            name="account_type"
            value={formData.account_type}
            onChange={handleChange}
          >
            {ACCOUNT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>

          <Select
            label="Currency"
            name="currency"
            value={formData.currency}
            onChange={handleChange}
          >
            {CURRENCIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting} icon={Wallet}>
            {isSubmitting ? 'Creating…' : 'Create Account'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
