/**
 * components/ui/PasswordInput.jsx
 *
 * Password input with a show/hide toggle button.
 *
 * FIX: The toggle button must be positioned relative to the input field
 * itself, not the outer wrapper that includes the label.  We pass `iconRight`
 * as a render-prop substitute using the underlying Input's own slot, but
 * since Input's iconRight is a static icon we instead render the button as
 * a sibling inside Input's wrapper div via the `iconRight` slot.
 *
 * To avoid fighting with Input's internal layout, we override the input
 * type dynamically and add the toggle button absolutely within a wrapper
 * that sits BELOW the label — matching Input's own "relative" wrapper.
 */

import { forwardRef, useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '../../lib/utils'

const SIZES = {
  sm: 'h-8 text-sm',
  md: 'h-9.5 text-sm',
  lg: 'h-11 text-md',
}

const PasswordInput = forwardRef(function PasswordInput(
  {
    label,
    error,
    hint,
    size = 'md',
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
  const hintId  = `${inputId}-hint`

  const [showPassword, setShowPassword] = useState(false)

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

      {/* This div is the reference frame for the absolute toggle button */}
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={showPassword ? 'text' : 'password'}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={cn(
            'w-full rounded-md border bg-white pl-3 pr-10 text-slate-900',
            'placeholder:text-slate-400',
            'transition-colors duration-150',
            'focus:border-indigo-500 focus:outline-none',
            SIZES[size],
            error
              ? 'border-red-300 focus:border-red-500'
              : 'border-slate-300 hover:border-slate-400',
            'disabled:bg-slate-50 disabled:cursor-not-allowed',
            className
          )}
          {...props}
        />

        {/* Toggle sits inside the input row, right-aligned */}
        <button
          type="button"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          onClick={() => setShowPassword((s) => !s)}
          tabIndex={-1}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
        >
          {showPassword
            ? <EyeOff className="h-4 w-4" />
            : <Eye className="h-4 w-4" />
          }
        </button>
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

export default PasswordInput
