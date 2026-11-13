/**
 * pages/auth/RegisterPage.jsx
 *
 * Minimal centered auth layout — matches LoginPage exactly.
 * AuthBackground SVG component bundled inside the app by Vite.
 */

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { UserPlus, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import { MonvexLogo } from '../../components/ui'
import { ApiError } from '../../lib/api'
import AuthBackground from '../../components/auth/AuthBackground'

const CURRENT_YEAR = new Date().getFullYear()

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate     = useNavigate()

  const [form, setForm] = useState({
    username: '', email: '', password: '', passwordConfirm: '',
    first_name: '', last_name: '',
  })
  const [errors,       setErrors]       = useState({})
  const [formError,    setFormError]    = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success,      setSuccess]      = useState(false)
  const [showPwd,      setShowPwd]      = useState(false)
  const [showConfirm,  setShowConfirm]  = useState(false)

  function handleChange(e) {
    const { name, value } = e.target
    setForm(p => ({ ...p, [name]: value }))
    if (errors[name]) setErrors(p => ({ ...p, [name]: undefined }))
  }

  function validate() {
    const e = {}
    if (!form.username.trim())         e.username = 'Username is required'
    else if (form.username.length < 3) e.username = 'At least 3 characters'
    if (!form.email.trim())            e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email'
    if (!form.password)                e.password = 'Password is required'
    else if (form.password.length < 8) e.password = 'At least 8 characters'
    if (form.password !== form.passwordConfirm) e.passwordConfirm = 'Passwords do not match'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)
    setErrors({})
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setIsSubmitting(true)
    try {
      await register({
        username:   form.username.trim(),
        email:      form.email.trim(),
        password:   form.password,
        first_name: form.first_name.trim() || undefined,
        last_name:  form.last_name.trim()  || undefined,
      })
      setSuccess(true)
      setTimeout(() => navigate('/login', { replace: true }), 2500)
    } catch (err) {
      if (err instanceof ApiError && err.data) {
        const fe = {}
        for (const [k, v] of Object.entries(err.data)) fe[k] = Array.isArray(v) ? v[0] : String(v)
        if (Object.keys(fe).length) setErrors(fe)
        else setFormError(err.message)
      } else {
        setFormError(err instanceof ApiError ? err.message : 'Registration failed.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  /* ── Shared card style ── */
  const cardStyle = {
    background:          'rgba(14,10,48,0.75)',
    backdropFilter:      'blur(22px)',
    WebkitBackdropFilter:'blur(22px)',
    border:              '1px solid rgba(139,92,246,0.25)',
    borderRadius:        '20px',
    padding:             '36px 32px',
    boxShadow:           '0 25px 60px rgba(0,0,0,0.55)',
    width:               '100%',
    maxWidth:            '420px',
  }

  /* ── Success state ── */
  if (success) {
    return (
      <div
        className="relative flex min-h-screen items-center justify-center overflow-hidden"
        style={{ backgroundColor: '#06052b' }}
      >
        <AuthBackground />
        <div className="relative z-10 flex flex-col items-center gap-4 text-center" style={cardStyle}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 style={{ width: 28, height: 28, color: '#34d399' }} />
          </div>
          <div>
            <p style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff' }}>Account created</p>
            <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '8px' }}>Redirecting to sign in…</p>
          </div>
        </div>
      </div>
    )
  }

  /* ── Registration form ── */
  return (
    <div
      className="relative flex min-h-screen items-center justify-center px-4 py-8 overflow-hidden"
      style={{ backgroundColor: '#06052b' }}
    >
      {/* SVG background — bundled inside the app, deploys with Vercel */}
      <AuthBackground />

      <div className="relative z-10" style={cardStyle}>

        {/* Logo + brand */}
        <div className="mb-7 flex flex-col items-center gap-3">
          <MonvexLogo size={48} />
          <div className="text-center">
            <p style={{ fontSize: '17px', fontWeight: 700, letterSpacing: '0.12em', color: '#ffffff' }}>MONVEX</p>
            <p style={{ fontSize: '12px', color: '#a78bfa', marginTop: '2px' }}>Move Money. Maintain Trust.</p>
          </div>
        </div>

        {/* Heading */}
        <div className="mb-5">
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#ffffff', lineHeight: 1.2 }}>Create your account</h1>
          <p style={{ fontSize: '13px', color: '#c4b5fd', marginTop: '5px' }}>Join MONVEX as an account holder</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
          {formError && (
            <div
              className="flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-sm"
              style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.35)', color: '#fca5a5' }}
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Name row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <Field label="First name" name="first_name" placeholder="Jane"
              value={form.first_name} onChange={handleChange} error={errors.first_name} />
            <Field label="Last name" name="last_name" placeholder="Doe"
              value={form.last_name} onChange={handleChange} error={errors.last_name} />
          </div>

          <Field label="Username" name="username" required autoComplete="username"
            placeholder="jane.doe" value={form.username} onChange={handleChange} error={errors.username} />

          <Field label="Email" name="email" type="email" required autoComplete="email"
            placeholder="jane@example.com" value={form.email} onChange={handleChange} error={errors.email} />

          <PasswordField label="Password" name="password" required autoComplete="new-password"
            placeholder="••••••••" value={form.password} onChange={handleChange}
            error={errors.password} hint="At least 8 characters"
            show={showPwd} onToggle={() => setShowPwd(s => !s)} />

          <PasswordField label="Confirm password" name="passwordConfirm" required autoComplete="new-password"
            placeholder="••••••••" value={form.passwordConfirm} onChange={handleChange}
            error={errors.passwordConfirm}
            show={showConfirm} onToggle={() => setShowConfirm(s => !s)} />

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55"
            style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', fontSize: '15px' }}
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

        <p className="mt-5 text-center" style={{ fontSize: '13px', color: '#94a3b8' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#a78bfa', fontWeight: 500 }}>Sign in</Link>
        </p>
      </div>

      <p
        className="absolute bottom-4 text-center w-full"
        style={{ fontSize: '11px', color: 'rgba(139,92,246,0.35)', pointerEvents: 'none' }}
      >
        © {CURRENT_YEAR} MONVEX Financial Systems
      </p>
    </div>
  )
}

/* ── Shared dark-theme field components ──────────────────────────────────── */

function Field({ label, name, type = 'text', required, error, hint, ...rest }) {
  const id = `reg-${name}`
  return (
    <div>
      <label htmlFor={id} style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#c4b5fd', marginBottom: '5px' }}>
        {label}{required && <span style={{ color: '#f87171', marginLeft: '2px' }}>*</span>}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        style={{
          width: '100%', borderRadius: '10px', padding: '10px 13px',
          fontSize: '14px', color: '#ffffff',
          background: 'rgba(255,255,255,0.07)',
          border: error ? '1px solid rgba(248,113,113,0.6)' : '1px solid rgba(139,92,246,0.22)',
          outline: 'none',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = '#7c3aed' }}
        onBlur={e  => { e.currentTarget.style.borderColor = error ? 'rgba(248,113,113,0.6)' : 'rgba(139,92,246,0.22)' }}
        {...rest}
      />
      {error && <p style={{ marginTop: '4px', fontSize: '12px', color: '#f87171' }}>{error}</p>}
      {hint && !error && <p style={{ marginTop: '4px', fontSize: '12px', color: '#7c6fba' }}>{hint}</p>}
    </div>
  )
}

function PasswordField({ label, name, required, error, hint, show, onToggle, ...rest }) {
  const id = `reg-${name}`
  return (
    <div>
      <label htmlFor={id} style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#c4b5fd', marginBottom: '5px' }}>
        {label}{required && <span style={{ color: '#f87171', marginLeft: '2px' }}>*</span>}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          name={name}
          type={show ? 'text' : 'password'}
          style={{
            width: '100%', borderRadius: '10px', padding: '10px 42px 10px 13px',
            fontSize: '14px', color: '#ffffff',
            background: 'rgba(255,255,255,0.07)',
            border: error ? '1px solid rgba(248,113,113,0.6)' : '1px solid rgba(139,92,246,0.22)',
            outline: 'none',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = '#7c3aed' }}
          onBlur={e  => { e.currentTarget.style.borderColor = error ? 'rgba(248,113,113,0.6)' : 'rgba(139,92,246,0.22)' }}
          {...rest}
        />
        <button
          type="button"
          onClick={onToggle}
          tabIndex={-1}
          aria-label={show ? 'Hide password' : 'Show password'}
          style={{
            position: 'absolute', right: '11px', top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            color: '#c4b5fd', display: 'flex', alignItems: 'center',
          }}
        >
          {show ? <EyeOff style={{ width: '16px', height: '16px' }} /> : <Eye style={{ width: '16px', height: '16px' }} />}
        </button>
      </div>
      {error && <p style={{ marginTop: '4px', fontSize: '12px', color: '#f87171' }}>{error}</p>}
      {hint && !error && <p style={{ marginTop: '4px', fontSize: '12px', color: '#7c6fba' }}>{hint}</p>}
    </div>
  )
}
