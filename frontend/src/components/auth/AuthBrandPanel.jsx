/**
 * components/auth/AuthBrandPanel.jsx
 *
 * Left brand panel shared by LoginPage and RegisterPage.
 *
 * Layout (top → bottom):
 *   1. Logo + wordmark                    (top)
 *   2. Main heading (48px bold white)
 *   3. Sub-heading (20px lavender)
 *   4. Body copy (17px muted lavender)
 *   5. Feature list with icons            (spacious)
 *   6. Bottom: copyright                  (bottom)
 *
 * The banking illustration (SVG temple) lives BELOW the text in the
 * z-stack and is pinned to the bottom so text never overlaps it.
 * Text lives in a flex column that stops before reaching the illustration.
 */

import {
  ShieldCheck,
  TrendingUp,
  BookOpen,
} from 'lucide-react'
import MonvexLogo from '../ui/MonvexLogo'

const CURRENT_YEAR = new Date().getFullYear()

const FEATURES = [
  {
    icon: ShieldCheck,
    label: 'Secure financial operations',
    sub:   'Every transaction protected end-to-end',
  },
  {
    icon: TrendingUp,
    label: 'Reliable money movement',
    sub:   'Atomic transfers with idempotency guarantees',
  },
  {
    icon: BookOpen,
    label: 'Transparent, auditable records',
    sub:   'Immutable double-entry ledger trail',
  },
]

