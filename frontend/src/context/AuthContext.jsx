/**
 * context/AuthContext.jsx
 *
 * Central authentication provider for MONVEX.
 *
 * RESPONSIBILITIES:
 *   - Provide the authenticated user object to the entire app
 *   - Restore session on app load (if tokens exist in localStorage)
 *   - Handle login, registration, and logout
 *   - Listen for 'monvex:session-expired' events from the API interceptor
 *     and redirect to login when the session expires
 *   - Expose a useAuth() hook for consuming components
 *
 * SESSION RESTORATION FLOW:
 *   1. On mount, if hasTokens() is true, call GET /api/users/me/
 *   2. If successful → set user, set isLoading=false
 *   3. If 401 → interceptor tries refresh, if that also fails → clear tokens, isLoading=false
 *   4. If network error → clear tokens, isLoading=false
 *
 * The isLoading flag is critical: the router waits for it to become false
 * before deciding whether to show the login page or the app. Without this,
 * a user with valid tokens would see a flash of the login page on every reload.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { apiClient, ApiError } from '../lib/api'
import { clearTokens, hasTokens } from '../lib/tokenStorage'

// ── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within <AuthProvider>')
  }
  return ctx
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  // ── Session restoration on mount ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function restoreSession() {
      if (!hasTokens()) {
        // No tokens → no session to restore.
        if (!cancelled) {
          setIsLoading(false)
        }
        return
      }

      try {
        const me = await apiClient.users.me()
        if (!cancelled) {
          setUser(me)
          setError(null)
        }
      } catch (err) {
        // The interceptor already tried to refresh and failed.
        // Clear tokens and stay logged out.
        clearTokens()
        if (!cancelled) {
          setUser(null)
          setError(err instanceof ApiError ? err.message : 'Session expired')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    restoreSession()

    return () => {
      cancelled = true
    }
  }, [])

  // ── Listen for session-expired events from the API interceptor ─────────────
  useEffect(() => {
    function handleSessionExpired() {
      setUser(null)
      clearTokens()
      navigate('/login', { replace: true })
    }

    window.addEventListener('monvex:session-expired', handleSessionExpired)
    return () => window.removeEventListener('monvex:session-expired', handleSessionExpired)
  }, [navigate])

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (username, password) => {
    setError(null)
    try {
      await apiClient.auth.login(username, password)
      const me = await apiClient.users.me()
      setUser(me)
      return me
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Login failed. Please try again.'
      setError(msg)
      throw err
    }
  }, [])

  // ── Register ──────────────────────────────────────────────────────────────
  const register = useCallback(async (payload) => {
    setError(null)
    try {
      // Registration creates the user but does NOT log them in.
      // The caller should redirect to login after success.
      await apiClient.auth.register(payload)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Registration failed.'
      setError(msg)
      throw err
    }
  }, [])

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    apiClient.auth.logout()
    setUser(null)
    setError(null)
    navigate('/login', { replace: true })
  }, [navigate])

  // ── Derived state ──────────────────────────────────────────────────────────
  const isAuthenticated = !!user

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      error,
      login,
      register,
      logout,
      // Role convenience properties (verified from backend GET /api/users/me/)
      isAdmin: user?.role === 'ADMIN',
      isAccountHolder: user?.role === 'ACCOUNT_HOLDER',
      isAuditor: user?.role === 'AUDITOR',
    }),
    [user, isAuthenticated, isLoading, error, login, register, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
