/**
 * routes/PublicRoute.jsx
 *
 * Route wrapper for unauthenticated-only pages (login, register).
 * If the user is already authenticated, redirect to dashboard.
 * Prevents showing the login page to a logged-in user.
 *
 * Usage:
 *   <Route element={<PublicRoute />}>
 *     <Route path="/login" element={<Login />} />
 *   </Route>
 */

import { Navigate, Outlet } from 'react-router-dom'
import { PageSpinner } from '../components/ui'

import { useAuth } from '../context/AuthContext'

export default function PublicRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <PageSpinner label="Loading…" />
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
