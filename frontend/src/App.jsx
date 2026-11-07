/**
 * App.jsx
 *
 * Root component for MONVEX frontend.
 *
 * Wires together all providers and routes:
 *   - BrowserRouter (URL routing)
 *   - AuthProvider (session + user state)
 *   - ToastProvider (notification system)
 *
 * Route hierarchy:
 *   /                    → redirect to /dashboard
 *   /login               → LoginPage (PublicRoute — redirect if authed)
 *   /register            → RegisterPage (PublicRoute)
 *   /dashboard           → DashboardPage (ProtectedRoute + AppLayout)
 *   /accounts            → AccountsListPage (ProtectedRoute + AppLayout)
 *   /accounts/:id        → AccountDetailPage (ProtectedRoute + AppLayout)
 *   /transactions        → TransactionsListPage (ProtectedRoute + AppLayout)
 *   /audit               → PlaceholderPage (RoleRoute: ADMIN, AUDITOR)
 *   /users               → PlaceholderPage (RoleRoute: ADMIN)
 *   /reconciliation      → PlaceholderPage (RoleRoute: ADMIN, AUDITOR)
 *   /settings            → PlaceholderPage (ProtectedRoute + AppLayout)
 *   *                    → NotFoundPage
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './components/ui'

import { ProtectedRoute, RoleRoute, PublicRoute } from './routes'
import { AppLayout } from './components/layout'

import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import AccountsListPage from './pages/accounts/AccountsListPage'
import AccountDetailPage from './pages/accounts/AccountDetailPage'
import TransactionsListPage from './pages/transactions/TransactionsListPage'
import PlaceholderPage from './pages/PlaceholderPage'
import NotFoundPage from './pages/NotFoundPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* ── Public routes (login, register) ───────────────────────── */}
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>

            {/* ── Protected routes (require authentication) ─────────────── */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                {/* All-roles pages */}
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/accounts" element={<AccountsListPage />} />
                <Route path="/accounts/:id" element={<AccountDetailPage />} />
                <Route path="/transactions" element={<TransactionsListPage />} />
                <Route path="/settings" element={
                  <PlaceholderPage title="Settings" description="Manage your profile and preferences" />
                } />

                {/* Admin + Auditor only */}
                <Route element={<RoleRoute roles={['ADMIN', 'AUDITOR']} />}>
                  <Route path="/audit" element={
                    <PlaceholderPage title="Audit Log" description="System audit trail and compliance records" />
                  } />
                  <Route path="/reconciliation" element={
                    <PlaceholderPage title="Reconciliation" description="Balance verification and ledger integrity checks" />
                  } />
                </Route>

                {/* Admin only */}
                <Route element={<RoleRoute roles={['ADMIN']} />}>
                  <Route path="/users" element={
                    <PlaceholderPage title="User Management" description="Manage users, roles, and access" />
                  } />
                </Route>
              </Route>
            </Route>

            {/* ── Root redirect ──────────────────────────────────────────── */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* ── 404 catch-all ──────────────────────────────────────────── */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