export default function AuthBrandPanel() {
  return (
    <div className="relative hidden h-full min-h-screen overflow-hidden lg:flex lg:w-[480px] xl:w-[520px] lg:flex-col lg:shrink-0">

      {/* ── Background gradient layer ── */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(160deg, #07061f 0%, #0f0650 35%, #1c0a6e 60%, #0a0535 100%)',
        }}
      />

      {/* ── Purple glow blobs ── */}
      <div
        className="absolute"
        style={{
          left: '-15%', top: '30%',
          width: '70%', height: '50%',
          background:
            'radial-gradient(ellipse at 30% 50%, rgba(109,40,217,0.5) 0%, transparent 65%)',
        }}
      />
      <div
        className="absolute"
        style={{
          right: '-10%', bottom: '25%',
          width: '55%', height: '45%',
          background:
            'radial-gradient(ellipse at 70% 60%, rgba(139,92,246,0.3) 0%, transparent 60%)',
        }}
      />

      {/* ── Temple illustration — fixed to bottom, behind text ── */}
      <TempleIllustration />

      {/* ── Main content — z-10 so it sits above illustration ── */}
      <div className="relative z-10 flex flex-1 flex-col justify-between px-10 py-10 xl:px-14 xl:py-12">

        {/* Top section: logo + all copy */}
        <div>
          {/* Logo + wordmark */}
          <div className="flex items-center gap-3">
            <MonvexLogo size={40} />
            <span
              className="font-bold tracking-widest text-white"
              style={{ fontSize: '20px', letterSpacing: '0.12em' }}
            >
              MONVEX
            </span>
          </div>

          {/* Main heading */}
          <div className="mt-12 xl:mt-16">
            <h1
              className="font-bold leading-tight text-white"
              style={{ fontSize: 'clamp(36px, 4.5vw, 48px)', lineHeight: 1.15 }}
            >
              Move Money.<br />Maintain Trust.
            </h1>

            {/* Sub-heading */}
            <p
              className="mt-5 font-semibold"
              style={{
                fontSize: 'clamp(17px, 2vw, 20px)',
                color: '#c4b5fd',
                lineHeight: 1.4,
              }}
            >
              Every transaction. Every entry.<br />Accounted for.
            </p>

            {/* Body copy */}
            <p
              className="mt-5"
              style={{
                fontSize: 'clamp(14px, 1.5vw, 17px)',
                color: '#a78bfa',
                lineHeight: 1.75,
                maxWidth: '340px',
              }}
            >
              A smarter way to manage financial transactions
              with secure operations, transparent records
              and complete accountability.
            </p>
          </div>

          {/* Feature list */}
          <ul className="mt-10 xl:mt-12 space-y-6">
            {FEATURES.map(({ icon: Icon, label, sub }) => (
              <li key={label} className="flex items-start gap-4">
                {/* Icon badge */}
                <div
                  className="flex shrink-0 items-center justify-center rounded-xl"
                  style={{
                    width: '44px',
                    height: '44px',
                    background: 'rgba(99,102,241,0.2)',
                    border: '1px solid rgba(139,92,246,0.3)',
                  }}
                >
                  <Icon
                    style={{ width: '22px', height: '22px', color: '#a78bfa' }}
                    strokeWidth={1.75}
                  />
                </div>
                {/* Text */}
                <div>
                  <p
                    className="font-semibold text-white"
                    style={{ fontSize: 'clamp(14px, 1.6vw, 17px)', lineHeight: 1.3 }}
                  >
                    {label}
                  </p>
                  <p
                    style={{
                      fontSize: 'clamp(12px, 1.3vw, 14px)',
                      color: '#7c6fba',
                      lineHeight: 1.5,
                      marginTop: '3px',
                    }}
                  >
                    {sub}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom: copyright */}
        <p
          className="mt-10"
          style={{ fontSize: '12px', color: 'rgba(139,92,246,0.4)' }}
        >
          © {CURRENT_YEAR} MONVEX Financial Systems. All rights reserved.
        </p>
      </div>
    </div>
  )
}

// ── Temple + wave illustration (bottom of panel) ──────────────────────────────

function TempleIllustration() {
  return (
    <div
      className="absolute bottom-0 left-0 w-full"
      style={{ height: '260px', pointerEvents: 'none' }}
    >
      <svg
        viewBox="0 0 520 260"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full"
        preserveAspectRatio="xMidYMax slice"
      >
        <defs>
          <linearGradient id="ap-wave" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#7c3aed" stopOpacity="0" />
            <stop offset="45%"  stopColor="#7c3aed" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.25" />
          </linearGradient>
          <linearGradient id="ap-wave2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#6d28d9" stopOpacity="0" />
            <stop offset="55%"  stopColor="#8b5cf6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="ap-temple" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#a78bfa" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#6d28d9" stopOpacity="0.2" />
          </linearGradient>
          <filter id="ap-glow">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Wave fills */}
        <path
          d="M0 160 Q110 130 220 150 Q330 170 440 145 Q490 135 520 148 L520 260 L0 260 Z"
          fill="url(#ap-wave)" opacity="0.55"
        />
        <path
          d="M0 185 Q100 168 210 178 Q320 188 430 170 Q485 162 520 172 L520 260 L0 260 Z"
          fill="url(#ap-wave2)" opacity="0.45"
        />

        {/* Wave lines */}
        <path d="M0 168 Q120 148 240 162 Q360 176 480 155 Q505 150 520 157"
          fill="none" stroke="#c4b5fd" strokeWidth="1.2" opacity="0.35" />
        <path d="M0 192 Q130 178 250 185 Q370 192 490 176 Q508 172 520 178"
          fill="none" stroke="#a78bfa" strokeWidth="0.8" opacity="0.25" />

        {/* Glow at base of temple */}
        <ellipse cx="140" cy="210" rx="100" ry="12" fill="#7c3aed" opacity="0.2" />

        {/* Temple group — centred horizontally */}
        <g transform="translate(40, 55)" filter="url(#ap-glow)">
          {/* Steps */}
          <rect x="8"   y="148" width="184" height="7" rx="1" fill="url(#ap-temple)" opacity="0.75" />
          <rect x="16"  y="141" width="168" height="7" rx="1" fill="url(#ap-temple)" opacity="0.7" />
          <rect x="24"  y="134" width="152" height="7" rx="1" fill="url(#ap-temple)" opacity="0.65" />
          {/* Ground beam */}
          <rect x="22"  y="127" width="156" height="7" rx="1" fill="url(#ap-temple)" opacity="0.8" />
          {/* Columns */}
          {[36, 61, 86, 111, 136, 161].map((x, i) => (
            <rect key={i} x={x} y="62" width="9" height="65" rx="3" fill="url(#ap-temple)" opacity="0.7" />
          ))}
          {/* Entablature */}
          <rect x="22"  y="52" width="156" height="10" rx="2" fill="url(#ap-temple)" opacity="0.8" />
          {/* Pediment */}
          <polygon points="22,52 100,14 178,52" fill="url(#ap-temple)" opacity="0.4" />
          <polygon points="22,52 100,14 178,52" fill="none" stroke="#c4b5fd" strokeWidth="0.8" opacity="0.35" />
        </g>

        {/* Temple reflection */}
        <g transform="translate(40, 215) scale(1,-0.18)" opacity="0.15">
          <rect x="22" y="52" width="156" height="10" fill="#a78bfa" />
          {[36,61,86,111,136,161].map((x,i)=>(
            <rect key={i} x={x} y="62" width="9" height="65" fill="#a78bfa" />
          ))}
        </g>
      </svg>
    </div>
  )
}
