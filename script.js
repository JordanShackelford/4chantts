class FourChanTTS {
    constructor() {
        this.isReading = false;
        this.isTransitioning = false;
        this.currentPostIndex = 0;
        this.posts = [];
        this.threads = [];
        this.selectedBoard = null;
        this.selectedThread = null;
        this.speechSynthesis = window.speechSynthesis;
        this.currentUtterance = null;
        this.voices = [];
        this.voiceAssignments = new Map();
        this.userVoices = new Map();
        this.voicesLoaded = false;
        this.autoPlay = true;
        this.autoPlayDelay = 500;
        this.imageDescriptionEnabled = false;
        this.puterTTSEnabled = false;
        this.puterTTSFailures = 0;
        this.maxPuterTTSFailures = 3;
        this.toneAnalysisEnabled = false;
        this.rhymeEngine = new RhymeEngine();
        this.beatEnabled = false;
        this.beatInterval = null;
        this.beatTempo = 120;
        
        // Initialize the app
        this.initializeElements();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.setDefaults();
        this.loadVoices();
        this.setupMobileOptimizations();
        this.setupCloudTTSOption();
        this.setupRhymeBeatControls();
        
        // Load boards and start auto-play
        console.log('About to load boards...');
        this.loadAllBoards().then(() => {
            console.log('Boards loaded successfully');
            this.startAutoPlayWorkflow();
        }).catch(error => {
            console.error('Failed to initialize:', error);
            this.showError('Failed to load boards. Check your connection.', true, () => this.loadAllBoards());
        });
        
        // Force fallback boards as a test
        setTimeout(() => {
            console.log('Timeout check: boards =', this.boards);
            console.log('Timeout check: boardSelector =', this.boardSelector);
            if (!this.boards || this.boards.length === 0) {
                console.log('No boards loaded after 3 seconds, forcing fallback...');
                this.useFallbackBoards();
                this.startAutoPlayWorkflow();
            } else {
                console.log('Boards already loaded:', this.boards.length);
            }
        }, 3000);
        
        // Initialize tone analysis system
        if (this.toneAnalysisEnabled) {
            this.initializeToneSystem();
        }
    }

    initializeElements() {
        this.boardSelector = document.getElementById('boardSelector');
        this.loadThreadsBtn = document.getElementById('load-threads');
        this.threadList = document.getElementById('threads-list');
        this.postList = document.getElementById('posts-list');
        this.playPauseBtn = document.getElementById('play-pause');
        this.stopBtn = document.getElementById('stop');
        this.nextBtn = document.getElementById('skip');
        this.voiceSelect = document.getElementById('voice-select');
        this.rateSlider = document.getElementById('speed-range');
        this.pitchSlider = document.getElementById('pitchSlider');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.autoPlayCheckbox = null; // Element doesn't exist in HTML
        this.autoPlayDelaySlider = null; // Element doesn't exist in HTML
        this.imageDescriptionCheckbox = document.getElementById('enable-image-descriptions');
        this.loadingIndicator = document.getElementById('loading');
        this.errorMessage = document.getElementById('error-message');
        this.debugInfo = document.getElementById('debugInfo');
        this.puterTTSCheckbox = document.getElementById('use-puter-tts');
        this.toneAnalysisCheckbox = document.getElementById('enable-tone-analysis');
        this.rhymeCheckbox = document.getElementById('enable-rhyme-mode');
        this.beatCheckbox = document.getElementById('enable-beat-sync');
        this.beatTempoSlider = document.getElementById('bpm-range');
        this.progressContainer = document.getElementById('progress-container');
        this.progressText = document.getElementById('progress-text');
        this.progressPercentage = document.getElementById('progress-percentage');
        this.progressFill = document.getElementById('progress-fill');
    }

    setupEventListeners() {
        if (this.boardSelector) {
            this.boardSelector.addEventListener('change', () => {
                console.log('Board selector changed to:', this.boardSelector.value);
                this.selectedBoard = this.boardSelector.value;
                console.log('Selected board set to:', this.selectedBoard);
                if (this.selectedBoard) {
                    console.log('Auto-loading threads for selected board...');
                    this.loadThreads();
                } else {
                    console.log('No board selected, not loading threads');
                }
            });
        }

        if (this.playPauseBtn) {
            this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        }

        if (this.stopBtn) {
            this.stopBtn.addEventListener('click', () => this.stopReading());
        }

        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => this.skipToNext());
        }

        // Auto-play controls don't exist in current HTML - commenting out to prevent errors
        // if (this.autoPlayCheckbox) {
        //     this.autoPlayCheckbox.addEventListener('change', (e) => {
        //         this.autoPlay = e.target.checked;
        //     });
        // }

        // if (this.autoPlayDelaySlider) {
        //     this.autoPlayDelaySlider.addEventListener('input', (e) => {
        //         this.autoPlayDelay = parseInt(e.target.value);
        //         const autoPlayDelayValue = document.getElementById('autoPlayDelayValue');
        //         if (autoPlayDelayValue) {
        //             autoPlayDelayValue.textContent = this.autoPlayDelay + 'ms';
        //         }
        //     });
        // }

        if (this.imageDescriptionCheckbox) {
            this.imageDescriptionCheckbox.addEventListener('change', (e) => {
                this.imageDescriptionEnabled = e.target.checked;
            });
        }

        // Add event listener for speed range slider
        if (this.rateSlider) {
            this.rateSlider.addEventListener('input', (e) => {
                const speedValue = document.getElementById('speed-value');
                if (speedValue) {
                    speedValue.textContent = parseFloat(e.target.value).toFixed(1) + 'x';
                }
            });
        }

        if (this.puterTTSCheckbox) {
            this.puterTTSCheckbox.addEventListener('change', (e) => {
                this.puterTTSEnabled = e.target.checked;
                if (this.puterTTSEnabled && !this.checkPuterLibrary()) {
                    this.showError('Puter TTS library not found. Please check the console for details.');
                    this.puterTTSCheckbox.checked = false;
                    this.puterTTSEnabled = false;
                }
            });
        }

        if (this.toneAnalysisCheckbox) {
            this.toneAnalysisCheckbox.addEventListener('change', (e) => {
                this.toneAnalysisEnabled = e.target.checked;
                if (this.toneAnalysisEnabled) {
                    this.initializeToneSystem();
                }
            });
        }

        if (this.rhymeCheckbox) {
            this.rhymeCheckbox.addEventListener('change', (e) => {
                this.rhymeEnabled = e.target.checked;
            });
        }

        if (this.beatCheckbox) {
            this.beatCheckbox.addEventListener('change', (e) => {
                this.beatEnabled = e.target.checked;
                if (this.beatEnabled) {
                    this.startBeat();
                } else {
                    this.stopBeatMethod();
                }
            });
        }

        if (this.beatTempoSlider) {
            this.beatTempoSlider.addEventListener('input', (e) => {
                this.beatTempo = parseInt(e.target.value);
                const beatTempoValue = document.getElementById('bpm-value');
        if (beatTempoValue) {
            beatTempoValue.textContent = this.beatTempo + ' BPM';
        }
                if (this.beatEnabled) {
                    this.stopBeatMethod();
                    this.startBeat();
                }
            });
        }

        // Add event listener for Load Threads button
        if (this.loadThreadsBtn) {
            this.loadThreadsBtn.addEventListener('click', () => {
                console.log('Load Threads button clicked!');
                console.log('Selected board:', this.selectedBoard);
                if (this.selectedBoard) {
                    console.log('Starting to load threads...');
                    this.loadThreads();
                } else {
                    console.log('No board selected, showing error');
                    this.showError('Please select a board first.');
                }
            });
        }
        
        // Add test TTS button event listener
        const testTTSBtn = document.getElementById('test-tts-btn');
        if (testTTSBtn) {
            testTTSBtn.addEventListener('click', () => {
                this.testTTS();
            });
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only handle shortcuts when not typing in input fields
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                return;
            }

            switch (e.key.toLowerCase()) {
                case ' ': // Spacebar for play/pause
                case 'k':
                    e.preventDefault();
                    this.togglePlayPause();
                    break;
                case 'arrowright': // Right arrow for skip
                case 'n':
                    e.preventDefault();
                    this.skipToNext();
                    break;
                case 's': // S for stop
                case 'escape':
                    e.preventDefault();
                    this.stopReading();
                    break;
                case 'r': // R for random board
                    e.preventDefault();
                    this.selectRandomBoard();
                    break;
                case 'm': // M for mute/unmute
                    e.preventDefault();
                    this.toggleMute();
                    break;
                case '?': // Show keyboard shortcuts help
                    e.preventDefault();
                    this.showKeyboardHelp();
                    break;
            }
        });
        
        console.log('⌨️ Keyboard shortcuts enabled: Space/K=Play/Pause, →/N=Skip, S/Esc=Stop, R=Random Board, M=Mute, ?=Help');
    }

    toggleMute() {
        if (this.currentUtterance) {
            this.speechSynthesis.cancel();
        }
        // Toggle mute state - could be expanded to remember volume
        console.log('🔇 Mute toggled');
    }

    showKeyboardHelp() {
        const helpText = `
🎹 Keyboard Shortcuts:

▶️ Play/Pause: Space or K
⏭️ Skip: Right Arrow or N  
⏹️ Stop: S or Escape
🎲 Random Board: R
🔇 Mute: M
❓ Help: ?

Note: Shortcuts work when not typing in input fields.`;
        
        alert(helpText);
    }

    updateProgress() {
        if (!this.progressContainer || !this.posts.length) return;
        
        const currentPost = this.currentPostIndex + 1;
        const totalPosts = this.posts.length;
        const percentage = Math.round((currentPost / totalPosts) * 100);
        
        if (this.progressText) {
            this.progressText.textContent = `Post ${currentPost} of ${totalPosts}`;
        }
        
        if (this.progressPercentage) {
            this.progressPercentage.textContent = `${percentage}%`;
        }
        
        if (this.progressFill) {
            this.progressFill.style.width = `${percentage}%`;
        }
        
        // Show progress container when reading
        if (this.isReading && this.progressContainer.classList.contains('hidden')) {
            this.progressContainer.classList.remove('hidden');
        }
    }

    hideProgress() {
        if (this.progressContainer) {
            this.progressContainer.classList.add('hidden');
        }
    }

    setDefaults() {
        if (this.rateSlider) {
            this.rateSlider.value = 1.0;
        }
        if (this.pitchSlider) {
            this.pitchSlider.value = 1.0;
        }
        if (this.volumeSlider) {
            this.volumeSlider.value = 1.0;
        }
        if (this.autoPlayDelaySlider) {
            this.autoPlayDelaySlider.value = 2000;
            this.autoPlayDelay = 2000;
        }
        if (this.beatTempoSlider) {
            this.beatTempoSlider.value = 120;
            this.beatTempo = 120;
        }
    }

    loadVoices() {
        console.log('🎤 Starting voice loading system...');
        console.log('🔍 speechSynthesis available:', !!this.speechSynthesis);
        console.log('🔍 voiceSelect element:', !!this.voiceSelect);
        
        const updateVoices = () => {
            this.voices = this.speechSynthesis.getVoices();
            console.log('🔄 Voice update called, found:', this.voices.length, 'voices');
            
            if (this.voices.length > 0) {
                console.log('📋 Available voices:');
                this.voices.forEach((voice, index) => {
                    console.log(`  ${index}: ${voice.name} (${voice.lang}) ${voice.default ? '[DEFAULT]' : ''}`);
                });
            }
            
            if (this.voiceSelect) {
                this.voiceSelect.innerHTML = '';
                
                if (this.voices.length > 0) {
                    this.voices.forEach((voice, index) => {
                        const option = document.createElement('option');
                        option.value = index;
                        option.textContent = `${voice.name} (${voice.lang})`;
                        if (voice.default) {
                            option.selected = true;
                        }
                        this.voiceSelect.appendChild(option);
                    });
                    
                    console.log(`✅ Successfully populated voice dropdown with ${this.voices.length} voices`);
                    this.voicesLoaded = true;
                    this.autoPlay = true;
                } else {
                    console.log('⚠️ No voices found - adding fallback option');
                    const fallbackOption = document.createElement('option');
                    fallbackOption.value = '';
                    fallbackOption.textContent = 'No voices available - loading...';
                    this.voiceSelect.appendChild(fallbackOption);
                }
            } else {
                console.error('❌ voiceSelect element not found!');
            }
        };
        
        // Force immediate voice loading
        updateVoices();
        
        // Set up voice change listener
        if (this.speechSynthesis.onvoiceschanged !== undefined) {
            console.log('🔗 Setting up onvoiceschanged listener');
            this.speechSynthesis.onvoiceschanged = updateVoices;
        } else {
            console.warn('⚠️ onvoiceschanged not supported');
        }
        
        // Aggressive voice loading with multiple attempts
        const forceVoiceLoad = (attempt) => {
            console.log(`🚀 Force loading voices (attempt ${attempt})...`);
            this.speechSynthesis.cancel();
            
            // Create a dummy utterance to trigger voice loading
            const dummyUtterance = new SpeechSynthesisUtterance('test');
            dummyUtterance.volume = 0;
            this.speechSynthesis.speak(dummyUtterance);
            this.speechSynthesis.cancel();
            
            updateVoices();
        };
        
        // Multiple fallback attempts with different timings
        setTimeout(() => forceVoiceLoad(1), 50);
        setTimeout(() => forceVoiceLoad(2), 200);
        setTimeout(() => forceVoiceLoad(3), 500);
        setTimeout(() => forceVoiceLoad(4), 1000);
        setTimeout(() => forceVoiceLoad(5), 2000);
        
        // Final check after 3 seconds
        setTimeout(() => {
            console.log('🏁 Final voice check after 3 seconds:');
            console.log('   Voices loaded:', this.voices.length);
            console.log('   voicesLoaded flag:', this.voicesLoaded);
            if (this.voices.length === 0) {
                console.error('❌ CRITICAL: No voices loaded after all attempts!');
                this.showError('Voice loading failed. Please refresh the page or try a different browser.');
            }
        }, 3000);
    }

    getVoiceForThread(threadNo) {
        if (!this.voiceAssignments.has(threadNo)) {
            const randomIndex = Math.floor(Math.random() * this.voices.length);
            this.voiceAssignments.set(threadNo, randomIndex);
        }
        return this.voices[this.voiceAssignments.get(threadNo)];
    }

    getVoiceForUser(userId) {
        if (!this.userVoices.has(userId)) {
            const randomIndex = Math.floor(Math.random() * this.voices.length);
            this.userVoices.set(userId, randomIndex);
        }
        return this.voices[this.userVoices.get(userId)];
    }

    async loadAllBoards() {
        console.log('Starting to load boards...');
        this.showLoading(true);
        
        try {
            await this.loadBoardsFromAPI();
        } catch (error) {
            console.error('Failed to load boards from API:', error);
            this.showError('Failed to load boards. Check your connection.', true, () => this.loadAllBoards());
        }
    }
    
    async loadBoardsFromAPI() {
        console.log('Attempting to load boards from API...');
        
        const proxies = [
            'http://localhost:8001/api/', // Local CORS proxy - most reliable
            '', // Direct access second
            'https://api.allorigins.win/raw?url=',
            'https://cors.bridged.cc/',
            'https://api.codetabs.com/v1/proxy?quest=',
            'https://corsproxy.io/?'
        ];
        
        let lastError;
        
        for (const proxy of proxies) {
                try {
                    let url;
                    if (proxy === 'http://localhost:8001/api/') {
                        url = `${proxy}boards.json`;
                    } else {
                        url = `${proxy}https://a.4cdn.org/boards.json`;
                    }
                    console.log(`Trying to load boards with proxy: ${proxy || 'direct'}`);
                    const response = await fetch(url, { 
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                        },
                        mode: 'cors'
                    });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data && data.boards && Array.isArray(data.boards)) {
                    this.boards = data.boards.map(board => ({
                        board: board.board,
                        title: board.title,
                        description: board.meta_description || board.title
                    }));
                    
                    console.log(`Loaded ${this.boards.length} boards from API with proxy: ${proxy || 'direct'}`);
                    this.populateBoardSelector();
                    this.selectRandomBoard();
                    this.showLoading(false);
                    return; // Success, exit the loop
                } else {
                    throw new Error('Invalid board data structure');
                }
            } catch (error) {
                lastError = error;
                console.log(`Failed to load boards with proxy ${proxy || 'direct'}:`, error.message);
                if (proxy === proxies[proxies.length - 1]) {
                    // All proxies failed, use fallback
                    console.log('All proxies failed, using fallback boards');
                    this.useFallbackBoards();
                    return;
                }
            }
        }
    }
    
    populateBoardSelector() {
        console.log('populateBoardSelector called');
        console.log('boardSelector element:', this.boardSelector);
        console.log('boards array:', this.boards);
        
        if (!this.boardSelector || !this.boards) {
            console.log('Missing boardSelector or boards, returning early');
            return;
        }
        
        this.boardSelector.innerHTML = '<option value="">Select a board...</option>';
        
        this.boards.forEach(board => {
            const option = document.createElement('option');
            option.value = board.board;
            option.textContent = `/${board.board}/ - ${board.title}`;
            this.boardSelector.appendChild(option);
        });
        
        console.log('Board selector populated with', this.boards.length, 'boards');
    }
    
    selectRandomBoard() {
        if (!this.boards || this.boards.length === 0) {
            console.warn('No boards available for random selection');
            return;
        }
        
        const safeBoards = this.boards.filter(board => 
            !['b', 'r9k', 'pol', 'bant', 'r', 's4s', 'soc', 'qa'].includes(board.board)
        );
        
        if (safeBoards.length === 0) {
            console.warn('No safe boards available');
            return;
        }
        
        const randomBoard = safeBoards[Math.floor(Math.random() * safeBoards.length)];
        this.selectedBoard = randomBoard.board;
        
        if (this.boardSelector) {
            this.boardSelector.value = this.selectedBoard;
        }
        
        console.log(`Selected random board: /${this.selectedBoard}/`);
    }
    
    useFallbackBoards() {
        console.log('Using fallback boards...');
        this.boards = [
            { board: 'g', title: 'Technology', description: 'Technology discussion' },
            { board: 'v', title: 'Video Games', description: 'Video game discussion' },
            { board: 'a', title: 'Anime & Manga', description: 'Anime and manga discussion' },
            { board: 'mu', title: 'Music', description: 'Music discussion' },
            { board: 'tv', title: 'Television & Film', description: 'TV and movie discussion' },
            { board: 'lit', title: 'Literature', description: 'Literature discussion' },
            { board: 'sci', title: 'Science & Math', description: 'Science and mathematics' },
            { board: 'his', title: 'History & Humanities', description: 'History discussion' },
            { board: 'fit', title: 'Fitness', description: 'Health and fitness' },
            { board: 'ck', title: 'Food & Cooking', description: 'Cooking and food' },
            { board: 'diy', title: 'Do It Yourself', description: 'DIY projects' },
            { board: 'fa', title: 'Fashion', description: 'Fashion discussion' },
            { board: 'sp', title: 'Sports', description: 'Sports discussion' },
            { board: 'tg', title: 'Traditional Games', description: 'Board games and tabletop' },
            { board: 'toy', title: 'Toys', description: 'Toys and collectibles' },
            { board: 'trv', title: 'Travel', description: 'Travel discussion' },
            { board: 'out', title: 'Outdoors', description: 'Outdoor activities' },
            { board: 'wg', title: 'Wallpapers/General', description: 'Wallpapers' },
            { board: 'wsg', title: 'Worksafe GIF', description: 'Safe for work GIFs' },
            { board: '3', title: '3DCG', description: '3D computer graphics' },
            { board: 'gd', title: 'Graphic Design', description: 'Graphic design' },
            { board: 'po', title: 'Papercraft & Origami', description: 'Paper crafts' },
            { board: 'p', title: 'Photography', description: 'Photography discussion' },
            { board: 'ck', title: 'Food & Cooking', description: 'Cooking discussion' },
            { board: 'an', title: 'Animals & Nature', description: 'Animals and nature' },
            { board: 'c', title: 'Anime/Cute', description: 'Cute anime images' },
            { board: 'w', title: 'Anime/Wallpapers', description: 'Anime wallpapers' },
            { board: 'wg', title: 'Wallpapers/General', description: 'General wallpapers' },
            { board: 'jp', title: 'Otaku Culture', description: 'Japanese culture' },
            { board: 'vp', title: 'Pokémon', description: 'Pokémon discussion' }
        ];
        
        this.populateBoardSelector();
        this.selectRandomBoard();
        this.showLoading(false);
    }

    showBoardSelection(board) {
        const boardInfo = this.boards.find(b => b.board === board.board);
        if (!boardInfo) return;
        
        const boardElement = document.createElement('div');
        boardElement.className = 'board-item';
        boardElement.innerHTML = `
            <div class="board-header">
                <h3>/${boardInfo.board}/ - ${boardInfo.title}</h3>
                <p class="board-description">${boardInfo.description}</p>
            </div>
        `;
        
        boardElement.addEventListener('click', () => {
            this.selectedBoard = boardInfo.board;
            if (this.boardSelector) {
                this.boardSelector.value = this.selectedBoard;
            }
            this.loadThreads();
        });
        
        if (this.boardList) {
            this.boardList.appendChild(boardElement);
        }
    }

    async loadThreads() {
        console.log('=== loadThreads() called ===');
        console.log('selectedBoard:', this.selectedBoard);
        console.log('threadList element:', this.threadList);
        
        if (!this.selectedBoard) {
            console.warn('No board selected');
            return;
        }
        
        this.showLoading(true);
        this.hideError();
        
        try {
            console.log(`Loading threads for /${this.selectedBoard}/...`);
            const proxies = [
                'http://localhost:8001/api/', // Local CORS proxy - most reliable
                '', // Direct access second
                'https://api.allorigins.win/raw?url=',
                'https://cors.bridged.cc/',
                'https://api.codetabs.com/v1/proxy?quest=',
                'https://corsproxy.io/?'
            ];
            let response;
            let lastError;
            
            for (const proxy of proxies) {
                try {
                    let url;
                    if (proxy === 'http://localhost:8001/api/') {
                        url = `${proxy}${this.selectedBoard}/catalog.json`;
                    } else {
                        url = `${proxy}https://a.4cdn.org/${this.selectedBoard}/catalog.json`;
                    }
                    console.log(`Trying proxy: ${proxy || 'direct'}`);
                    response = await fetch(url);
                    if (response.ok) {
                        console.log(`Success with proxy: ${proxy || 'direct'}`);
                        console.log('Response status:', response.status);
                        break;
                    } else {
                        console.log(`Failed with proxy ${proxy || 'direct'}: HTTP ${response.status}`);
                    }
                } catch (e) {
                    lastError = e;
                    console.log(`Failed with proxy ${proxy || 'direct'}:`, e.message);
                    if (proxy === proxies[proxies.length - 1]) throw e;
                }
            }
            
            if (!response || !response.ok) {
                throw new Error(`HTTP error! status: ${response?.status || 'unknown'}`);
            }
            
            const data = await response.json();
            this.threads = [];
            
            if (data && Array.isArray(data)) {
                data.forEach(page => {
                    if (page.threads && Array.isArray(page.threads)) {
                        page.threads.forEach(thread => {
                            if (thread.sub || thread.com) {
                                this.threads.push({
                                    no: thread.no,
                                    sub: thread.sub || 'No Subject',
                                    com: thread.com || '',
                                    replies: thread.replies || 0,
                                    images: thread.images || 0,
                                    last_modified: thread.last_modified || 0
                                });
                            }
                        });
                    }
                });
            }
            
            console.log(`Loaded ${this.threads.length} threads`);
            if (this.threads.length > 0) {
                console.log('First few threads:', this.threads.slice(0, 3));
            }
            this.displayThreads(this.threads);
            
        } catch (error) {
            console.error('Failed to load threads:', error);
            const errorMessage = `Failed to load threads for /${this.selectedBoard}/. ` +
                               `This may be due to CORS restrictions or network issues. ` +
                               `Try refreshing the page or using a different browser.`;
            this.showError(errorMessage, true, () => this.loadThreads());
        } finally {
            this.showLoading(false);
        }
    }

    displayThreads(threads) {
        console.log('=== displayThreads() called ===');
        console.log('threads array length:', threads ? threads.length : 'null/undefined');
        console.log('threadList element:', this.threadList);
        
        if (!this.threadList) {
            console.error('threadList element not found!');
            return;
        }
        
        this.threadList.innerHTML = '';
        
        threads.slice(0, 20).forEach(thread => {
            const threadElement = document.createElement('div');
            threadElement.className = 'thread-item';
            threadElement.innerHTML = `
                <div class="thread-header">
                    <h4>${this.stripHtml(thread.sub)}</h4>
                    <span class="thread-stats">${thread.replies} replies, ${thread.images} images</span>
                </div>
                <div class="thread-preview">${this.stripHtml(thread.com).substring(0, 200)}...</div>
            `;
            
            threadElement.addEventListener('click', () => this.selectThread(thread.no, threadElement));
            this.threadList.appendChild(threadElement);
        });
    }

    async selectThread(threadNo, threadElement) {
        this.selectedThread = threadNo;
        
        // Update UI
        document.querySelectorAll('.thread-item').forEach(el => el.classList.remove('selected'));
        if (threadElement) {
            threadElement.classList.add('selected');
        }
        
        this.showLoading(true);
        this.hideError();
        
        try {
            console.log(`Loading posts for thread ${threadNo}...`);
            const proxies = [
                'http://localhost:8001/api/', // Local CORS proxy - most reliable
                '', // Direct access second
                'https://api.allorigins.win/raw?url=',
                'https://cors.bridged.cc/',
                'https://api.codetabs.com/v1/proxy?quest=',
                'https://corsproxy.io/?'
            ];
            let response;
            
            for (const proxy of proxies) {
                try {
                    let url;
                    if (proxy === 'http://localhost:8001/api/') {
                        url = `${proxy}${this.selectedBoard}/thread/${threadNo}.json`;
                    } else {
                        url = `${proxy}https://a.4cdn.org/${this.selectedBoard}/thread/${threadNo}.json`;
                    }
                    response = await fetch(url);
                    if (response.ok) break;
                } catch (e) {
                    if (proxy === proxies[proxies.length - 1]) throw e;
                }
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data && data.posts && Array.isArray(data.posts)) {
                this.posts = data.posts.map(post => ({
                    no: post.no,
                    com: post.com || '',
                    name: post.name || 'Anonymous',
                    trip: post.trip || '',
                    time: post.time || 0,
                    filename: post.filename || null,
                    ext: post.ext || null,
                    tim: post.tim || null
                }));
                
                console.log(`Loaded ${this.posts.length} posts`);
                this.displayPosts();
                
                // Auto-play immediately after thread loads if voices are ready
                if (this.autoPlay && this.voicesLoaded && this.posts.length > 0) {
                    setTimeout(() => {
                        this.currentPostIndex = 0;
                        this.startReading();
                    }, 500); // Small delay to ensure UI is ready
                }
            } else {
                throw new Error('Invalid thread data structure');
            }
            
        } catch (error) {
            console.error('Failed to load thread:', error);
            const errorMessage = error.message.includes('HTTP error')
                ? `Network error loading thread ${threadNo}. Check your connection.`
                : `Failed to load thread ${threadNo}.`;
            this.showError(errorMessage, true, () => this.selectThread(threadNo, threadElement));
        } finally {
            this.showLoading(false);
        }
    }

    displayPosts() {
        if (!this.postList) return;
        
        this.postList.innerHTML = '';
        
        this.posts.forEach((post, index) => {
            const postElement = document.createElement('div');
            postElement.className = 'post-item';
            postElement.innerHTML = `
                <div class="post-header">
                    <span class="post-number">#${index + 1}</span>
                    <span class="post-author">${post.name}${post.trip ? post.trip : ''}</span>
                    <span class="post-time">${new Date(post.time * 1000).toLocaleString()}</span>
                </div>
                <div class="post-content">${this.stripHtml(post.com)}</div>
            `;
            
            postElement.addEventListener('click', () => this.selectPost(index, postElement));
            this.postList.appendChild(postElement);
        });
    }

    selectPost(index, postElement) {
        this.currentPostIndex = index;
        
        // Update UI
        document.querySelectorAll('.post-item').forEach(el => el.classList.remove('selected'));
        if (postElement) {
            postElement.classList.add('selected');
        }
    }

    async togglePlayPause() {
        if (this.isReading) {
            this.pauseReading();
        } else {
            await this.startReading();
        }
    }

    async startReading() {
        if (this.posts.length === 0) {
            this.showError('No posts to read. Please select a thread first.');
            return;
        }
        
        this.isReading = true;
        if (this.playPauseBtn) {
            this.playPauseBtn.textContent = 'Pause';
        }
        
        if (this.beatEnabled) {
            this.startBeat();
        }
        
        this.updateProgress();
        await this.readCurrentPost();
    }

    pauseReading() {
        this.isReading = false;
        if (this.playPauseBtn) {
            this.playPauseBtn.textContent = 'Play';
        }
        
        if (this.currentUtterance) {
            this.speechSynthesis.cancel();
        }
        
        if (this.beatEnabled) {
            this.stopBeatMethod();
        }
    }

    stopReading() {
        this.isReading = false;
        this.currentPostIndex = 0;
        
        if (this.playPauseBtn) {
            this.playPauseBtn.textContent = 'Play';
        }
        
        if (this.currentUtterance) {
            this.speechSynthesis.cancel();
        }
        
        if (this.beatEnabled) {
            this.stopBeatMethod();
        }
        
        this.hideProgress();
        
        // Clear selection
        document.querySelectorAll('.post-item').forEach(el => el.classList.remove('selected'));
    }

    async skipToNext() {
        if (this.currentPostIndex < this.posts.length - 1) {
            this.currentPostIndex++;
            
            // Cancel current speech if any
            if (this.currentUtterance) {
                this.speechSynthesis.cancel();
                this.currentUtterance = null;
            }
            
            this.updateProgress();
            
            if (this.isReading && !this.isTransitioning) {
                await this.readCurrentPost();
            }
        } else {
            // End of posts, try to load next thread if auto-play is enabled
            if (this.autoPlay) {
                await this.autoPlayNextThread();
            } else {
                this.stopReading();
            }
        }
    }
    
    async autoPlayNextThread() {
        if (!this.autoPlay || !this.threads) {
            return;
        }
        
        const currentThreadIndex = this.threads.findIndex(t => t.no === this.selectedThread);
        if (currentThreadIndex === -1 || currentThreadIndex >= this.threads.length - 1) {
            console.log('No more threads in current board, switching to random board...');
            
            // Switch to a random board and continue auto-play
            try {
                this.selectRandomBoard();
                // Wait for new threads to load, then start auto-play
                setTimeout(() => {
                    if (this.threads && this.threads.length > 0) {
                        this.selectThread(this.threads[0].no);
                    }
                }, 2000);
            } catch (error) {
                console.error('Failed to switch board:', error);
                this.stopReading();
            }
            return;
        }
        
        const nextThread = this.threads[currentThreadIndex + 1];
        console.log(`Auto-playing next thread: ${nextThread.no}`);
        
        try {
            await this.selectThread(nextThread.no);
            
            // Wait for the delay before starting to read
            setTimeout(async () => {
                if (this.autoPlay && this.posts.length > 0) {
                    this.currentPostIndex = 0;
                    await this.readCurrentPost();
                }
            }, this.autoPlayDelay);
            
        } catch (error) {
            console.error('Failed to auto-play next thread:', error);
            this.stopReading();
        }
    }

    async startAutoPlayWorkflow() {
        console.log('🚀 Starting automatic workflow...');
        
        // Wait for voices to load
        const waitForVoices = () => {
            return new Promise((resolve) => {
                if (this.voicesLoaded) {
                    resolve();
                    return;
                }
                
                const checkVoices = () => {
                    if (this.voicesLoaded) {
                        resolve();
                    } else {
                        setTimeout(checkVoices, 100);
                    }
                };
                checkVoices();
            });
        };
        
        try {
            // Wait for voices to be ready
            await waitForVoices();
            console.log('✅ Voices loaded, proceeding with auto-play');
            
            // Select a random board
            this.selectRandomBoard();
            
            // Wait a bit for board selection to complete
            setTimeout(async () => {
                try {
                    // Load threads for the selected board
                    await this.loadThreads();
                    console.log('✅ Threads loaded, selecting first thread');
                    
                    // Select the first thread and start reading
                    if (this.threads && this.threads.length > 0) {
                        await this.selectThread(this.threads[0].no);
                        
                        // Start reading after a short delay
                        setTimeout(async () => {
                            if (this.posts && this.posts.length > 0) {
                                console.log('🎤 Starting automatic reading...');
                                this.currentPostIndex = 0;
                                await this.readCurrentPost();
                            }
                        }, 1000);
                    }
                } catch (error) {
                    console.error('Failed to start auto-play workflow:', error);
                    // Retry after a delay
                    setTimeout(() => this.startAutoPlayWorkflow(), 5000);
                }
            }, 1000);
            
        } catch (error) {
            console.error('Failed to initialize auto-play workflow:', error);
            // Retry after a delay
            setTimeout(() => this.startAutoPlayWorkflow(), 5000);
        }
    }

    async readCurrentPost() {
        if (!this.isReading || this.currentPostIndex >= this.posts.length) {
            return;
        }
        
        const post = this.posts[this.currentPostIndex];
        if (!post || !post.com) {
            await this.skipToNext();
            return;
        }
        
        // Update UI to show current post
        const postElements = document.querySelectorAll('.post-item');
        postElements.forEach(el => el.classList.remove('selected'));
        if (postElements[this.currentPostIndex]) {
            postElements[this.currentPostIndex].classList.add('selected');
            postElements[this.currentPostIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        let textToRead = this.stripHtml(post.com);
        
        // Process image descriptions if enabled
        if (this.imageDescriptionEnabled) {
            const enhancedPost = await this.enhancePostWithImageDescriptions(post);
            textToRead = enhancedPost.com;
        }
        
        // Process URLs
        textToRead = this.simplifyUrls(textToRead);
        
        // Process post references
        textToRead = this.processPostReferences(textToRead, this.currentPostIndex);
        
        // Create summary if text is too long
        if (textToRead.length > 500) {
            textToRead = this.createPostSummary(textToRead);
        }
        
        // Process for rhyme if enabled
        if (this.rhymeEnabled) {
            textToRead = await this.processTextForRhyme(textToRead);
        }
        
        // Use appropriate TTS method
        if (this.puterTTSEnabled && this.checkPuterLibrary()) {
            await this.speakWithPuterTTS(textToRead);
        } else {
            await this.speakWithBrowserTTS(textToRead);
        }
    }
    
    async speakWithBrowserTTS(text, toneAnalysis = null) {
        return new Promise((resolve) => {
            console.log('🗣️ Starting TTS with text length:', text?.length || 0);
            
            if (!text || text.trim() === '') {
                console.log('⚠️ No text to speak');
                resolve();
                return;
            }
            
            console.log('🔍 TTS Debug Info:');
            console.log('   speechSynthesis available:', !!this.speechSynthesis);
            console.log('   voices loaded:', this.voices.length);
            console.log('   voiceSelect value:', this.voiceSelect?.value);
            console.log('   voicesLoaded flag:', this.voicesLoaded);
            
            this.currentUtterance = new SpeechSynthesisUtterance(text);
            
            // Apply voice settings
            if (this.voiceSelect && this.voices.length > 0) {
                const selectedVoiceIndex = parseInt(this.voiceSelect.value);
                console.log('🎯 Selected voice index:', selectedVoiceIndex);
                
                if (selectedVoiceIndex >= 0 && selectedVoiceIndex < this.voices.length) {
                    this.currentUtterance.voice = this.voices[selectedVoiceIndex];
                    console.log('✅ Voice set to:', this.voices[selectedVoiceIndex].name);
                } else {
                    console.warn('⚠️ Invalid voice index, using default');
                }
            } else {
                console.warn('⚠️ No voice selector or no voices available');
            }
            
            // Apply rate, pitch, and volume
            if (this.rateSlider) {
                this.currentUtterance.rate = parseFloat(this.rateSlider.value);
                console.log('🎛️ Rate set to:', this.currentUtterance.rate);
            }
            if (this.pitchSlider) {
                this.currentUtterance.pitch = parseFloat(this.pitchSlider.value);
                console.log('🎛️ Pitch set to:', this.currentUtterance.pitch);
            }
            if (this.volumeSlider) {
                this.currentUtterance.volume = parseFloat(this.volumeSlider.value);
                console.log('🎛️ Volume set to:', this.currentUtterance.volume);
            }
            
            // Apply tone analysis if available
            if (toneAnalysis && this.toneAnalysisEnabled) {
                this.applyToneToTTS(this.currentUtterance, toneAnalysis);
                console.log('🎭 Tone analysis applied');
            }
            
            this.currentUtterance.onstart = () => {
                console.log('▶️ Speech started');
            };
            
            let speechHandled = false;
            
            this.currentUtterance.onend = () => {
                console.log('⏹️ Speech ended');
                if (!speechHandled) {
                    speechHandled = true;
                    this.handleSpeechEnd();
                }
                resolve();
            };
            
            this.currentUtterance.onerror = (event) => {
                console.error('❌ Speech synthesis error:', event);
                console.error('   Error type:', event.error);
                console.error('   Error message:', event.message);
                if (!speechHandled) {
                    speechHandled = true;
                    this.handleSpeechEnd();
                }
                resolve();
            };
            
            console.log('🚀 Attempting to speak...');
            try {
                this.speechSynthesis.speak(this.currentUtterance);
                console.log('✅ speak() called successfully');
            } catch (error) {
                console.error('❌ Error calling speak():', error);
                resolve();
            }
        });
    }
    
    setupMobileSpeechWorkarounds() {
        // iOS Safari workarounds
        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
            // Force speech synthesis to work on iOS
            document.addEventListener('touchstart', () => {
                if (this.speechSynthesis.getVoices().length === 0) {
                    this.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
                    this.speechSynthesis.cancel();
                }
            }, { once: true });
        }
        
        // Android Chrome workarounds
        if (/Android/.test(navigator.userAgent) && /Chrome/.test(navigator.userAgent)) {
            // Prevent speech from being interrupted by screen lock
            document.addEventListener('visibilitychange', () => {
                if (document.hidden && this.isReading) {
                    // Keep speech active when page becomes hidden
                    this.speechSynthesis.pause();
                    setTimeout(() => {
                        if (this.isReading) {
                            this.speechSynthesis.resume();
                        }
                    }, 100);
                }
            });
        }
    }
    
    async speakWithPuterTTS(text, toneAnalysis = null) {
        if (!this.checkPuterLibrary()) {
            console.error('Puter TTS library not available');
            await this.speakWithBrowserTTS(text, toneAnalysis);
            return;
        }
        
        try {
            // Process tone analysis if available
            let processedText = text;
            if (toneAnalysis && this.toneAnalysisEnabled) {
                const result = await this.processPostWithTone(text, null);
                processedText = result.enhancedText;
            }
            
            const options = {
                voice: 'en-US-Standard-A',
                speed: this.rateSlider ? parseFloat(this.rateSlider.value) : 1.0,
                pitch: this.pitchSlider ? parseFloat(this.pitchSlider.value) : 1.0,
                volume: this.volumeSlider ? parseFloat(this.volumeSlider.value) : 1.0
            };
            
            // Apply tone-specific voice settings
            if (toneAnalysis) {
                const voiceMap = {
                    'deep': 'en-US-Standard-D',
                    'high': 'en-US-Standard-E',
                    'robotic': 'en-US-Wavenet-A',
                    'dramatic': 'en-US-Standard-B',
                    'normal': 'en-US-Standard-A'
                };
                options.voice = voiceMap[toneAnalysis.voice_style] || options.voice;
            }
            
            return new Promise((resolve, reject) => {
                puter.ai.txt2speech(processedText, options)
                    .then(audioBlob => {
                        const audio = new Audio(URL.createObjectURL(audioBlob));
                        
                        audio.onended = () => {
                            this.handleSpeechEnd();
                            resolve();
                        };
                        
                        audio.onerror = (error) => {
                            console.error('Puter TTS audio error:', error);
                            this.handlePuterTTSFailure('Audio playback failed');
                            reject(error);
                        };
                        
                        audio.play().catch(error => {
                            console.error('Failed to play Puter TTS audio:', error);
                            this.handlePuterTTSFailure('Failed to play audio');
                            reject(error);
                        });
                    })
                    .catch(error => {
                        console.error('Puter TTS generation error:', error);
                        this.handlePuterTTSFailure(error.message || 'TTS generation failed');
                        reject(error);
                    });
            });
            
        } catch (error) {
            console.error('Puter TTS error:', error);
            this.handlePuterTTSFailure(error.message || 'Unknown error');
            // Fallback to browser TTS
            await this.speakWithBrowserTTS(text, toneAnalysis);
        }
    }
    
    handlePuterTTSFailure(errorMessage) {
        this.puterTTSFailures++;
        console.warn(`Puter TTS failure ${this.puterTTSFailures}/${this.maxPuterTTSFailures}: ${errorMessage}`);
        
        if (this.puterTTSFailures >= this.maxPuterTTSFailures) {
            console.error('Too many Puter TTS failures, disabling Puter TTS');
            this.puterTTSEnabled = false;
            if (this.puterTTSCheckbox) {
                this.puterTTSCheckbox.checked = false;
            }
            this.showError('Puter TTS has been disabled due to repeated failures. Using browser TTS instead.');
            this.addPuterTTSResetButton();
        }
    }
    
    resetPuterTTSFailures() {
        this.puterTTSFailures = 0;
        console.log('Puter TTS failure count reset');
        
        // Remove reset button if it exists
        const resetButton = document.getElementById('puterTTSResetBtn');
        if (resetButton) {
            resetButton.remove();
        }
    }
    
    addPuterTTSResetButton() {
        if (document.getElementById('puterTTSResetBtn')) {
            return; // Button already exists
        }
        
        const resetButton = document.createElement('button');
        resetButton.id = 'puterTTSResetBtn';
        resetButton.textContent = 'Reset Puter TTS';
        resetButton.className = 'btn btn-secondary';
        resetButton.onclick = () => {
            this.resetPuterTTSFailures();
            this.puterTTSEnabled = true;
            if (this.puterTTSCheckbox) {
                this.puterTTSCheckbox.checked = true;
            }
        };
        
        const controlsContainer = document.querySelector('.controls');
        if (controlsContainer) {
            controlsContainer.appendChild(resetButton);
        }
    }
    
    async handleSpeechEnd() {
        if (!this.isReading || this.isTransitioning) {
            return;
        }
        
        this.isTransitioning = true;
        
        try {
            // Play beep between posts and wait for it to complete
            await this.playBeep();
            
            // Wait for auto-play delay before moving to next
            await new Promise(resolve => setTimeout(resolve, this.autoPlayDelay));
            
            // Move to next post if still reading
            if (this.isReading) {
                await this.skipToNext();
            }
        } finally {
            this.isTransitioning = false;
        }
    }

    stripHtml(html) {
        if (!html) return '';
        
        // Create a temporary div to parse HTML
        const temp = document.createElement('div');
        temp.innerHTML = html;
        
        // Remove script and style elements
        const scripts = temp.querySelectorAll('script, style');
        scripts.forEach(script => script.remove());
        
        // Get text content and clean it up
        let text = temp.textContent || temp.innerText || '';
        
        // Clean up whitespace
        text = text.replace(/\s+/g, ' ').trim();
        
        // Remove common 4chan formatting artifacts
        text = text.replace(/>>\d+/g, ''); // Remove post references
        text = text.replace(/\[spoiler\].*?\[\/spoiler\]/gi, '[spoiler content]');
        
        return text;
    }

    simplifyUrls(text) {
        // Replace long URLs with simplified versions
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.replace(urlRegex, (url) => {
            try {
                const urlObj = new URL(url);
                const domain = urlObj.hostname.replace('www.', '');
                
                // Common domain simplifications
                const domainMap = {
                    'youtube.com': 'YouTube',
                    'youtu.be': 'YouTube',
                    'twitter.com': 'Twitter',
                    'x.com': 'Twitter',
                    'reddit.com': 'Reddit',
                    'github.com': 'GitHub',
                    'stackoverflow.com': 'Stack Overflow',
                    'wikipedia.org': 'Wikipedia',
                    'imgur.com': 'Imgur',
                    'twitch.tv': 'Twitch'
                };
                
                return `[link to ${domainMap[domain] || domain}]`;
            } catch (e) {
                return '[link]';
            }
        });
    }

    processPostReferences(text, currentPostIndex) {
        // Replace >>number references with spoken equivalents
        return text.replace(/>>\d+/g, (match) => {
            const refNumber = parseInt(match.substring(2));
            const refIndex = this.posts.findIndex(post => post.no === refNumber);
            
            if (refIndex !== -1) {
                return `replying to post ${refIndex + 1}`;
            } else {
                return 'replying to another post';
            }
        });
    }

    createPostSummary(text) {
        // Create a summary for very long posts
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        
        if (sentences.length <= 3) {
            return text;
        }
        
        // Take first sentence, middle sentence, and last sentence
        const summary = [
            sentences[0],
            sentences[Math.floor(sentences.length / 2)],
            sentences[sentences.length - 1]
        ].join('. ') + '.';
        
        return `Post summary: ${summary}`;
    }
    
    testTTS() {
        console.log('🧪 Testing TTS functionality...');
        console.log('🔍 speechSynthesis available:', !!window.speechSynthesis);
        console.log('🔍 SpeechSynthesisUtterance available:', !!window.SpeechSynthesisUtterance);
        
        if (!window.speechSynthesis) {
            console.error('❌ speechSynthesis not supported in this browser');
            alert('Speech synthesis is not supported in this browser.');
            return;
        }
        
        const voices = window.speechSynthesis.getVoices();
        console.log('🔍 Available voices:', voices.length);
        voices.forEach((voice, index) => {
            console.log(`   ${index}: ${voice.name} (${voice.lang})`);
        });
        
        const testText = 'Hello, this is a test of the text to speech functionality.';
        const utterance = new SpeechSynthesisUtterance(testText);
        
        utterance.onstart = () => {
            console.log('✅ Test TTS started successfully');
        };
        
        utterance.onend = () => {
            console.log('✅ Test TTS completed successfully');
        };
        
        utterance.onerror = (event) => {
            console.error('❌ Test TTS error:', event.error);
            alert(`TTS Error: ${event.error}`);
        };
        
        console.log('🚀 Starting test speech...');
        window.speechSynthesis.speak(utterance);
    }

    async playBeep() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
            
            // Wait for beep to finish
            await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
            console.warn('Could not play beep:', error);
        }
    }

    showLoading(show) {
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = show ? 'block' : 'none';
        }
    }

    showError(message, isRetryable = false, retryCallback = null) {
        if (this.errorMessage) {
            this.errorMessage.innerHTML = '';
            
            const errorText = document.createElement('span');
            errorText.textContent = message;
            this.errorMessage.appendChild(errorText);
            
            if (isRetryable && retryCallback) {
                const retryBtn = document.createElement('button');
                retryBtn.textContent = 'Retry';
                retryBtn.style.marginLeft = '10px';
                retryBtn.style.padding = '5px 10px';
                retryBtn.style.backgroundColor = '#4CAF50';
                retryBtn.style.color = 'white';
                retryBtn.style.border = 'none';
                retryBtn.style.borderRadius = '3px';
                retryBtn.style.cursor = 'pointer';
                retryBtn.onclick = () => {
                    this.hideError();
                    retryCallback();
                };
                this.errorMessage.appendChild(retryBtn);
            }
            
            this.errorMessage.classList.remove('hidden');
            
            // Auto-hide non-critical errors after 10 seconds
            if (!isRetryable) {
                setTimeout(() => this.hideError(), 10000);
            }
        }
    }

    hideError() {
        if (this.errorMessage) {
            this.errorMessage.classList.add('hidden');
        }
    }

    async describeImage(imageUrl) {
        try {
            // This is a placeholder for image description functionality
            // In a real implementation, you would use an image recognition API
            console.log('Describing image:', imageUrl);
            
            // For now, return a generic description
            return 'An image was posted';
            
        } catch (error) {
            console.error('Failed to describe image:', error);
            return 'An image was posted';
        }
    }

    extractImageUrls(post) {
        const imageUrls = [];
        
        if (post.filename && post.ext && post.tim) {
            const imageUrl = `https://i.4cdn.org/${this.selectedBoard}/${post.tim}${post.ext}`;
            imageUrls.push(imageUrl);
        }
        
        return imageUrls;
    }

    async enhancePostWithImageDescriptions(post) {
        const imageUrls = this.extractImageUrls(post);
        let enhancedCom = post.com;
        
        if (imageUrls.length > 0) {
            const descriptions = [];
            
            for (const imageUrl of imageUrls) {
                try {
                    const description = await this.describeImage(imageUrl);
                    descriptions.push(description);
                } catch (error) {
                    console.error('Failed to describe image:', error);
                    descriptions.push('An image was posted');
                }
            }
            
            if (descriptions.length > 0) {
                const imageText = descriptions.length === 1 
                    ? `Image description: ${descriptions[0]}` 
                    : `Image descriptions: ${descriptions.join(', ')}`;
                
                enhancedCom = `${imageText}. ${enhancedCom}`;
            }
        }
        
        return { ...post, com: enhancedCom };
    }

    setupMobileOptimizations() {
        // Detect mobile devices
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
            console.log('Mobile device detected, applying optimizations...');
            this.setupMobileBrowserWorkarounds();
            this.setupMobileAudioContext();
            this.setupIOSWorkarounds();
            this.setupChromeWorkarounds();
            this.setupGenericMobileWorkarounds();
        }
    }

    setupMobileBrowserWorkarounds() {
        // Prevent zoom on input focus (iOS Safari)
        const viewport = document.querySelector('meta[name=viewport]');
        if (viewport) {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
        }
        
        // Prevent pull-to-refresh
        document.body.style.overscrollBehavior = 'none';
    }

    setupMobileAudioContext() {
        // Create audio context on first user interaction
        const createAudioContext = () => {
            if (!this.audioContext) {
                try {
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    console.log('Mobile audio context created');
                } catch (error) {
                    console.error('Failed to create mobile audio context:', error);
                }
            }
        };
        
        // Listen for first user interaction
        ['touchstart', 'touchend', 'mousedown', 'keydown'].forEach(event => {
            document.addEventListener(event, createAudioContext, { once: true });
        });
    }

    setupIOSWorkarounds() {
        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
            // iOS-specific workarounds
            console.log('iOS device detected, applying iOS-specific workarounds...');
            
            // Force speech synthesis initialization
            document.addEventListener('touchstart', () => {
                this.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
                this.speechSynthesis.cancel();
            }, { once: true });
        }
    }

    setupChromeWorkarounds() {
        if (/Chrome/.test(navigator.userAgent)) {
            // Chrome-specific workarounds
            console.log('Chrome browser detected, applying Chrome-specific workarounds...');
            
            // Handle autoplay policy
            document.addEventListener('click', () => {
                if (this.audioContext && this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }
            }, { once: true });
        }
    }

    setupGenericMobileWorkarounds() {
        // Generic mobile optimizations
        
        // Prevent context menu on long press
        document.addEventListener('contextmenu', (e) => {
            if (e.target.closest('.post-item, .thread-item')) {
                e.preventDefault();
            }
        });
        
        // Optimize touch scrolling
        document.body.style.webkitOverflowScrolling = 'touch';
        
        // Prevent text selection on UI elements
        const uiElements = document.querySelectorAll('.controls, .thread-list, .post-list');
        uiElements.forEach(element => {
            element.style.webkitUserSelect = 'none';
            element.style.userSelect = 'none';
        });
        
        // Cordova/WebView specific optimizations
        if (window.cordova || window.PhoneGap || window.phonegap) {
            console.log('Cordova environment detected, applying WebView optimizations...');
            this.setupCordovaOptimizations();
        }
    }
    
    setupCordovaOptimizations() {
        // Disable text selection for better touch experience in WebView
        document.body.style.webkitUserSelect = 'none';
        document.body.style.webkitTouchCallout = 'none';
        
        // Optimize for WebView performance
        document.body.style.webkitTransform = 'translateZ(0)';
        
        // Handle device ready event
        document.addEventListener('deviceready', () => {
            console.log('Cordova device ready');
            
            // Handle back button for Android
            if (window.device && window.device.platform === 'Android') {
                document.addEventListener('backbutton', (e) => {
                    if (this.isReading) {
                        this.stopReading();
                        e.preventDefault();
                    } else {
                        navigator.app.exitApp();
                    }
                }, false);
            }
            
            // Initialize status bar if plugin available
            if (window.StatusBar) {
                window.StatusBar.styleDefault();
            }
        }, false);
    }

    async initializeMediaSessionManager() {
        if ('mediaSession' in navigator) {
            try {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: '4chan TTS Reader',
                    artist: 'Anonymous',
                    album: this.selectedBoard ? `/${this.selectedBoard}/` : '4chan',
                    artwork: [
                        { src: '/icon-96x96.png', sizes: '96x96', type: 'image/png' },
                        { src: '/icon-128x128.png', sizes: '128x128', type: 'image/png' },
                        { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
                        { src: '/icon-256x256.png', sizes: '256x256', type: 'image/png' },
                        { src: '/icon-384x384.png', sizes: '384x384', type: 'image/png' },
                        { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' }
                    ]
                });
                
                navigator.mediaSession.setActionHandler('play', () => this.startReading());
                navigator.mediaSession.setActionHandler('pause', () => this.pauseReading());
                navigator.mediaSession.setActionHandler('stop', () => this.stopReading());
                navigator.mediaSession.setActionHandler('nexttrack', () => this.skipToNext());
                
                console.log('Media Session API initialized');
            } catch (error) {
                console.error('Failed to initialize Media Session API:', error);
            }
        }
    }

    async initializeAdvancedAudioPersistence() {
        console.log('🔊 Initializing ADVANCED audio persistence system...');
        
        try {
            await this.loadAudioPersistenceManager();
            await this.setupNuclearAudioPersistence();
            await this.initializeMediaSessionManager();
            
            console.log('✅ Advanced audio persistence system initialized');
        } catch (error) {
            console.error('❌ Failed to initialize advanced audio persistence:', error);
        }
    }

    async loadAudioPersistenceManager() {
        console.log('📦 Loading Audio Persistence Manager...');
        
        this.audioPersistenceManager = {
            audioContexts: [],
            oscillators: [],
            wakeLocks: new Map(),
            isActive: false,
            monitoringInterval: null,
            
            async initialize() {
                console.log('🎵 Initializing Audio Persistence Manager...');
                this.isActive = true;
                await this.createMultipleAudioContexts();
                this.startMonitoring();
            },
            
            async createMultipleAudioContexts() {
                const contextCount = 5;
                for (let i = 0; i < contextCount; i++) {
                    try {
                        const context = new (window.AudioContext || window.webkitAudioContext)();
                        this.audioContexts.push(context);
                        console.log(`🎵 Created audio context ${i + 1}/${contextCount}`);
                    } catch (error) {
                        console.error(`❌ Failed to create audio context ${i + 1}:`, error);
                    }
                }
            }
        };
    }

    async setupNuclearAudioPersistence() {
        console.log('☢️ Setting up NUCLEAR audio persistence...');
        
        this.nuclearAudio = {
            contexts: [],
            oscillators: [],
            intervals: [],
            wakeLocks: [],
            isActive: false,
            
            async activate() {
                console.log('🚀 Activating NUCLEAR audio persistence...');
                this.isActive = true;
                
                await this.createMultiplePersistentStreams();
                this.setupBasicAudioContext();
                this.setupAggressiveMediaSession();
                this.setupPageVisibilityHandling();
                this.setupAggressiveWakeLock();
                this.setupServiceWorkerCommunication();
                this.startAggressiveMonitoring();
                
                console.log('☢️ NUCLEAR audio persistence ACTIVATED');
            },
            
            cleanup() {
                console.log('🧹 Cleaning up nuclear audio...');
                this.isActive = false;
                
                this.oscillators.forEach(osc => {
                    try {
                        osc.stop();
                    } catch (e) {}
                });
                
                this.contexts.forEach(ctx => {
                    try {
                        ctx.close();
                    } catch (e) {}
                });
                
                this.intervals.forEach(interval => clearInterval(interval));
                
                this.wakeLocks.forEach(wakeLock => {
                    try {
                        wakeLock.release();
                    } catch (e) {}
                });
                
                this.contexts = [];
                this.oscillators = [];
                this.intervals = [];
                this.wakeLocks = [];
            }
        };
    }

     setupBasicAudioContext() {
        console.log('🎵 Setting up basic audio context...');
        
        try {
            this.primaryAudioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('✅ Primary audio context created');
        } catch (error) {
            console.error('❌ Failed to create primary audio context:', error);
        }
    }

     cleanupNuclearAudio() {
        if (this.nuclearAudio && this.nuclearAudio.isActive) {
            console.log('🧹 Cleaning up nuclear audio systems...');
            this.nuclearAudio.cleanup();
        }
        
        if (this.audioPersistenceManager && this.audioPersistenceManager.isActive) {
            console.log('🧹 Cleaning up audio persistence manager...');
            this.audioPersistenceManager.isActive = false;
            
            if (this.audioPersistenceManager.monitoringInterval) {
                clearInterval(this.audioPersistenceManager.monitoringInterval);
            }
        }
        
        // Release all wake locks
        this.releaseAllWakeLocks();
        
        // Stop all monitoring
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        
        console.log('✅ Nuclear audio cleanup completed');
    }

     async createMultiplePersistentStreams() {
        console.log('🌊 Creating multiple persistent audio streams...');
        
        const streamCount = 3;
        
        for (let i = 0; i < streamCount; i++) {
            try {
                const context = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = context.createOscillator();
                const gainNode = context.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(context.destination);
                
                oscillator.frequency.setValueAtTime(20, context.currentTime); // Very low frequency
                gainNode.gain.setValueAtTime(0.001, context.currentTime); // Very low volume
                
                oscillator.start();
                
                this.nuclearAudio.contexts.push(context);
                this.nuclearAudio.oscillators.push(oscillator);
                
                console.log(`🌊 Created persistent stream ${i + 1}/${streamCount}`);
                
                // Recreate oscillator when it ends
                oscillator.onended = () => this.recreateOscillator(i);
                
            } catch (error) {
                console.error(`❌ Failed to create persistent stream ${i + 1}:`, error);
            }
        }
    }

     async recreateOscillator(index) {
        if (!this.nuclearAudio.isActive) return;
        
        try {
            const context = this.nuclearAudio.contexts[index];
            if (!context || context.state === 'closed') return;
            
            const oscillator = context.createOscillator();
            const gainNode = context.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(context.destination);
            
            oscillator.frequency.setValueAtTime(20, context.currentTime);
            gainNode.gain.setValueAtTime(0.001, context.currentTime);
            
            oscillator.start();
            oscillator.onended = () => this.recreateOscillator(index);
            
            this.nuclearAudio.oscillators[index] = oscillator;
            
            console.log(`🔄 Recreated oscillator ${index + 1}`);
        } catch (error) {
            console.error(`❌ Failed to recreate oscillator ${index + 1}:`, error);
        }
    }

     setupAggressiveMediaSession() {
        console.log('📻 Setting up aggressive media session...');
        
        if ('mediaSession' in navigator) {
            try {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: '4chan TTS Reader - Nuclear Mode',
                    artist: 'Anonymous Reader',
                    album: this.selectedBoard ? `/${this.selectedBoard}/` : '4chan Board',
                    artwork: [
                        {
                            src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgdmlld0JveD0iMCAwIDUxMiA1MTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI1MTIiIGhlaWdodD0iNTEyIiBmaWxsPSIjMDA3QUZGIi8+Cjx0ZXh0IHg9IjI1NiIgeT0iMjU2IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iNDgiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+VFRTPC90ZXh0Pgo8L3N2Zz4K',
                            sizes: '512x512',
                            type: 'image/svg+xml'
                        }
                    ]
                });
                
                // Set up action handlers
                navigator.mediaSession.setActionHandler('play', () => {
                    console.log('📻 Media session play triggered');
                    this.startReading();
                });
                
                navigator.mediaSession.setActionHandler('pause', () => {
                    console.log('📻 Media session pause triggered');
                    this.pauseReading();
                });
                
                navigator.mediaSession.setActionHandler('stop', () => {
                    console.log('📻 Media session stop triggered');
                    this.stopReading();
                });
                
                navigator.mediaSession.setActionHandler('nexttrack', () => {
                    console.log('📻 Media session next triggered');
                    this.skipToNext();
                });
                
                console.log('✅ Aggressive media session configured');
            } catch (error) {
                console.error('❌ Failed to setup aggressive media session:', error);
            }
        }
    }

    setupCloudTTSOption() {
        // Setup cloud TTS options if available
        console.log('Setting up cloud TTS options...');
    }

    setupRhymeBeatControls() {
        // Setup rhyme and beat controls
        console.log('Setting up rhyme and beat controls...');
        
        const rhymeCheckbox = document.getElementById('enable-rhyme-mode');
        const beatCheckbox = document.getElementById('enable-beat-sync');
        const bpmSlider = document.getElementById('bpm-range');
        const bpmValue = document.getElementById('bpm-value');
        const playBeatBtn = document.getElementById('play-beat');
        const stopBeatBtn = document.getElementById('stop-beat');
        
        if (rhymeCheckbox) {
            rhymeCheckbox.addEventListener('change', (e) => {
                this.rhymeEnabled = e.target.checked;
                console.log('Rhyme mode:', this.rhymeEnabled ? 'enabled' : 'disabled');
            });
        }
        
        if (beatCheckbox) {
            beatCheckbox.addEventListener('change', (e) => {
                this.beatEnabled = e.target.checked;
                if (this.beatEnabled) {
                    this.startBeat();
                } else {
                    this.stopBeatMethod();
                }
            });
        }
        
        if (bpmSlider && bpmValue) {
            bpmSlider.addEventListener('input', (e) => {
                this.beatTempo = parseInt(e.target.value);
                bpmValue.textContent = this.beatTempo;
                if (this.beatEnabled) {
                    this.stopBeatMethod();
                    this.startBeat();
                }
            });
        }
        
        if (playBeatBtn) {
            playBeatBtn.addEventListener('click', () => {
                this.beatEnabled = true;
                this.startBeat();
            });
        }
        
        if (stopBeatBtn) {
            stopBeatBtn.addEventListener('click', () => {
                this.beatEnabled = false;
                this.stopBeatMethod();
            });
        }
    }

    initializeToneSystem() {
        // Initialize tone analysis system
        console.log('Initializing tone analysis system...');
        try {
            if (typeof ToneIntegratedTTS !== 'undefined') {
                this.toneSystem = new ToneIntegratedTTS();
                console.log('Tone analysis system initialized');
            } else {
                console.warn('ToneIntegratedTTS not available');
            }
        } catch (error) {
            console.error('Failed to initialize tone system:', error);
        }
    }

    async processPostWithTone(text, post) {
        if (!this.toneSystem || !this.toneAnalysisEnabled) {
            return { enhancedText: text };
        }
        
        try {
            const result = await this.toneSystem.processPost(text, this);
            return { enhancedText: text };
        } catch (error) {
            console.error('Error processing post with tone:', error);
            return { enhancedText: text };
        }
    }

    async processTextForRhyme(text) {
        if (!this.rhymeEngine || !this.rhymeEnabled) {
            return text;
        }
        
        try {
            return await this.rhymeEngine.transformToRhyme(text);
        } catch (error) {
            console.error('Error processing text for rhyme:', error);
            return text;
        }
    }

    startBeat() {
        if (this.beatInterval) {
            clearInterval(this.beatInterval);
        }
        
        const beatIntervalMs = 60000 / this.beatTempo; // Convert BPM to milliseconds
        
        this.beatInterval = setInterval(() => {
            this.playBeatSound();
        }, beatIntervalMs);
        
        console.log(`Beat started at ${this.beatTempo} BPM`);
    }

    stopBeatMethod() {
        if (this.beatInterval) {
            clearInterval(this.beatInterval);
            this.beatInterval = null;
        }
        console.log('Beat stopped');
    }

    async playBeatSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
            oscillator.type = 'square';
            
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (error) {
            console.warn('Could not play beat sound:', error);
        }
    }

    checkPuterLibrary() {
        return typeof puter !== 'undefined' && puter.ai && puter.ai.txt2speech;
    }

    applyToneToTTS(utterance, toneAnalysis) {
        if (!toneAnalysis) return;
        
        // Apply tone-based modifications to the utterance
        switch (toneAnalysis.mood) {
            case 'angry':
                utterance.rate = Math.min(2.0, utterance.rate * 1.2);
                utterance.pitch = Math.max(0.1, utterance.pitch * 0.8);
                break;
            case 'sad':
                utterance.rate = Math.max(0.1, utterance.rate * 0.8);
                utterance.pitch = Math.max(0.1, utterance.pitch * 0.9);
                break;
            case 'happy':
                utterance.rate = Math.min(2.0, utterance.rate * 1.1);
                utterance.pitch = Math.min(2.0, utterance.pitch * 1.1);
                break;
            case 'excited':
                utterance.rate = Math.min(2.0, utterance.rate * 1.3);
                utterance.pitch = Math.min(2.0, utterance.pitch * 1.2);
                break;
        }
    }
}

