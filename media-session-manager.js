/**
 * Comprehensive Media Session API Manager
 * Implements proper background audio persistence using Media Session API
 * and invisible video element trick for maximum compatibility
 */
class MediaSessionManager {
    constructor() {
        this.isInitialized = false;
        this.currentMetadata = null;
        this.invisibleVideo = null;
        this.audioElement = null;
        this.isPlaying = false;
        this.currentPostIndex = 0;
        this.totalPosts = 0;
        this.currentBoard = '';
        this.currentThread = '';
        
        // Callbacks for TTS control
        this.onPlay = null;
        this.onPause = null;
        this.onStop = null;
        this.onNext = null;
        this.onPrevious = null;
        
        this.init();
    }
    
    async init() {
        console.log('🎵 Initializing comprehensive Media Session Manager...');
        
        try {
            // Initialize invisible video element
            await this.initInvisibleVideo();
            
            // Start the invisible video immediately
            this.startInvisibleVideo();
            
            // Setup Media Session API
            this.setupMediaSession();
            
            // Setup visibility change handling
            this.setupVisibilityHandling();
            
            // Setup audio element persistence
            this.setupAudioElementPersistence();
            
            // Start audio element monitoring
            this.startAudioElementMonitoring();
            
            this.isInitialized = true;
            console.log('✅ Media Session Manager initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Media Session Manager:', error);
        }
    }
    
    async initInvisibleVideo() {
        this.invisibleVideo = document.getElementById('invisible-video');
        
        if (!this.invisibleVideo) {
            console.warn('⚠️ Invisible video element not found');
            return;
        }
        
        // Ensure video is ready for background persistence
        this.invisibleVideo.muted = true;
        this.invisibleVideo.loop = true;
        this.invisibleVideo.playsInline = true;
        
        // Handle video events
        this.invisibleVideo.addEventListener('ended', () => {
            this.invisibleVideo.play().catch(console.warn);
        });
        
        this.invisibleVideo.addEventListener('pause', () => {
            // Restart video if it gets paused unexpectedly
            setTimeout(() => {
                if (this.invisibleVideo.paused) {
                    this.invisibleVideo.play().catch(console.warn);
                }
            }, 100);
        });
    }
    
    startInvisibleVideo() {
        if (this.invisibleVideo) {
            // Start the invisible video to maintain background process
            this.invisibleVideo.play().catch(error => {
                console.warn('Failed to start invisible video:', error);
                // Retry after user interaction
                document.addEventListener('click', () => {
                    this.invisibleVideo.play().catch(console.warn);
                }, { once: true });
            });
        }
    }
    
    setupMediaSession() {
        if (!('mediaSession' in navigator)) {
            console.warn('⚠️ Media Session API not supported');
            return;
        }
        
        console.log('🎵 Setting up Media Session API...');
        
        // Set initial metadata
        this.updateMetadata({
            title: '4chan TTS Reader',
            artist: 'Text-to-Speech',
            album: 'Background Audio Active'
        });
        
        // Setup action handlers
        navigator.mediaSession.setActionHandler('play', () => {
            console.log('🎵 Media Session: Play action');
            if (this.onPlay) {
                this.onPlay();
            }
            this.setPlaybackState('playing');
        });
        
        navigator.mediaSession.setActionHandler('pause', () => {
            console.log('🎵 Media Session: Pause action');
            if (this.onPause) {
                this.onPause();
            }
            this.setPlaybackState('paused');
        });
        
        navigator.mediaSession.setActionHandler('stop', () => {
            console.log('🎵 Media Session: Stop action');
            if (this.onStop) {
                this.onStop();
            }
            this.setPlaybackState('none');
        });
        
        navigator.mediaSession.setActionHandler('nexttrack', () => {
            console.log('🎵 Media Session: Next track action');
            if (this.onNext) {
                this.onNext();
            }
        });
        
        navigator.mediaSession.setActionHandler('previoustrack', () => {
            console.log('🎵 Media Session: Previous track action');
            if (this.onPrevious) {
                this.onPrevious();
            }
        });
        
        // Additional action handlers for better control
        navigator.mediaSession.setActionHandler('seekbackward', (details) => {
            console.log('🎵 Media Session: Seek backward', details);
            // Could implement seeking within current post
        });
        
        navigator.mediaSession.setActionHandler('seekforward', (details) => {
            console.log('🎵 Media Session: Seek forward', details);
            // Could implement seeking within current post
        });
        
        navigator.mediaSession.setActionHandler('seekto', (details) => {
            console.log('🎵 Media Session: Seek to', details);
            // Could implement seeking to specific position
        });
        
        console.log('✅ Media Session action handlers configured');
    }
    
