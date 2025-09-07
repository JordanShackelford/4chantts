// CHANGE #6: Enhanced Service Worker for Aggressive Background Audio Support

const CACHE_NAME = '4chan-tts-v2.1.3';
const urlsToCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/script.js',
    '/beep.mp3'
];

// CHANGE #6: Enhanced audio state management
let audioState = {
    isPlaying: false,
    currentPostIndex: 0,
    currentThread: null,
    lastActivity: Date.now(),
    aggressiveMode: true,
    audioContextCount: 3,
    oscillatorStates: []
};

// CHANGE #6: Aggressive background audio management
let keepAliveInterval = null;
let backgroundAudioInterval = null;
let audioKeepAliveTimer = null;
let aggressiveAudioInterval = null;
let wakeLockMonitorInterval = null;
let audioContextMonitorInterval = null;

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

// Background sync for maintaining audio session
self.addEventListener('sync', (event) => {
    if (event.tag === 'background-audio-sync') {
        event.waitUntil(handleBackgroundAudioSync());
    } else if (event.tag === 'background-audio-maintenance') {
        event.waitUntil(maintainAudioSession());
    }
});

// Periodic background task to maintain audio session
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'audio-keepalive') {
        event.waitUntil(maintainAudioSession());
    }
});

// CHANGE #6: Enhanced background audio sync with aggressive management
async function handleBackgroundAudioSync() {
    console.log('Service Worker: AGGRESSIVE background audio sync triggered');
    
    try {
        // Notify main thread to maintain audio aggressively
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'AGGRESSIVE_AUDIO_MAINTENANCE',
                timestamp: Date.now(),
                forceResume: true,
                recreateOscillators: true
            });
        });
        
        // Start aggressive monitoring if not already running
        if (!aggressiveAudioInterval) {
            startAggressiveAudioMonitoring();
        }
        
        // Update last activity
        audioState.lastActivity = Date.now();
        
    } catch (error) {
        console.error('Service Worker: Aggressive background audio sync failed:', error);
    }
}

// CHANGE #6: Start aggressive audio monitoring
function startAggressiveAudioMonitoring() {
    console.log('Service Worker: Starting aggressive audio monitoring');
    
    // Monitor every 1 second when in aggressive mode
    aggressiveAudioInterval = setInterval(async () => {
        if (audioState.aggressiveMode) {
            const clients = await self.clients.matchAll();
            clients.forEach(client => {
                client.postMessage({
                    type: 'AUDIO_HEALTH_CHECK',
                    timestamp: Date.now(),
                    requireResponse: true
                });
            });
        }
    }, 1000);
    
    // Monitor audio contexts every 2 seconds
    audioContextMonitorInterval = setInterval(async () => {
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'AUDIO_CONTEXT_CHECK',
                timestamp: Date.now(),
                expectedContexts: audioState.audioContextCount
            });
        });
    }, 2000);
}

// CHANGE #6: Stop aggressive monitoring
function stopAggressiveAudioMonitoring() {
    if (aggressiveAudioInterval) {
        clearInterval(aggressiveAudioInterval);
        aggressiveAudioInterval = null;
    }
    
    if (audioContextMonitorInterval) {
        clearInterval(audioContextMonitorInterval);
        audioContextMonitorInterval = null;
    }
}

// Maintain audio session for background playback
async function maintainAudioSession() {
    try {
        if (audioState.isPlaying) {
            // Send keepalive signal to prevent audio interruption
            const clients = await self.clients.matchAll();
            clients.forEach(client => {
                client.postMessage({
                    type: 'AUDIO_KEEPALIVE',
                    timestamp: Date.now()
                });
            });
            
            // Schedule next keepalive
            if (keepAliveInterval) {
                clearInterval(keepAliveInterval);
            }
            keepAliveInterval = setInterval(() => {
                self.registration.sync.register('background-audio-sync');
            }, 30000); // Every 30 seconds
        }
    } catch (error) {
        console.error('Audio session maintenance failed:', error);
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
        case 'BACKGROUND_AUDIO_ACTIVE':
            // Enhanced background audio management
            handleBackgroundAudioActive(data);
            break;
        case 'REQUEST_BACKGROUND_PERMISSION':
            // Handle background permission requests
            handleBackgroundPermission();
            break;
        case 'AUDIO_STARTED':
            audioState.isPlaying = true;
            audioState.currentPostIndex = data.postIndex || 0;
            audioState.currentThread = data.threadNo || null;
            maintainAudioSession();
            break;
        case 'AUDIO_STOPPED':
            audioState.isPlaying = false;
            if (keepAliveInterval) {
                clearInterval(keepAliveInterval);
                keepAliveInterval = null;
            }
            break;
        case 'AUDIO_PAUSED':
            audioState.isPlaying = false;
            break;
        case 'AUDIO_RESUMED':
            audioState.isPlaying = true;
            maintainAudioSession();
            break;
        default:
            console.log('Service Worker: Unknown message type', type);
    }
});

// Store audio state for background recovery
function handleAudioStateUpdate(newAudioState) {
    // Update global audio state
    Object.assign(audioState, newAudioState);
    audioState.lastActivity = Date.now();
    
    // Register background sync to maintain session
    self.registration.sync.register('background-audio-sync').catch(err => {
        console.warn('Background sync registration failed:', err);
    });
    
    // Register periodic sync for audio keepalive (if supported)
    if ('periodicSync' in self.registration) {
        self.registration.periodicSync.register('audio-keepalive', {
            minInterval: 30000 // 30 seconds
        }).catch(err => {
            console.warn('Periodic sync registration failed:', err);
        });
    }
}

// Handle background permission requests
function handleBackgroundPermission() {
    // Request persistent notification permission for background operation
    if ('Notification' in self && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// Enhanced background audio management
function handleBackgroundAudioActive(data) {
    audioState = { ...audioState, ...data };
    
    // Start aggressive background audio maintenance
    if (backgroundAudioInterval) {
        clearInterval(backgroundAudioInterval);
    }
    
    backgroundAudioInterval = setInterval(async () => {
        try {
            // Send keepalive signals to all clients
            const clients = await self.clients.matchAll();
            clients.forEach(client => {
                client.postMessage({
                    type: 'BACKGROUND_KEEPALIVE',
                    timestamp: Date.now(),
                    audioState: audioState
                });
            });
            
            // Register background sync to maintain audio
            if (self.registration && self.registration.sync) {
                self.registration.sync.register('background-audio-maintenance');
            }
        } catch (error) {
            console.error('Background audio maintenance failed:', error);
        }
    }, 3000); // Every 3 seconds for aggressive maintenance
    
    // Set up audio keepalive timer
    if (audioKeepAliveTimer) {
        clearTimeout(audioKeepAliveTimer);
    }
    
    audioKeepAliveTimer = setTimeout(() => {
        if (backgroundAudioInterval) {
            clearInterval(backgroundAudioInterval);
            backgroundAudioInterval = null;
        }
    }, 300000); // Stop after 5 minutes of inactivity
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