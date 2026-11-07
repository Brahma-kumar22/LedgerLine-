/**
 * components/layout/Breadcrumbs.jsx
 *
 * Breadcrumb trail for the current page.
 * Derived from the current URL path segments.
 *
 * Example:
 *   /accounts/abc-123/statement → Accounts > abc-123 > Statement
 *
 * For UUID segments (36 chars with dashes), we truncate to 8 chars + ellipsis
 * to keep the breadcrumb readable.
 */

import { Link, useLocation } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

import { cn, truncate } from '../../lib/utils'

// Map path segments to human-readable labels
const SEGMENT_LABELS = {
  dashboard: 'Dashboard',
  accounts: 'Accounts',
  transactions: 'Transactions',
  audit: 'Audit Log',
  users: 'Users',
  reconciliation: 'Reconciliation',
  settings: 'Settings',
  statement: 'Statement',
  deposit: 'Deposit',
  withdraw: 'Withdraw',
  transfer: 'Transfer',
}

function getLabel(segment) {
  // Check the label map first
  if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment]

  // If it looks like a UUID, truncate for display
  if (segment.length >= 32 && segment.includes('-')) {
    return truncate(segment, 12)
  }

  // Capitalize otherwise
  return segment.charAt(0).toUpperCase() + segment.slice(1)
}

export default function Breadcrumbs({ className }) {
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean)

  if (segments.length === 0) return null

  // Build the breadcrumb items with their full paths
  const crumbs = []
  let path = ''
  for (let i = 0; i < segments.length; i++) {
    path += `/${segments[i]}`
    crumbs.push({
      label: getLabel(segments[i]),
      path,
      isLast: i === segments.length - 1,
    })
  }

  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center', className)}>
      <ol className="flex items-center gap-1 text-sm">
        {crumbs.map((crumb, i) => (
          <li key={crumb.path} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight className="h-3.5 w-3.5 text-slate-300" aria-hidden="true" />
            )}
            {crumb.isLast ? (
              <span className="font-medium text-slate-700" aria-current="page">
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.path}
                className="text-slate-400 hover:text-slate-600"
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
