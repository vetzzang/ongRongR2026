/* 옹알옹알 서비스 워커 — 캐시 우선(오프라인 보장)
   배포할 때마다 아래 버전 문자열을 바꿀 것 (index.html의 APP_VERSION과 맞추면 편함) */
const CACHE = 'ongal-20260822-1900';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './favicon-64.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  /* 앱의 "새 버전 확인"(?nocache=...)은 반드시 네트워크로 —
     캐시로 답하면 새 버전 알림이 영영 뜨지 않는다 */
  if (url.searchParams.has('nocache')) {
    e.respondWith(fetch(e.request).catch(() => caches.match('./index.html')));
    return;
  }

  /* 그 외: 캐시 먼저(오프라인 보장), 온라인이면 뒤에서 최신본으로 조용히 갱신 */
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((cached) => {
      const network = fetch(e.request)
        .then((res) => {
          if (res && res.ok && url.origin === self.location.origin) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
