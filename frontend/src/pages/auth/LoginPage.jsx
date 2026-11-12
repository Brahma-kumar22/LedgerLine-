/**
 * pages/auth/LoginPage.jsx
 *
 * MONVEX login page — full-page background image + centered glass form card.
 *
 * Background: /monvex-login-bg.png (served from frontend/public/)
 *   - cover + center so the image fills every viewport without distortion
 *   - Works on Vercel because Vite copies public/ to dist/ as-is
 *
 * Layout:
 *   - Full-screen background image
 *   - Semi-transparent glass card centered over it
 *   - MonvexLogo + wordmark above the form
 *   - Login form with username, password, error handling
 */

import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { LogIn, AlertCircle } from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import { Button, Input, PasswordInput, MonvexLogo } from '../../components/ui'
import { ApiError } from '../../lib/api'

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
    /*
     * Root container — full-screen background image.
     *
     * background-image:  /monvex-login-bg.png  (from public/)
     * background-size:   cover   — fills the viewport without letter-boxing
     * background-position: center — keeps the subject centred at any size
     * background-repeat: no-repeat — never tiles
     *
     * The inline style is used intentionally so Tailwind's purge does not
     * remove the dynamic image reference at build time.
     */
    <div
      className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12"
      style={{
        backgroundImage:    'url(/monvex-login-bg.png)',
        backgroundSize:     'cover',
        backgroundPosition: 'center',
        backgroundRepeat:   'no-repeat',
      }}
    >
      {/* Dark overlay so the form remains readable over any background */}
      <div className="absolute inset-0 bg-navy-950/60" aria-hidden="true" />

      {/* Form card — sits above the overlay */}
      <div className="relative z-10 w-full max-w-sm">

        {/* Logo + wordmark */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <MonvexLogo size={52} />
          <div className="text-center">
            <p className="text-xl font-bold tracking-widest text-white">MONVEX</p>
            <p className="text-xs text-indigo-300">Move Money. Maintain Trust.</p>
          </div>
        </div>

        {/* Glass card */}
        <div className="rounded-2xl border border-white/10 bg-white/8 p-8 shadow-2xl backdrop-blur-md">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">Welcome back</h1>
            <p className="mt-1 text-sm text-slate-300">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {formError && (
              <div
                className="flex items-start gap-2.5 rounded-lg border border-red-400/30 bg-red-900/30 px-4 py-3 text-sm text-red-300"
                role="alert"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Username input — dark-theme variant */}
            <div>
              <label
                htmlFor="login-username"
                className="mb-1.5 block text-sm font-medium text-slate-200"
              >
                Username
              </label>
              <input
                id="login-username"
                name="username"
                type="text"
                autoComplete="username"
                required
                autoFocus
                value={formData.username}
                onChange={handleChange}
                placeholder="your.username"
                className="w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400/40"
              />
              {errors.username && (
                <p className="mt-1 text-xs text-red-400">{errors.username}</p>
              )}
            </div>

            {/* Password input — dark-theme variant */}
            <div>
              <label
                htmlFor="login-password"
                className="mb-1.5 block text-sm font-medium text-slate-200"
              >
                Password
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400/40"
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-400">{errors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
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

          <p className="mt-5 text-center text-sm text-slate-400">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-medium text-indigo-400 hover:text-indigo-300"
            >
              Create one
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          © {CURRENT_YEAR} MONVEX. All rights reserved.
        </p>
      </div>
    </div>
  )
}
