/**
 * components/layout/AppLayout.jsx
 *
 * Main application layout shell.
 *
 * Structure:
 *   ┌─────────────────────────────────────────────────────────┐
 *   │  Sidebar    │  TopNav (sticky)                           │
 *   │             ├─────────────────────────────────────────────┤
 *   │             │  Breadcrumbs                                │
 *   │             ├─────────────────────────────────────────────┤
 *   │             │                                             │
 *   │             │  Page content (Outlet)                      │
 *   │             │                                             │
 *   └─────────────────────────────────────────────────────────┘
 *
 * The sidebar is fixed on desktop, off-canvas on mobile.
 * The content area scrolls independently.
 *
 * Used as a layout route element in the router:
 *   <Route element={<ProtectedRoute />}>
 *     <Route element={<AppLayout />}>
 *       <Route path="/dashboard" element={<Dashboard />} />
 *     </Route>
 *   </Route>
 */

import { useState } from 'react'
import { Outlet } from 'react-router-dom'

import DesktopSidebar, { MobileSidebar } from './Sidebar'
import TopNav from './TopNav'
import Breadcrumbs from './Breadcrumbs'

export default function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop sidebar — fixed width, always visible on md+ */}
      <DesktopSidebar />

      {/* Mobile sidebar — off-canvas drawer */}
      <MobileSidebar isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      {/* Main content column */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNav onMenuClick={() => setMobileNavOpen(true)} />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 lg:px-8">
            <Breadcrumbs className="mb-4" />
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
