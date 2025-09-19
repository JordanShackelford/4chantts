class FourChanTTS {
    constructor() {
        this.isReading = false;
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
        this.autoPlay = false;
        this.autoPlayDelay = 2000;
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
        
        // Load boards and threads
        this.loadAllBoards().then(() => {
            this.loadThreads();
        }).catch(error => {
            console.error('Failed to initialize:', error);
            this.showError('Failed to load boards. Check your connection.', true, () => this.loadAllBoards());
        });
        
        // Initialize tone analysis system
        if (this.toneAnalysisEnabled) {
            this.initializeToneSystem();
        }
    }

    initializeElements() {
        this.boardSelector = document.getElementById('boardSelector');
        this.threadList = document.getElementById('threadList');
        this.postList = document.getElementById('postList');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.voiceSelect = document.getElementById('voiceSelect');
        this.rateSlider = document.getElementById('rateSlider');
        this.pitchSlider = document.getElementById('pitchSlider');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.autoPlayCheckbox = document.getElementById('autoPlayCheckbox');
        this.autoPlayDelaySlider = document.getElementById('autoPlayDelaySlider');
        this.imageDescriptionCheckbox = document.getElementById('imageDescriptionCheckbox');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.errorMessage = document.getElementById('errorMessage');
        this.debugInfo = document.getElementById('debugInfo');
        this.puterTTSCheckbox = document.getElementById('puterTTSCheckbox');
        this.toneAnalysisCheckbox = document.getElementById('toneAnalysisCheckbox');
        this.rhymeCheckbox = document.getElementById('rhymeCheckbox');
        this.beatCheckbox = document.getElementById('beatCheckbox');
        this.beatTempoSlider = document.getElementById('beatTempoSlider');
        this.progressContainer = document.getElementById('progress-container');
        this.progressText = document.getElementById('progress-text');
        this.progressPercentage = document.getElementById('progress-percentage');
        this.progressFill = document.getElementById('progress-fill');
    }

    setupEventListeners() {
        if (this.boardSelector) {
            this.boardSelector.addEventListener('change', () => {
                this.selectedBoard = this.boardSelector.value;
                if (this.selectedBoard) {
                    this.loadThreads();
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

        if (this.autoPlayCheckbox) {
            this.autoPlayCheckbox.addEventListener('change', (e) => {
                this.autoPlay = e.target.checked;
            });
        }

        if (this.autoPlayDelaySlider) {
            this.autoPlayDelaySlider.addEventListener('input', (e) => {
                this.autoPlayDelay = parseInt(e.target.value);
                document.getElementById('autoPlayDelayValue').textContent = this.autoPlayDelay + 'ms';
            });
        }

        if (this.imageDescriptionCheckbox) {
            this.imageDescriptionCheckbox.addEventListener('change', (e) => {
                this.imageDescriptionEnabled = e.target.checked;
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
                document.getElementById('beatTempoValue').textContent = this.beatTempo + ' BPM';
                if (this.beatEnabled) {
                    this.stopBeatMethod();
                    this.startBeat();
                }
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
        const updateVoices = () => {
            this.voices = this.speechSynthesis.getVoices();
            
            if (this.voiceSelect && this.voices.length > 0) {
                this.voiceSelect.innerHTML = '';
                
                this.voices.forEach((voice, index) => {
                    const option = document.createElement('option');
                    option.value = index;
                    option.textContent = `${voice.name} (${voice.lang})`;
                    if (voice.default) {
                        option.selected = true;
                    }
                    this.voiceSelect.appendChild(option);
                });
            }
        };
        
        updateVoices();
        
        if (this.speechSynthesis.onvoiceschanged !== undefined) {
            this.speechSynthesis.onvoiceschanged = updateVoices;
        }
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
        this.showLoading(true);
        
        try {
            await this.loadBoardsFromAPI();
        } catch (error) {
            console.error('Failed to load boards from API:', error);
            this.showError('Failed to load boards. Check your connection.', true, () => this.loadAllBoards());
        }
    }
    
    async loadBoardsFromAPI() {
        const proxies = [
            '', // Direct access first
            'https://corsproxy.io/?',
            'https://cors-anywhere.herokuapp.com/',
            'https://api.allorigins.win/raw?url='
        ];
        
        for (const proxy of proxies) {
            try {
                const url = `${proxy}https://a.4cdn.org/boards.json`;
                const response = await fetch(url);
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
                    
                    console.log(`Loaded ${this.boards.length} boards from API`);
                    this.populateBoardSelector();
                    this.selectRandomBoard();
                    return; // Success, exit the loop
                } else {
                    throw new Error('Invalid board data structure');
                }
            } catch (error) {
                console.error(`Failed with proxy ${proxy || 'direct'}:`, error);
                if (proxy === proxies[proxies.length - 1]) {
                    // Last proxy failed, use fallback
                    this.useFallbackBoards();
                    return;
                }
                // Continue to next proxy
            }
        }
    }
    
    populateBoardSelector() {
        if (!this.boardSelector || !this.boards) return;
        
        this.boardSelector.innerHTML = '<option value="">Select a board...</option>';
        
        this.boards.forEach(board => {
            const option = document.createElement('option');
            option.value = board.board;
            option.textContent = `/${board.board}/ - ${board.title}`;
            this.boardSelector.appendChild(option);
        });
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
        if (!this.selectedBoard) {
            console.warn('No board selected');
            return;
        }
        
        this.showLoading(true);
        this.hideError();
        
        try {
            console.log(`Loading threads for /${this.selectedBoard}/...`);
            const proxies = ['', 'https://corsproxy.io/?', 'https://cors-anywhere.herokuapp.com/', 'https://api.allorigins.win/raw?url='];
            let response;
            
            for (const proxy of proxies) {
                try {
                    const url = `${proxy}https://a.4cdn.org/${this.selectedBoard}/catalog.json`;
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
            this.displayThreads(this.threads);
            
        } catch (error) {
            console.error('Failed to load threads:', error);
            const errorMessage = error.message.includes('HTTP error') 
                ? `Network error loading threads for /${this.selectedBoard}/. Check your connection.`
                : `Failed to load threads for /${this.selectedBoard}/.`;
            this.showError(errorMessage, true, () => this.loadThreads());
        } finally {
            this.showLoading(false);
        }
    }

    displayThreads(threads) {
        if (!this.threadList) return;
        
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
            const proxies = ['', 'https://corsproxy.io/?', 'https://cors-anywhere.herokuapp.com/', 'https://api.allorigins.win/raw?url='];
            let response;
            
            for (const proxy of proxies) {
                try {
                    const url = `${proxy}https://a.4cdn.org/${this.selectedBoard}/thread/${threadNo}.json`;
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
            
            if (this.currentUtterance) {
                this.speechSynthesis.cancel();
            }
            
            this.updateProgress();
            
            if (this.isReading) {
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
            console.log('No more threads to auto-play');
            this.stopReading();
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
            if (!text || text.trim() === '') {
                resolve();
                return;
            }
            
            this.currentUtterance = new SpeechSynthesisUtterance(text);
            
            // Apply voice settings
            if (this.voiceSelect && this.voices.length > 0) {
                const selectedVoiceIndex = parseInt(this.voiceSelect.value);
                if (selectedVoiceIndex >= 0 && selectedVoiceIndex < this.voices.length) {
                    this.currentUtterance.voice = this.voices[selectedVoiceIndex];
                }
            }
            
            // Apply rate, pitch, and volume
            if (this.rateSlider) {
                this.currentUtterance.rate = parseFloat(this.rateSlider.value);
            }
            if (this.pitchSlider) {
                this.currentUtterance.pitch = parseFloat(this.pitchSlider.value);
            }
            if (this.volumeSlider) {
                this.currentUtterance.volume = parseFloat(this.volumeSlider.value);
            }
            
            // Apply tone analysis if available
            if (toneAnalysis && this.toneAnalysisEnabled) {
                this.applyToneToTTS(this.currentUtterance, toneAnalysis);
            }
            
            this.currentUtterance.onend = () => {
                this.handleSpeechEnd();
                resolve();
            };
            
            this.currentUtterance.onerror = (event) => {
                console.error('Speech synthesis error:', event);
                this.handleSpeechEnd();
                resolve();
            };
            
            this.speechSynthesis.speak(this.currentUtterance);
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
        if (!this.isReading) {
            return;
        }
        
        // Play beep between posts
        await this.playBeep();
        
        // Wait for auto-play delay
        setTimeout(async () => {
            if (this.isReading) {
                await this.skipToNext();
            }
        }, this.autoPlayDelay);
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