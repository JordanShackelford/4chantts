// Advanced Audio Persistence Manager using Web Locks API and AudioWorklet
class AudioPersistenceManager {
  constructor() {
    this.audioContext = null;
    this.workletNode = null;
    this.isInitialized = false;
    this.lockName = 'audio-persistence-lock';
    this.lockController = null;
    this.broadcastChannel = null;
    this.keepAliveInterval = null;
    this.heartbeatInterval = null;
    
    // Bind methods
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.handlePageHide = this.handlePageHide.bind(this);
    this.handlePageShow = this.handlePageShow.bind(this);
    this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
  }
  
  async initialize() {
    try {
      console.log('[AudioPersistence] Initializing advanced audio persistence...');
      
      // Initialize AudioContext with optimal settings
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        latencyHint: 'playback',
        sampleRate: 44100
      });
      
      // Resume context if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      // Load and initialize AudioWorklet
      await this.initializeAudioWorklet();
      
      // Initialize Web Locks API
      await this.initializeWebLocks();
      
      // Initialize BroadcastChannel for cross-tab communication
      this.initializeBroadcastChannel();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Start keep-alive mechanisms
      this.startKeepAlive();
      
      this.isInitialized = true;
      console.log('[AudioPersistence] Advanced audio persistence initialized successfully');
      