// Simple RhymeEngine class
class RhymeEngine {
    constructor() {
        this.rhymeSchemes = {
            'aabb': this.aabbScheme,
            'abab': this.ababScheme,
            'abcb': this.abcbScheme,
            'freestyle': this.freestyleScheme
        };
        this.currentScheme = 'aabb';
    }

    async transformToRhyme(text) {
        // Simple rhyme transformation - in a real implementation this would be more sophisticated
        const words = text.split(' ');
        if (words.length < 4) return text;
        
        // Basic rhyme attempt - replace last word with a rhyming word
        const lastWord = words[words.length - 1];
        const rhymingWord = this.findSimpleRhyme(lastWord);
        
        if (rhymingWord) {
            words[words.length - 1] = rhymingWord;
        }
        
        return words.join(' ');
    }

    findSimpleRhyme(word) {
        // Very basic rhyme dictionary - in practice you'd use a proper rhyming API
        const rhymes = {
            'cat': 'hat',
            'dog': 'log',
            'tree': 'free',
            'sun': 'fun',
            'day': 'way',
            'night': 'light',
            'good': 'mood',
            'bad': 'sad',
            'big': 'pig',
            'small': 'tall'
        };
        
        return rhymes[word.toLowerCase()] || null;
    }

    aabbScheme(lines) {
        // AABB rhyme scheme implementation
        return lines;
    }

    ababScheme(lines) {
        // ABAB rhyme scheme implementation
        return lines;
    }

    abcbScheme(lines) {
        // ABCB rhyme scheme implementation
        return lines;
    }

    freestyleScheme(lines) {
        // Freestyle rhyme scheme implementation
        return lines;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.fourChanTTS = new FourChanTTS();
});