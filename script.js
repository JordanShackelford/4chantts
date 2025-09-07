class FourChanTTS {
    constructor() {
        this.currentBoard = 'pol';
        this.threads = [];
        this.currentThread = null;
        this.posts = [];
        this.currentPostIndex = 0;
        this.isPlaying = false;
        this.isPaused = false;
        this.synth = window.speechSynthesis;
        this.currentUtterance = null;
        this.voices = [];
        this.imageDescriptionsEnabled = true; // Enable by default
        this.hfToken = null; // No default token - user must provide their own
        this.imageDescriptionCache = new Map();
        this.wakeLock = null; // For preventing screen sleep
        this.usePuterTTS = false; // Toggle for Puter.js neural TTS
        this.puterTTSEngine = 'neural'; // Puter.js engine: standard, neural, generative
        this.puterTTSFailureCount = 0; // Track consecutive failures
        this.puterTTSDisabled = false; // Auto-disable after too many failures
        this.maxPuterTTSFailures = 3; // Max failures before auto-disable
        this.lastPuterTTSCall = 0; // Track last API call time for rate limiting
        this.puterTTSRateLimit = 2000; // Minimum 2 seconds between calls
        
        // Voice variety system
        this.threadVoices = new Map(); // Map thread IDs to voice indices
        this.userVoices = new Map(); // Map user IDs to voice indices
        this.availableVoices = []; // Filtered list of good voices
        this.voiceIndex = 0; // Current voice rotation index
        
        this.initializeElements();
        
        // Get DOM elements for image descriptions
        this.enableImageDescriptions = document.getElementById('enable-image-descriptions');
        this.hfTokenInput = document.getElementById('hf-token');
        
        this.setupEventListeners();
        this.loadVoices();
        this.setDefaults();
        this.setupMobileOptimizations();
        this.registerServiceWorker();
        this.setupCloudTTSOption();
        this.checkPuterLibrary();
        this.setupMediaSession();
        
        // Load voices when they become available
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = () => this.loadVoices();
        }
        
        // Auto-load threads for /pol/ board
        setTimeout(() => {
            this.loadThreads();
        }, 1000);
    }

    initializeElements() {
        this.elements = {
            boardSelect: document.getElementById('board-select'),
            loadThreadsBtn: document.getElementById('load-threads'),
            playBtn: document.getElementById('play-pause'),
            pauseBtn: document.getElementById('play-pause'), // Same button for play/pause
            stopBtn: document.getElementById('stop'),
            skipBtn: document.getElementById('skip'),
            voiceSelect: document.getElementById('voice-select'),
            speedSlider: document.getElementById('speed-range'),
            speedValue: document.getElementById('speed-value'),
            threadsList: document.getElementById('threads-list'),
            postsList: document.getElementById('posts-list'),
            loading: document.getElementById('loading'),
            currentReading: document.getElementById('current-reading'),
            errorMessage: document.getElementById('error-message')
        };
        
        // Legacy references for backward compatibility
        this.boardSelect = this.elements.boardSelect;
        this.loadThreadsBtn = this.elements.loadThreadsBtn;
        this.playPauseBtn = this.elements.playBtn;
        this.stopBtn = this.elements.stopBtn;
        this.skipBtn = this.elements.skipBtn;
        this.voiceSelect = this.elements.voiceSelect;
        this.speedRange = this.elements.speedSlider;
        this.speedValue = this.elements.speedValue;
        this.threadsList = this.elements.threadsList;
        this.postsList = this.elements.postsList;
        this.loading = this.elements.loading;
        this.currentReading = this.elements.currentReading;
        this.errorMessage = this.elements.errorMessage;
    }

    setupEventListeners() {
        this.boardSelect.addEventListener('change', (e) => {
            this.currentBoard = e.target.value;
        });

        this.loadThreadsBtn.addEventListener('click', () => {
            console.log('Load threads button clicked');
            this.loadThreads();
        });

        this.playPauseBtn.addEventListener('click', async () => {
            await this.togglePlayPause();
        });

        this.stopBtn.addEventListener('click', () => {
            this.stopReading();
        });

        this.skipBtn.addEventListener('click', async () => {
            await this.skipToNext();
        });

        this.voiceSelect.addEventListener('change', () => {
            this.stopReading();
        });

        this.speedRange.addEventListener('input', (e) => {
            this.speedValue.textContent = e.target.value + 'x';
        });

        // Handle speech synthesis events
        this.synth.addEventListener('voiceschanged', () => {
            this.loadVoices();
        });
        
        // Puter.js TTS controls
         const usePuterTTSCheckbox = document.getElementById('use-puter-tts');
         const puterTTSEngineSelect = document.getElementById('puter-tts-engine');
         
         if (usePuterTTSCheckbox) {
             usePuterTTSCheckbox.addEventListener('change', (e) => {
                 this.usePuterTTS = e.target.checked;
                 this.stopReading(); // Stop current playback when switching
             });
         }
         
         if (puterTTSEngineSelect) {
             puterTTSEngineSelect.addEventListener('change', (e) => {
                 this.puterTTSEngine = e.target.value;
                 this.stopReading(); // Stop current playback when switching
             });
         }
        
        // Image description controls
        if (this.enableImageDescriptions) {
            this.enableImageDescriptions.addEventListener('change', (e) => {
                this.imageDescriptionsEnabled = e.target.checked;
            });
        }
        
        if (this.hfTokenInput) {
            this.hfTokenInput.addEventListener('input', (e) => {
                this.hfToken = e.target.value.trim();
            });
        }
        
        // Test TTS button
        const testSpeakBtn = document.getElementById('test-speak');
        const testTextInput = document.getElementById('test-text');
        if (testSpeakBtn && testTextInput) {
            testSpeakBtn.addEventListener('click', async () => {
                const text = testTextInput.value.trim();
                if (text) {
                     const usePuterTTSCheckbox = document.getElementById('use-puter-tts');
                     if (usePuterTTSCheckbox && usePuterTTSCheckbox.checked) {
                         await this.speakWithPuterTTS(text);
                     } else {
                         await this.speakWithBrowserTTS(text);
                     }
                 }
            });
        }
        
        // Test HF Token button
        const testTokenBtn = document.getElementById('test-token');
        if (testTokenBtn) {
            testTokenBtn.addEventListener('click', () => {
                console.log('=== Hugging Face Token Test ===');
                console.log('Current hfToken value:', this.hfToken);
                console.log('Token length:', this.hfToken ? this.hfToken.length : 0);
                console.log('Token input element:', this.hfTokenInput);
                if (this.hfTokenInput) {
                    console.log('Input field value:', this.hfTokenInput.value);
                    console.log('Input field value length:', this.hfTokenInput.value.length);
                }
                console.log('Image descriptions enabled:', this.imageDescriptionsEnabled);
                console.log('=== End Token Test ===');
            });
        }
    }
    
    setDefaults() {
         // Set default board to /pol/
         if (this.boardSelect) {
             this.boardSelect.value = 'pol';
         }
         
         // Set default speed to 1.2x
         if (this.speedRange) {
             this.speedRange.value = '1.2';
         }
         if (this.speedValue) {
             this.speedValue.textContent = '1.2x';
         }
         
         // Set default Hugging Face token
         // HF token input is left empty - users must provide their own token
         
         // Enable AI image descriptions by default
         if (this.enableImageDescriptions) {
             this.enableImageDescriptions.checked = true;
             this.imageDescriptionsEnabled = true;
         }
         
         // Set default Puter.js TTS settings
          const usePuterTTSCheckbox = document.getElementById('use-puter-tts');
          const puterTTSEngineSelect = document.getElementById('puter-tts-engine');
          
          if (usePuterTTSCheckbox) {
               usePuterTTSCheckbox.checked = true;
               this.usePuterTTS = true;
           }
          
          if (puterTTSEngineSelect) {
              puterTTSEngineSelect.value = 'neural';
              this.puterTTSEngine = 'neural';
          }
     }

    loadVoices() {
        this.voices = this.synth.getVoices();
        this.voiceSelect.innerHTML = '';
        
        // Filter and prioritize natural-sounding voices
        const naturalVoices = this.voices.filter(voice => {
            const name = voice.name.toLowerCase();
            // Prioritize neural/premium voices and exclude robotic ones
            return !name.includes('microsoft') || name.includes('neural') || 
                   name.includes('premium') || name.includes('enhanced');
        });
        
        // Use natural voices if available, otherwise fall back to all voices
        const voicesToUse = naturalVoices.length > 0 ? naturalVoices : this.voices;
        
        // Populate available voices for variety (English voices only)
        this.availableVoices = voicesToUse.filter(voice => voice.lang.startsWith('en'));
        if (this.availableVoices.length === 0) {
            // Fallback to any available voices if no English ones
            this.availableVoices = voicesToUse.slice(0, 10); // Limit to first 10
        }
        
        let bestVoiceIndex = -1;
        
        voicesToUse.forEach((voice, index) => {
            const option = document.createElement('option');
            const originalIndex = this.voices.indexOf(voice);
            option.value = originalIndex;
            option.textContent = `${voice.name} (${voice.lang})`;
            
            // Auto-select the best English voice
            if (voice.lang.startsWith('en') && bestVoiceIndex === -1) {
                const name = voice.name.toLowerCase();
                if (name.includes('neural') || name.includes('premium') || 
                    name.includes('enhanced') || name.includes('samantha') ||
                    name.includes('alex') || name.includes('karen')) {
                    bestVoiceIndex = originalIndex;
                    option.selected = true;
                }
            }
            
            this.voiceSelect.appendChild(option);
        });
        
        // If no premium voice found, select first English voice
        if (bestVoiceIndex === -1) {
            const firstEnglish = voicesToUse.find(voice => voice.lang.startsWith('en'));
            if (firstEnglish) {
                const originalIndex = this.voices.indexOf(firstEnglish);
                this.voiceSelect.value = originalIndex;
            }
        }
        
        console.log(`Loaded ${this.availableVoices.length} voices for variety`);
    }

    getVoiceForThread(threadNo) {
        if (!this.threadVoices.has(threadNo)) {
            const voiceIndex = this.voiceIndex % this.availableVoices.length;
            this.threadVoices.set(threadNo, voiceIndex);
            this.voiceIndex++;
        }
        return this.availableVoices[this.threadVoices.get(threadNo)];
    }

    getVoiceForUser(userId) {
        if (!this.userVoices.has(userId)) {
            const voiceIndex = this.voiceIndex % this.availableVoices.length;
            this.userVoices.set(userId, voiceIndex);
            this.voiceIndex++;
        }
        return this.availableVoices[this.userVoices.get(userId)];
    }

    async loadThreads() {
        console.log('loadThreads called for board:', this.currentBoard);
        this.showLoading(true);
        this.hideError();
        
        try {
            // Try multiple CORS proxy services
            const proxies = [
                'https://api.codetabs.com/v1/proxy?quest=',
                'https://cors-anywhere.herokuapp.com/',
                'https://proxy.cors.sh/',
                'https://corsproxy.io/?'
            ];
            
            let response = null;
            let lastError = null;
            
            for (const proxy of proxies) {
                try {
                    const targetUrl = `https://a.4cdn.org/${this.currentBoard}/catalog.json`;
                    console.log('Trying proxy:', proxy, 'for URL:', targetUrl);
                    response = await fetch(proxy + encodeURIComponent(targetUrl));
                    console.log('Response status:', response.status);
                    if (response.ok) break;
                } catch (error) {
                    console.log('Proxy failed:', proxy, 'Error:', error);
                    lastError = error;
                    continue;
                }
            }
            
            if (!response || !response.ok) {
                console.error('All proxies failed. Last error:', lastError);
                throw lastError || new Error('All CORS proxies failed. Please check your internet connection and try again.');
            }
            
            console.log('Successfully fetched data from proxy');
            const data = await response.json();
            console.log('Parsed JSON data:', data);
            const threads = [];
            
            data.forEach(page => {
                page.threads.forEach(thread => {
                    // Skip sticky threads (pinned announcements)
                    if (thread.sticky) {
                        return;
                    }
                    
                    if (thread.sub || thread.com) {
                        threads.push({
                            no: thread.no,
                            subject: thread.sub || 'No Subject',
                            comment: this.stripHtml(thread.com || ''),
                            replies: thread.replies || 0,
                            images: thread.images || 0
                        });
                    }
                });
            });
            
            // Store threads for auto-play functionality
            this.threads = threads;
            this.displayThreads(threads);
            
            // Auto-start playback if threads are available
            if (threads.length > 0) {
                // Select the first thread automatically
                const firstThreadElement = this.threadsList.children[0];
                if (firstThreadElement) {
                    const firstThreadNo = firstThreadElement.dataset.threadNo;
                    await this.selectThread(firstThreadNo, firstThreadElement);
                }
            }
        } catch (error) {
            console.error('loadThreads error:', error);
            this.showError(`Failed to load threads: ${error.message}. Check browser console for details.`);
        } finally {
            this.showLoading(false);
        }
    }

    displayThreads(threads) {
        this.threadsList.innerHTML = '';
        
        threads.forEach(thread => {
            const threadElement = document.createElement('div');
            threadElement.className = 'thread-item';
            threadElement.dataset.threadNo = thread.no;
            
            threadElement.innerHTML = `
                <div class="thread-title">${thread.subject}</div>
                <div class="thread-info">
                    Replies: ${thread.replies} | Images: ${thread.images}
                </div>
                <div class="thread-preview">${thread.comment.substring(0, 100)}${thread.comment.length > 100 ? '...' : ''}</div>
            `;
            
            threadElement.addEventListener('click', () => {
                this.selectThread(thread.no, threadElement);
            });
            
            this.threadsList.appendChild(threadElement);
        });
    }

    async selectThread(threadNo, threadElement) {
        // Remove previous selection
        document.querySelectorAll('.thread-item.selected').forEach(el => {
            el.classList.remove('selected');
        });
        
        // Add selection to current thread
        threadElement.classList.add('selected');
        
        this.currentThread = threadNo;
        this.showLoading(true);
        this.hideError();
        
        try {
            // Try multiple CORS proxy services
            const proxies = [
                'https://api.codetabs.com/v1/proxy?quest=',
                'https://cors-anywhere.herokuapp.com/',
                'https://proxy.cors.sh/',
                'https://corsproxy.io/?'
            ];
            
            let response = null;
            let lastError = null;
            
            for (const proxy of proxies) {
                try {
                    const targetUrl = `https://a.4cdn.org/${this.currentBoard}/thread/${threadNo}.json`;
                    response = await fetch(proxy + encodeURIComponent(targetUrl));
                    if (response.ok) break;
                } catch (error) {
                    lastError = error;
                    continue;
                }
            }
            
            if (!response || !response.ok) {
                throw lastError || new Error('All CORS proxies failed');
            }
            
            const data = await response.json();
            
            // Filter and map posts
            const filteredPosts = data.posts
                .map((post, index) => ({
                    ...post,
                    isOP: index === 0
                }))
                .filter(post => {
                    // Always include the OP (original post)
                    if (post.isOP) return true;
                    // For replies, only include if they have comment text
                    return post.com && post.com.trim().length > 0;
                });
            
            console.log(`Loaded ${filteredPosts.length} posts for thread ${threadNo}`);
            
            this.posts = filteredPosts.map(post => ({
                 no: post.no,
                 name: post.name || 'Anonymous',
                 comment: this.stripHtml(post.com || ''),
                 time: new Date(post.time * 1000).toLocaleString(),
                 isOP: post.isOP,
                 // Preserve image data for descriptions
                 filename: post.filename,
                 ext: post.ext,
                 tim: post.tim
             }));
            
            this.displayPosts();
            this.currentPostIndex = 0;
            
            // Auto-start playback
            setTimeout(() => {
                this.startReading();
            }, 500);
        } catch (error) {
            this.showError(`Failed to load thread: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    displayPosts() {
        this.postsList.innerHTML = '';
        
        this.posts.forEach((post, index) => {
            const postElement = document.createElement('div');
            postElement.className = 'post-item';
            postElement.dataset.postIndex = index;
            
            postElement.innerHTML = `
                <div class="post-content">${post.comment}</div>
                <div class="post-info">
                    ${post.name} | ${post.time} | Post #${post.no}
                </div>
            `;
            
            postElement.addEventListener('click', () => {
                this.selectPost(index, postElement);
            });
            
            this.postsList.appendChild(postElement);
        });
    }

    selectPost(index, postElement) {
        // Remove previous selection
        document.querySelectorAll('.post-item.selected').forEach(el => {
            el.classList.remove('selected');
        });
        
        // Add selection to current post
        postElement.classList.add('selected');
        
        this.currentPostIndex = index;
        this.stopReading();
    }

    async togglePlayPause() {
        if (this.posts.length === 0) {
            this.showError('No posts loaded. Please select a thread first.');
            return;
        }
        
        if (this.isPlaying) {
            this.pauseReading();
        } else {
            await this.startReading();
        }
    }

    async startReading() {
        if (this.currentPostIndex >= this.posts.length) {
            this.currentPostIndex = 0;
        }
        
        this.isPlaying = true;
        this.playPauseBtn.textContent = '⏸️ Pause';
        this.requestWakeLock(); // Ensure wake lock is active
        this.notifyServiceWorker('AUDIO_STATE_UPDATE', { isPlaying: true, postIndex: this.currentPostIndex });
        
        // Activate enhanced background audio management
        this.notifyServiceWorker('BACKGROUND_AUDIO_ACTIVE', {
            isPlaying: true,
            postIndex: this.currentPostIndex,
            threadNo: this.currentThread,
            timestamp: Date.now()
        });
        
        await this.readCurrentPost();
    }

    pauseReading() {
        this.isPlaying = false;
        this.playPauseBtn.textContent = '▶️ Play';
        this.synth.pause();
    }

    stopReading() {
        this.isPlaying = false;
        this.playPauseBtn.textContent = '▶️ Play';
        
        // Stop browser TTS
        this.synth.cancel();
        
        // Stop Puter.js TTS audio if playing
         if (this.currentAudio) {
             this.currentAudio.pause();
             this.currentAudio.currentTime = 0;
             this.currentAudio = null;
         }
        
        this.currentReading.textContent = '';
        this.releaseWakeLock(); // Release wake lock when stopped
        this.notifyServiceWorker('AUDIO_STATE_UPDATE', { isPlaying: false, postIndex: this.currentPostIndex });
        
        // Remove current reading highlight
        document.querySelectorAll('.post-item.current-reading').forEach(el => {
            el.classList.remove('current-reading');
        });
    }

    async skipToNext() {
        if (this.posts.length === 0) return;
        
        this.synth.cancel();
        this.currentPostIndex++;
        
        if (this.currentPostIndex >= this.posts.length) {
            // Try to auto-play next thread
            if (await this.autoPlayNextThread()) {
                return; // Successfully started next thread
            }
            
            this.stopReading();
            this.showError('Reached end of posts.');
            return;
        }
        
        if (this.isPlaying) {
            await this.readCurrentPost();
        }
    }
    
    async autoPlayNextThread() {
        // Find current thread in the threads list
        const currentThreadNo = this.currentThread;
        if (!currentThreadNo || !this.threads) {
            return false;
        }
        
        const currentThreadIndex = this.threads.findIndex(t => t.no === currentThreadNo);
        if (currentThreadIndex === -1 || currentThreadIndex >= this.threads.length - 1) {
            return false; // No next thread available
        }
        
        // Select next thread
        const nextThread = this.threads[currentThreadIndex + 1];
        const nextThreadElement = document.querySelector(`[data-thread-no="${nextThread.no}"]`);
        
        if (nextThreadElement) {
            // Auto-select and start playing next thread
            await this.selectThread(nextThread.no, nextThreadElement);
            
            // Always start reading automatically when auto-advancing
            setTimeout(() => {
                this.startReading();
            }, 1000); // Small delay to let thread load
            
            return true;
        }
        
        return false;
    }

    async readCurrentPost() {
        if (this.currentPostIndex >= this.posts.length) {
            this.stopReading();
            return;
        }
        
        const post = this.posts[this.currentPostIndex];

        
        // Get enhanced content with image descriptions
        const enhancedContent = await this.enhancePostWithImageDescriptions(post);
        let text = enhancedContent || post.comment || '';
        
        // Handle original post with no comment text
        if (post.isOP && !text.trim()) {
            text = 'Original post with image or media content.';
        }
        
        // Skip empty posts (shouldn't happen with our filtering, but safety check)
        if (!text.trim()) {
            this.currentPostIndex++;
            if (this.currentPostIndex < this.posts.length && this.isPlaying) {
                await this.readCurrentPost();
            } else {
                this.stopReading();
            }
            return;
        }
        
        // Simplify URLs in the text
        text = this.simplifyUrls(text);
        
        // Process post references and add context if needed
        text = this.processPostReferences(text, this.currentPostIndex);
        
        // Highlight current post
        document.querySelectorAll('.post-item.current-reading').forEach(el => {
            el.classList.remove('current-reading');
        });
        
        const currentPostElement = document.querySelector(`[data-post-index="${this.currentPostIndex}"]`);
        if (currentPostElement) {
            currentPostElement.classList.add('current-reading');
            currentPostElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        this.currentReading.textContent = `Reading post ${this.currentPostIndex + 1} of ${this.posts.length}`;
        
        // Play beep sound before reading (if not the first post)
        if (this.currentPostIndex > 0) {
            await this.playBeep();
        }
        
        // Use Puter.js TTS if enabled
        if (this.usePuterTTS) {
            await this.speakWithPuterTTS(text);
        } else {
            await this.speakWithBrowserTTS(text);
        }
    }
    
    async speakWithBrowserTTS(text) {
        this.currentUtterance = new SpeechSynthesisUtterance(text);
        
        // Set voice based on user variety if available
        if (this.availableVoices.length > 0 && this.posts && this.posts[this.currentPostIndex]) {
            const currentPost = this.posts[this.currentPostIndex];
            const userId = currentPost.name || currentPost.no || 'anonymous';
            const assignedVoice = this.getVoiceForUser(userId);
            if (assignedVoice) {
                this.currentUtterance.voice = assignedVoice;
            }
        } else {
            // Fallback to selected voice
            const selectedVoiceIndex = this.voiceSelect.value;
            if (selectedVoiceIndex && this.voices[selectedVoiceIndex]) {
                this.currentUtterance.voice = this.voices[selectedVoiceIndex];
            }
        }
        
        // Set speed
        this.currentUtterance.rate = parseFloat(this.speedRange.value);
        
        // Handle utterance events
        this.currentUtterance.onend = async () => {
            await this.handleSpeechEnd();
        };
        
        this.currentUtterance.onerror = (event) => {
            this.showError(`Speech synthesis error: ${event.error}`);
            this.stopReading();
        };
        
        this.synth.speak(this.currentUtterance);
    }
    
    async speakWithPuterTTS(text) {
        try {
            // Check if Puter.js TTS is disabled due to repeated failures
            if (this.puterTTSDisabled) {
                console.warn('⚠️ Puter.js TTS is disabled due to repeated failures. Using browser TTS.');
                await this.speakWithBrowserTTS(text);
                return;
            }
            
            // Validate text input
            if (!text || typeof text !== 'string' || text.trim().length === 0) {
                throw new Error('Text parameter is required and must be a non-empty string');
            }
            
            // Limit text length as per Puter.js requirements
            if (text.length > 3000) {
                text = text.substring(0, 3000);
            }
            
            console.log('Attempting Puter.js TTS with engine:', this.puterTTSEngine);
            
            // Check if puter is available
            if (typeof puter === 'undefined') {
                this.handlePuterTTSFailure('Puter.js library not loaded');
                throw new Error('Puter.js library not loaded');
            }
            
            // Rate limiting: Check if enough time has passed since last call
            const now = Date.now();
            const timeSinceLastCall = now - this.lastPuterTTSCall;
            console.log(`⏱️ Time since last Puter.js call: ${timeSinceLastCall}ms (limit: ${this.puterTTSRateLimit}ms)`);
            
            if (timeSinceLastCall < this.puterTTSRateLimit) {
                const waitTime = this.puterTTSRateLimit - timeSinceLastCall;
                console.log(`⏳ Rate limiting: waiting ${waitTime}ms before next Puter.js call`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
            
            this.lastPuterTTSCall = Date.now();
            console.log(`🚀 Making Puter.js API call (rate limit: ${this.puterTTSRateLimit}ms)`);
            
            // Use Puter.js SDK for TTS with proper options format
            const options = {
                voice: 'Joanna',
                engine: this.puterTTSEngine || 'neural',
                language: 'en-US'
            };
            
            console.log('Calling puter.ai.txt2speech with options:', options);
            console.log('⏱️ Time since last call:', timeSinceLastCall + 'ms');
            const result = await puter.ai.txt2speech(text, options);
            console.log('Puter.js API result:', result);
            console.log('Result type:', typeof result);
            console.log('Result keys:', Object.keys(result || {}));
            
            // Display API call info on webpage for debugging
            const errorDiv = document.getElementById('error-message');
            if (errorDiv) {
                const apiDebugInfo = {
                    apiCall: 'puter.ai.txt2speech',
                    options: options,
                    resultType: typeof result,
                    resultKeys: Object.keys(result || {}),
                    fullResult: result
                };
                errorDiv.innerHTML = `<h3>Puter.js API Debug Info:</h3><pre>${JSON.stringify(apiDebugInfo, null, 2)}</pre>`;
                errorDiv.classList.remove('hidden');
            }
            
            // Check if the result indicates success
            if (result && result.success === false) {
                console.error('Puter.js API returned error:', result.error);
                console.error('Full result object:', result);
                console.error('Error object keys:', Object.keys(result.error || {}));
                console.error('Error object type:', typeof result.error);
                console.error('Error object constructor:', result.error?.constructor?.name);
                
                // Check for specific error types
                const errorStr = JSON.stringify(result.error || {}).toLowerCase();
                if (errorStr.includes('rate') || errorStr.includes('limit') || errorStr.includes('quota')) {
                    console.error('🚫 Detected rate limiting or quota error');
                } else if (errorStr.includes('auth') || errorStr.includes('permission') || errorStr.includes('unauthorized')) {
                    console.error('🔐 Detected authentication/permission error');
                } else if (errorStr.includes('network') || errorStr.includes('timeout') || errorStr.includes('connection')) {
                    console.error('🌐 Detected network/connectivity error');
                }
                
                // Display detailed error analysis on webpage
                const errorDiv = document.getElementById('error-message');
                if (errorDiv) {
                    const errorAnalysis = {
                        resultSuccess: result.success,
                        errorType: typeof result.error,
                        errorKeys: Object.keys(result.error || {}),
                        errorConstructor: result.error?.constructor?.name,
                        fullResult: result,
                        errorObject: result.error
                    };
                    errorDiv.innerHTML = `<h3>Puter.js API Error Analysis:</h3><pre>${JSON.stringify(errorAnalysis, null, 2)}</pre>`;
                    errorDiv.classList.remove('hidden');
                }
                
                let errorMessage = 'Unknown Puter.js TTS error';
                let isRateLimit = false;
                
                if (result.error) {
                    const errorStr = JSON.stringify(result.error).toLowerCase();
                    
                    // Check for rate limiting first
                    if (errorStr.includes('rate') || errorStr.includes('limit') || errorStr.includes('quota')) {
                        errorMessage = 'Rate limit exceeded - too many requests to Puter.js API';
                        isRateLimit = true;
                        console.warn('🚫 Rate limit detected, increasing delay between calls');
                        this.puterTTSRateLimit = Math.min(this.puterTTSRateLimit * 2, 10000); // Double delay, max 10s
                    } else if (errorStr.includes('auth') || errorStr.includes('permission') || errorStr.includes('unauthorized')) {
                        errorMessage = 'Authentication/permission error with Puter.js API';
                    } else if (errorStr.includes('network') || errorStr.includes('timeout') || errorStr.includes('connection')) {
                        errorMessage = 'Network connectivity issue with Puter.js API';
                    } else if (typeof result.error === 'string') {
                        errorMessage = result.error;
                    } else if (result.error.message) {
                        errorMessage = result.error.message;
                    } else if (result.error.error) {
                        errorMessage = result.error.error;
                    } else if (result.error.details) {
                        errorMessage = result.error.details;
                    } else if (result.error.code) {
                        errorMessage = `Error code: ${result.error.code}`;
                    } else if (result.error.type) {
                        errorMessage = `Error type: ${result.error.type}`;
                    } else {
                        // Try to extract any meaningful information from the error object
                        const errorKeys = Object.keys(result.error);
                        if (errorKeys.length > 0) {
                            const firstKey = errorKeys[0];
                            const firstValue = result.error[firstKey];
                            errorMessage = `${firstKey}: ${firstValue}`;
                        } else {
                            errorMessage = 'Empty error object returned by Puter.js';
                        }
                    }
                }
                
                // Add rate limit info to error message
                if (isRateLimit) {
                    errorMessage += ` (delay increased to ${this.puterTTSRateLimit}ms)`;
                }
                
                // Track failure and fall back to browser TTS
                this.handlePuterTTSFailure(errorMessage);
                this.showError(`Puter.js TTS failed: ${errorMessage}`);
                await this.speakWithBrowserTTS(text);
                return;
            }
            
            // Reset failure count and rate limit on successful API call
            if (this.puterTTSFailureCount > 0) {
                console.log('✅ Puter.js TTS working again, resetting failure count');
                this.puterTTSFailureCount = 0;
                
                // Remove reset button if it exists
                const resetBtn = document.getElementById('puter-tts-reset-btn');
                if (resetBtn) {
                    resetBtn.remove();
                }
            }
            
            // Reset rate limit delay on successful call
            if (this.puterTTSRateLimit > 2000) {
                console.log('✅ Resetting rate limit delay to default (2000ms)');
                this.puterTTSRateLimit = 2000;
            }
            
            // Store reference for stopping
            this.currentAudio = result;
            
            // Set up event handlers
            result.onended = () => {
                this.handleSpeechEnd();
            };
            
            result.onerror = (error) => {
                console.error('Puter.js TTS audio playback error:', error);
                this.handlePuterTTSFailure('Audio playback error');
                this.speakWithBrowserTTS(text);
            };
            
            // Play the audio
            await result.play();
        } catch (error) {
            console.error('Puter.js TTS failed, falling back to browser TTS:', error);
            
            // Log detailed error information
            const errorDetails = {
                message: error.message || 'No message',
                stack: error.stack || 'No stack trace',
                name: error.name || 'No error name',
                toString: error.toString ? error.toString() : 'Cannot convert to string',
                constructor: error.constructor ? error.constructor.name : 'No constructor',
                type: typeof error,
                fullError: error
            };
            
            console.error('Error details:', errorDetails);
            
            // Display error on webpage for debugging
            const errorDiv = document.getElementById('error-message');
            if (errorDiv) {
                let errorMessage = 'Puter.js TTS API call failed';
                if (error.message) {
                    errorMessage = error.message;
                } else if (error.toString && error.toString() !== '[object Object]') {
                    errorMessage = error.toString();
                }
                
                errorDiv.innerHTML = `<h3>Puter.js TTS Error:</h3><p><strong>Error:</strong> ${errorMessage}</p><details><summary>Full Error Details</summary><pre>${JSON.stringify(errorDetails, null, 2)}</pre></details>`;
                errorDiv.classList.remove('hidden');
            }
            
            // If this is a Puter.js API response with error details
            if (error.message && error.message.includes('Puter.js TTS API error:')) {
                console.error('Puter.js API returned an error. This might be due to:');
                console.error('1. Network connectivity issues');
                console.error('2. Puter.js service temporarily unavailable');
                console.error('3. Text too long (max 3000 characters)');
                console.error('4. Invalid engine or language settings');
            }
            
            this.handlePuterTTSFailure(error.message || 'Unknown error');
            this.showError('Puter.js TTS failed, using browser TTS instead.');
            await this.speakWithBrowserTTS(text);
        }
    }
    
    handlePuterTTSFailure(errorMessage) {
        this.puterTTSFailureCount++;
        console.warn(`⚠️ Puter.js TTS failure #${this.puterTTSFailureCount}: ${errorMessage}`);
        
        if (this.puterTTSFailureCount >= this.maxPuterTTSFailures) {
            this.puterTTSDisabled = true;
            console.error(`❌ Puter.js TTS disabled after ${this.maxPuterTTSFailures} consecutive failures`);
            
            // Show notification to user
            this.showError(`Puter.js TTS has been disabled after ${this.maxPuterTTSFailures} failures. Using browser TTS only.`);
            
            // Add a button to re-enable Puter.js TTS
            this.addPuterTTSResetButton();
        }
    }
    
    resetPuterTTSFailures() {
        this.puterTTSFailureCount = 0;
        this.puterTTSDisabled = false;
        console.log('✅ Puter.js TTS failure count reset. Re-enabling Puter.js TTS.');
        this.hideError();
        
        // Remove reset button if it exists
        const resetBtn = document.getElementById('puter-tts-reset-btn');
        if (resetBtn) {
            resetBtn.remove();
        }
    }
    
    addPuterTTSResetButton() {
        // Check if button already exists
        if (document.getElementById('puter-tts-reset-btn')) {
            return;
        }
        
        const resetBtn = document.createElement('button');
        resetBtn.id = 'puter-tts-reset-btn';
        resetBtn.textContent = 'Re-enable Puter.js TTS';
        resetBtn.className = 'btn btn-warning';
        resetBtn.style.marginLeft = '10px';
        resetBtn.onclick = () => this.resetPuterTTSFailures();
        
        // Add button next to TTS controls
        const controlsDiv = document.querySelector('.controls');
        if (controlsDiv) {
            controlsDiv.appendChild(resetBtn);
        }
    }
    
    // Puter.js TTS methods removed - now using SDK directly in speakWithPuterTTS
    
    async handleSpeechEnd() {
        if (!this.isPlaying) return; // Exit early if not playing
        
        this.currentPostIndex++;
        
        // Check if we've reached the end of the thread
        if (this.currentPostIndex >= this.posts.length) {
            this.currentReading.textContent = 'End of thread - trying next thread...';
            
            // Try to auto-play next thread
            const success = await this.autoPlayNextThread();
            
            if (!success) {
                this.stopReading();
                this.showError('Reached end of thread. No more threads available.');
            }
            return;
        }
        
        // Continue to next post
        setTimeout(async () => {
            if (this.isPlaying) { // Double-check we're still playing
                await this.readCurrentPost();
            }
        }, 300);
    }

    stripHtml(html) {
        if (!html) return '';
        
        // Create a temporary div to parse HTML
        const temp = document.createElement('div');
        temp.innerHTML = html;
        
        // Handle line breaks
        temp.querySelectorAll('br').forEach(br => {
            br.replaceWith('\n');
        });
        
        // Handle quotes (greentext)
        temp.querySelectorAll('.quote').forEach(quote => {
            quote.textContent = `Quote: ${quote.textContent}`;
        });
        
        // Get text content and clean up
        let text = temp.textContent || temp.innerText || '';
        
        // Clean up extra whitespace
        text = text.replace(/\s+/g, ' ').trim();
        
        return text;
    }

    simplifyUrls(text) {
        if (!text) return '';
        
        // Count total URLs first
        const allUrls = text.match(/https?:\/\/[^\s]+/gi) || [];
        
        // If more than 2 URLs, replace all with 'various weblinks'
        if (allUrls.length > 2) {
            return text.replace(/https?:\/\/[^\s]+/gi, '').replace(/\s+/g, ' ').trim() + ' various weblinks';
        }
        
        // Replace various URL patterns with simplified descriptions
        const urlPatterns = [
            {
                pattern: /https?:\/\/(www\.)?x\.com\/[^\s]+/gi,
                replacement: 'X post'
            },
            {
                pattern: /https?:\/\/(www\.)?twitter\.com\/[^\s]+/gi,
                replacement: 'Twitter post'
            },
            {
                pattern: /https?:\/\/(www\.)?youtube\.com\/watch\?v=[^\s]+/gi,
                replacement: 'YouTube video'
            },
            {
                pattern: /https?:\/\/(www\.)?youtu\.be\/[^\s]+/gi,
                replacement: 'YouTube video'
            },
            {
                pattern: /https?:\/\/(www\.)?reddit\.com\/[^\s]+/gi,
                replacement: 'Reddit post'
            },
            {
                pattern: /https?:\/\/(www\.)?instagram\.com\/[^\s]+/gi,
                replacement: 'Instagram post'
            },
            {
                pattern: /https?:\/\/(www\.)?tiktok\.com\/[^\s]+/gi,
                replacement: 'TikTok video'
            },
            {
                pattern: /https?:\/\/(www\.)?facebook\.com\/[^\s]+/gi,
                replacement: 'Facebook post'
            },
            {
                pattern: /https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp)/gi,
                replacement: 'image'
            },
            {
                pattern: /https?:\/\/[^\s]+\.(mp4|webm|mov|avi)/gi,
                replacement: 'video'
            },
            {
                pattern: /https?:\/\/[^\s]+/gi,
                replacement: 'weblink'
            }
        ];
        
        let simplifiedText = text;
        urlPatterns.forEach(({ pattern, replacement }) => {
            simplifiedText = simplifiedText.replace(pattern, replacement);
        });
        
        // Replace 'right pointing triangle' with 'right arrow'
        simplifiedText = simplifiedText.replace(/right pointing triangle/gi, 'right arrow');
        
        return simplifiedText;
    }

    processPostReferences(text, currentPostIndex) {
        // Remove various 4chan reference patterns
        text = text.replace(/>>(\d+)/g, ''); // >>123456789
        text = text.replace(/\b\d{8,}\b/g, ''); // Long number strings (8+ digits)
        text = text.replace(/\(OP\)/g, ''); // (OP) markers
        text = text.replace(/\(You\)/g, ''); // (You) markers
        text = text.replace(/>>>/g, ''); // >>> markers
        text = text.replace(/\s+/g, ' '); // Clean up extra whitespace
        
        // Return the clean text without any reference context
        return text.trim();
    }
    
    createPostSummary(text) {
        // Create a brief summary of the post content
        const cleanText = this.stripHtml(text).replace(/\s+/g, ' ').trim();
        
        // Extract key topics/words (simple approach)
        const words = cleanText.toLowerCase().split(/\s+/);
        const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them']);
        
        const keyWords = words
            .filter(word => word.length > 3 && !stopWords.has(word))
            .slice(0, 3);
        
        if (keyWords.length > 0) {
            return keyWords.join(', ');
        }
        
        // Fallback: use first few words
        return cleanText.substring(0, 30).trim() + (cleanText.length > 30 ? '...' : '');
    }

    async playBeep() {
        return new Promise((resolve) => {
            // Create a short beep using Web Audio API
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // 800Hz beep
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime); // Low volume
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.1);
                
                oscillator.onended = () => {
                    audioContext.close();
                    resolve();
                };
            } catch (error) {
                // Fallback: just resolve immediately if Web Audio API fails
                console.warn('Could not play beep sound:', error);
                resolve();
            }
        });
    }

    showLoading(show) {
        if (show) {
            this.loading.classList.remove('hidden');
        } else {
            this.loading.classList.add('hidden');
        }
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.classList.remove('hidden');
        setTimeout(() => {
            this.hideError();
        }, 5000);
    }

    hideError() {
        this.errorMessage.classList.add('hidden');
    }
    
    // Image description methods
    async describeImage(imageUrl) {
        if (!this.imageDescriptionsEnabled) return null;
        
        // Check cache first
        if (this.imageDescriptionCache.has(imageUrl)) {
            return this.imageDescriptionCache.get(imageUrl);
        }
        
        try {
            // Skip image description if no HF token is available
            if (!this.hfToken) {
                console.log('Hugging Face token not available, skipping image description');
                return 'Image';
            }
            
            console.log('Using Hugging Face token (first 10 chars):', this.hfToken.substring(0, 10) + '...');
            console.log('Making request to:', imageUrl);
            
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.hfToken}`
            };
            
            const response = await fetch('https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    inputs: imageUrl
                })
            });
            
            if (!response.ok) {
                console.warn('Image description failed:', response.status);
                return null;
            }
            
            const result = await response.json();
            const description = result[0]?.generated_text || 'Image could not be described';
            
            // Cache the result
            this.imageDescriptionCache.set(imageUrl, description);
            
            return description;
        } catch (error) {
            console.warn('Error describing image:', error);
            return null;
        }
    }
    
    extractImageUrls(post) {
        const images = [];
        
        // Check for 4chan image attachments
        if (post.filename && post.ext) {
            const imageUrl = `https://i.4cdn.org/${this.currentBoard}/${post.tim}${post.ext}`;
            images.push({
                url: imageUrl,
                filename: post.filename + post.ext
            });
        }
        
        return images;
    }
    
    async enhancePostWithImageDescriptions(post) {
        if (!this.imageDescriptionsEnabled) {
            return post.com || '';
        }
        
        let content = post.com || '';
        const images = this.extractImageUrls(post);
        
        if (images.length > 0) {
            console.log(`Processing ${images.length} image(s) for descriptions...`);
            // Show processing indicator
            const statusElement = document.getElementById('image-processing-status');
            if (statusElement) {
                statusElement.classList.remove('hidden');
            }
            
            const descriptions = [];
            
            for (const image of images) {
                const description = await this.describeImage(image.url);
                if (description) {
                    descriptions.push(`Image: ${description}`);
                }
            }
            
            // Hide processing indicator
            if (statusElement) {
                statusElement.classList.add('hidden');
            }
            
            if (descriptions.length > 0) {
                content = descriptions.join('. ') + (content ? '. ' + content : '');
            }
        }
        
        return content;
    }
    
    setupMobileOptimizations() {
        // Request wake lock to prevent screen from sleeping during playback
        this.requestWakeLock();
        
        // Enhanced background audio persistence
        this.setupBackgroundAudioPersistence();
        
        // Handle visibility change to maintain playback
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isPlaying) {
                // Page is hidden but we're playing - try to maintain audio
                this.handleBackgroundPlayback();
                this.preventPageSuspension();
            } else if (!document.hidden && this.isPlaying) {
                // Page is visible again - resume normal operation
                this.requestWakeLock();
                this.resumeFromBackground();
            }
        });
        
        // Prevent page from being suspended on mobile
        this.setupPageSuspensionPrevention();
    }
    
    setupBackgroundAudioPersistence() {
        // Keep audio context alive
        if (window.AudioContext || window.webkitAudioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create a silent audio buffer to keep context alive
            this.silentBuffer = this.audioContext.createBuffer(1, 1, 22050);
            this.silentSource = null;
        }
        
        // Enhanced media session for better mobile support
        this.setupEnhancedMediaSession();
        
        // Aggressive audio session management
        setInterval(() => {
            if (this.isPlaying && document.hidden) {
                this.maintainBackgroundAudio();
            }
        }, 5000); // Check every 5 seconds
    }
    
    setupPageSuspensionPrevention() {
        // Multiple techniques to prevent page suspension
        
        // 1. Periodic network activity
        this.backgroundPingInterval = setInterval(() => {
            if (this.isPlaying && document.hidden) {
                // Minimal network request to keep connection alive
                fetch('/favicon.ico', { cache: 'no-cache' }).catch(() => {});
            }
        }, 30000);
        
        // 2. Periodic DOM manipulation
        this.backgroundDOMInterval = setInterval(() => {
            if (this.isPlaying && document.hidden) {
                // Minimal DOM update to prevent suspension
                document.title = document.title;
            }
        }, 15000);
        
        // 3. Audio context state management
        document.addEventListener('touchstart', () => {
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
        }, { passive: true });
    }
    
    preventPageSuspension() {
        // Play silent audio to keep audio session active
        if (this.audioContext && this.silentBuffer) {
            try {
                if (this.silentSource) {
                    this.silentSource.stop();
                }
                this.silentSource = this.audioContext.createBufferSource();
                this.silentSource.buffer = this.silentBuffer;
                this.silentSource.connect(this.audioContext.destination);
                this.silentSource.loop = true;
                this.silentSource.start();
            } catch (error) {
                console.log('Silent audio failed:', error);
            }
        }
        
        // Force speech synthesis to stay active
        if (this.synth.paused) {
            this.synth.resume();
        }
        
        // Notify service worker of background state
        this.notifyServiceWorker('BACKGROUND_AUDIO_ACTIVE', {
            isPlaying: this.isPlaying,
            currentPostIndex: this.currentPostIndex
        });
    }
    
    maintainBackgroundAudio() {
        // Aggressive audio maintenance for background playback
        if (this.currentUtterance && this.synth.speaking) {
            // Force resume if paused
            if (this.synth.paused) {
                this.synth.resume();
            }
        } else if (this.isPlaying && !this.synth.speaking) {
            // If we should be playing but aren't, restart current post
            console.log('Restarting audio from background');
            this.readCurrentPost();
        }
        
        // Keep audio context alive
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
    
    resumeFromBackground() {
        // Clean up background audio maintenance
        if (this.silentSource) {
            try {
                this.silentSource.stop();
                this.silentSource = null;
            } catch (error) {
                console.log('Silent audio cleanup failed:', error);
            }
        }
        
        // Ensure audio is still playing
        if (this.isPlaying && this.synth.paused) {
            this.synth.resume();
        }
    }
    
    setupEnhancedMediaSession() {
        if ('mediaSession' in navigator) {
            // Set playback state
            navigator.mediaSession.playbackState = 'playing';
            
            // Enhanced action handlers with better mobile support
            navigator.mediaSession.setActionHandler('play', () => {
                if (this.isPaused) {
                    this.togglePlayPause();
                }
                navigator.mediaSession.playbackState = 'playing';
            });

            navigator.mediaSession.setActionHandler('pause', () => {
                if (!this.isPaused) {
                    this.togglePlayPause();
                }
                navigator.mediaSession.playbackState = 'paused';
            });
        }
        
        // Handle page unload to clean up wake lock
        window.addEventListener('beforeunload', () => {
            this.releaseWakeLock();
        });
        
        // Mobile-specific touch optimizations
        if ('ontouchstart' in window) {
            this.setupTouchOptimizations();
        }
    }
    
    async requestWakeLock() {
        if ('wakeLock' in navigator && !this.wakeLock) {
            try {
                this.wakeLock = await navigator.wakeLock.request('screen');
                console.log('Wake lock acquired');
                
                this.wakeLock.addEventListener('release', () => {
                    console.log('Wake lock released');
                    this.wakeLock = null;
                });
            } catch (err) {
                console.warn('Could not acquire wake lock:', err);
            }
        }
    }
    
    releaseWakeLock() {
        if (this.wakeLock) {
            this.wakeLock.release();
            this.wakeLock = null;
        }
    }
    
    handleBackgroundPlayback() {
        // Ensure speech synthesis continues in background
        if (this.isPlaying && this.synth.paused) {
            this.synth.resume();
        }
        
        // Re-request wake lock if lost
        this.requestWakeLock();
    }

    setupMediaSession() {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: '4chan TTS Reader',
                artist: 'Reading Posts',
                album: this.currentBoard || 'Board',
                artwork: [
                    { src: '/icon-96x96.png', sizes: '96x96', type: 'image/png' },
                    { src: '/icon-128x128.png', sizes: '128x128', type: 'image/png' },
                    { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
                    { src: '/icon-256x256.png', sizes: '256x256', type: 'image/png' },
                    { src: '/icon-384x384.png', sizes: '384x384', type: 'image/png' },
                    { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' }
                ]
            });

            navigator.mediaSession.setActionHandler('play', () => {
                if (this.isPaused) {
                    this.togglePlayPause();
                }
            });

            navigator.mediaSession.setActionHandler('pause', () => {
                if (!this.isPaused) {
                    this.togglePlayPause();
                }
            });

            navigator.mediaSession.setActionHandler('stop', () => {
                this.stopReading();
            });

            navigator.mediaSession.setActionHandler('nexttrack', () => {
                this.skipToNext();
            });

            navigator.mediaSession.setActionHandler('previoustrack', () => {
                if (this.currentPostIndex > 0) {
                    this.currentPostIndex -= 2; // Go back one (will be incremented in skipToNext)
                    this.skipToNext();
                }
            });
        }
    }

    setupTouchOptimizations() {
        // Add touch-friendly event handlers
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            button.addEventListener('touchstart', (e) => {
                e.preventDefault();
                button.click();
            }, { passive: false });
        });
        
        // Prevent zoom on double tap for control elements
        const controls = document.querySelector('.controls');
        if (controls) {
            controls.addEventListener('touchend', (e) => {
                e.preventDefault();
            }, { passive: false });
        }
    }
    
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered:', registration);
                
                // Listen for messages from service worker
                navigator.serviceWorker.addEventListener('message', (event) => {
                    this.handleServiceWorkerMessage(event.data);
                });
                
                // Request notification permission for background operation
                if ('Notification' in window && Notification.permission === 'default') {
                    await Notification.requestPermission();
                }
                
            } catch (error) {
                console.warn('Service Worker registration failed:', error);
            }
        }
    }
    
    handleServiceWorkerMessage(data) {
        const { type, timestamp } = data;
        
        switch (type) {
            case 'BACKGROUND_SYNC':
                // Handle background sync - ensure audio continues
                if (this.isPlaying && this.synth.paused) {
                    this.synth.resume();
                }
                break;
            case 'BACKGROUND_KEEPALIVE':
                // Enhanced background keepalive handling
                if (this.isPlaying && document.hidden) {
                    this.maintainBackgroundAudio();
                }
                break;
            default:
                console.log('Unknown service worker message:', type);
        }
    }
    
    notifyServiceWorker(type, data = {}) {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type, data });
        }
    }
    
    setupCloudTTSOption() {
        // This method sets up the Cloud TTS option UI elements
        // The actual HTML elements should be added to the page:
        // <div class="cloud-tts-controls">
        //     <label>
        //         <input type="checkbox" id="use-cloud-tts"> Use Google Cloud TTS (Higher Quality)
        //     </label>
        //     <input type="text" id="cloud-tts-api-key" placeholder="Google Cloud TTS API Key" style="width: 100%; margin-top: 5px;">
        //     <small>Get your free API key at <a href="https://cloud.google.com/text-to-speech" target="_blank">Google Cloud Console</a></small>
        // </div>
        
        console.log('Cloud TTS option initialized. Add the HTML elements to enable this feature.');
    }
    
    checkPuterLibrary() {
        const debugInfo = [];
        debugInfo.push('Checking Puter.js library availability...');
        debugInfo.push(`Current URL: ${window.location.href}`);
        debugInfo.push(`User Agent: ${navigator.userAgent}`);
        
        // Check if Puter.js script is loaded
        const puterScript = document.querySelector('script[src*="puter.com"]');
        if (puterScript) {
            debugInfo.push(`✅ Puter.js script tag found: ${puterScript.src}`);
        } else {
            debugInfo.push('❌ Puter.js script tag not found');
        }
        
        if (typeof window.puter !== 'undefined') {
            debugInfo.push('✅ Puter.js library is available');
            debugInfo.push(`Puter object type: ${typeof window.puter}`);
            debugInfo.push(`Puter object keys: ${Object.keys(window.puter).join(', ')}`);
            
            if (window.puter.ai) {
                debugInfo.push('✅ Puter.ai is available');
                debugInfo.push(`Puter.ai type: ${typeof window.puter.ai}`);
                debugInfo.push(`Puter.ai keys: ${Object.keys(window.puter.ai).join(', ')}`);
                
                if (typeof window.puter.ai.txt2speech === 'function') {
                    debugInfo.push('✅ Puter.js TTS functionality is available');
                    debugInfo.push('🧪 Auto-testing Puter.js TTS to capture error details...');
                    this.displayDebugInfo(debugInfo);
                    
                    // Add manual test button
                    this.addManualTestButton();
                    
                    // Auto-test with a simple message
                    setTimeout(() => {
                        this.speakWithPuterTTS('Test');
                    }, 1000);
                    return;
                } else {
                    debugInfo.push(`❌ TTS function not available. Type: ${typeof window.puter.ai.txt2speech}`);
                }
            } else {
                debugInfo.push(`❌ Puter.ai not available. Type: ${typeof window.puter.ai}`);
            }
        } else {
            debugInfo.push('❌ Puter.js library is NOT available');
            debugInfo.push('Possible causes:');
            debugInfo.push('- Network connectivity issues');
            debugInfo.push('- CDN blocking or unavailable');
            debugInfo.push('- Script loading order issues');
            debugInfo.push('- Browser security restrictions');
        }
        
        this.displayDebugInfo(debugInfo);
    }
    
    addManualTestButton() {
        const errorDiv = document.getElementById('error-message');
        if (errorDiv && !document.getElementById('manual-test-btn')) {
            const testButton = document.createElement('button');
            testButton.id = 'manual-test-btn';
            testButton.textContent = 'Test Puter.js TTS Manually';
            testButton.style.cssText = 'margin: 10px 0; padding: 10px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;';
            testButton.onclick = () => {
                this.speakWithPuterTTS('Manual test message');
            };
            errorDiv.appendChild(testButton);
        }
    }
    
    displayDebugInfo(messages) {
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.innerHTML = `<h3>Debug Info:</h3><pre>${messages.join('\n')}</pre>`;
            errorDiv.classList.remove('hidden');
        }
        messages.forEach(msg => console.log(msg));
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new FourChanTTS();
});