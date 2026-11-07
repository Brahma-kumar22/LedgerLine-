/**
 * routes/ProtectedRoute.jsx
 *
 * Route guard that redirects unauthenticated users to /login.
 *
 * Shows a full-page spinner while the auth context is still loading
 * (session restoration in progress), preventing a flash of the login page
 * for users with valid tokens.
 *
 * Usage:
 *   <Route element={<ProtectedRoute />}>
 *     <Route path="/dashboard" element={<Dashboard />} />
 *   </Route>
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { PageSpinner } from '../components/ui'

import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  // ── Loading: show spinner while restoring session ─────────────────────
  if (isLoading) {
    return <PageSpinner label="Restoring your session…" />
  }

  // ── Not authenticated: redirect to login, preserving intended destination ─
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // ── Authenticated: render the child routes ──────────────────────────────
  return <Outlet />
}
