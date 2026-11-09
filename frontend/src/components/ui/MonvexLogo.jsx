/**
 * components/ui/MonvexLogo.jsx
 *
 * Official MONVEX brand icon as an inline SVG React component.
 *
 * The gradient M letterform with diagonal ribbon cross-stroke,
 * purple → violet → pink palette, on a transparent background.
 *
 * BUG FIX: SVG gradient `id` attributes must be unique per document.
 * Previously the IDs were hardcoded (`ml-gLeft` etc.), which caused
 * gradient references to cross-pollinate when two MonvexLogo instances
 * rendered on the same page (e.g. sidebar + a modal).
 *
 * Fix: `useId()` generates a React-stable unique string per component
 * instance. Gradient IDs are prefixed with this string so they are
 * unique across the DOM regardless of how many instances are rendered.
 *
 * Props:
 *   size      — number (px applied to width and height). Default 40.
 *   className — additional CSS classes.
 */

import { useId } from 'react'

export default function MonvexLogo({ size = 40, className = '' }) {
  const uid = useId().replace(/:/g, '')  // useId returns ":r0:" etc — strip colons for valid SVG IDs

  const ids = {
    gLeft:  `${uid}-gLeft`,
    gRight: `${uid}-gRight`,
    gDiag:  `${uid}-gDiag`,
    gArmR:  `${uid}-gArmR`,
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      fill="none"
      aria-label="MONVEX logo"
      role="img"
      className={className}
    >
      <defs>
        <linearGradient id={ids.gLeft} x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0%"   stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#c4b5fd" />
        </linearGradient>

        <linearGradient id={ids.gRight} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#f0abfc" />
          <stop offset="60%"  stopColor="#a855f7" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>

        <linearGradient id={ids.gDiag} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#5b21b6" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>

        <linearGradient id={ids.gArmR} x1="1" y1="0" x2="0.5" y2="1">
          <stop offset="0%"   stopColor="#f0abfc" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>

      {/* Left vertical leg */}
      <rect
        x="5" y="8" width="21" height="66"
        rx="10.5"
        fill={`url(#${ids.gLeft})`}
        transform="rotate(-1 15.5 41)"
      />

      {/* Right vertical leg */}
      <rect
        x="73" y="32" width="21" height="48"
        rx="10.5"
        fill={`url(#${ids.gRight})`}
      />
      <ellipse cx="83.5" cy="72" rx="8" ry="9" fill="white" />

      {/* Left-top descending arm */}
      <rect
        x="13" y="5" width="21" height="60"
        rx="10.5"
        fill={`url(#${ids.gLeft})`}
        transform="rotate(-28 23.5 35)"
      />

      {/* Right-top descending arm */}
      <rect
        x="52" y="5" width="21" height="60"
        rx="10.5"
        fill={`url(#${ids.gArmR})`}
        transform="rotate(28 62.5 35)"
      />

      {/* Diagonal ribbon cross-stroke */}
      <rect
        x="8" y="43" width="82" height="19"
        rx="9.5"
        fill={`url(#${ids.gDiag})`}
        transform="rotate(-32 49 52.5)"
      />
    </svg>
  )
}
