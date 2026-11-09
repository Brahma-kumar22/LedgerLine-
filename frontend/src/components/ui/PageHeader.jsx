/**
 * components/ui/PageHeader.jsx
 *
 * Page-level heading component.
 *
 * Provides a consistent, accessible h1 heading with optional subtitle
 * and right-aligned action area. Used on every authenticated page to
 * ensure one clear page title per screen.
 *
 * Note: Breadcrumbs.jsx is responsible for preventing duplicate headings —
 * it returns null for single-segment paths so the PageHeader is the sole
 * visible title on pages like /dashboard and /accounts.
 */

import { cn } from '../../lib/utils'

export default function PageHeader({ title, subtitle, actions, className }) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-slate-500 sm:text-base">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  )
}
