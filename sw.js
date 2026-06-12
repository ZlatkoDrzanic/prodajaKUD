const VERSION = 'v15';
const CACHE   = 'evidencija-pica-' + VERSION;

const STATIC = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './icons/apple-touch-icon.png'
];

// Install — preuzmi statičke datoteke, BEZ automatskog skipWaiting
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC))
  );
  // Ne pozivamo self.skipWaiting() — čekamo korisnikovu potvrdu
});

// Activate — obriši stare cache verzije, preuzmi kontrolu
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k.startsWith('evidencija-pica-') && k !== CACHE)
          .map(k => { console.log('[SW] Brišem stari cache:', k); return caches.delete(k); })
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch strategija
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Firebase, Google, QR — uvijek s mreže
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('firestore') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('google.com') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('qrserver.com')
  ) {
    e.respondWith(fetch(e.request).catch(() => new Response('Offline', {status: 503})));
    return;
  }

  // index.html — network first, fallback cache
  if (url.pathname.endsWith('/') || url.pathname.endsWith('index.html')) {
    e.respondWith(
      fetch(e.request)
        .then(resp => {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return resp;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Ostali statički resursi — cache first
  e.respondWith(
    caches.match(e.request)
      .then(cached => cached || fetch(e.request)
        .then(resp => {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return resp;
        })
      )
  );
});

// Korisnikova potvrda "Da, učitaj" šalje SKIP_WAITING
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
