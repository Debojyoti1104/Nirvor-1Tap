import type { Metadata, Viewport } from 'next'
import './globals.css'
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar'

export const metadata: Metadata = {
  title: 'Nirvor-1Tap — Community Emergency Assistant',
  description:
    'Nirvor-1Tap (Northeast Connect) — offline-capable disaster response and community emergency coordination for North East India. Flood, landslide and earthquake risk for all 8 NE states, with SMS SOS packets and a relief board.',
  applicationName: 'Nirvor-1Tap',
  keywords: ['Northeast India', 'disaster management', 'flood alert', 'landslide', 'emergency', 'ASDMA', 'NDRF', 'offline', 'SOS'],
  authors: [{ name: 'Nirvor-1Tap' }],
  icons: { icon: '/icon.svg', apple: '/icon-192.png' },
  appleWebApp: {
    capable: true,
    title: 'Nirvor-1Tap',
    statusBarStyle: 'default',
  },
  openGraph: {
    title: 'Nirvor-1Tap',
    description: 'Community Emergency Assistant for North East India — works offline',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#DC2626',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F8FAFC] antialiased">
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  )
}
