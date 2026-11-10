/**
 * components/ui/MonvexLogo.jsx
 *
 * Official MONVEX brand icon component.
 *
 * ASSET REQUIREMENT:
 *   Place the official MONVEX M logo PNG at:
 *     frontend/public/monvex-logo.png
 *
 *   Vite serves everything in public/ at the root URL.
 *   The browser loads it as /monvex-logo.png with no import needed.
 *
 * FALLBACK:
 *   If the PNG has not been placed yet, onError falls back to an inline
 *   SVG that approximates the brand purple gradient identity so the layout
 *   never shows a broken-image icon.
 *
 * Props:
 *   size      — number (applied as both width and height in px). Default 32.
 *   className — extra CSS classes on the wrapper element.
 */

import { useState } from 'react'

function FallbackM({ size }) {
  /* Inline SVG fallback — purple gradient M. Only shown if PNG is missing. */
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-label="MONVEX logo"
      role="img"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="fb-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="50%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#fb-g)" />
      <text
        x="32" y="46"
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="800"
        fontSize="34"
        fill="white"
        letterSpacing="-1"
      >
        M
      </text>
    </svg>
  )
}

export default function MonvexLogo({ size = 32, className = '' }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <span
        className={className}
        style={{ display: 'block', width: size, height: size, flexShrink: 0 }}
      >
        <FallbackM size={size} />
      </span>
    )
  }

  return (
    <img
      src="/monvex-logo.png"
      alt="MONVEX logo"
      role="img"
      width={size}
      height={size}
      onError={() => setFailed(true)}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        display: 'block',
        flexShrink: 0,
      }}
      className={className}
      draggable={false}
    />
  )
}
