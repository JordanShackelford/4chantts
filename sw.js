// Service Worker for 4chan TTS - Background Audio Support

const CACHE_NAME = '4chan-tts-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/script.js',
    '/beep.mp3'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching files');
                return cache.addAll(urlsToCache);
            })
            .catch((error) => {
                console.error('Service Worker: Cache failed', error);
            })
    );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version or fetch from network
                return response || fetch(event.request);
            })
            .catch(() => {
                // Fallback for navigation requests
                if (event.request.destination === 'document') {
                    return caches.match('/index.html');
                }
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Background sync for maintaining audio state
self.addEventListener('sync', (event) => {
    if (event.tag === 'background-audio-sync') {
        event.waitUntil(handleBackgroundAudioSync());
    }
});

// Handle background audio synchronization
async function handleBackgroundAudioSync() {
    try {
        // Notify the main app that background sync occurred
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'BACKGROUND_SYNC',
                timestamp: Date.now()
            });
        });
    } catch (error) {
        console.error('Background sync failed:', error);
    }
}

// Handle messages from the main app
self.addEventListener('message', (event) => {
    const { type, data } = event.data;
    
    switch (type) {
        case 'AUDIO_STATE_UPDATE':
            // Store audio state for background recovery
            handleAudioStateUpdate(data);
            break;
        case 'REQUEST_BACKGROUND_PERMISSION':
            // Handle background permission requests
            handleBackgroundPermission();
            break;
        default:
            console.log('Service Worker: Unknown message type', type);
    }
});

// Store audio state for background recovery
function handleAudioStateUpdate(audioState) {
    // Store in IndexedDB or localStorage for persistence
    self.registration.sync.register('background-audio-sync').catch(err => {
        console.warn('Background sync registration failed:', err);
    });
}

// Handle background permission requests
function handleBackgroundPermission() {
    // Request persistent notification permission for background operation
    if ('Notification' in self && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// Notification click handler for returning to app
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
        self.clients.matchAll().then((clients) => {
            // Focus existing window or open new one
            const client = clients.find(c => c.visibilityState === 'visible');
            if (client) {
                client.focus();
            } else {
                self.clients.openWindow('/');
            }
        })
    );
});

console.log('Service Worker: 4chan TTS SW loaded');