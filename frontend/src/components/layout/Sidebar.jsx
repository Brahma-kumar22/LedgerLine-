/**
 * components/layout/Sidebar.jsx
 *
 * Premium midnight-navy sidebar with:
 *   - Official MONVEX gradient-M logo
 *   - Inline collapse button inside the branding header (not floating on the edge)
 *   - Smooth width transition
 *   - Icon-only collapsed mode with tooltip labels
 *   - Role-aware navigation
 *   - User footer with avatar
 *   - Mobile off-canvas drawer
 *
 * COLLAPSE BUTTON DESIGN:
 *   Per the reference screenshot, the collapse toggle lives inside the
 *   branding header row — right-aligned, vertically centered with the logo.
 *   It is NOT a floating circle straddling the sidebar edge.
 *   In collapsed mode it moves to center (below the logo mark).
 */

import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import { cn, displayName, formatRole } from '../../lib/utils'
import { getNavItemsForRole } from './navConfig'
import MonvexLogo from '../ui/MonvexLogo'

// ── Brand header with collapse toggle ────────────────────────────────────────

function BrandHeader({ collapsed, onToggle }) {
  return (
    <div className="flex items-center border-b border-white/8 px-4 py-3.5">
      {/* Logo + wordmark — shrinks to just logo when collapsed */}
      <div className="flex flex-1 items-center gap-3 min-w-0">
        <MonvexLogo size={30} className="shrink-0" />
        {!collapsed && (
          <div className="flex min-w-0 flex-col">
            <span className="text-sm font-bold tracking-wider text-white">MONVEX</span>
            <span className="text-2xs leading-tight text-slate-400">Move Money. Maintain Trust.</span>
          </div>
        )}
      </div>

      {/* Collapse / expand toggle — always right-aligned in the header */}
      {onToggle && (
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-navy-700 hover:text-slate-200 transition-colors duration-150"
        >
          {collapsed
            ? <ChevronRight className="h-3.5 w-3.5" />
            : <ChevronLeft  className="h-3.5 w-3.5" />
          }
        </button>
      )}
    </div>
  )
}

// ── Single nav item ───────────────────────────────────────────────────────────

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
          'flex items-center rounded-lg text-sm font-medium transition-all duration-150',
          collapsed
            ? 'justify-center mx-2 py-2.5 px-0'
            : 'gap-3 mx-2 px-3 py-2',
          isActive
            ? 'bg-indigo-600/30 text-white'
            : 'text-slate-400 hover:bg-navy-800 hover:text-slate-200'
        )}
      >
        <Icon
          className={cn(
            'shrink-0 transition-colors duration-150',
            isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300',
            'h-[18px] w-[18px]'
          )}
          aria-hidden="true"
        />
        {!collapsed && <span>{item.label}</span>}

        {/* Active indicator bar */}
        {isActive && !collapsed && (
          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-400" />
        )}
      </NavLink>

      {/* Tooltip — only in collapsed mode */}
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

// ── Sidebar inner content ─────────────────────────────────────────────────────

function SidebarContent({ collapsed = false, onNavigate, onToggle }) {
  const { user } = useAuth()
  const navItems = getNavItemsForRole(user?.role || 'ACCOUNT_HOLDER')
  const name    = displayName(user)
  const role    = formatRole(user?.role)
  const initial = (user?.first_name?.[0] || user?.username?.[0] || '?').toUpperCase()

  return (
    <div className="flex h-full flex-col">
      <BrandHeader collapsed={collapsed} onToggle={onToggle} />

      <nav aria-label="Main navigation" className="flex-1 overflow-y-auto py-3">
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
          'border-t border-white/8 py-3',
          collapsed ? 'flex justify-center px-0' : 'px-4'
        )}
      >
        {collapsed ? (
          <div className="relative group flex h-8 w-8 cursor-default items-center justify-center rounded-full bg-indigo-600/80 text-xs font-bold text-white">
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
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600/80 text-xs font-bold text-white">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {name || user?.username}
              </p>
              <p className="truncate text-2xs text-slate-400">{role}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Desktop sidebar ───────────────────────────────────────────────────────────

export function DesktopSidebar({ collapsed, onToggle }) {
  return (
    <aside
      className={cn(
        'hidden h-screen shrink-0 bg-navy-900 md:block',
        'transition-[width] duration-200 ease-in-out',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <SidebarContent collapsed={collapsed} onToggle={onToggle} />
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
    <div className="fixed inset-0 z-overlay md:hidden">
      <div
        className="absolute inset-0 bg-slate-900/60 animate-fade-in backdrop-blur-sm"
        onClick={onClose}
      />
      <aside
        className="absolute left-0 top-0 h-full w-64 bg-navy-900 animate-slide-left shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-md p-1.5 text-slate-400 hover:bg-navy-800 hover:text-white"
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
