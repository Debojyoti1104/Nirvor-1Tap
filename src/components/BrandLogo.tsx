'use client'

import React from 'react'

interface BrandLogoProps {
  size?: number
  showWordmark?: boolean
  className?: string
}

export default function BrandLogo({ size = 32, showWordmark = true, className = '' }: BrandLogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`} suppressHydrationWarning>
      <img
        src="/nirvor_logo.png"
        alt="Nirvor-1Tap Logo"
        width={size}
        height={size}
        className="object-contain rounded-lg flex-shrink-0 shadow-sm"
        suppressHydrationWarning
      />

      {showWordmark && (
        <div className="flex flex-col leading-none" suppressHydrationWarning>
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
