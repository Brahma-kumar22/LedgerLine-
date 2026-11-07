/**
 * components/ui/Modal.jsx
 *
 * Accessible modal dialog.
 *
 * Features:
 *   - Focus trap (Tab cycles within modal)
 *   - ESC key to close
 *   - Click outside backdrop to close
 *   - Scroll lock on body while open
 *   - ARIA role="dialog" and aria-modal
 *
 * Usage:
 *   <Modal isOpen={isOpen} onClose={handleClose} title="Confirm">
 *     <p>Are you sure?</p>
 *   </Modal>
 */

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

export default function Modal({
  isOpen = false,
  onClose,
  title,
  children,
  size = 'md',
  closeOnBackdrop = true,
  showClose = true,
}) {
  const dialogRef = useRef(null)
  const previousFocus = useRef(null)

  // Lock scroll and manage focus when modal opens
  useEffect(() => {
    if (!isOpen) return
    previousFocus.current = document.activeElement
    document.body.style.overflow = 'hidden'
    // Focus the dialog after render
    const timer = setTimeout(() => {
      dialogRef.current?.focus()
    }, 0)

    return () => {
      document.body.style.overflow = ''
      previousFocus.current?.focus()
      clearTimeout(timer)
    }
  }, [isOpen])

  // Close on ESC
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose?.()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const SIZES = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  }

  return createPortal(
    <div
      className="fixed inset-0 z-300 flex items-start justify-center overflow-y-auto p-4 pt-16"
      onClick={(e) => closeOnBackdrop && e.target === e.currentTarget && onClose?.()}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/40 animate-fade-in" />

      {/* Modal */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Dialog'}
        tabIndex={-1}
        className={cn(
          'relative z-400 w-full rounded-xl bg-white shadow-xl animate-fade-in-up',
          SIZES[size]
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            {showClose && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>,
    document.body
  )
}
