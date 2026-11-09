/**
 * components/ui/MonvexLogo.jsx
 *
 * Official MONVEX brand icon.
 *
 * IMPLEMENTATION:
 *   Uses the actual PNG asset supplied with the brand kit.
 *   The PNG must be placed at:
 *     frontend/public/monvex-logo.png
 *
 *   It is served as a static asset by Vite from /public/ — no import needed.
 *   The URL is /monvex-logo.png in both development and production builds.
 *
 *   Requirements met:
 *   ✓ Uses the exact supplied PNG — no SVG recreation
 *   ✓ Preserves original gradients, transparency and glow
 *   ✓ Never stretches or distorts (object-contain)
 *   ✓ Works on dark (sidebar) and light (auth pages) backgrounds
 *   ✓ Accessible: role="img" + aria-label
 *   ✓ Square 1:1 aspect ratio enforced via width/height props
 *
 * Props:
 *   size      — pixel size for both width and height (default 40)
 *   className — additional Tailwind/CSS classes
 */

export default function MonvexLogo({ size = 40, className = '' }) {
  return (
    <img
      src="/monvex-logo.png"
      alt="MONVEX logo"
      role="img"
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
      className={className}
      draggable={false}
    />
  )
}
