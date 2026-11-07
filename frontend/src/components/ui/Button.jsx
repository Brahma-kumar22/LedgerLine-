/**
 * components/ui/Button.jsx
 *
 * Primary button component with complete variant and state support.
 *
 * Variants:
 *   primary   — indigo background, white text (default actions)
 *   secondary — white background, slate border (alternative actions)
 *   ghost     — transparent background, subtle text (contextual)
 *   danger    — red background, white text (destructive actions)
 *   subtle    — light background (table row actions)
 *
 * Sizes:
 *   xs  — 28px height, 12px font
 *   sm  — 32px height, 13px font
 *   md  — 38px height, 14px font (default)
 *   lg  — 44px height, 15px font
 *
 * States:
 *   loading — shows a spinner, disables interaction
 *   disabled — greyed out, no pointer
 *
 * Accessibility:
 *   - Uses <button> element (keyboard-focusable, Enter/Space activation)
 *   - aria-busy when loading
 *   - aria-disabled when disabled
 */

import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'

const VARIANTS = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 shadow-xs',
  secondary:
    'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 active:bg-slate-100 shadow-xs',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 active:bg-slate-200',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-xs',
  subtle: 'bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300',
}

const SIZES = {
  xs: 'h-7 px-2.5 text-xs gap-1',
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-9.5 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-md gap-2',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  iconRight: IconRight,
  iconProps,
  className,
  type = 'button',
  ...props
}) {
  const isDisabled = disabled || loading

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading}
      aria-disabled={isDisabled}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium',
        'transition-colors duration-150 select-none',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        Icon && <Icon className="h-4 w-4 shrink-0" {...iconProps} aria-hidden="true" />
      )}
      {children}
      {!loading && IconRight && (
        <IconRight className="h-4 w-4 shrink-0" aria-hidden="true" />
      )}
    </button>
  )
}
