import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Nirvor-1Tap — Community Emergency Assistant',
    short_name: 'Nirvor-1Tap',
    description:
      'Nirvor-1Tap — offline-capable emergency information, SOS packets and relief coordination for North East India.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#F8FAFC',
    theme_color: '#DC2626',
    categories: ['utilities', 'health', 'government'],
    icons: [
      { src: '/nirvor_logo.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/nirvor_logo.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/nirvor_logo.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
