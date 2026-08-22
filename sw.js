/* 옹알옹알 서비스 워커 — 캐시 우선(오프라인 보장) + 온라인 시 배경 갱신 */

/* 코드를 수정해 배포할 때마다 이 버전 숫자를 올릴 것 (v2, v3 ...)
   → 다음번 온라인 실행 때 새 파일로 교체됨 */
const CACHE = 'ongal-v1';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

/* 설치: 앱 파일 전체를 폰에 저장 */
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* 활성화: 이전 버전 캐시 정리 */
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* 요청 처리: 캐시 먼저 응답(오프라인 보장), 온라인이면 뒤에서 최신본으로 갱신 */
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((cached) => {
      const network = fetch(e.request)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => cached); // 오프라인이면 캐시로
      return cached || network;
    })
  );
});
