/**
 * components/layout/Sidebar.jsx
 *
 * Midnight-navy sidebar with role-aware navigation and desktop collapse toggle.
 *
 * Desktop (md+):
 *   Expanded  — 240px: icon + label + logo + user footer.
 *   Collapsed — 64px:  icon only; hovering shows a tooltip with the label.
 *   A chevron button sits on the right edge to toggle between the two states.
 *   The collapse state is owned by AppLayout so the content column width
 *   adjusts at the same flex level.
 *
 * Mobile: always full-width off-canvas drawer — no collapse.
 */

import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import { cn, displayName, formatRole } from '../../lib/utils'
import { getNavItemsForRole } from './navConfig'
import MonvexLogo from '../ui/MonvexLogo'

// ── Logo ──────────────────────────────────────────────────────────────────────

function Logo({ collapsed }) {
  return (
    <div
      className={cn(
        'flex items-center py-5 transition-all duration-200',
        collapsed ? 'justify-center px-0' : 'gap-2.5 px-5'
      )}
    >
      {/* Brand icon — gradient M, no background square needed */}
      <MonvexLogo size={32} className="shrink-0" />

      {!collapsed && (
        <div className="flex flex-col overflow-hidden">
          <span className="text-sm font-semibold tracking-wide text-white">MONVEX</span>
          <span className="text-2xs text-slate-400 whitespace-nowrap">
            Move Money. Maintain Trust.
          </span>
        </div>
      )}
    </div>
  )
}

// ── Single nav item with collapsed tooltip ────────────────────────────────────

function NavItem({ item, collapsed, onNavigate }) {
  const location = useLocation()
  const Icon = item.icon
  const isActive =
    location.pathname === item.path ||
    location.pathname.startsWith(item.path + '/')

  return (
    <li className="relative group">
      <NavLink
        to={item.path}
        onClick={onNavigate}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'flex items-center rounded-md text-sm font-medium transition-colors duration-150',
          collapsed ? 'justify-center py-2.5 mx-2' : 'gap-3 px-3 py-2',
          isActive
            ? 'bg-navy-800 text-white'
            : 'text-slate-400 hover:bg-navy-800/50 hover:text-slate-200'
        )}
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        {!collapsed && <span>{item.label}</span>}
      </NavLink>

      {/* Tooltip — only visible when collapsed */}
      {collapsed && (
        <span
          role="tooltip"
          className={cn(
            'pointer-events-none absolute left-full top-1/2 z-tooltip',
            'ml-3 -translate-y-1/2 whitespace-nowrap',
            'rounded-md bg-slate-800 px-2.5 py-1.5',
            'text-xs font-medium text-white shadow-md',
            'opacity-0 group-hover:opacity-100 transition-opacity duration-150'
          )}
        >
          {item.label}
        </span>
      )}
    </li>
  )
}

// ── Sidebar inner content (shared by desktop + mobile) ────────────────────────

function SidebarContent({ collapsed = false, onNavigate }) {
  const { user } = useAuth()
  const navItems = getNavItemsForRole(user?.role || 'ACCOUNT_HOLDER')
  const name    = displayName(user)
  const role    = formatRole(user?.role)
  const initial = (user?.first_name?.[0] || user?.username?.[0] || '?').toUpperCase()

  return (
    <>
      <Logo collapsed={collapsed} />

      <nav aria-label="Main navigation" className="flex-1 py-2">
        <ul className="space-y-0.5">
          {navItems.map((item) => (
            <NavItem
              key={item.path}
              item={item}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      </nav>

      {/* User footer */}
      <div
        className={cn(
          'border-t border-white/8 py-4',
          collapsed ? 'flex justify-center px-0' : 'px-5'
        )}
      >
        {collapsed ? (
          <div className="relative group flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
            {initial}
            <span
              role="tooltip"
              className="pointer-events-none absolute left-full top-1/2 z-tooltip ml-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2.5 py-1.5 text-xs text-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-150"
            >
              {name || user?.username}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{name || user?.username}</p>
              <p className="truncate text-2xs text-slate-400">{role}</p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ── Desktop sidebar ───────────────────────────────────────────────────────────

export function DesktopSidebar({ collapsed, onToggle }) {
  return (
    <aside
      className={cn(
        'relative hidden h-screen shrink-0 flex-col bg-navy-900 md:flex',
        'transition-[width] duration-200 ease-in-out',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <SidebarContent collapsed={collapsed} />

      {/* ── Collapse/expand toggle ─────────────────────────────────────────
          Positioned so it sits exactly on the right edge of the sidebar.
          -right-3  = half the button width (6px of 24px) so the circle
          straddles the border.  top-[4.5rem] sits below the logo row.     */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className={cn(
          'absolute -right-3 top-[4.5rem]',
          'z-raised flex h-6 w-6 items-center justify-center rounded-full',
          'border border-slate-200 bg-white shadow-sm',
          'text-slate-500 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600',
          'transition-colors duration-150'
        )}
      >
        {collapsed
          ? <ChevronRight className="h-3.5 w-3.5" />
          : <ChevronLeft  className="h-3.5 w-3.5" />
        }
      </button>
    </aside>
  )
}

// ── Mobile sidebar ────────────────────────────────────────────────────────────

export function MobileSidebar({ isOpen, onClose }) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-300 md:hidden">
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
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-4 z-10 rounded-md p-1 text-slate-400 hover:bg-navy-800 hover:text-white"
          aria-label="Close navigation"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent collapsed={false} onNavigate={onClose} />
      </aside>
    </div>
  )
}

export default DesktopSidebar
