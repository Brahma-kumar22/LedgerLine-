/**
 * components/ui/Input.jsx
 *
 * Text input with label, error message, and optional leading/trailing icons.
 * Uses semantic <label> + <input> structure for screen-reader accessibility.
 */

import { forwardRef, useId } from 'react'
import { cn } from '../../lib/utils'

const SIZES = {
  sm: 'h-8 text-sm',
  md: 'h-10 text-sm',
  lg: 'h-11 text-base',
}

const Input = forwardRef(function Input(
  {
    label,
    error,
    hint,
    size = 'md',
    icon: Icon,
    iconRight: IconRight,
    className,
    id,
    required = false,
    ...props
  },
  ref
) {
  const autoId = useId()
  const inputId = id || autoId
  const errorId = `${inputId}-error`
  const hintId = `${inputId}-hint`

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={cn(
            'w-full rounded-md border bg-white px-3 text-slate-900',
            'placeholder:text-slate-400',
            'transition-colors duration-150',
            'focus:border-indigo-500 focus:outline-none',
            SIZES[size],
            Icon && 'pl-9',
            IconRight && 'pr-9',
            error
              ? 'border-red-300 focus:border-red-500'
              : 'border-slate-300 hover:border-slate-400',
            'disabled:bg-slate-50 disabled:cursor-not-allowed',
            className
          )}
          {...props}
        />
        {IconRight && (
          <IconRight
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
        )}
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-xs text-slate-500">
          {hint}
        </p>
      )}
    </div>
  )
})

export default Input
