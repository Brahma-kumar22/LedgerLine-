/**
 * components/layout/TopNav.jsx
 *
 * Premium top navigation bar.
 *
 * - Sticky, with a subtle bottom border
 * - Mobile hamburger for the off-canvas sidebar
 * - User profile dropdown: name, email, role, settings, sign out
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, ChevronDown, LogOut, Settings, User } from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import { cn, displayName, formatRole } from '../../lib/utils'

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

  // Close dropdown on ESC
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') setDropdownOpen(false)
    }
    if (dropdownOpen) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [dropdownOpen])

  const name    = displayName(user)
  const role    = formatRole(user?.role)
  const initial = (user?.first_name?.[0] || user?.username?.[0] || '?').toUpperCase()

  return (
    <header className="sticky top-0 z-sticky flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-sm md:px-6">

      {/* Left: mobile menu button */}
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 md:hidden"
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Spacer on desktop (breadcrumbs live in the page content area) */}
      <div className="hidden md:block" />

      {/* Right: user profile dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen((s) => !s)}
          aria-expanded={dropdownOpen}
          aria-haspopup="menu"
          className={cn(
            'flex items-center gap-2 rounded-lg px-2 py-1.5',
            'transition-colors duration-150',
            dropdownOpen
              ? 'bg-slate-100'
              : 'hover:bg-slate-50'
          )}
        >
          {/* Avatar */}
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
            {initial}
          </div>
          {/* Name */}
          <span className="hidden text-sm font-medium text-slate-700 sm:inline">
            {name || user?.username}
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-slate-400 transition-transform duration-150',
              dropdownOpen && 'rotate-180'
            )}
          />
        </button>

        {/* Dropdown */}
        {dropdownOpen && (
          <div
            role="menu"
            aria-label="User menu"
            className={cn(
              'absolute right-0 top-[calc(100%+6px)] w-60',
              'rounded-xl border border-slate-200 bg-white shadow-xl',
              'py-1.5 animate-fade-in-up'
            )}
          >
            {/* User summary */}
            <div className="border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                  {initial}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
                  <p className="truncate text-xs text-slate-500">{user?.email}</p>
                  <span className="mt-0.5 inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                    {role}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="py-1">
              <button
                type="button"
                role="menuitem"
                onClick={() => { setDropdownOpen(false); navigate('/settings') }}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                <Settings className="h-4 w-4 text-slate-400" />
                Settings
              </button>
            </div>

            <div className="border-t border-slate-100 py-1">
              <button
                type="button"
                role="menuitem"
                onClick={() => { setDropdownOpen(false); logout() }}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