      return true;
    } catch (error) {
      console.error('[AudioPersistence] Failed to initialize:', error);
      return false;
    }
  }
  
  async initializeAudioWorklet() {
    try {
      // Add AudioWorklet module
      await this.audioContext.audioWorklet.addModule('./audio-worklet-processor.js');
      
      // Create AudioWorkletNode
      this.workletNode = new AudioWorkletNode(this.audioContext, 'background-audio-processor');
      
      // Connect to destination
      this.workletNode.connect(this.audioContext.destination);
      
      // Set up message handling
      this.workletNode.port.onmessage = (event) => {
        const { type, data } = event.data;
        console.log('[AudioWorklet]', type, data);
        
        if (type === 'HEARTBEAT') {
          // Worklet is alive
          this.lastWorkletHeartbeat = Date.now();
        }
      };
      
      console.log('[AudioPersistence] AudioWorklet initialized');
    } catch (error) {
      console.error('[AudioPersistence] AudioWorklet initialization failed:', error);
      throw error;
    }
  }
  
  async initializeWebLocks() {
    if (!navigator.locks) {
      console.warn('[AudioPersistence] Web Locks API not supported');
      return;
    }
    
    try {
      // Acquire a persistent lock to prevent suspension
      this.lockController = new AbortController();
      
      navigator.locks.request(this.lockName, 
        { signal: this.lockController.signal },
        async (lock) => {
          console.log('[AudioPersistence] Web Lock acquired:', this.lockName);
          
          // Keep the lock alive indefinitely
          return new Promise((resolve) => {
            // This promise never resolves, keeping the lock active
            this.lockController.signal.addEventListener('abort', () => {
              console.log('[AudioPersistence] Web Lock released');
              resolve();
            });
          });
        }
      );
      
      console.log('[AudioPersistence] Web Locks initialized');
    } catch (error) {
      console.error('[AudioPersistence] Web Locks initialization failed:', error);
    }
  }
  
  initializeBroadcastChannel() {
    try {
      this.broadcastChannel = new BroadcastChannel('audio-persistence');
      
      this.broadcastChannel.onmessage = (event) => {
        const { type, data } = event.data;
        
        switch (type) {
          case 'KEEP_AUDIO_ALIVE':
            this.ensureAudioContextActive();
            break;
            
          case 'AUDIO_STATE_REQUEST':
            this.broadcastChannel.postMessage({
              type: 'AUDIO_STATE_RESPONSE',
              data: {
                isActive: this.audioContext?.state === 'running',
                isInitialized: this.isInitialized
              }
            });
            break;
        }
      };
      
      console.log('[AudioPersistence] BroadcastChannel initialized');
    } catch (error) {
      console.error('[AudioPersistence] BroadcastChannel initialization failed:', error);
    }
  }
  
  setupEventListeners() {
    // Visibility change events
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Page lifecycle events
    window.addEventListener('pagehide', this.handlePageHide);
    window.addEventListener('pageshow', this.handlePageShow);
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    
    // Focus events
    window.addEventListener('blur', () => this.handleFocusChange(false));
    window.addEventListener('focus', () => this.handleFocusChange(true));
    
    console.log('[AudioPersistence] Event listeners set up');
  }
  
  startKeepAlive() {
    // Keep AudioContext alive
    this.keepAliveInterval = setInterval(() => {
      this.ensureAudioContextActive();
      this.sendWorkletKeepAlive();
      this.broadcastKeepAlive();
    }, 1000);
    
    // Monitor worklet heartbeat
    this.heartbeatInterval = setInterval(() => {
      if (this.lastWorkletHeartbeat && 
          Date.now() - this.lastWorkletHeartbeat > 5000) {
        console.warn('[AudioPersistence] Worklet heartbeat lost, reinitializing...');
        this.reinitializeWorklet();
      }
    }, 2000);
    
    console.log('[AudioPersistence] Keep-alive mechanisms started');
  }
  
  async ensureAudioContextActive() {
    if (!this.audioContext) return;
    
    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        console.log('[AudioPersistence] AudioContext resumed');
      } catch (error) {
        console.error('[AudioPersistence] Failed to resume AudioContext:', error);
      }
    }
  }
  
  sendWorkletKeepAlive() {
    if (this.workletNode) {
      this.workletNode.port.postMessage({ type: 'KEEP_ALIVE' });
    }
  }
  
  broadcastKeepAlive() {
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'KEEP_AUDIO_ALIVE' });
    }
  }
  
  async reinitializeWorklet() {
    try {
      if (this.workletNode) {
        this.workletNode.disconnect();
      }
      
      await this.initializeAudioWorklet();
      console.log('[AudioPersistence] AudioWorklet reinitialized');
    } catch (error) {
      console.error('[AudioPersistence] Failed to reinitialize AudioWorklet:', error);
    }
  }
  
  handleVisibilityChange() {
    if (document.hidden) {
      console.log('[AudioPersistence] Page hidden, maintaining audio...');
      this.ensureAudioContextActive();
      this.sendWorkletKeepAlive();
    } else {
      console.log('[AudioPersistence] Page visible, ensuring audio active...');
      this.ensureAudioContextActive();
    }
  }
  
  handlePageHide(event) {
    console.log('[AudioPersistence] Page hide event, maintaining persistence...');
    this.ensureAudioContextActive();
    this.sendWorkletKeepAlive();
  }
  
  handlePageShow(event) {
    console.log('[AudioPersistence] Page show event, restoring audio...');
    this.ensureAudioContextActive();
  }
  
  handleBeforeUnload(event) {
    console.log('[AudioPersistence] Before unload, attempting to maintain audio...');
    // Don't prevent unload, but try to maintain audio
    this.broadcastKeepAlive();
  }
  
  handleFocusChange(hasFocus) {
    console.log('[AudioPersistence] Focus change:', hasFocus);
    if (!hasFocus) {
      // Lost focus, ensure audio continues
      this.ensureAudioContextActive();
      this.sendWorkletKeepAlive();
    }
  }
  
  async startAudio(audioBuffer) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (this.workletNode) {
      this.workletNode.port.postMessage({
        type: 'SET_AUDIO_BUFFER',
        data: { buffer: audioBuffer }
      });
      
      this.workletNode.port.postMessage({ type: 'START_AUDIO' });
    }
    
    await this.ensureAudioContextActive();
    console.log('[AudioPersistence] Audio started with advanced persistence');
  }
  
  stopAudio() {
    if (this.workletNode) {
      this.workletNode.port.postMessage({ type: 'STOP_AUDIO' });
    }
    
    console.log('[AudioPersistence] Audio stopped');
  }
  
  destroy() {
    // Clean up intervals
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Release Web Lock
    if (this.lockController) {
      this.lockController.abort();
    }
    
    // Close BroadcastChannel
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
    }
    
    // Disconnect AudioWorklet
    if (this.workletNode) {
      this.workletNode.disconnect();
    }
    
    // Close AudioContext
    if (this.audioContext) {
      this.audioContext.close();
    }
    
    // Remove event listeners
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('pagehide', this.handlePageHide);
    window.removeEventListener('pageshow', this.handlePageShow);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    
    console.log('[AudioPersistence] Destroyed');
  }
}

// Export for use in other modules
window.AudioPersistenceManager = AudioPersistenceManager;