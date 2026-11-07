/**
 * pages/auth/RegisterPage.jsx
 *
 * User registration page.
 *
 * Calls the backend POST /api/auth/register/ endpoint.
 * Public registration ALWAYS creates ACCOUNT_HOLDER users — the backend
 * rejects any role field in the request body. This page does not include
 * a role selector.
 *
 * After successful registration, the user is redirected to the login page
 * with a success message. They must log in to receive their JWT tokens.
 */

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import { Button, Input, PasswordInput } from '../../components/ui'
import { ApiError } from '../../lib/api'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    passwordConfirm: '',
    first_name: '',
    last_name: '',
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)
  const [success, setSuccess] = useState(false)

  function handleChange(e) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  function validate() {
    const errs = {}

    if (!formData.username.trim()) {
      errs.username = 'Username is required'
    } else if (formData.username.length < 3) {
      errs.username = 'Username must be at least 3 characters'
    }

    if (!formData.email.trim()) {
      errs.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errs.email = 'Please enter a valid email address'
    }

    if (!formData.password) {
      errs.password = 'Password is required'
    } else if (formData.password.length < 8) {
      errs.password = 'Password must be at least 8 characters'
    }

    if (formData.password !== formData.passwordConfirm) {
      errs.passwordConfirm = 'Passwords do not match'
    }

    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)
    setErrors({})

    const fieldErrors = validate()
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      return
    }

    setIsSubmitting(true)
    try {
      // Send only the fields the backend expects.
      // Role is intentionally NOT sent — the backend forces ACCOUNT_HOLDER.
      await register({
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        first_name: formData.first_name.trim() || undefined,
        last_name: formData.last_name.trim() || undefined,
      })
      setSuccess(true)
      // Redirect to login after a short delay so the user sees the success message.
      setTimeout(() => navigate('/login', { replace: true }), 2000)
    } catch (err) {
      if (err instanceof ApiError && err.data) {
        // Backend field-level errors (e.g. {"username": ["A user with that username already exists."]})
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
        setFormError(err instanceof ApiError ? err.message : 'Registration failed. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Success state ──────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-7 w-7 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Account created</h1>
          <p className="mt-2 text-sm text-slate-500">
            Your MONVEX account has been created. Redirecting you to sign in…
          </p>
        </div>
      </div>
    )
  }

  // ── Registration form ───────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600">
            <span className="text-xl font-bold text-white">M</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Create your account</h1>
          <p className="mt-1 text-sm text-slate-500">
            Join MONVEX as an account holder
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          noValidate
        >
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
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First name"
                name="first_name"
                type="text"
                autoComplete="given-name"
                value={formData.first_name}
                onChange={handleChange}
                error={errors.first_name}
                placeholder="Jane"
              />
              <Input
                label="Last name"
                name="last_name"
                type="text"
                autoComplete="family-name"
                value={formData.last_name}
                onChange={handleChange}
                error={errors.last_name}
                placeholder="Doe"
              />
            </div>

            <Input
              label="Username"
              name="username"
              type="text"
              autoComplete="username"
              required
              value={formData.username}
              onChange={handleChange}
              error={errors.username}
              placeholder="jane.doe"
            />

            <Input
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              placeholder="jane.doe@example.com"
            />

            <PasswordInput
              label="Password"
              name="password"
              autoComplete="new-password"
              required
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              hint="At least 8 characters"
              placeholder="••••••••"
            />

            <PasswordInput
              label="Confirm password"
              name="passwordConfirm"
              autoComplete="new-password"
              required
              value={formData.passwordConfirm}
              onChange={handleChange}
              error={errors.passwordConfirm}
              placeholder="••••••••"
            />
          </div>

          <Button
            type="submit"
            className="mt-6 w-full"
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            {!isSubmitting && <UserPlus className="mr-1.5 h-4 w-4" />}
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-indigo-600 hover:text-indigo-700"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
