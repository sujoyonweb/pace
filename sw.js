// Version updated to v2 to force the browser to replace the old Service Worker
const CACHE_NAME = 'pace-cache-v2';

// The absolute essential files needed to boot the app offline
const PRECACHE_ASSETS = [
    './',
    './index.html',
    './css/variables.css',
    './css/base.css',
    './css/components.css',
    './js/app.js',
    './js/state.js',
    './js/storage.js',
    './js/ui.js',
    './manifest.json',
    './assets/icon-192.png',
    './assets/icon-512.png'
];

// 1. INSTALL EVENT: Pre-cache all core assets and take over immediately
self.addEventListener('install', (event) => {
    self.skipWaiting(); 
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Pre-caching offline assets');
            return cache.addAll(PRECACHE_ASSETS);
        })
    );
});

// 2. ACTIVATE EVENT: Clean up old versions of the cache
self.addEventListener('activate', (event) => {
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
        }).then(() => self.clients.claim()) 
    );
});

// 3. FETCH EVENT: "Stale-While-Revalidate" with Query String Ignoring
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        // CRITICAL FIX: ignoreSearch: true allows ?v=16 tags to match the cached files safely
        caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }
                
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });

                return networkResponse;
            }).catch(() => {
                console.log('[Service Worker] Offline mode activated.');
            });

            return cachedResponse || fetchPromise;
        })
    );
});