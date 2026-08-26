/* RSC Connect — service worker (network-first, precache all app pages) */
const C = 'rscc-v10';
const SHELL = [
  './', './index.html', './checkin.html', './admin.html', './finance.html', './RSC-JR360.html',
  './firebase-config.js', './store.js', './brand.js', './icons.js', './srprint.js', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'
];
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(C).then(c => c.addAll(SHELL).catch(() => {})));
});
self.addEventListener('activate', e => {
  self.clients.claim();
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => k !== C && caches.delete(k)))));
});
// Map a clean URL / navigation path to the correct cached page (so /admin never falls back to check-in)
function pageForPath(pathname) {
  const p = pathname.replace(/\/+$/, '') || '/';
  if (p === '/' || p === '/index') return './index.html';
  if (p === '/admin' || p === '/admin.html') return './admin.html';
  if (p === '/checkin' || p === '/checkin.html') return './checkin.html';
  if (p === '/finance' || p === '/finance.html') return './finance.html';
  if (p === '/jr360' || p === '/RSC-JR360.html') return './RSC-JR360.html';
  return null;
}
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  if (u.origin !== location.origin) return;            // Firebase / fonts → straight to network
  e.respondWith(
    fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(C).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() =>
      caches.match(e.request).then(r => {
        if (r) return r;
        // Offline / firewall-blocked: serve the RIGHT cached page for this path, else the Hub
        const page = pageForPath(u.pathname);
        return caches.match(page || './index.html').then(m => m || caches.match('./index.html'));
      })
    )
  );
});
