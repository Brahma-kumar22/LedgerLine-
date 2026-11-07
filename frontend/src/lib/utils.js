/**
 * lib/utils.js
 *
 * Shared utility functions for MONVEX frontend.
 */

import clsx from 'clsx'

/**
 * Merge class names conditionally.
 * Filters falsy values and joins truthy ones with spaces.
 *
 * Usage: cn('btn', isActive && 'btn-active', { 'btn-lg': size === 'lg' })
 *
 * @param  {...any} classes
 * @returns {string}
 */
export function cn(...classes) {
  return clsx(classes)
}

/**
 * Format a monetary amount for display.
 * Uses Intl.NumberFormat for locale-aware formatting.
 *
 * @param {number|string} amount — the amount to format
 * @param {string} currency — ISO 4217 code (default 'USD')
 * @returns {string} formatted string like "$1,234.56"
 */
export function formatCurrency(amount, currency = 'USD') {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (num === null || num === undefined || isNaN(num)) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

/**
 * Format an ISO datetime string for display.
 *
 * @param {string} isoString — ISO 8601 datetime
 * @param {boolean} includeTime — whether to include time (default true)
 * @returns {string} formatted like "Nov 6, 2026, 3:45 PM"
 */
export function formatDate(isoString, includeTime = true) {
  if (!isoString) return '—'
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return isoString
  const options = { year: 'numeric', month: 'short', day: 'numeric' }
  if (includeTime) {
    options.hour = 'numeric'
    options.minute = '2-digit'
  }
  return date.toLocaleString('en-US', options)
}

/**
 * Generate a fresh UUID v4 string for idempotency keys.
 * Uses crypto.randomUUID when available, falls back to manual generation.
 *
 * @returns {string}
 */
export function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Truncate a string to a max length, adding an ellipsis.
 *
 * @param {string} str
 * @param {number} maxLen
 * @returns {string}
 */
export function truncate(str, maxLen = 50) {
  if (!str) return ''
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen - 1) + '…'
}

/**
 * Capitalize the first letter of a string.
 *
 * @param {string} str
 * @returns {string}
 */
export function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

/**
 * Sleep for a given number of milliseconds.
 * Useful for staggered animation delays.
 *
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
