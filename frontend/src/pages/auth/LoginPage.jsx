/**
 * pages/auth/LoginPage.jsx
 *
 * Premium MONVEX login page.
 * Clean two-column-inspired layout: brand panel + form.
 */

import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { LogIn, AlertCircle } from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import { Button, Input, PasswordInput, MonvexLogo } from '../../components/ui'
import { ApiError } from '../../lib/api'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()

  const [formData, setFormData]   = useState({ username: '', password: '' })
  const [errors, setErrors]       = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  const fromPath = location.state?.from?.pathname || '/dashboard'

  function handleChange(e) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  function validate() {
    const errs = {}
    if (!formData.username.trim()) errs.username = 'Username is required'
    if (!formData.password)        errs.password = 'Password is required'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)
    const fieldErrs = validate()
    if (Object.keys(fieldErrs).length > 0) { setErrors(fieldErrs); return }

    setIsSubmitting(true)
    try {
      await login(formData.username, formData.password)
      navigate(fromPath, { replace: true })
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'An unexpected error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Left brand panel — hidden on small screens */}
      <div className="hidden lg:flex lg:w-[420px] lg:flex-col lg:justify-between bg-navy-900 px-10 py-12">
        <div>
          <div className="flex items-center gap-3">
            <MonvexLogo size={36} />
            <span className="text-xl font-bold tracking-wide text-white">MONVEX</span>
          </div>
          <div className="mt-16">
            <h2 className="text-3xl font-bold leading-tight text-white">
              Move Money.<br />Maintain Trust.
            </h2>
            <p className="mt-4 text-base text-slate-400 leading-relaxed">
              A secure, auditable financial transaction system built for precision and accountability.
            </p>
          </div>

          {/* Feature list */}
          <ul className="mt-10 space-y-4">
            {[
              'Double-entry ledger accounting',
              'Idempotent transaction processing',
              'PostgreSQL-backed concurrency safety',
              'Role-based access control',
            ].map((feat) => (
              <li key={feat} className="flex items-center gap-3 text-sm text-slate-400">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                </span>
                {feat}
              </li>
            ))}
          </ul>
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
            <span className="text-sm text-slate-500">Move Money. Maintain Trust.</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
            <p className="mt-1 text-sm text-slate-500">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {formError && (
              <div
                className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                role="alert"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <Input
              label="Username"
              name="username"
              type="text"
              autoComplete="username"
              required
              autoFocus
              value={formData.username}
              onChange={handleChange}
              error={errors.username}
              placeholder="your.username"
            />

            <PasswordInput
              label="Password"
              name="password"
              autoComplete="current-password"
              required
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              placeholder="••••••••"
            />

            <Button
              type="submit"
              className="w-full"
              loading={isSubmitting}
              disabled={isSubmitting}
              icon={LogIn}
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-700">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