    setupVisibilityHandling() {
        console.log('👁️ Setting up visibility change handling...');
        
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('📱 Page hidden - maintaining background audio');
                this.handlePageHidden();
            } else {
                console.log('📱 Page visible - ensuring audio is active');
                this.handlePageVisible();
            }
        });
        
        // Handle page focus/blur events
        window.addEventListener('blur', () => {
            console.log('📱 Window blurred - preserving audio');
            this.preserveAudioState();
        });
        
        window.addEventListener('focus', () => {
            console.log('📱 Window focused - restoring audio');
            this.restoreAudioState();
        });
        
        // Handle page lifecycle events
        window.addEventListener('beforeunload', (e) => {
            if (this.isPlaying) {
                console.log('⚠️ Page unloading while audio is playing');
                e.preventDefault();
                e.returnValue = 'Audio is currently playing. Are you sure you want to leave?';
                return e.returnValue;
            }
        });
        
        window.addEventListener('pagehide', () => {
            console.log('📱 Page hide event - maintaining audio state');
            this.handlePageHidden();
        });
        
        window.addEventListener('pageshow', () => {
            console.log('📱 Page show event - restoring audio state');
            this.handlePageVisible();
        });
    }
    
    setupAudioElementPersistence() {
        // Create a persistent audio element for better control
        this.audioElement = document.createElement('audio');
        this.audioElement.style.display = 'none';
        this.audioElement.preload = 'auto';
        this.audioElement.loop = false;
        document.body.appendChild(this.audioElement);
        
        // Prevent audio from being paused by browser
        this.audioElement.addEventListener('pause', (e) => {
            if (this.isPlaying && !document.hidden) {
                console.log('🔄 Audio element paused unexpectedly, resuming...');
                this.audioElement.play().catch(console.error);
            }
        });
        
        console.log('✅ Audio element persistence configured');
    }
    
    updateMetadata(metadata) {
        if (!('mediaSession' in navigator)) return;
        
        const defaultArtwork = [
            {
                src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIHZpZXdCb3g9IjAgMCA5NiA5NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9Ijk2IiBoZWlnaHQ9Ijk2IiBmaWxsPSIjMDA3QUZGIi8+Cjx0ZXh0IHg9IjQ4IiB5PSI1NCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+VFRTPC90ZXh0Pgo8L3N2Zz4K',
                sizes: '96x96',
                type: 'image/svg+xml'
            },
            {
                src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiBmaWxsPSIjMDA3QUZGIi8+Cjx0ZXh0IHg9IjY0IiB5PSI3MiIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE4IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+VFRTPC90ZXh0Pgo8L3N2Zz4K',
                sizes: '128x128',
                type: 'image/svg+xml'
            }
        ];
        
        this.currentMetadata = {
            title: metadata.title || '4chan TTS Reader',
            artist: metadata.artist || 'Text-to-Speech',
            album: metadata.album || this.currentBoard ? `/${this.currentBoard}/` : 'Background Audio',
            artwork: metadata.artwork || defaultArtwork
        };
        
        navigator.mediaSession.metadata = new MediaMetadata(this.currentMetadata);
        console.log('🎵 Media Session metadata updated:', this.currentMetadata);
    }
    
    setPlaybackState(state) {
        if (!('mediaSession' in navigator)) return;
        
        navigator.mediaSession.playbackState = state;
        this.isPlaying = (state === 'playing');
        
        console.log(`🎵 Media Session playback state: ${state}`);
        
        // Sync invisible video with playback state
        if (this.invisibleVideo) {
            if (state === 'playing') {
                this.invisibleVideo.play().catch(console.error);
            } else if (state === 'paused' || state === 'none') {
                this.invisibleVideo.pause();
            }
        }
    }
    
    updateProgress(currentPost, totalPosts, board, thread) {
        this.currentPostIndex = currentPost;
        this.totalPosts = totalPosts;
        this.currentBoard = board;
        this.currentThread = thread;
        
        // Update metadata with current progress
        this.updateMetadata({
            title: `Post ${currentPost + 1} of ${totalPosts}`,
            artist: '4chan TTS Reader',
            album: board ? `/${board}/ - Thread ${thread}` : 'Reading Posts'
        });
        
        // Update position state if supported
        if ('setPositionState' in navigator.mediaSession) {
            try {
                navigator.mediaSession.setPositionState({
                    duration: totalPosts,
                    playbackRate: 1.0,
                    position: currentPost
                });
            } catch (error) {
                console.warn('⚠️ Could not set position state:', error);
            }
        }
    }
    
    handlePageHidden() {
        if (!this.isPlaying) return;
        
        console.log('📱 Maintaining background audio while page is hidden');
        
        // Ensure invisible video keeps playing
        if (this.invisibleVideo && this.invisibleVideo.paused) {
            this.invisibleVideo.play().catch(console.error);
        }
        
        // Maintain media session state
        this.setPlaybackState('playing');
        
        // Send heartbeat to service worker
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'AUDIO_HEARTBEAT',
                isPlaying: this.isPlaying,
                timestamp: Date.now()
            });
        }
    }
    
    handlePageVisible() {
        if (!this.isPlaying) return;
        
        console.log('📱 Page visible - ensuring audio state is correct');
        
        // Restart invisible video if needed
        if (this.invisibleVideo && this.invisibleVideo.paused) {
            this.invisibleVideo.play().catch(console.error);
        }
        
        // Refresh media session state
        this.setPlaybackState('playing');
    }
    
    preserveAudioState() {
        if (!this.isPlaying) return;
        
        console.log('📱 Preserving audio state during focus loss');
        
        // Ensure invisible video keeps playing
        if (this.invisibleVideo && this.invisibleVideo.paused) {
            this.invisibleVideo.play().catch(console.error);
        }
        
        // Maintain media session state
        this.setPlaybackState('playing');
        
        // Store audio element state
        if (this.audioElement) {
            this.audioElement.setAttribute('data-preserve-state', 'true');
        }
    }
    
    restoreAudioState() {
        if (!this.isPlaying) return;
        
        console.log('📱 Restoring audio state after focus gain');
        
        // Restart invisible video if needed
        if (this.invisibleVideo && this.invisibleVideo.paused) {
            this.invisibleVideo.play().catch(console.error);
        }
        
        // Refresh media session state
        this.setPlaybackState('playing');
        
        // Restore audio element if needed
        if (this.audioElement && this.audioElement.hasAttribute('data-preserve-state')) {
            this.audioElement.removeAttribute('data-preserve-state');
            if (this.audioElement.paused && this.isPlaying) {
                this.audioElement.play().catch(console.error);
            }
        }
    }
    
    // Public API methods
    startPlayback() {
        console.log('🎵 Starting playback');
        this.setPlaybackState('playing');
        
        // Start invisible video
        if (this.invisibleVideo) {
            this.invisibleVideo.play().catch(console.error);
        }
        
        // Register current audio element for persistence
        this.registerAudioElement();
    }
    
    pausePlayback() {
        console.log('🎵 Pausing playback');
        this.setPlaybackState('paused');
    }
    
    stopPlayback() {
        console.log('🎵 Stopping playback');
        this.setPlaybackState('none');
        
        // Stop invisible video
        if (this.invisibleVideo) {
            this.invisibleVideo.pause();
        }
    }
    
    // Set callback functions
    setCallbacks(callbacks) {
        this.onPlay = callbacks.onPlay;
        this.onPause = callbacks.onPause;
        this.onStop = callbacks.onStop;
        this.onNext = callbacks.onNext;
        this.onPrevious = callbacks.onPrevious;
    }
    
    // Register audio element for persistence
    registerAudioElement() {
        if (this.audioElement) {
            this.audioElement.setAttribute('data-media-session-active', 'true');
            console.log('🎵 Audio element registered for persistence');
        }
    }
    
    // Unregister audio element
    unregisterAudioElement() {
         if (this.audioElement) {
             this.audioElement.removeAttribute('data-media-session-active');
             console.log('🎵 Audio element unregistered from persistence');
         }
     }
     
     // Monitor audio elements to prevent unwanted pausing
     startAudioElementMonitoring() {
         // Monitor all audio elements every 500ms
         this.audioMonitorInterval = setInterval(() => {
             if (this.isPlaying) {
                 this.maintainAudioElements();
             }
         }, 500);
         
         console.log('🔍 Audio element monitoring started');
     }
     
     maintainAudioElements() {
         // Find all active audio elements
         const audioElements = document.querySelectorAll('audio[data-media-session-active="true"]');
         
         audioElements.forEach(audio => {
             if (audio.paused && this.isPlaying) {
                 console.log('🔄 Restarting paused audio element');
                 audio.play().catch(error => {
                     console.warn('Failed to restart audio element:', error);
                 });
             }
         });
         
         // Also maintain the invisible video
         if (this.invisibleVideo && this.invisibleVideo.paused) {
             this.invisibleVideo.play().catch(console.warn);
         }
     }
    
    // Cleanup method
    destroy() {
        console.log('🧹 Cleaning up Media Session Manager');
        
        if (this.audioMonitorInterval) {
            clearInterval(this.audioMonitorInterval);
            this.audioMonitorInterval = null;
        }
        
        if (this.invisibleVideo) {
            this.invisibleVideo.pause();
        }
        
        if (this.audioElement) {
            this.unregisterAudioElement();
            this.audioElement.remove();
        }
        
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = null;
            navigator.mediaSession.playbackState = 'none';
        }
        
        this.isInitialized = false;
    }
}

// Export for use in main script
window.MediaSessionManager = MediaSessionManager;