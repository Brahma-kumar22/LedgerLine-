/**
 * routes/RoleRoute.jsx
 *
 * Role-based route guard.
 *
 * If the authenticated user's role is not in the allowed list, they see
 * an AccessDenied page instead of the route content.
 *
 * IMPORTANT: This is a UX guard, not a security boundary.
 * The backend enforces role-based authorization on every request.
 * A user cannot access data the backend refuses to return, even if
 * they navigate to a URL the frontend would try to render.
 *
 * Usage:
 *   <Route element={<ProtectedRoute />}>
 *     <Route element={<RoleRoute roles={['ADMIN']} />}>
 *       <Route path="/admin" element={<AdminPanel />} />
 *     </Route>
 *   </Route>
 */

import { Outlet } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'

import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui'

export default function RoleRoute({ roles = [] }) {
  const { user } = useAuth()

  // If no roles specified, allow all authenticated users.
  if (roles.length === 0) {
    return <Outlet />
  }

  const userHasRole = user && roles.includes(user.role)

  if (!userHasRole) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
          <ShieldAlert className="h-7 w-7 text-amber-500" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900">Access Denied</h2>
        <p className="mt-2 max-w-md text-sm text-slate-500">
          You do not have permission to view this page. Your role ({user?.role || 'unknown'})
          does not include the required access for this section.
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-6"
          onClick={() => window.history.back()}
        >
          Go back
        </Button>
      </div>
    )
  }

  return <Outlet />
}
