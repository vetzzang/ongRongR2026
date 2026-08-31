/* 옹알옹알 — 오프라인 서비스워커
   CORE: 없으면 앱이 안 열린다 → 하나라도 실패하면 설치를 실패시킨다
   EXTRA: 없어도 앱은 열린다 → 각각 따로 시도하고 실패해도 넘어간다
   (한 묶음 addAll이면 아이콘 하나 빠져도 오프라인이 통째로 죽는다) */
const CACHE_NAME = 'ongal-v1.8.0';

const CORE = ['./', './index.html', './manifest.webmanifest'];

const EXTRA = [
  './fonts/NotoSansCJKsc-sub.woff2',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png',
  './apple-touch-icon.png', './favicon-64.png',
  './pack.json', './audio/all.mp3'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE_NAME);
    await c.addAll(CORE);
    await Promise.all(EXTRA.map(u => c.add(u).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  /* 새 버전 확인 요청은 캐시를 건너뛴다 — 없으면 영원히 "최신"이라고 답한다 */
  let u = null; try { u = new URL(req.url); } catch (err) {}
  if (u && u.searchParams.has('nocache')) return;

  if (req.mode === 'navigate') {
    e.respondWith(caches.match('./index.html').then(c => c || fetch(req)));
    return;
  }
  e.respondWith(caches.match(req).then(c => {
    if (c) return c;
    return fetch(req).then(r => {
      if (!r || r.status !== 200 || r.type === 'opaque') return r;
      const copy = r.clone();
      caches.open(CACHE_NAME).then(k => k.put(req, copy));
      return r;
    }).catch(() => new Response('', { status: 504, statusText: 'offline' }));
  }));
});
