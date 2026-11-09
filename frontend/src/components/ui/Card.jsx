/**
 * components/ui/Card.jsx
 *
 * Surface container with optional header, body padding, and border.
 * Uses <div> with role="region" when a title is provided.
 */

import { cn } from '../../lib/utils'

export function Card({ children, className, padded = true, ...props }) {
  return (
    <div
      className={cn(
        'rounded-lg border border-slate-200 bg-white shadow-xs',
        padded && 'p-6',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, title, subtitle, action, className }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        {title && (
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        )}
        {subtitle && (
          <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
        )}
        {children}
      </div>
      {action}
    </div>
  )
}

export function CardBody({ children, className: _c }) {
  return <div className={_c}>{children}</div>
}

export default Card
