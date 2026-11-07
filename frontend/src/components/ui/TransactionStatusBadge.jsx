/**
 * components/ui/TransactionStatusBadge.jsx
 *
 * Maps backend transaction status values to semantic badge colors.
 *
 * Status → Color mapping:
 *   PENDING   → warning (amber)
 *   COMPLETED → success (emerald)
 *   FAILED    → danger (red)
 *   REVERSED  → neutral (slate)
 */

import Badge from './Badge'
import { capitalize } from '../../lib/utils'

const STATUS_COLORS = {
  PENDING: 'warning',
  COMPLETED: 'success',
  FAILED: 'danger',
  REVERSED: 'neutral',
}

export default function TransactionStatusBadge({ status, size = 'sm' }) {
  if (!status) return null
  const color = STATUS_COLORS[status] || 'neutral'
  return (
    <Badge color={color} size={size}>
      {capitalize(status)}
    </Badge>
  )
}
