/**
 * components/layout/AppLayout.jsx
 *
 * Main application layout shell.
 *
 * Owns:
 *   - mobileNavOpen — whether the off-canvas mobile drawer is visible
 *   - sidebarCollapsed — whether the desktop sidebar is in icon-only mode
 *
 * Both pieces of state live here so the main content column can react to
 * sidebar width changes at the same level (rather than in a child).
 *
 * BREADCRUMBS vs PAGE HEADER:
 *   Breadcrumbs show the navigation path (e.g. Accounts > abc-12…).
 *   They are rendered here, once, above all page content.
 *   Individual pages render a <PageHeader> with a prominent title,
 *   subtitle, and action buttons.
 *
 *   To prevent the top-level segment from being a redundant repeat of the
 *   page title, Breadcrumbs only renders when there is MORE than one path
 *   segment (e.g. /accounts/abc-123 shows "Accounts > abc-12…").
 *   Single-segment paths like /dashboard are already communicated by the
 *   active nav item in the sidebar — a breadcrumb there adds no value.
 */

import { useState } from 'react'
import { Outlet } from 'react-router-dom'

import DesktopSidebar, { MobileSidebar } from './Sidebar'
import TopNav from './TopNav'
import Breadcrumbs from './Breadcrumbs'

export default function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop sidebar — collapses to icon-only mode */}
      <DesktopSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
      />

      {/* Mobile sidebar — off-canvas drawer, always full-width */}
      <MobileSidebar isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      {/* Main content column — flex-1 so it fills the remaining space after
          the sidebar. The sidebar's own width transition handles the resize. */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <TopNav onMenuClick={() => setMobileNavOpen(true)} />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 lg:px-8">
            {/* Only show breadcrumbs when we're more than one level deep.
                Single-level paths (/dashboard, /accounts) repeat the page
                title unnecessarily — the active sidebar item already shows
                where we are. */}
            <Breadcrumbs className="mb-4" />
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
