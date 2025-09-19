// Music Manager for Dynamic Background Music
// Integrates with OpenRouter tone analysis for adaptive audio

class MusicManager {
    constructor() {
        this.currentTrack = null;
        this.audioContext = null;
        this.musicVolume = 0.3;
        this.isPlaying = false;
        this.crossfadeDuration = 2000; // 2 seconds
        
        // Free music sources and tracks
        this.musicLibrary = {
            ambient: [
                { name: 'Peaceful Ambient', url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', loop: true },
                { name: 'Soft Drone', url: 'https://freesound.org/data/previews/316/316847_5123451-lq.mp3', loop: true }
            ],
            electronic: [
                { name: 'Synth Wave', url: 'https://www.soundjay.com/misc/sounds/beep-07a.wav', loop: true },
                { name: 'Digital Beat', url: 'https://freesound.org/data/previews/316/316847_5123451-lq.mp3', loop: true }
            ],
            rock: [
                { name: 'Guitar Riff', url: 'https://www.soundjay.com/misc/sounds/beep-10.wav', loop: true }
            ],
            classical: [
                { name: 'Piano Melody', url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', loop: true }
            ],
            none: []
        };
        
        // Voice modulation settings based on tone
        this.voiceSettings = {
            angry: { rate: 1.2, pitch: 0.8, volume: 0.9 },
            sad: { rate: 0.8, pitch: 0.9, volume: 0.7 },
            happy: { rate: 1.1, pitch: 1.1, volume: 0.8 },
            excited: { rate: 1.3, pitch: 1.2, volume: 0.9 },
            sarcastic: { rate: 1.0, pitch: 0.9, volume: 0.8 },
            serious: { rate: 0.9, pitch: 0.8, volume: 0.8 },
            neutral: { rate: 1.0, pitch: 1.0, volume: 0.8 }
        };
    }

    // Initialize audio context
    async initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('Music Manager: Audio context initialized');
        } catch (error) {
            console.error('Failed to initialize audio context:', error);
        }
    }

    // Apply tone-based music and voice settings
    async applyToneSettings(toneAnalysis, ttsInstance) {
        if (!toneAnalysis) return;

        console.log('Applying tone settings:', toneAnalysis);

        // Apply voice settings
        if (ttsInstance && this.voiceSettings[toneAnalysis.mood]) {
            const settings = this.voiceSettings[toneAnalysis.mood];
            ttsInstance.rate = settings.rate;
            ttsInstance.pitch = settings.pitch;
            ttsInstance.volume = settings.volume;
        }

        // Apply background music
        if (toneAnalysis.music_genre && toneAnalysis.music_genre !== 'none') {
            await this.playBackgroundMusic(toneAnalysis.music_genre, toneAnalysis.tempo);
        } else {
            this.stopBackgroundMusic();
        }
    }

    // Play background music based on genre and tempo
    async playBackgroundMusic(genre, tempo = 'medium') {
        const tracks = this.musicLibrary[genre] || this.musicLibrary.ambient;
        if (tracks.length === 0) return;

        // Select random track from genre
        const track = tracks[Math.floor(Math.random() * tracks.length)];
        
        try {
            // Stop current track if playing
            if (this.currentTrack) {
                this.stopBackgroundMusic();
            }

            // Create new audio element
            this.currentTrack = new Audio();
            this.currentTrack.src = track.url;
            this.currentTrack.loop = track.loop;
            this.currentTrack.volume = this.musicVolume;
            
            // Adjust playback rate based on tempo
            this.currentTrack.playbackRate = this.getPlaybackRate(tempo);
            
            // Fade in
            this.currentTrack.volume = 0;
            await this.currentTrack.play();
            this.fadeIn(this.currentTrack);
            
            this.isPlaying = true;
            console.log(`Playing background music: ${track.name} (${genre}, ${tempo})`);
            
        } catch (error) {
            console.error('Failed to play background music:', error);
            // Fallback to generated tones
            this.generateTone(genre, tempo);
        }
    }

    // Generate synthetic tones as fallback
    generateTone(genre, tempo) {
        if (!this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Set frequency based on genre
        const frequencies = {
            ambient: 220,
            electronic: 440,
            rock: 330,
            classical: 523
        };
        
        oscillator.frequency.setValueAtTime(frequencies[genre] || 220, this.audioContext.currentTime);
        oscillator.type = genre === 'electronic' ? 'square' : 'sine';
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 1);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 5);
        
        console.log(`Generated ${genre} tone at ${frequencies[genre]}Hz`);
    }

    // Get playback rate based on tempo
    getPlaybackRate(tempo) {
        switch (tempo) {
            case 'slow': return 0.8;
            case 'fast': return 1.2;
            default: return 1.0;
        }
    }

    // Fade in audio
    fadeIn(audio) {
        const fadeSteps = 20;
        const stepTime = this.crossfadeDuration / fadeSteps;
        const volumeStep = this.musicVolume / fadeSteps;
        let currentStep = 0;

        const fadeInterval = setInterval(() => {
            if (currentStep >= fadeSteps) {
                clearInterval(fadeInterval);
                return;
            }
            audio.volume = volumeStep * currentStep;
            currentStep++;
        }, stepTime);
    }

    // Stop background music
    stopBackgroundMusic() {
        if (this.currentTrack) {
            this.currentTrack.pause();
            this.currentTrack = null;
            this.isPlaying = false;
            console.log('Background music stopped');
        }
    }

    // Set music volume
    setVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.currentTrack) {
            this.currentTrack.volume = this.musicVolume;
        }
    }

    // Get free music sources (for user to download)
    getFreeMusicSources() {
        return {
            websites: [
                {
                    name: 'Freesound.org',
                    url: 'https://freesound.org',
                    description: 'Creative Commons licensed sounds and music',
                    formats: ['MP3', 'WAV', 'FLAC']
                },
                {
                    name: 'Zapsplat',
                    url: 'https://zapsplat.com',
                    description: 'Free sound effects and music (requires account)',
                    formats: ['MP3', 'WAV']
                },
                {
                    name: 'YouTube Audio Library',
                    url: 'https://studio.youtube.com/channel/UC_/music',
                    description: 'Royalty-free music from YouTube',
                    formats: ['MP3']
                },
                {
                    name: 'Incompetech',
                    url: 'https://incompetech.com/music/royalty-free/',
                    description: 'Kevin MacLeod\'s royalty-free music',
                    formats: ['MP3']
                },
                {
                    name: 'Pixabay Music',
                    url: 'https://pixabay.com/music/',
                    description: 'Free music for commercial use',
                    formats: ['MP3']
                }
            ],
            localSetup: {
                instructions: [
                    '1. Create a "music" folder in your project directory',
                    '2. Download music files from the sources above',
                    '3. Organize by genre: music/ambient/, music/electronic/, etc.',
                    '4. Update musicLibrary URLs to point to local files',
                    '5. Ensure files are in web-compatible formats (MP3, OGG, WAV)'
                ],
                example: {
                    folder_structure: 'music/ambient/peaceful.mp3',
                    code_update: 'url: "./music/ambient/peaceful.mp3"'
                }
            }
        };
    }
}

// Export for use in main script
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MusicManager;
} else {
    window.MusicManager = MusicManager;
}