import type { Metadata, Viewport } from 'next'
import './globals.css'
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar'

export const metadata: Metadata = {
  title: 'Northeast Connect — Community Emergency Assistant',
  description:
    'Offline-capable disaster response and community emergency coordination for North East India. Flood, landslide and earthquake risk for all 8 NE states, with SMS SOS packets and a relief board.',
  applicationName: 'Northeast Connect',
  keywords: ['Northeast India', 'disaster management', 'flood alert', 'landslide', 'emergency', 'ASDMA', 'NDRF', 'offline', 'SOS'],
  authors: [{ name: 'Northeast Connect' }],
  icons: { icon: '/icon.svg', apple: '/icon-192.png' },
  appleWebApp: {
    capable: true,
    title: 'NE Connect',
    statusBarStyle: 'default',
  },
  openGraph: {
    title: 'Northeast Connect',
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
