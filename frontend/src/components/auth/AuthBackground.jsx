/**
 * components/auth/AuthBackground.jsx
 *
 * Full-screen SVG background for Login and Register pages.
 *
 * Stored INSIDE the application as a React component — Vite bundles it
 * directly, so it deploys with the code on Vercel with no external files,
 * no public/ folder dependency, and no runtime image loading.
 *
 * Faithfully reproduces the supplied MONVEX brand background:
 *   - Deep navy/indigo gradient base  (#0a0a2e → #1a0860 → #0d0450)
 *   - Circular arc behind the temple (left side)
 *   - Greek temple silhouette (bottom-left) with purple glow
 *   - Temple reflection below the glow line
 *   - Large M lettermark (right side, dark indigo/violet)
 *   - Purple wave curves (bottom-right)
 *   - Thin bright wave lines
 *   - Subtle sparkle lines (top)
 */

export default function AuthBackground() {
  return (
    <div
      aria-hidden="true"
      style={{
        position:   'absolute',
        inset:      0,
        overflow:   'hidden',
        zIndex:     0,
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <defs>
          {/* ── Base gradient ── */}
          <linearGradient id="bg-base" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor="#06052b" />
            <stop offset="35%"  stopColor="#0d0450" />
            <stop offset="65%"  stopColor="#120863" />
            <stop offset="100%" stopColor="#07042a" />
          </linearGradient>

          {/* ── Temple glow — radial, bottom-left ── */}
          <radialGradient id="temple-glow" cx="22%" cy="85%" r="35%">
            <stop offset="0%"   stopColor="#6d28d9" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#6d28d9" stopOpacity="0" />
          </radialGradient>

          {/* ── Secondary glow — right side ── */}
          <radialGradient id="right-glow" cx="80%" cy="75%" r="30%">
            <stop offset="0%"   stopColor="#7c3aed" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </radialGradient>

          {/* ── Wave fill gradient ── */}
          <linearGradient id="wave-fill" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#6d28d9" stopOpacity="0.0" />
            <stop offset="45%"  stopColor="#7c3aed" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="wave-fill2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#5b21b6" stopOpacity="0.0" />
            <stop offset="55%"  stopColor="#8b5cf6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0.3" />
          </linearGradient>

          {/* ── Temple gradient ── */}
          <linearGradient id="temple-col" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#8b78f8" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#6d28d9" stopOpacity="0.3" />
          </linearGradient>

          {/* ── M lettermark gradient ── */}
          <linearGradient id="m-mark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#312e81" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0.5" />
          </linearGradient>

          {/* ── Glow filter for temple ── */}
          <filter id="f-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* ── Soft blur for M mark ── */}
          <filter id="f-soft">
            <feGaussianBlur stdDeviation="2" />
          </filter>
        </defs>

        {/* ════════════════════════════════════════════════
            LAYER 1 — Base background gradient
            ════════════════════════════════════════════════ */}
        <rect width="1440" height="900" fill="url(#bg-base)" />

        {/* ════════════════════════════════════════════════
            LAYER 2 — Glow blobs
            ════════════════════════════════════════════════ */}
        <rect width="1440" height="900" fill="url(#temple-glow)" />
        <rect width="1440" height="900" fill="url(#right-glow)" />

        {/* ════════════════════════════════════════════════
            LAYER 3 — Circular arc (left side, behind temple)
            ════════════════════════════════════════════════ */}
        <circle
          cx="310" cy="590"
          r="260"
          fill="none"
          stroke="#5b21b6"
          strokeWidth="1.5"
          opacity="0.3"
        />

        {/* ════════════════════════════════════════════════
            LAYER 4 — Greek temple (bottom-left)
            ════════════════════════════════════════════════ */}
        <g transform="translate(80, 420)" filter="url(#f-glow)">
          {/* Steps */}
          <rect x="10"  y="246" width="310" height="11" rx="2" fill="url(#temple-col)" opacity="0.8" />
          <rect x="22"  y="235" width="286" height="11" rx="2" fill="url(#temple-col)" opacity="0.75" />
          <rect x="34"  y="224" width="262" height="11" rx="2" fill="url(#temple-col)" opacity="0.7" />

          {/* Ground beam */}
          <rect x="34"  y="210" width="262" height="14" rx="2" fill="url(#temple-col)" opacity="0.85" />

          {/* Columns — 7 columns */}
          {[55, 92, 129, 165, 201, 238, 275].map((x, i) => (
            <rect key={i} x={x} y="96" width="15" height="114" rx="5" fill="url(#temple-col)" opacity="0.72" />
          ))}

          {/* Entablature */}
          <rect x="34"  y="80" width="262" height="16" rx="3" fill="url(#temple-col)" opacity="0.82" />

          {/* Pediment */}
          <polygon
            points="34,80 165,24 296,80"
            fill="url(#temple-col)"
            opacity="0.45"
          />
          <polygon
            points="34,80 165,24 296,80"
            fill="none"
            stroke="#a78bfa"
            strokeWidth="1.5"
            opacity="0.4"
          />

          {/* Base glow / ground light */}
          <ellipse cx="165" cy="258" rx="145" ry="12" fill="#7c3aed" opacity="0.3" />

          {/* Horizontal glow line (the bright horizon) */}
          <line
            x1="-80" y1="262" x2="420" y2="262"
            stroke="#c4b5fd"
            strokeWidth="1.5"
            opacity="0.4"
          />
        </g>

        {/* ════════════════════════════════════════════════
            LAYER 5 — Temple reflection (mirror, below horizon)
            ════════════════════════════════════════════════ */}
        <g transform="translate(80, 684) scale(1, -0.22)" opacity="0.18">
          <rect x="34"  y="80" width="262" height="16" fill="#8b78f8" />
          {[55, 92, 129, 165, 201, 238, 275].map((x, i) => (
            <rect key={i} x={x} y="96" width="15" height="114" fill="#8b78f8" />
          ))}
          <rect x="34" y="210" width="262" height="14" fill="#8b78f8" />
        </g>

        {/* ════════════════════════════════════════════════
            LAYER 6 — M lettermark (right side, dark)
            ════════════════════════════════════════════════ */}
        {/* Outer glow behind the M */}
        <ellipse cx="1060" cy="300" rx="180" ry="160" fill="#4c1d95" opacity="0.18" filter="url(#f-soft)" />

        {/* The M shape built from paths matching the reference */}
        <g transform="translate(900, 110)" opacity="0.55">
          {/* Left vertical leg */}
          <rect x="0"   y="0"   width="78" height="310" rx="39" fill="url(#m-mark)" />
          {/* Right vertical leg — with open bottom (arch) */}
          <rect x="242" y="96"  width="78" height="214" rx="39" fill="url(#m-mark)" />
          {/* Inner arch cutout on right leg */}
          <ellipse cx="281" cy="310" rx="34" ry="38" fill="#07042a" />
          {/* Left-top arm */}
          <rect
            x="0" y="0" width="78" height="230" rx="39"
            fill="url(#m-mark)"
            transform="rotate(-30, 39, 115)"
          />
          {/* Right-top arm */}
          <rect
            x="195" y="0" width="78" height="230" rx="39"
            fill="url(#m-mark)"
            transform="rotate(30, 234, 115)"
          />
          {/* Diagonal band (the distinctive cross-stroke) */}
          <rect
            x="-20" y="140" width="380" height="72" rx="36"
            fill="url(#m-mark)"
            opacity="0.7"
            transform="rotate(-18, 170, 176)"
          />
        </g>

        {/* ════════════════════════════════════════════════
            LAYER 7 — Wave curves (bottom-right)
            ════════════════════════════════════════════════ */}
        {/* Large wave fill 1 */}
        <path
          d="M 400 700 Q 600 640 800 670 Q 1000 700 1200 650 Q 1360 615 1440 635 L 1440 900 L 400 900 Z"
          fill="url(#wave-fill)"
          opacity="0.6"
        />
        {/* Large wave fill 2 (slightly lower) */}
        <path
          d="M 500 760 Q 680 730 880 748 Q 1080 766 1270 735 Q 1380 718 1440 730 L 1440 900 L 500 900 Z"
          fill="url(#wave-fill2)"
          opacity="0.5"
        />
        {/* Wave line 1 — bright */}
        <path
          d="M 400 715 Q 620 668 840 688 Q 1060 708 1250 672 Q 1370 650 1440 663"
          fill="none"
          stroke="#c4b5fd"
          strokeWidth="2"
          opacity="0.45"
        />
        {/* Wave line 2 */}
        <path
          d="M 450 755 Q 660 730 870 743 Q 1080 756 1270 730 Q 1375 715 1440 724"
          fill="none"
          stroke="#a78bfa"
          strokeWidth="1.5"
          opacity="0.35"
        />
        {/* Wave line 3 — faint */}
        <path
          d="M 480 788 Q 700 768 920 778 Q 1130 788 1310 762 Q 1395 750 1440 757"
          fill="none"
          stroke="#8b5cf6"
          strokeWidth="1"
          opacity="0.25"
        />

        {/* ════════════════════════════════════════════════
            LAYER 8 — Top sparkle / accent lines
            ════════════════════════════════════════════════ */}
        <line x1="940" y1="40"  x2="1100" y2="18"  stroke="#c4b5fd" strokeWidth="1.5" opacity="0.2" />
        <line x1="960" y1="62"  x2="1140" y2="44"  stroke="#a78bfa" strokeWidth="1"   opacity="0.15" />
        <line x1="910" y1="84"  x2="1060" y2="70"  stroke="#c4b5fd" strokeWidth="0.8" opacity="0.12" />
        <line x1="1200" y1="30" x2="1380" y2="12"  stroke="#c4b5fd" strokeWidth="1"   opacity="0.15" />
        <line x1="1220" y1="52" x2="1400" y2="38"  stroke="#a78bfa" strokeWidth="0.8" opacity="0.1"  />
      </svg>
    </div>
  )
}
