// sw.js - Service Worker for Offline Capability

// Increment cache name when files change to trigger update
const CACHE_NAME = 'box-breathing-cache-v3';
const urlsToCache = [
    // Use absolute paths from the root domain
    '/',                    // Cache the root path (often index.html)
    '/index.html',          // Cache the single HTML file (contains HTML, CSS)
    '/script.js',           // Cache the JavaScript file
    '/manifest.json',       // Cache the PWA manifest
    '/icons/icon-192x192.png', // Cache essential icons
    '/icons/icon-512x512.png'
];

// Install: Cache core assets
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...', CACHE_NAME);
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching app shell');
                // Fetch fresh copies from network during install
                const requests = urlsToCache.map(url => new Request(url, { cache: 'reload' }));
                return cache.addAll(requests);
            })
            .then(() => {
                 console.log('Service Worker: App shell cached successfully.');
                 // Activate the new service worker immediately
                 return self.skipWaiting();
             })
            .catch(error => {
                 console.error('Service Worker: Caching failed', error);
            })
    );
});

// Activate: Clean up old caches and take control
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...', CACHE_NAME);
    event.waitUntil(
        caches.keys().then(cacheNames => {
            // Delete caches that are not the current one
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
             // Take control of any open clients without requiring a reload
             return self.clients.claim();
         })
    );
});

// Fetch: Serve from cache first, fallback to network (Cache First Strategy)
self.addEventListener('fetch', event => {
    // Only handle GET requests
    if (event.request.method !== 'GET') {
       return;
    }

    // Log fetch requests (can be disabled for less console noise)
    // console.log('Service Worker: Fetching', event.request.url);

    event.respondWith(
        // Try to find the response in the cache
        caches.match(event.request)
            .then(cachedResponse => {
                // Return the cached response if found
                if (cachedResponse) {
                    // console.log('Service Worker: Serving from cache:', event.request.url);
                    return cachedResponse;
                }

                // If not found in cache, fetch from network
                // console.log('Service Worker: Not in cache, fetching from network:', event.request.url);
                return fetch(event.request).catch(error => {
                    // Handle network errors (e.g., offline)
                    console.error('Service Worker: Fetch network error:', error);
                    // Optionally return a custom offline fallback page for navigation requests
                    // if (event.request.mode === 'navigate') {
                    //     return caches.match('/offline.html'); // Need to create and cache offline.html
                    // }
                    // For assets, just returning the error/undefined might be okay
                });
            })
    );
});

console.log('Service Worker: Script loaded.'); // Log SW script execution
