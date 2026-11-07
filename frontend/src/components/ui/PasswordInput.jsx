/**
 * components/ui/PasswordInput.jsx
 *
 * Password input with a show/hide toggle button.
 * Inherits all props from Input (label, error, hint, etc.).
 */

import { forwardRef, useState, useId } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import Input from './Input'

const PasswordInput = forwardRef(function PasswordInput(
  { id, ...props },
  ref
) {
  const [showPassword, setShowPassword] = useState(false)
  const toggleId = useId()

  return (
    <div className="relative">
      <Input ref={ref} id={id} type={showPassword ? 'text' : 'password'} {...props} />
      <button
        type="button"
        id={toggleId}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        onClick={() => setShowPassword((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        tabIndex={-1}
      >
        {showPassword ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </button>
    </div>
  )
})

export default PasswordInput
