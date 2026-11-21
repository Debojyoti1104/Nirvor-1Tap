/* Northeast Connect service worker — offline-first emergency shell. */
const VERSION = 'nc-v3'
const SHELL = [
  '/',
  '/manifest.webmanifest',
  '/nirvor_logo.png',
  '/data/facilities.json',
]
const TILE_HOSTS = [
  'tile.openstreetmap.org',
  'tile.opentopomap.org',
  'server.arcgisonline.com',
]

/** Cache the app shell, then the JS/CSS chunks referenced by the shell HTML. */
async function precache() {
  const cache = await caches.open(VERSION)
  await cache.addAll(SHELL).catch(() => undefined)

  const shell = await cache.match('/')
  if (!shell) return
  const html = await shell.clone().text()
  const assets = Array.from(html.matchAll(/(?:src|href)="(\/_next\/[^"]+)"/g)).map((m) => m[1])
  await Promise.all(assets.map((asset) => cache.add(asset).catch(() => undefined)))
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

async function networkFirst(request) {
  const cache = await caches.open(VERSION)
  try {
    const fresh = await fetch(request)
    if (fresh && fresh.ok) {
      // Store navigations under a canonical key so any route can recover.
      if (request.mode === 'navigate') {
        cache.put('/', fresh.clone()).catch(() => undefined)
      } else {
        cache.put(request, fresh.clone()).catch(() => undefined)
      }
    }
    return fresh
  } catch {
    const cached =
      (await cache.match(request, { ignoreSearch: true })) ||
      (await cache.match('/'))
    if (cached) return cached
    return new Response(
      '<!doctype html><meta name="viewport" content="width=device-width"><title>Offline — Northeast Connect</title><body style="font-family:system-ui;padding:24px;background:#F8FAFC;color:#0F172A"><h1 style="font-size:20px">You are offline</h1><p style="font-size:14px;color:#475569;line-height:1.5">Northeast Connect could not load this screen from cache. Emergency numbers still work:</p><p style="font-size:22px;font-weight:700;margin-top:12px">112 <span style="font-size:13px;font-weight:400;color:#64748B">National emergency</span></p><p style="font-size:22px;font-weight:700">108 <span style="font-size:13px;font-weight:400;color:#64748B">Ambulance</span></p><p style="font-size:22px;font-weight:700">1070 <span style="font-size:13px;font-weight:400;color:#64748B">Disaster management</span></p><button onclick="location.reload()" style="margin-top:20px;background:#0F172A;color:white;border:0;border-radius:8px;padding:10px 16px;font-size:14px">Try again</button></body>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(VERSION)
  const cached = await cache.match(request)
  if (cached) return cached
  try {
    const fresh = await fetch(request)
    if (fresh && fresh.ok) cache.put(request, fresh.clone()).catch(() => undefined)
    return fresh
  } catch {
    return new Response('', { status: 504 })
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(VERSION)
  const cached = await cache.match(request)
  const network = fetch(request)
    .then((fresh) => {
      if (fresh && fresh.ok) cache.put(request, fresh.clone()).catch(() => undefined)
      return fresh
    })
    .catch(() => undefined)
  return cached || (await network) || new Response('', { status: 504 })
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  const sameOrigin = url.origin === self.location.origin

  // API calls must never be served from cache.
  if (sameOrigin && url.pathname.startsWith('/api/')) return

  // Map tiles: cache aggressively so the last viewed area works offline.
  if (TILE_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) {
    event.respondWith(cacheFirst(request))
    return
  }

  // Google fonts / translate assets: best effort.
  if (!sameOrigin) {
    if (/fonts\.(googleapis|gstatic)\.com|translate\.(googleapis|gstatic)\.com/.test(url.hostname)) {
      event.respondWith(staleWhileRevalidate(request))
    }
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request))
    return
  }

  event.respondWith(staleWhileRevalidate(request))
})
