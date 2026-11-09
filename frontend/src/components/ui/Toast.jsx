/**
 * components/ui/Toast.jsx
 *
 * Toast notification system.
 *
 * ToastContext provides a `useToast()` hook:
 *   const toast = useToast()
 *   toast.success('Transaction completed')
 *   toast.error('Insufficient funds')
 *   toast.info('Idempotency replay')
 *
 * Toasts auto-dismiss after 4 seconds (configurable).
 * Multiple toasts can stack.
 */

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import { cn } from '../../lib/utils'

// ── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within <ToastProvider>')
  }
  return ctx
}

// ── Types ────────────────────────────────────────────────────────────────────

const TOAST_TYPES = {
  success: { icon: CheckCircle2, bg: 'bg-emerald-50', text: 'text-emerald-700', iconColor: 'text-emerald-500' },
  error: { icon: XCircle, bg: 'bg-red-50', text: 'text-red-700', iconColor: 'text-red-500' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-50', text: 'text-amber-700', iconColor: 'text-amber-500' },
  info: { icon: Info, bg: 'bg-sky-50', text: 'text-sky-700', iconColor: 'text-sky-500' },
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const show = useCallback(
    (type, message, duration = 4000) => {
      const id = Date.now() + Math.random()
      setToasts((prev) => [...prev, { id, type, message }])
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration)
      }
    },
    [dismiss]
  )

  const toast = useMemo(
    () => ({
      success: (msg, d) => show('success', msg, d),
      error: (msg, d) => show('error', msg, d),
      warning: (msg, d) => show('warning', msg, d),
      info: (msg, d) => show('info', msg, d),
    }),
    [show]
  )

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast container — fixed top-right, above all content */}
      <div
        className="fixed right-4 top-4 z-toast flex flex-col gap-2"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((t) => {
          const config = TOAST_TYPES[t.type] || TOAST_TYPES.info
          const Icon = config.icon
          return (
            <div
              key={t.id}
              className={cn(
                'flex items-start gap-3 rounded-lg border border-slate-200 px-4 py-3 shadow-lg',
                'animate-slide-right w-80',
                config.bg
              )}
              role="alert"
            >
              <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', config.iconColor)} />
              <p className={cn('flex-1 text-sm', config.text)}>{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="shrink-0 text-slate-400 hover:text-slate-600"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export default ToastProvider
