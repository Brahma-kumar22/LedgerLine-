/**
 * components/ui/Badge.jsx
 *
 * Small status label. Used for transaction status, role labels, etc.
 *
 * Colors map to semantic states:
 *   neutral  — grey background
 *   success  — green (completed, active)
 *   warning  — amber (pending)
 *   danger   — red (failed, error)
 *   info     — blue (informational)
 */

import { cn } from '../../lib/utils'

const COLORS = {
  neutral: 'bg-slate-100 text-slate-600',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-700',
  info: 'bg-sky-50 text-sky-700',
}

const SIZES = {
  xs: 'h-4 px-1.5 text-2xs',
  sm: 'h-5 px-2 text-xs',
  md: 'h-6 px-2.5 text-xs',
}

export default function Badge({
  children,
  color = 'neutral',
  size = 'sm',
  rounded = 'full',
  className,
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium whitespace-nowrap',
        COLORS[color],
        SIZES[size],
        rounded === 'full' ? 'rounded-full' : 'rounded-md',
        className
      )}
    >
      {children}
    </span>
  )
}
