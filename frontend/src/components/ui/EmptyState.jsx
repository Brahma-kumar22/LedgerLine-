/**
 * components/ui/EmptyState.jsx
 *
 * Placeholder shown when a list or page has no data.
 * Provides a clear message and optional call-to-action.
 */

import { cn } from '../../lib/utils'

export default function EmptyState({
  icon: Icon,
  title = 'No data yet',
  message,
  action,
  className,
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 py-12 text-center',
        className
      )}
    >
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <Icon className="h-6 w-6 text-slate-400" />
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-700">{title}</h3>
      {message && (
        <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
