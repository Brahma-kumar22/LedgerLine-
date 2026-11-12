/**
 * App.jsx
 *
 * Root component for MONVEX frontend.
 * Wires together all providers and routes.
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
import TransactionDetailPage from './pages/transactions/TransactionDetailPage'
import DepositPage from './pages/transactions/DepositPage'
import WithdrawPage from './pages/transactions/WithdrawPage'
import TransferPage from './pages/transactions/TransferPage'
import AuditPage from './pages/AuditPage'
import ReconciliationPage from './pages/ReconciliationPage'
import AdminUsersPage from './pages/AdminUsersPage'
import PlaceholderPage from './pages/PlaceholderPage'
import NotFoundPage from './pages/NotFoundPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public routes */}
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                {/* All-roles pages */}
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/accounts" element={<AccountsListPage />} />
                <Route path="/accounts/:id" element={<AccountDetailPage />} />
                <Route path="/transactions" element={<TransactionsListPage />} />
                <Route path="/transactions/:id" element={<TransactionDetailPage />} />
                <Route path="/transactions/deposit" element={<DepositPage />} />
                <Route path="/transactions/withdraw" element={<WithdrawPage />} />
                <Route path="/transactions/transfer" element={<TransferPage />} />
                <Route path="/settings" element={
                  <PlaceholderPage title="Settings" description="Manage your profile and preferences" />
                } />

                {/* Admin + Auditor only */}
                <Route element={<RoleRoute roles={['ADMIN', 'AUDITOR']} />}>
                  <Route path="/audit" element={<AuditPage />} />
                  <Route path="/reconciliation" element={<ReconciliationPage />} />
                </Route>

                {/* Admin only */}
                <Route element={<RoleRoute roles={['ADMIN', 'AUDITOR']} />}>
                  <Route path="/users" element={<AdminUsersPage />} />
                </Route>
              </Route>
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
