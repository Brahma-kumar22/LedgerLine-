/**
 * components/ui/Skeleton.jsx
 *
 * Loading placeholder for content that hasn't loaded yet.
 * Uses the skeleton-pulse animation from index.css.
 * Shapes: text, rect, circle.
 */

import { cn } from '../../lib/utils'

export function Skeleton({ className, rounded = 'md' }) {
  return (
    <div
      className={cn(
        'animate-skeleton bg-slate-200',
        rounded === 'full' ? 'rounded-full' : 'rounded-md',
        className
      )}
      aria-hidden="true"
    />
  )
}

export function SkeletonText({ lines = 3, className }) {
  return (
    <div className={cn('space-y-2', className)} role="status" aria-label="Loading">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-3.5', i === lines - 1 && 'w-2/3')}
        />
      ))}
      <span className="sr-only">Loading content…</span>
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="w-full" role="status" aria-label="Loading table">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 border-b border-slate-100 py-3">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
      <span className="sr-only">Loading table data…</span>
    </div>
  )
}

export default Skeleton
