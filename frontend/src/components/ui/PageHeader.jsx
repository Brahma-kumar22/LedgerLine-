/**
 * components/ui/PageHeader.jsx
 *
 * Page title + optional subtitle and action area.
 * Consistent across all authenticated pages.
 */

import { cn } from '../../lib/utils'

export default function PageHeader({ title, subtitle, actions, className }) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
