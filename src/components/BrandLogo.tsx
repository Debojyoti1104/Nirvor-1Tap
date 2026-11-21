import React from 'react'

interface BrandLogoProps {
  size?: number
  showWordmark?: boolean
  className?: string
}

export default function BrandLogo({ size = 32, showWordmark = true, className = '' }: BrandLogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Nirvor-1Tap brand mark"
      >
        {/* Shield base */}
        <path
          d="M24 4L6 11.2V24.4C6 33.84 14.04 42.56 24 45C33.96 42.56 42 33.84 42 24.4V11.2L24 4Z"
          fill="#0F172A"
        />
        {/* Mountain / terrain contour */}
        <path
          d="M12 30L18 20L22 25L26 18L32 30"
          stroke="#059669"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* River / water contour */}
        <path
          d="M10 33C13 32 15 34 18 33C21 32 23 34 26 33C29 32 31 34 34 33C37 32 38 33 39 33"
          stroke="#38BDF8"
          strokeWidth="1.4"
          strokeLinecap="round"
          fill="none"
        />
        {/* Signal beacon dot */}
        <circle cx="24" cy="12" r="3" fill="#DC2626" />
        {/* Signal arcs */}
        <path
          d="M18.5 8.5A7.78 7.78 0 0 1 29.5 8.5"
          stroke="#DC2626"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        />
        <path
          d="M15.5 6A11.5 11.5 0 0 1 32.5 6"
          stroke="#DC2626"
          strokeWidth="1.4"
          strokeLinecap="round"
          fill="none"
          opacity="0.4"
        />
      </svg>

      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span
            style={{
              fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
              fontWeight: 800,
              fontSize: size * 0.44,
              letterSpacing: '0.08em',
              color: '#0F172A',
              lineHeight: 1,
            }}
          >
            NIRVOR
          </span>
          <span
            style={{
              fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
              fontWeight: 500,
              fontSize: size * 0.3,
              letterSpacing: '0.12em',
              color: '#475569',
              lineHeight: 1.2,
            }}
          >
            1TAP
          </span>
        </div>
      )}
    </div>
  )
}
