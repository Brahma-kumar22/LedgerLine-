/**
 * components/ui/Spinner.jsx
 *
 * Loading indicator. Sized for inline, button, or page-level use.
 */

import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'

const SIZES = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
}

export default function Spinner({ size = 'md', className }) {
  return <Loader2 className={cn('animate-spin text-slate-400', SIZES[size], className)} />
}

export function PageSpinner({ label = 'Loading…' }) {
  return (
    <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-3">
      <Spinner size="xl" />
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  )
}
