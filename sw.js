/* Çevrimdışı çalışma: önce ağ (her zaman güncel sürüm), ağ yoksa önbellek. Sürüm ve dosya listesi derlemede doldurulur. */
const V = 'mektup-202611241945';
const FILES = ["./","app.js","apple-touch-icon.png","config.js","export.js","extra.js","fonts/caveat-latin-500-normal.woff2","fonts/caveat-latin-700-normal.woff2","fonts/caveat-latin-ext-500-normal.woff2","fonts/caveat-latin-ext-700-normal.woff2","fonts/playfair-display-latin-600-normal.woff2","fonts/playfair-display-latin-700-normal.woff2","fonts/playfair-display-latin-ext-600-normal.woff2","fonts/playfair-display-latin-ext-700-normal.woff2","gifenc.js","gmail.js","gonder.css","html2canvas.min.js","icon-192.png","icon-512.png","icon-maskable-512.png","icon.svg","index.html","manifest.webmanifest","style.css","theme.js","ui.js"];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(r, { cache: 'no-cache' }).then((res) => {
      if (res.ok) { const cp = res.clone(); caches.open(V).then((c) => c.put(r, cp)); }
      return res;
    }).catch(() => caches.match(r, { ignoreSearch: true }).then((m) => m || caches.match('./index.html', { ignoreSearch: true }) || caches.match('./')))
  );
});
