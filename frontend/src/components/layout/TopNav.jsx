/**
 * components/layout/TopNav.jsx
 *
 * Top navigation bar with mobile menu toggle and user profile dropdown.
 *
 * Contains:
 *   - Mobile hamburger menu (shows sidebar drawer on tap)
 *   - Page title / breadcrumb area (rendered by parent)
 *   - User profile dropdown (profile, settings, logout)
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, ChevronDown, LogOut, Settings } from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/utils'

export default function TopNav({ onMenuClick }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleLogout() {
    setDropdownOpen(false)
    logout()
  }

  function handleSettings() {
    setDropdownOpen(false)
    navigate('/settings')
  }

  const displayName =
    user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`
      : user?.username || 'User'

  return (
    <header className="sticky top-0 z-200 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
      {/* Left: mobile menu button */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 md:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Right: user profile dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen((s) => !s)}
          className="flex items-center gap-2 rounded-md py-1.5 pl-2 pr-3 hover:bg-slate-100"
          aria-expanded={dropdownOpen}
          aria-haspopup="menu"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-700 text-xs font-semibold text-white">
            {user?.first_name?.[0] || user?.username?.[0]?.toUpperCase() || '?'}
          </div>
          <span className="hidden text-sm font-medium text-slate-700 sm:inline">
            {displayName}
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-slate-400 transition-transform',
              dropdownOpen && 'rotate-180'
            )}
          />
        </button>

        {/* Dropdown menu */}
        {dropdownOpen && (
          <div
            role="menu"
            className="absolute right-0 top-12 w-56 rounded-lg border border-slate-200 bg-white py-1.5 shadow-lg animate-fade-in-up"
          >
            {/* User info header */}
            <div className="border-b border-slate-100 px-3 py-2">
              <p className="truncate text-sm font-medium text-slate-900">{displayName}</p>
              <p className="truncate text-xs text-slate-500">{user?.email}</p>
            </div>

            <button
              type="button"
              role="menuitem"
              onClick={handleSettings}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              <Settings className="h-4 w-4 text-slate-400" />
              Settings
            </button>

            <div className="my-1 border-t border-slate-100" />

            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
