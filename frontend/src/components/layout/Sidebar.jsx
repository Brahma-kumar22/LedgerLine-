/**
 * components/layout/Sidebar.jsx
 *
 * Midnight-navy sidebar with role-aware navigation.
 *
 * Desktop (md+): Fixed 240px width, always visible.
 * Mobile: Off-canvas drawer, slides in when the mobile menu button is pressed.
 *
 * Accessibility:
 *   - <nav> element with aria-label
 *   - Current page link has aria-current="page"
 *   - Mobile drawer has aria-hidden when closed
 *   - Backdrop closes drawer on click
 */

import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/utils'
import { getNavItemsForRole } from './navConfig'

// ── MONVEX brand logo ────────────────────────────────────────────────────────

function Logo() {
  return (
    <div className="flex items-center gap-2.5 px-5 py-5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
        <span className="text-sm font-bold text-white">M</span>
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-semibold tracking-wide text-white">MONVEX</span>
        <span className="text-2xs text-slate-400">Move Money. Maintain Trust.</span>
      </div>
    </div>
  )
}

// ── Sidebar content (shared between desktop and mobile) ────────────────────

function SidebarContent({ onNavigate }) {
  const { user } = useAuth()
  const location = useLocation()
  const navItems = getNavItemsForRole(user?.role || 'ACCOUNT_HOLDER')

  return (
    <>
      <Logo />
      <nav aria-label="Main navigation" className="flex-1 px-3 py-2">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path ||
              location.pathname.startsWith(item.path + '/')
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={onNavigate}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-navy-800 text-white'
                      : 'text-slate-400 hover:bg-navy-800/50 hover:text-slate-200'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {item.label}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Sidebar footer: user info */}
      <div className="border-t border-white/8 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-700 text-xs font-semibold text-white">
            {user?.first_name?.[0] || user?.username?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {user?.first_name && user?.last_name
                ? `${user.first_name} ${user.last_name}`
                : user?.username}
            </p>
            <p className="truncate text-2xs text-slate-400">
              {user?.role === 'ACCOUNT_HOLDER' ? 'Account Holder' : (user?.role || '')}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Desktop sidebar ───────────────────────────────────────────────────────────

export function DesktopSidebar() {
  return (
    <aside className="hidden h-screen w-60 shrink-0 flex-col bg-navy-900 md:flex">
      <SidebarContent />
    </aside>
  )
}

// ── Mobile sidebar (off-canvas drawer) ───────────────────────────────────────

export function MobileSidebar({ isOpen, onClose }) {
  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-300 md:hidden" aria-hidden={!isOpen}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className="absolute left-0 top-0 flex h-full w-60 flex-col bg-navy-900 animate-slide-left"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-4 z-10 rounded-md p-1 text-slate-400 hover:bg-navy-800 hover:text-white"
          aria-label="Close navigation"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent onNavigate={onClose} />
      </aside>
    </div>
  )
}

export default DesktopSidebar
