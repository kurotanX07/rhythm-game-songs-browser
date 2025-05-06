// public/service-worker.js
const CACHE_NAME = 'rhythm-game-browser-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/static/js/main.chunk.js',
  '/static/js/0.chunk.js',
  '/static/js/bundle.js',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] Install completed');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Skip non-GET requests and Firebase API requests
  if (
    event.request.method !== 'GET' || 
    event.request.url.includes('firestore.googleapis.com') || 
    event.request.url.includes('identitytoolkit.googleapis.com')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return the response from the cached version
        if (response) {
          console.log('[Service Worker] Serving from cache:', event.request.url);
          return response;
        }

        // Not in cache - fetch from network
        console.log('[Service Worker] Fetching from network:', event.request.url);
        return fetch(event.request)
          .then(networkResponse => {
            // Check if we received a valid response
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Clone the response - one copy for the browser, one for the cache
            const responseToCache = networkResponse.clone();

            // Cache the fetched response
            caches.open(CACHE_NAME)
              .then(cache => {
                // Only cache same-origin resources
                if (new URL(event.request.url).origin === location.origin) {
                  console.log('[Service Worker] Caching new resource:', event.request.url);
                  cache.put(event.request, responseToCache);
                }
              });

            // Return the network response
            return networkResponse;
          });
      })
      .catch(error => {
        // If both cache and network fail, show a generic fallback
        console.log('[Service Worker] Fetch failed; returning offline page', error);
        
        // Check if the request is for an HTML page
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/index.html');
        }
        
        return new Response('Network error happened', {
          status: 408,
          headers: { 'Content-Type': 'text/plain' }
        });
      })
  );
});

// Listen for messages from the main thread
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync for pending data operations
self.addEventListener('sync', event => {
  if (event.tag === 'sync-favorites') {
    event.waitUntil(syncFavorites());
  }
});

// Function to sync favorites data when back online
async function syncFavorites() {
  try {
    // This function would typically read from IndexedDB and push to Firebase
    // Simplified implementation for example purposes
    console.log('[Service Worker] Syncing favorites');
    
    // In a real implementation, you would:
    // 1. Read pending changes from IndexedDB
    // 2. Send those changes to your API/Firebase
    // 3. Mark as processed in IndexedDB
    
    // This would be implemented with actual IndexedDB operations
    const db = await openDatabase();
    const tx = db.transaction('pendingFavorites', 'readwrite');
    const store = tx.objectStore('pendingFavorites');
    
    // Get all pending favorites
    const pendingFavorites = await store.getAll();
    
    if (pendingFavorites.length === 0) {
      console.log('[Service Worker] No pending favorites to sync');
      return;
    }
    
    console.log('[Service Worker] Found pending favorites:', pendingFavorites.length);
    
    // Process each pending favorite
    // This would be a network request in a real implementation
    
    // Clear the store after successful sync
    await store.clear();
    console.log('[Service Worker] Favorites synced successfully');
  } catch (error) {
    console.error('[Service Worker] Error syncing favorites:', error);
    throw error; // This will keep the sync pending
  }
}

// Helper function to open IndexedDB
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('rhythmGameOfflineDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = event => {
      const db = request.result;
      if (!db.objectStoreNames.contains('pendingFavorites')) {
        db.createObjectStore('pendingFavorites', { keyPath: 'id', autoIncrement: true });
      }
      
      if (!db.objectStoreNames.contains('songCache')) {
        db.createObjectStore('songCache', { keyPath: 'id' });
      }
    };
  });
}