// Example Integration: Tone Analysis + Music Manager + TTS
// This shows how to integrate OpenRouter tone analysis with dynamic music and voice modulation

// Usage example for your main script.js
class ToneIntegratedTTS {
    constructor() {
        this.openRouter = new OpenRouterAPI();
        this.musicManager = new MusicManager();
        this.isEnabled = false;
        
        // Initialize audio systems
        this.init();
    }

    async init() {
        await this.musicManager.initAudio();
        console.log('Tone-integrated TTS system ready');
    }

    // Main function: Analyze post and apply dynamic settings
    async processPost(postText, ttsInstance) {
        if (!this.isEnabled) {
            // Just play normally without analysis
            return this.playNormal(postText, ttsInstance);
        }

        try {
            console.log('Analyzing post tone...');
            
            // Step 1: Analyze the post tone
            const toneAnalysis = await this.openRouter.analyzeTone(postText);
            
            if (!toneAnalysis) {
                console.warn('Tone analysis failed, using normal settings');
                return this.playNormal(postText, ttsInstance);
            }

            console.log('Tone analysis result:', toneAnalysis);

            // Step 2: Apply music and voice settings
            await this.musicManager.applyToneSettings(toneAnalysis, ttsInstance);

            // Step 3: Play TTS with enhanced settings
            return this.playWithTone(postText, ttsInstance, toneAnalysis);

        } catch (error) {
            console.error('Error in tone processing:', error);
            return this.playNormal(postText, ttsInstance);
        }
    }

    // Play TTS with tone-based enhancements
    async playWithTone(text, ttsInstance, toneAnalysis) {
        // Add emotional context to the text if needed
        const enhancedText = this.enhanceTextForTone(text, toneAnalysis);
        
        // Configure TTS voice based on tone
        this.configureTTSVoice(ttsInstance, toneAnalysis);
        
        // Speak the text
        return new Promise((resolve, reject) => {
            const utterance = new SpeechSynthesisUtterance(enhancedText);
            
            // Apply voice settings
            utterance.rate = ttsInstance.rate || 1.0;
            utterance.pitch = ttsInstance.pitch || 1.0;
            utterance.volume = ttsInstance.volume || 0.8;
            
            // Select appropriate voice
            const voices = speechSynthesis.getVoices();
            const selectedVoice = this.selectVoiceForTone(voices, toneAnalysis);
            if (selectedVoice) {
                utterance.voice = selectedVoice;
            }

            utterance.onend = () => {
                console.log('TTS completed with tone:', toneAnalysis.mood);
                resolve();
            };
            
            utterance.onerror = (error) => {
                console.error('TTS error:', error);
                reject(error);
            };

            speechSynthesis.speak(utterance);
        });
    }

    // Play TTS normally (fallback)
    async playNormal(text, ttsInstance) {
        return new Promise((resolve, reject) => {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.onend = resolve;
            utterance.onerror = reject;
            speechSynthesis.speak(utterance);
        });
    }

    // Enhance text based on tone (add pauses, emphasis, etc.)
    enhanceTextForTone(text, toneAnalysis) {
        let enhanced = text;

        switch (toneAnalysis.mood) {
            case 'angry':
                // Add emphasis and shorter pauses
                enhanced = text.replace(/[.!?]/g, '! ');
                break;
            case 'sad':
                // Add longer pauses
                enhanced = text.replace(/[.]/g, '... ');
                break;
            case 'excited':
                // Add exclamation and faster pace
                enhanced = text.replace(/[.]/g, '! ');
                break;
            case 'sarcastic':
                // Add subtle pauses for effect
                enhanced = text.replace(/,/g, ', ... ');
                break;
        }

        return enhanced;
    }

    // Configure TTS voice parameters
    configureTTSVoice(ttsInstance, toneAnalysis) {
        // Energy level affects volume and rate
        const energyMultiplier = {
            'low': 0.8,
            'medium': 1.0,
            'high': 1.2
        }[toneAnalysis.energy] || 1.0;

        // Apply energy to existing settings
        if (ttsInstance.rate) ttsInstance.rate *= energyMultiplier;
        if (ttsInstance.volume) ttsInstance.volume *= energyMultiplier;

        // Voice style affects pitch
        switch (toneAnalysis.voice_style) {
            case 'deep':
                ttsInstance.pitch = Math.max(0.5, (ttsInstance.pitch || 1.0) * 0.7);
                break;
            case 'high':
                ttsInstance.pitch = Math.min(2.0, (ttsInstance.pitch || 1.0) * 1.3);
                break;
            case 'robotic':
                ttsInstance.rate = 0.9;
                ttsInstance.pitch = 0.8;
                break;
            case 'dramatic':
                ttsInstance.rate = 0.8;
                ttsInstance.pitch = 1.1;
                break;
        }
    }

    // Select appropriate voice based on tone
    selectVoiceForTone(voices, toneAnalysis) {
        if (!voices || voices.length === 0) return null;

        // Filter voices based on tone requirements
        let preferredVoices = voices;

        // Gender preference based on mood
        if (toneAnalysis.mood === 'angry' || toneAnalysis.mood === 'serious') {
            preferredVoices = voices.filter(voice => 
                voice.name.toLowerCase().includes('male') && 
                !voice.name.toLowerCase().includes('female')
            );
        } else if (toneAnalysis.mood === 'happy' || toneAnalysis.mood === 'excited') {
            preferredVoices = voices.filter(voice => 
                voice.name.toLowerCase().includes('female')
            );
        }

        // Fallback to any available voice
        if (preferredVoices.length === 0) {
            preferredVoices = voices;
        }

        // Return random voice from preferred list
        return preferredVoices[Math.floor(Math.random() * preferredVoices.length)];
    }

    // Enable/disable tone analysis
    setEnabled(enabled) {
        this.isEnabled = enabled;
        console.log(`Tone analysis ${enabled ? 'enabled' : 'disabled'}`);
        
        if (!enabled) {
            this.musicManager.stopBackgroundMusic();
        }
    }

    // Set music volume
    setMusicVolume(volume) {
        this.musicManager.setVolume(volume);
    }

    // Get available music sources for user
    getMusicSources() {
        return this.musicManager.getFreeMusicSources();
    }

    // Test the system with sample text
    async testTone(sampleText = "This is a test of the tone analysis system.") {
        console.log('Testing tone analysis system...');
        
        const mockTTS = {
            rate: 1.0,
            pitch: 1.0,
            volume: 0.8
        };

        await this.processPost(sampleText, mockTTS);
    }
}

// Integration instructions for main script.js:
/*

1. Add these script tags to index.html:
   <script src="openrouter-config.js"></script>
   <script src="music-manager.js"></script>
   <script src="tone-integration-example.js"></script>

2. In your main FourChanTTS class, add:
   this.toneSystem = new ToneIntegratedTTS();

3. Replace your TTS playback calls with:
   await this.toneSystem.processPost(postText, this.ttsInstance);

4. Add UI controls for:
   - Enable/disable tone analysis
   - Music volume slider
   - Music genre override
   - Voice style selection

5. Example UI additions to index.html:
   <div class="tone-controls">
       <label>
           <input type="checkbox" id="enableToneAnalysis"> Enable Smart Tone Analysis
       </label>
       <label>
           Music Volume: <input type="range" id="musicVolume" min="0" max="1" step="0.1" value="0.3">
       </label>
   </div>

*/

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ToneIntegratedTTS;
} else {
    window.ToneIntegratedTTS = ToneIntegratedTTS;
}