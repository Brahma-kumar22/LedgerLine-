/**
 * components/ui/Select.jsx
 *
 * Select dropdown with label and error.
 * Uses native <select> for accessibility and mobile compatibility.
 */

import { forwardRef, useId } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'

const Select = forwardRef(function Select(
  {
    label,
    error,
    hint,
    children,
    className,
    id,
    required = false,
    placeholder,
    ...props
  },
  ref
) {
  const autoId = useId()
  const selectId = id || autoId
  const errorId = `${selectId}-error`

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'h-9.5 w-full appearance-none rounded-md border bg-white px-3 pr-9 text-sm text-slate-900',
            'focus:border-indigo-500 focus:outline-none',
            'disabled:cursor-not-allowed disabled:bg-slate-50',
            error
              ? 'border-red-300 focus:border-red-500'
              : 'border-slate-300 hover:border-slate-400',
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      )}
    </div>
  )
})

export default Select
