/**
 * pages/auth/LoginPage.jsx
 *
 * User login page.
 *
 * Calls the backend POST /api/auth/token/ endpoint with username + password.
 * On success, tokens are stored by the API client and the user profile
 * is fetched by the AuthContext's login() method.
 *
 * After successful login, redirects to the page the user was trying to reach
 * (stored in location.state.from) or to /dashboard by default.
 *
 * Error handling: displays backend error messages (e.g. "No active account
 * found with the given credentials") in the form, never as raw stack traces.
 */

import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { LogIn, AlertCircle } from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import { Button, Input, PasswordInput } from '../../components/ui'
import { ApiError } from '../../lib/api'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [formData, setFormData] = useState({ username: '', password: '' })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  const fromPath = location.state?.from?.pathname || '/dashboard'

  function handleChange(e) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear field error on change
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  function validate() {
    const errs = {}
    if (!formData.username.trim()) errs.username = 'Username is required'
    if (!formData.password) errs.password = 'Password is required'
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
      await login(formData.username, formData.password)
      navigate(fromPath, { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message)
      } else {
        setFormError('An unexpected error occurred. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600">
            <span className="text-xl font-bold text-white">M</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">
            Sign in to your MONVEX account
          </p>
        </div>

        {/* Login form */}
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
            <Input
              label="Username"
              name="username"
              type="text"
              autoComplete="username"
              required
              value={formData.username}
              onChange={handleChange}
              error={errors.username}
              placeholder="your.username"
              autoFocus
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
          </div>

          <Button
            type="submit"
            className="mt-6 w-full"
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            {!isSubmitting && <LogIn className="mr-1.5 h-4 w-4" />}
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        {/* Registration link */}
        <p className="mt-6 text-center text-sm text-slate-500">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="font-medium text-indigo-600 hover:text-indigo-700"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
