/**
 * pages/auth/LoginPage.jsx
 *
 * Minimal centered auth layout.
 * - Full-screen background: /monvex-login-bg.png (cover + center)
 * - Fallback gradient if PNG not yet placed in public/
 * - Single glass card centered horizontally and vertically
 * - MonvexLogo + wordmark at top of card
 * - All auth logic, validation and APIs unchanged
 */

import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import { MonvexLogo } from '../../components/ui'
import { ApiError } from '../../lib/api'

const CURRENT_YEAR = new Date().getFullYear()

export default function LoginPage() {
  const { login }  = useAuth()
  const navigate   = useNavigate()
  const location   = useLocation()

  const [form,         setForm]         = useState({ username: '', password: '' })
  const [errors,       setErrors]       = useState({})
  const [formError,    setFormError]    = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPwd,      setShowPwd]      = useState(false)

  const fromPath = location.state?.from?.pathname || '/dashboard'

  function handleChange(e) {
    const { name, value } = e.target
    setForm(p => ({ ...p, [name]: value }))
    if (errors[name]) setErrors(p => ({ ...p, [name]: undefined }))
  }

  function validate() {
    const e = {}
    if (!form.username.trim()) e.username = 'Username is required'
    if (!form.password)        e.password = 'Password is required'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setIsSubmitting(true)
    try {
      await login(form.username, form.password)
      navigate(fromPath, { replace: true })
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'An unexpected error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    /* Full-screen background */
    <div
      className="relative flex min-h-screen items-center justify-center px-4 py-8 overflow-hidden"
      style={{
        backgroundImage:    'url(/monvex-login-bg.png)',
        backgroundSize:     'cover',
        backgroundPosition: 'center',
        backgroundRepeat:   'no-repeat',
        /* Fallback gradient if PNG is not yet placed */
        backgroundColor:    '#07061f',
      }}
    >
      {/* Dark overlay for readability */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(5,4,28,0.55)' }}
        aria-hidden="true"
      />

      {/* Centered glass card */}
      <div
        className="relative z-10 w-full max-w-sm"
        style={{
          background:         'rgba(14,10,48,0.72)',
          backdropFilter:     'blur(20px)',
          WebkitBackdropFilter:'blur(20px)',
          border:             '1px solid rgba(139,92,246,0.25)',
          borderRadius:       '20px',
          padding:            '40px 36px',
          boxShadow:          '0 25px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Logo + brand */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <MonvexLogo size={52} />
          <div className="text-center">
            <p style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '0.12em', color: '#ffffff' }}>
              MONVEX
            </p>
            <p style={{ fontSize: '12px', color: '#a78bfa', marginTop: '2px' }}>
              Move Money. Maintain Trust.
            </p>
          </div>
        </div>

        {/* Heading */}
        <div className="mb-6">
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#ffffff', lineHeight: 1.2 }}>
            Welcome back
          </h1>
          <p style={{ fontSize: '14px', color: '#c4b5fd', marginTop: '6px' }}>
            Sign in to your account
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Error banner */}
          {formError && (
            <div
              className="flex items-start gap-2.5 rounded-lg px-4 py-3 text-sm"
              style={{
                background: 'rgba(220,38,38,0.15)',
                border:     '1px solid rgba(220,38,38,0.35)',
                color:      '#fca5a5',
              }}
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Username */}
          <Field
            id="login-username"
            label="Username"
            name="username"
            type="text"
            autoComplete="username"
            autoFocus
            required
            placeholder="your.username"
            value={form.username}
            onChange={handleChange}
            error={errors.username}
          />

          {/* Password */}
          <PasswordField
            id="login-password"
            label="Password"
            name="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            value={form.password}
            onChange={handleChange}
            error={errors.password}
            show={showPwd}
            onToggle={() => setShowPwd(s => !s)}
          />

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-colors hover:opacity-90 active:opacity-80 disabled:cursor-not-allowed disabled:opacity-55"
            style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', fontSize: '15px' }}
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

        <p className="mt-6 text-center" style={{ fontSize: '13px', color: '#94a3b8' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: '#a78bfa', fontWeight: 500 }}>
            Create one
          </Link>
        </p>
      </div>

      {/* Footer */}
      <p
        className="absolute bottom-4 text-center w-full"
        style={{ fontSize: '11px', color: 'rgba(139,92,246,0.35)' }}
      >
        © {CURRENT_YEAR} MONVEX Financial Systems
      </p>
    </div>
  )
}

/* ── Shared dark-theme field components ──────────────────────────────────── */

function Field({ id, label, error, required, ...rest }) {
  return (
    <div>
      <label htmlFor={id} style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#c4b5fd', marginBottom: '6px' }}>
        {label}{required && <span style={{ color: '#f87171', marginLeft: '2px' }}>*</span>}
      </label>
      <input
        id={id}
        style={{
          width:          '100%',
          borderRadius:   '10px',
          padding:        '11px 14px',
          fontSize:       '14px',
          color:          '#ffffff',
          background:     'rgba(255,255,255,0.07)',
          border:         error ? '1px solid rgba(248,113,113,0.6)' : '1px solid rgba(139,92,246,0.22)',
          outline:        'none',
          transition:     'border-color 0.15s',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = '#7c3aed' }}
        onBlur={e  => { e.currentTarget.style.borderColor = error ? 'rgba(248,113,113,0.6)' : 'rgba(139,92,246,0.22)' }}
        {...rest}
      />
      {error && <p style={{ marginTop: '5px', fontSize: '12px', color: '#f87171' }}>{error}</p>}
    </div>
  )
}

function PasswordField({ id, label, error, required, show, onToggle, hint, ...rest }) {
  return (
    <div>
      <label htmlFor={id} style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#c4b5fd', marginBottom: '6px' }}>
        {label}{required && <span style={{ color: '#f87171', marginLeft: '2px' }}>*</span>}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          type={show ? 'text' : 'password'}
          style={{
            width:          '100%',
            borderRadius:   '10px',
            padding:        '11px 44px 11px 14px',
            fontSize:       '14px',
            color:          '#ffffff',
            background:     'rgba(255,255,255,0.07)',
            border:         error ? '1px solid rgba(248,113,113,0.6)' : '1px solid rgba(139,92,246,0.22)',
            outline:        'none',
            transition:     'border-color 0.15s',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = '#7c3aed' }}
          onBlur={e  => { e.currentTarget.style.borderColor = error ? 'rgba(248,113,113,0.6)' : 'rgba(139,92,246,0.22)' }}
          {...rest}
        />
        {/* Eye toggle — white/lavender so it's clearly visible on dark bg */}
        <button
          type="button"
          onClick={onToggle}
          tabIndex={-1}
          aria-label={show ? 'Hide password' : 'Show password'}
          style={{
            position:   'absolute',
            right:      '12px',
            top:        '50%',
            transform:  'translateY(-50%)',
            background: 'none',
            border:     'none',
            cursor:     'pointer',
            padding:    '0',
            color:      '#c4b5fd',
            display:    'flex',
            alignItems: 'center',
          }}
        >
          {show
            ? <EyeOff style={{ width: '17px', height: '17px' }} />
            : <Eye    style={{ width: '17px', height: '17px' }} />
          }
        </button>
      </div>
      {error && <p style={{ marginTop: '5px', fontSize: '12px', color: '#f87171' }}>{error}</p>}
      {hint && !error && <p style={{ marginTop: '5px', fontSize: '12px', color: '#7c6fba' }}>{hint}</p>}
    </div>
  )
}
