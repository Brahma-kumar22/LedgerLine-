/**
 * components/layout/Sidebar.jsx
 *
 * Premium midnight-navy sidebar.
 *
 * Expanded (w-64):  Logo + wordmark + tagline + labels + user footer.
 * Collapsed (w-20): Logo only + icon-only nav + avatar + tooltips.
 *
 * Key layout decisions:
 *  - Collapsed width is 80px (w-20) so logo has room: 80 - 2×16px padding = 48px logo.
 *  - Nav section uses overflow-hidden (not overflow-y-auto) unless content
 *    genuinely overflows — prevents spurious scrollbar on collapsed sidebar.
 *  - BrandHeader is always a single horizontal row; no vertical stacking.
 *  - Collapse toggle sits in the header row, right-aligned.
 *  - Icons are 20×20px — large enough to read at 80px width.
 */

import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import { cn, displayName, formatRole } from '../../lib/utils'
import { getNavItemsForRole } from './navConfig'
import MonvexLogo from '../ui/MonvexLogo'

// ─────────────────────────────────────────────────────────────────────────────
// Brand header
// ─────────────────────────────────────────────────────────────────────────────

function BrandHeader({ collapsed, onToggle }) {
  return (
    <div className={cn(
      'flex items-center border-b border-white/10',
      collapsed ? 'h-16 justify-center px-0' : 'h-16 gap-3 px-4'
    )}>
      {/* Logo — 44px when collapsed (fits inside 80px with no padding), 36px when expanded */}
      <MonvexLogo
        size={collapsed ? 44 : 36}
        className="shrink-0"
      />

      {/* Wordmark + tagline — hidden when collapsed */}
      {!collapsed && (
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-bold tracking-widest text-white uppercase">
            MONVEX
          </span>
          <span className="text-[10px] leading-tight text-slate-400">
            Move Money. Maintain Trust.
          </span>
        </div>
      )}

      {/* Collapse toggle — always visible, right-aligned */}
      {onToggle && (
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded',
            'text-slate-500 transition-colors duration-150',
            'hover:bg-white/10 hover:text-slate-200',
            collapsed && 'absolute right-2'
          )}
        >
          {collapsed
            ? <ChevronRight className="h-4 w-4" />
            : <ChevronLeft  className="h-4 w-4" />
          }
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Navigation item
// ─────────────────────────────────────────────────────────────────────────────

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
          'flex items-center rounded-lg text-sm font-medium',
          'transition-colors duration-150',
          collapsed
            ? 'mx-auto w-10 h-10 justify-center'
            : 'mx-2 gap-3 px-3 py-2.5',
          isActive
            ? 'bg-white/10 text-white'
            : 'text-slate-400 hover:bg-white/8 hover:text-slate-200'
        )}
      >
        <Icon
          className={cn(
            'shrink-0',
            'h-5 w-5',
            isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'
          )}
          aria-hidden="true"
        />
        {!collapsed && <span className="truncate">{item.label}</span>}
        {isActive && !collapsed && (
          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0" />
        )}
      </NavLink>

      {/* Tooltip — only when collapsed */}
      {collapsed && (
        <div
          role="tooltip"
          className={cn(
            'pointer-events-none absolute left-full top-1/2 z-tooltip -translate-y-1/2',
            'ml-3 whitespace-nowrap rounded-md bg-slate-800',
            'px-2.5 py-1.5 text-xs font-medium text-white shadow-md',
            'opacity-0 group-hover:opacity-100 transition-opacity duration-150'
          )}
        >
          {item.label}
        </div>
      )}
    </li>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Inner sidebar content (shared between desktop and mobile)
// ─────────────────────────────────────────────────────────────────────────────

function SidebarContent({ collapsed = false, onNavigate, onToggle }) {
  const { user } = useAuth()
  const navItems = getNavItemsForRole(user?.role || 'ACCOUNT_HOLDER')
  const name     = displayName(user)
  const role     = formatRole(user?.role)
  const initial  = (user?.first_name?.[0] || user?.username?.[0] || '?').toUpperCase()

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <BrandHeader collapsed={collapsed} onToggle={onToggle} />

      {/* Navigation — overflow-hidden; use overflow-y-auto only if genuinely needed */}
      <nav
        aria-label="Main navigation"
        className={cn(
          'flex-1 py-2',
          collapsed ? 'overflow-hidden' : 'overflow-y-auto'
        )}
      >
        <ul className={cn('space-y-0.5', collapsed ? 'flex flex-col items-center' : '')}>
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
      <div className={cn(
        'border-t border-white/10 py-3',
        collapsed ? 'flex justify-center' : 'px-4'
      )}>
        {collapsed ? (
          <div className="group relative flex h-9 w-9 cursor-default items-center justify-center rounded-full bg-indigo-600/80 text-xs font-bold text-white">
            {initial}
            <div
              role="tooltip"
              className="pointer-events-none absolute left-full top-1/2 z-tooltip ml-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2.5 py-1.5 text-xs text-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-150"
            >
              {name || user?.username}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600/80 text-xs font-bold text-white">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{name || user?.username}</p>
              <p className="truncate text-[11px] text-slate-400">{role}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Desktop sidebar
// ─────────────────────────────────────────────────────────────────────────────

export function DesktopSidebar({ collapsed, onToggle }) {
  return (
    <aside
      className={cn(
        'relative hidden h-screen shrink-0 overflow-hidden bg-navy-900 md:flex md:flex-col',
        'transition-[width] duration-200 ease-in-out',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      <SidebarContent collapsed={collapsed} onToggle={onToggle} />
    </aside>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Mobile sidebar (off-canvas drawer, always full-width)
// ─────────────────────────────────────────────────────────────────────────────

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
        aria-hidden="true"
      />
      <aside
        className="absolute left-0 top-0 h-full w-64 overflow-hidden bg-navy-900 animate-slide-left shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-[14px] z-10 rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
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
