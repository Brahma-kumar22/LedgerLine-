/**
 * components/layout/Breadcrumbs.jsx
 *
 * Breadcrumb trail for the current page.
 * Derived from the current URL path segments.
 *
 * DEDUPLICATION RULE:
 *   When the URL has only ONE segment (e.g. /dashboard, /accounts,
 *   /transactions), the breadcrumb would show just "Dashboard" — which is
 *   already shown prominently by each page's <PageHeader>.  Rendering it
 *   here too creates the duplicate heading visible in the screenshot.
 *
 *   This component returns null for single-segment paths.
 *   It only renders when there are two or more segments, e.g.:
 *     /accounts/abc-123           → Accounts > abc-12…
 *     /accounts/abc-123/statement → Accounts > abc-12… > Statement
 *     /transactions/deposit       → Transactions > Deposit
 *
 * For UUID segments (36 chars with hyphens), we show only the first 8 chars
 * + ellipsis to keep the breadcrumb scannable.
 */

import { Link, useLocation } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

import { cn, truncate } from '../../lib/utils'

const SEGMENT_LABELS = {
  dashboard:       'Dashboard',
  accounts:        'Accounts',
  transactions:    'Transactions',
  audit:           'Audit Log',
  users:           'Users',
  reconciliation:  'Reconciliation',
  settings:        'Settings',
  statement:       'Statement',
  deposit:         'Deposit',
  withdraw:        'Withdraw',
  transfer:        'Transfer',
}

function getLabel(segment) {
  if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment]
  // UUID — show truncated form
  if (segment.length >= 32 && segment.includes('-')) {
    return truncate(segment, 12)
  }
  return segment.charAt(0).toUpperCase() + segment.slice(1)
}

export default function Breadcrumbs({ className }) {
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean)

  // Single-segment paths: the page's own <PageHeader> is the title.
  // Showing the same word here as a breadcrumb creates the duplicate heading.
  if (segments.length <= 1) return null

  const crumbs = []
  let path = ''
  for (let i = 0; i < segments.length; i++) {
    path += `/${segments[i]}`
    crumbs.push({
      label:  getLabel(segments[i]),
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
              <span className="font-medium text-slate-600" aria-current="page">
                {crumb.label}
              </span>
            ) : (
              <Link to={crumb.path} className="text-slate-400 hover:text-slate-600">
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
