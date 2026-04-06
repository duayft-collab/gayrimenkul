/**
 * @file public/service-worker.js
 * @description PWA service worker — vanilla JS, no workbox
 * Strategies:
 *  - Cache-first: statik assetler (JS, CSS, SVG, fonts)
 *  - Network-first: Firestore & API çağrıları
 *  - Stale-while-revalidate: imajlar
 *  - Offline fallback: /Gayrimenkul/offline.html
 */
const VERSION = 'gmk-v1';
const BASE = '/Gayrimenkul/';
const STATIC_CACHE = `${VERSION}-static`;
const IMAGE_CACHE = `${VERSION}-image`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

const PRECACHE = [
  BASE,
  BASE + 'offline.html',
  BASE + 'manifest.json',
  BASE + 'icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((anahtarlar) =>
      Promise.all(
        anahtarlar
          .filter((k) => !k.startsWith(VERSION))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Firestore / Google API'leri — network first, cache fallback yok
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('identitytoolkit')
  ) {
    event.respondWith(
      fetch(request).catch(() => new Response(
        JSON.stringify({ error: 'offline' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      ))
    );
    return;
  }

  // Navigation — offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match(BASE + 'offline.html'))
    );
    return;
  }

  // Imajlar — stale while revalidate
  if (request.destination === 'image') {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          const ag = fetch(request).then((yanit) => {
            if (yanit && yanit.ok) cache.put(request, yanit.clone());
            return yanit;
          }).catch(() => cached);
          return cached || ag;
        })
      )
    );
    return;
  }

  // Statik assetler — cache first
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    url.pathname.startsWith(BASE + 'assets/')
  ) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((yanit) => {
            if (yanit && yanit.ok) cache.put(request, yanit.clone());
            return yanit;
          });
        })
      )
    );
    return;
  }

  // Diğer — network first, cache fallback
  event.respondWith(
    fetch(request)
      .then((yanit) => {
        const kopya = yanit.clone();
        caches.open(RUNTIME_CACHE).then((c) => {
          try { c.put(request, kopya); } catch {}
        });
        return yanit;
      })
      .catch(() => caches.match(request))
  );
});

// Mesaj: "skipWaiting" ile yeni versiyona geçiş
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
