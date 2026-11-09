/**
 * pages/auth/RegisterPage.jsx
 *
 * Premium MONVEX registration page.
 * Public registration always creates ACCOUNT_HOLDER — role is never sent.
 */

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import { Button, Input, PasswordInput, MonvexLogo } from '../../components/ui'
import { ApiError } from '../../lib/api'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate     = useNavigate()

  const [formData, setFormData] = useState({
    username: '', email: '', password: '', passwordConfirm: '',
    first_name: '', last_name: '',
  })
  const [errors, setErrors]         = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError]   = useState(null)
  const [success, setSuccess]       = useState(false)

  function handleChange(e) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  function validate() {
    const errs = {}
    if (!formData.username.trim())           errs.username = 'Username is required'
    else if (formData.username.length < 3)   errs.username = 'At least 3 characters'
    if (!formData.email.trim())              errs.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = 'Enter a valid email'
    if (!formData.password)                  errs.password = 'Password is required'
    else if (formData.password.length < 8)   errs.password = 'At least 8 characters'
    if (formData.password !== formData.passwordConfirm) errs.passwordConfirm = 'Passwords do not match'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)
    setErrors({})
    const fieldErrs = validate()
    if (Object.keys(fieldErrs).length > 0) { setErrors(fieldErrs); return }

    setIsSubmitting(true)
    try {
      await register({
        username:   formData.username.trim(),
        email:      formData.email.trim(),
        password:   formData.password,
        first_name: formData.first_name.trim() || undefined,
        last_name:  formData.last_name.trim()  || undefined,
      })
      setSuccess(true)
      setTimeout(() => navigate('/login', { replace: true }), 2500)
    } catch (err) {
      if (err instanceof ApiError && err.data) {
        const fieldErrs = {}
        for (const [key, messages] of Object.entries(err.data)) {
          fieldErrs[key] = Array.isArray(messages) ? messages[0] : String(messages)
        }
        if (Object.keys(fieldErrs).length > 0) setErrors(fieldErrs)
        else setFormError(err.message)
      } else {
        setFormError(err instanceof ApiError ? err.message : 'Registration failed.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="flex max-w-sm flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-7 w-7 text-emerald-500" />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-slate-900">Account created</h2>
          <p className="mt-2 text-sm text-slate-500">
            Your MONVEX account is ready. Redirecting you to sign in…
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-[420px] lg:flex-col lg:justify-between bg-navy-900 px-10 py-12">
        <div>
          <div className="flex items-center gap-3">
            <MonvexLogo size={36} />
            <span className="text-xl font-bold tracking-wide text-white">MONVEX</span>
          </div>
          <div className="mt-16">
            <h2 className="text-3xl font-bold leading-tight text-white">
              Start managing your finances with confidence.
            </h2>
            <p className="mt-4 text-base text-slate-400 leading-relaxed">
              Every transaction recorded. Every entry balanced. Every audit trail preserved.
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-600">© {new Date().getFullYear()} MONVEX. All rights reserved.</p>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 flex flex-col items-center lg:hidden">
            <MonvexLogo size={48} />
            <span className="mt-3 text-lg font-bold text-slate-900">MONVEX</span>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
            <p className="mt-1 text-sm text-slate-500">Join MONVEX as an account holder</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {formError && (
              <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Input label="First name" name="first_name" type="text" autoComplete="given-name"
                value={formData.first_name} onChange={handleChange} error={errors.first_name} placeholder="Jane" />
              <Input label="Last name" name="last_name" type="text" autoComplete="family-name"
                value={formData.last_name} onChange={handleChange} error={errors.last_name} placeholder="Doe" />
            </div>

            <Input label="Username" name="username" type="text" autoComplete="username" required
              value={formData.username} onChange={handleChange} error={errors.username} placeholder="jane.doe" />

            <Input label="Email" name="email" type="email" autoComplete="email" required
              value={formData.email} onChange={handleChange} error={errors.email} placeholder="jane@example.com" />

            <PasswordInput label="Password" name="password" autoComplete="new-password" required
              value={formData.password} onChange={handleChange} error={errors.password}
              placeholder="••••••••" hint="At least 8 characters" />

            <PasswordInput label="Confirm password" name="passwordConfirm" autoComplete="new-password" required
              value={formData.passwordConfirm} onChange={handleChange} error={errors.passwordConfirm}
              placeholder="••••••••" />

            <Button type="submit" className="w-full" loading={isSubmitting} disabled={isSubmitting} icon={UserPlus}>
              {isSubmitting ? 'Creating account…' : 'Create account'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-700">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
