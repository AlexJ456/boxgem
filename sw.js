// sw.js - Service Worker for Offline Capability

const CACHE_NAME = 'box-breathing-cache-v4'; // Incremented version for SW changes
const urlsToCache = [
    '/',
    '/index.html',
    '/script.js',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
];

// --- Install Event --- (Same as before)
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...', CACHE_NAME);
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching app shell');
                const requests = urlsToCache.map(url => new Request(url, { cache: 'reload' }));
                return cache.addAll(requests);
            })
            .then(() => {
                 console.log('Service Worker: App shell cached successfully.');
                 return self.skipWaiting();
             })
            .catch(error => {
                 console.error('Service Worker: Caching failed', error);
            })
    );
});

// --- Activate Event --- (Same as before)
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...', CACHE_NAME);
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
             console.log('Service Worker: Active and ready to handle fetches!');
             return self.clients.claim();
         })
    );
});


// *** MODIFIED Fetch Event Handler ***
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') {
       return; // Only handle GET requests
    }

    const requestUrl = new URL(event.request.url);

    // Strategy: Cache First, with specific handling for navigation
    event.respondWith(
        caches.match(event.request) // Try matching the exact request first (good for assets like JS, icons)
            .then(cachedResponse => {
                if (cachedResponse) {
                    // console.log(`SW: Serving from cache (exact match): ${requestUrl.pathname}${requestUrl.search}`);
                    return cachedResponse;
                }

                // If exact match fails, handle navigation requests specially
                // This ensures /?view=exercise... still loads the base index.html from cache
                if (event.request.mode === 'navigate') {
                    console.log(`SW: Navigation request failed exact match, trying base page for: ${requestUrl.pathname}${requestUrl.search}`);
                    // Attempt to serve the cached root or index.html, ignoring search parameters for the match
                    return caches.match('/').then(rootResponse => {
                         if (rootResponse) {
                             console.log('SW: Serving "/" for navigation request.');
                             return rootResponse;
                         }
                         // Fallback to /index.html if / isn't found directly
                         return caches.match('/index.html').then(indexResponse => {
                              if(indexResponse) {
                                 console.log('SW: Serving "/index.html" for navigation request.');
                                 return indexResponse;
                              }
                               // If base page not in cache (install failed?), try network
                              console.warn('SW: Base page not in cache for navigation, trying network.');
                              return fetch(event.request);
                         });
                    });
                }

                // For non-navigation requests not found in cache, fetch from network
                // console.log(`SW: Not in cache, fetching from network: ${requestUrl.pathname}${requestUrl.search}`);
                return fetch(event.request);

            })
            .catch(error => {
                console.error('SW: Fetch failed:', error);
                // Optionally provide a generic offline fallback page for navigation errors
                // if (event.request.mode === 'navigate') {
                //     return caches.match('/offline.html'); // Ensure offline.html is cached
                // }
                // Rethrow or return an error response
                 return new Response("Network error occurred", { status: 408, headers: { 'Content-Type': 'text/plain' } });
            })
    );
});


console.log('Service Worker: Script loaded.');
