/**
 * components/ui/ErrorState.jsx
 *
 * Error display shown when an API call fails or data cannot be loaded.
 * Never displays stack traces or internal error details.
 */

import { AlertCircle } from 'lucide-react'
import Button from './Button'
import { cn } from '../../lib/utils'

export default function ErrorState({
  title = 'Something went wrong',
  message = 'We could not load this data. Please try again.',
  onRetry,
  retryLabel = 'Try again',
  className,
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 py-12 text-center',
        className
      )}
      role="alert"
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
        <AlertCircle className="h-6 w-6 text-red-500" />
      </div>
      <h3 className="text-base font-semibold text-slate-700">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-4">
          {retryLabel}
        </Button>
      )}
    </div>
  )
}
