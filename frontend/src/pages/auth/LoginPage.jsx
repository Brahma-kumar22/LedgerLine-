/**
 * pages/auth/LoginPage.jsx
 *
 * Two-panel layout:
 *   Left  — AuthBrandPanel (premium fintech brand presentation)
 *   Right — Glass login card over the dark gradient background
 */

import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { LogIn, AlertCircle } from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import { MonvexLogo } from '../../components/ui'
import { ApiError } from '../../lib/api'
import AuthBrandPanel from '../../components/auth/AuthBrandPanel'

const CURRENT_YEAR = new Date().getFullYear()

export default function LoginPage() {
  const { login }  = useAuth()
  const navigate   = useNavigate()
  const location   = useLocation()

  const [formData,     setFormData]     = useState({ username: '', password: '' })
  const [errors,       setErrors]       = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError,    setFormError]    = useState(null)

  const fromPath = location.state?.from?.pathname || '/dashboard'

  function handleChange(e) {
    const { name, value } = e.target
    setFormData((p) => ({ ...p, [name]: value }))
    if (errors[name]) setErrors((p) => ({ ...p, [name]: undefined }))
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
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

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
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-10">

        {/* Mobile logo — hidden on lg+ (brand panel covers it) */}
        <div className="mb-8 flex flex-col items-center gap-2 lg:hidden">
          <MonvexLogo size={48} />
          <span className="text-lg font-bold tracking-widest text-white">MONVEX</span>
          <span className="text-xs text-indigo-300">Move Money. Maintain Trust.</span>
        </div>

        {/* Glass card */}
        <div
          className="w-full max-w-sm rounded-2xl p-8 shadow-2xl"
          style={{
            background: 'rgba(15,10,50,0.70)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            border: '1px solid rgba(139,92,246,0.22)',
          }}
        >
          <div className="mb-7">
            <h2
              className="font-bold"
              style={{ fontSize: '26px', lineHeight: 1.2, color: '#ffffff' }}
            >
              Welcome back
            </h2>
            <p className="mt-1.5 text-sm" style={{ color: '#c4b5fd' }}>
              Sign in to your MONVEX account
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
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

            <DarkField
              label="Username"
              id="login-username"
              name="username"
              type="text"
              autoComplete="username"
              autoFocus
              required
              placeholder="your.username"
              value={formData.username}
              onChange={handleChange}
              error={errors.username}
            />

            <DarkField
              label="Password"
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 active:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Signing in…
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Sign in
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-indigo-400 hover:text-indigo-300">
              Create one
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

// ── Reusable dark-theme input ─────────────────────────────────────────────────

function DarkField({ label, id, error, ...inputProps }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-300">
        {label}
      </label>
      <input
        id={id}
        style={{
          background: 'rgba(255,255,255,0.07)',
          border: error
            ? '1px solid rgba(248,113,113,0.6)'
            : '1px solid rgba(139,92,246,0.25)',
        }}
        className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400/40"
        {...inputProps}
      />
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  )
}
