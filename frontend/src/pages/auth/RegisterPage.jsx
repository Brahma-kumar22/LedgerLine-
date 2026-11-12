/**
 * pages/auth/RegisterPage.jsx
 *
 * Two-panel layout matching LoginPage exactly.
 * Authentication logic unchanged.
 */

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import { MonvexLogo } from '../../components/ui'
import { ApiError } from '../../lib/api'
import AuthBrandPanel from '../../components/auth/AuthBrandPanel'

const CURRENT_YEAR = new Date().getFullYear()

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate     = useNavigate()

  const [formData,     setFormData]     = useState({
    username: '', email: '', password: '', passwordConfirm: '',
    first_name: '', last_name: '',
  })
  const [errors,       setErrors]       = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError,    setFormError]    = useState(null)
  const [success,      setSuccess]      = useState(false)

  function handleChange(e) {
    const { name, value } = e.target
    setFormData((p) => ({ ...p, [name]: value }))
    if (errors[name]) setErrors((p) => ({ ...p, [name]: undefined }))
  }

  function validate() {
    const errs = {}
    if (!formData.username.trim())         errs.username = 'Username is required'
    else if (formData.username.length < 3) errs.username = 'At least 3 characters'
    if (!formData.email.trim())            errs.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      errs.email = 'Enter a valid email'
    if (!formData.password)                errs.password = 'Password is required'
    else if (formData.password.length < 8) errs.password = 'At least 8 characters'
    if (formData.password !== formData.passwordConfirm)
      errs.passwordConfirm = 'Passwords do not match'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)
    setErrors({})
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

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
        const fe = {}
        for (const [k, v] of Object.entries(err.data)) {
          fe[k] = Array.isArray(v) ? v[0] : String(v)
        }
        if (Object.keys(fe).length > 0) setErrors(fe)
        else setFormError(err.message)
      } else {
        setFormError(err instanceof ApiError ? err.message : 'Registration failed.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{
          background:
            'linear-gradient(135deg, #05051a 0%, #0d0540 40%, #1a0860 70%, #0a0535 100%)',
        }}
      >
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}
          >
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">Account created</h2>
          <p className="text-sm text-slate-400 max-w-xs">
            Your MONVEX account is ready. Redirecting you to sign in…
          </p>
        </div>
      </div>
    )
  }

  // ── Registration form ──────────────────────────────────────────────────────
  return (
    <div
      className="flex min-h-screen"
      style={{
        background:
          'linear-gradient(135deg, #05051a 0%, #0d0540 40%, #1a0860 70%, #0a0535 100%)',
      }}
    >
      {/* ── Left brand panel ── */}
      <AuthBrandPanel />

      {/* ── Right: form ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-8">

        {/* Mobile logo */}
        <div className="mb-7 flex flex-col items-center gap-2 lg:hidden">
          <MonvexLogo size={44} />
          <span className="text-lg font-bold tracking-widest text-white">MONVEX</span>
          <span className="text-xs text-indigo-300">Move Money. Maintain Trust.</span>
        </div>

        {/* Glass card */}
        <div
          className="w-full max-w-md rounded-2xl p-8 shadow-2xl"
          style={{
            background: 'rgba(15,10,50,0.70)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            border: '1px solid rgba(139,92,246,0.22)',
          }}
        >
          <div className="mb-6">
            <h2
              className="font-bold text-white"
              style={{ fontSize: '26px', lineHeight: 1.2 }}
            >
              Create your account
            </h2>
            <p className="mt-1.5 text-sm text-indigo-300">
              Join MONVEX as an account holder
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {formError && (
              <div
                className="flex items-start gap-2.5 rounded-lg px-4 py-3 text-sm text-red-300"
                style={{
                  background: 'rgba(220,38,38,0.15)',
                  border: '1px solid rgba(220,38,38,0.3)',
                }}
                role="alert"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <RegField label="First name" name="first_name" placeholder="Jane"
                value={formData.first_name} onChange={handleChange} error={errors.first_name} />
              <RegField label="Last name" name="last_name" placeholder="Doe"
                value={formData.last_name} onChange={handleChange} error={errors.last_name} />
            </div>

            <RegField label="Username" name="username" required autoComplete="username"
              placeholder="jane.doe" value={formData.username}
              onChange={handleChange} error={errors.username} />

            <RegField label="Email" name="email" type="email" required autoComplete="email"
              placeholder="jane@example.com" value={formData.email}
              onChange={handleChange} error={errors.email} />

            <RegField label="Password" name="password" type="password" required
              autoComplete="new-password" placeholder="••••••••"
              value={formData.password} onChange={handleChange} error={errors.password}
              hint="At least 8 characters" />

            <RegField label="Confirm password" name="passwordConfirm" type="password" required
              autoComplete="new-password" placeholder="••••••••"
              value={formData.passwordConfirm} onChange={handleChange}
              error={errors.passwordConfirm} />

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 active:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Creating account…
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Create account
                </>
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-indigo-400 hover:text-indigo-300">
              Sign in
            </Link>
          </p>
        </div>

        <p className="mt-8 text-center text-xs" style={{ color: 'rgba(139,92,246,0.35)' }}>
          © {CURRENT_YEAR} MONVEX Financial Systems
        </p>
      </div>
    </div>
  )
}

// ── Dark-theme input field ────────────────────────────────────────────────────

function RegField({ label, name, type = 'text', required, autoComplete,
                    placeholder, value, onChange, error, hint }) {
  const id = `reg-${name}`
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-300">
        {label}{required && <span className="ml-0.5 text-red-400">*</span>}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        style={{
          background: 'rgba(255,255,255,0.07)',
          border: error
            ? '1px solid rgba(248,113,113,0.6)'
            : '1px solid rgba(139,92,246,0.25)',
        }}
        className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400/40"
      />
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-xs text-indigo-300/60">{hint}</p>}
    </div>
  )
}
