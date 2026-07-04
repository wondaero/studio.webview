const CACHE_NAME = 'webviewstudio-cache-v2'; // 버전을 올리면 캐시가 갱신됩니다.
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './config.json'
];

// 1. 서비스 워커 설치 및 앱 쉘 캐싱
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing SW & Caching App Shell...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        // 제어권을 즉시 얻기 위해 skipWaiting 대기 (업데이트 메시지 컨트롤을 위해 주석 처리하거나 수동 제어)
        // self.skipWaiting();
      })
  );
});

// 2. 구버전 캐시 정리 및 활성화
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating SW & Cleaning up old caches...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// 3. Fetch 이벤트 - Cache-First (네트워크 미사용으로 데이터 요금 절약)
self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith('http') && !event.request.url.startsWith('https') && !event.request.url.startsWith('file')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // 1. 캐시에 존재하면 인터넷 요금을 쓰지 않고 로컬 기기에서 무조건 즉시 반환 (데이터 소모 0)
        if (cachedResponse) {
          return cachedResponse;
        }

        // 2. 캐시에 없는 새로운 에셋이나 API 호출일 때만 인터넷 사용
        return fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch((err) => {
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
          });
      })
  );
});

// 4. 새로운 버전 적용(SKIP_WAITING) 메시지 수신 리스너
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[Service Worker] Skip waiting message received. Activating new worker...');
    self.skipWaiting();
  }
});
