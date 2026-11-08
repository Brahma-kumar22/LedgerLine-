/**
 * components/ui/MonvexLogo.jsx
 *
 * Official MONVEX brand icon as a React SVG component.
 *
 * Reproduces the supplied brand image:
 *   - Stylized M letterform with three rounded-pill legs
 *   - Diagonal ribbon cross-stroke (the 3D ribbon / flowing band effect)
 *   - Purple → violet → pink gradient palette
 *   - Transparent background so it works on any surface
 *
 * Props:
 *   size   — number (pixels, applied to both width and height). Default 40.
 *   className — additional CSS classes (e.g. for rounded-xl container).
 *
 * Usage:
 *   <MonvexLogo size={32} />          // bare SVG, 32×32
 *   <MonvexLogo size={48} />          // bare SVG, 48×48
 *
 * The icon is always rendered at a square 1:1 aspect ratio.
 * Never stretch or distort it by passing unequal width/height.
 */

export default function MonvexLogo({ size = 40, className = '' }) {
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
        {/* Left-side gradient: deep purple → soft lavender */}
        <linearGradient id="ml-gLeft" x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0%"   stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#c4b5fd" />
        </linearGradient>

        {/* Right-side gradient: pink/magenta → deep purple */}
        <linearGradient id="ml-gRight" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#f0abfc" />
          <stop offset="60%"  stopColor="#a855f7" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>

        {/* Diagonal ribbon gradient: indigo → violet */}
        <linearGradient id="ml-gDiag" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#5b21b6" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>

        {/* Top-right arm: vibrant pink fade */}
        <linearGradient id="ml-gArmR" x1="1" y1="0" x2="0.5" y2="1">
          <stop offset="0%"   stopColor="#f0abfc" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>

      {/* ── Left vertical leg — rounded pill ── */}
      <rect
        x="5" y="8" width="21" height="66"
        rx="10.5"
        fill="url(#ml-gLeft)"
        transform="rotate(-1 15.5 41)"
      />

      {/* ── Right vertical leg — open-bottom arch shape ── */}
      {/* Base pill */}
      <rect
        x="73" y="32" width="21" height="48"
        rx="10.5"
        fill="url(#ml-gRight)"
      />
      {/* Inner cutout to create the open-bottom arch */}
      <ellipse
        cx="83.5" cy="72" rx="8" ry="9"
        fill="white"
      />

      {/* ── Left-top descending arm (left peak of M) ── */}
      <rect
        x="13" y="5" width="21" height="60"
        rx="10.5"
        fill="url(#ml-gLeft)"
        transform="rotate(-28 23.5 35)"
      />

      {/* ── Right-top descending arm (right peak of M) ── */}
      <rect
        x="52" y="5" width="21" height="60"
        rx="10.5"
        fill="url(#ml-gArmR)"
        transform="rotate(28 62.5 35)"
      />

      {/* ── Diagonal ribbon / cross-stroke ── */}
      {/* This is the defining feature of the brand icon: the flowing band
          that cuts across the M from upper-right to lower-left              */}
      <rect
        x="8" y="43" width="82" height="19"
        rx="9.5"
        fill="url(#ml-gDiag)"
        transform="rotate(-32 49 52.5)"
      />
    </svg>
  )
}
