/**
 * GeoS4 Sound Engine - Modular Audio System
 * Handles all audio generation, custom audio loading, and sound synthesis
 * Note: Renamed oscillators from 'osc' to 'oscillator' to avoid conflict with Open Sound Control (OSC) protocol
 */
class GeoS4SoundEngine {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.isAudioInitialized = false;
        this.clickMuted = false;
        this.customAudioBuffers = {}; // Store loaded custom audio buffers
        this.loadingAudio = new Set(); // Track which audio files are loading
    }

    async initializeAudio() {
        if (this.isAudioInitialized) return;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.masterGain.gain.value = 0.7;
            this.isAudioInitialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize audio:', error);
            return false;
        }
    }

    async loadCustomAudio(trackKey, audioData) {
        if (!this.audioContext) {
            await this.initializeAudio();
        }

        if (!audioData || this.loadingAudio.has(trackKey)) {
            return false;
        }

        this.loadingAudio.add(trackKey);

        try {
            // Convert base64 to ArrayBuffer
            const binaryString = atob(audioData.data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // Decode audio data
            const audioBuffer = await this.audioContext.decodeAudioData(bytes.buffer);
            this.customAudioBuffers[trackKey] = audioBuffer;

            console.log(`Custom audio loaded for ${trackKey}:`, audioData.filename);
            this.loadingAudio.delete(trackKey);
            return true;

        } catch (error) {
            console.error(`Failed to load custom audio for ${trackKey}:`, error);
            this.loadingAudio.delete(trackKey);
            return false;
        }
    }

    setClickMuted(muted) {
        this.clickMuted = muted;
    }

    async playTrackSound(trackIndex, soundType = null, isClick = false) {
        // Only apply mute to click sounds
        if (isClick && this.clickMuted) return;

        const trackKey = `track_${trackIndex}`;

        // Try to play custom audio first
        if (this.customAudioBuffers[trackKey]) {
            this.playCustomAudio(trackKey);
            return;
        }

        // Fallback to default sounds
        const defaultSounds = ['kick', 'snare', 'hihat', 'perc'];
        const sound = soundType || defaultSounds[trackIndex % defaultSounds.length];
        this.playSound(sound);
    }

    playCustomAudio(trackKey) {
        if (!this.audioContext || !this.customAudioBuffers[trackKey]) return;

        try {
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();

            source.buffer = this.customAudioBuffers[trackKey];
            source.connect(gainNode);
            gainNode.connect(this.masterGain);

            // Set volume for custom audio
            gainNode.gain.value = 0.8;

            source.start(0);
        } catch (error) {
            console.error(`Error playing custom audio for ${trackKey}:`, error);
        }
    }

    // Generate random sound parameters for more variety
    getRandomSoundParams() {
        return {
            frequency: Math.random() * 200 + 50, // 50-250 Hz
            decay: Math.random() * 0.3 + 0.1, // 0.1-0.4 seconds
            volume: Math.random() * 0.3 + 0.4, // 0.4-0.7 volume
            filterFreq: Math.random() * 1000 + 500 // 500-1500 Hz
        };
    }

    playSound(soundType) {
        if (!this.audioContext) return;

        switch(soundType) {
            case 'kick':
                this.playKick();
                break;
            case 'snare':
                this.playSnare();
                break;
            case 'hihat':
                this.playHiHat();
                break;
            case 'perc':
                this.playPerc();
                break;
            case 'clap':
                this.playClap();
                break;
            case 'cymbal':
                this.playCymbal();
                break;
            case 'tom':
                this.playTom();
                break;
            case 'rim':
                this.playRim();
                break;
            case 'cowbell':
                this.playCowbell();
                break;
            case 'shaker':
                this.playShaker();
                break;
            case 'bass':
                this.playBass();
                break;
            case 'random':
                this.playRandomSound();
                break;
            default:
                this.playPerc();
                break;
        }
    }

    // New random sound generator
    playRandomSound() {
        const randomTypes = ['kick', 'snare', 'hihat', 'perc', 'clap', 'cymbal', 'tom', 'rim', 'cowbell', 'shaker', 'bass'];
        const randomType = randomTypes[Math.floor(Math.random() * randomTypes.length)];

        // Add some variation to the chosen sound
        const params = this.getRandomSoundParams();
        this.playVariedSound(randomType, params);
    }

    playVariedSound(soundType, params) {
        switch(soundType) {
            case 'kick':
                this.playVariedKick(params);
                break;
            case 'snare':
                this.playVariedSnare(params);
                break;
            case 'hihat':
                this.playVariedHiHat(params);
                break;
            default:
                this.playVariedPerc(params);
                break;
        }
    }

    playVariedKick(params) {
        const now = this.audioContext.currentTime;
        const oscillator = this.audioContext.createOscillator();
        const oscillatorGain = this.audioContext.createGain();

        oscillator.connect(oscillatorGain);
        oscillatorGain.connect(this.masterGain);

        // Use random parameters
        oscillator.frequency.setValueAtTime(params.frequency, now);
        oscillator.frequency.exponentialRampToValueAtTime(0.1, now + params.decay);

        oscillatorGain.gain.setValueAtTime(params.volume, now);
        oscillatorGain.gain.exponentialRampToValueAtTime(0.01, now + params.decay);

        oscillator.start(now);
        oscillator.stop(now + params.decay);
    }

    playVariedSnare(params) {
        const now = this.audioContext.currentTime;
        const oscillator = this.audioContext.createOscillator();
        const oscillatorGain = this.audioContext.createGain();

        oscillator.connect(oscillatorGain);
        oscillatorGain.connect(this.masterGain);

        oscillator.frequency.value = params.frequency * 2; // Higher pitch than kick
        oscillatorGain.gain.setValueAtTime(params.volume * 0.5, now);
        oscillatorGain.gain.exponentialRampToValueAtTime(0.01, now + params.decay);

        oscillator.start(now);
        oscillator.stop(now + params.decay);
    }

    playVariedHiHat(params) {
        const now = this.audioContext.currentTime;

        const bufferSize = this.audioContext.sampleRate * params.decay;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            output[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
        }

        const noise = this.audioContext.createBufferSource();
        const noiseGain = this.audioContext.createGain();
        const noiseFilter = this.audioContext.createBiquadFilter();

        noise.buffer = buffer;
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain);

        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = params.filterFreq * 8; // High frequency

        noiseGain.gain.setValueAtTime(params.volume * 0.3, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + params.decay);

        noise.start(now);
    }

    playVariedPerc(params) {
        const now = this.audioContext.currentTime;

        const oscillator = this.audioContext.createOscillator();
        const oscillatorGain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();

        oscillator.connect(filter);
        filter.connect(oscillatorGain);
        oscillatorGain.connect(this.masterGain);

        oscillator.frequency.setValueAtTime(params.frequency * 4, now);
        oscillator.frequency.exponentialRampToValueAtTime(params.frequency, now + params.decay);

        filter.type = 'bandpass';
        filter.frequency.value = params.filterFreq;
        filter.Q.value = 5 + Math.random() * 10;

        oscillatorGain.gain.setValueAtTime(params.volume, now);
        oscillatorGain.gain.exponentialRampToValueAtTime(0.01, now + params.decay);

        oscillator.start(now);
        oscillator.stop(now + params.decay);
    }

    // Standard drum sounds
    playKick() {
        const now = this.audioContext.currentTime;
        const oscillator = this.audioContext.createOscillator();
        const oscillatorGain = this.audioContext.createGain();

        oscillator.connect(oscillatorGain);
        oscillatorGain.connect(this.masterGain);

        oscillator.frequency.setValueAtTime(60, now);
        oscillator.frequency.exponentialRampToValueAtTime(0.1, now + 0.5);

        oscillatorGain.gain.setValueAtTime(1, now);
        oscillatorGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

        oscillator.start(now);
        oscillator.stop(now + 0.5);
    }

    playSnare() {
        const now = this.audioContext.currentTime;

        // Tone component
        const oscillator = this.audioContext.createOscillator();
        const oscillatorGain = this.audioContext.createGain();

        oscillator.connect(oscillatorGain);
        oscillatorGain.connect(this.masterGain);

        oscillator.frequency.value = 200;
        oscillatorGain.gain.setValueAtTime(0.3, now);
        oscillatorGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        oscillator.start(now);
        oscillator.stop(now + 0.2);

        // Noise component
        const bufferSize = this.audioContext.sampleRate * 0.2;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            output[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1);
        }

        const noise = this.audioContext.createBufferSource();
        const noiseGain = this.audioContext.createGain();
        const noiseFilter = this.audioContext.createBiquadFilter();

        noise.buffer = buffer;
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain);

        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 1000;
        noiseFilter.Q.value = 0.5;

        noiseGain.gain.setValueAtTime(0.8, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        noise.start(now);
    }

    playHiHat() {
        const now = this.audioContext.currentTime;

        const bufferSize = this.audioContext.sampleRate * 0.1;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            output[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
        }

        const noise = this.audioContext.createBufferSource();
        const noiseGain = this.audioContext.createGain();
        const noiseFilter = this.audioContext.createBiquadFilter();

        noise.buffer = buffer;
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain);

        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 8000;

        noiseGain.gain.setValueAtTime(0.3, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        noise.start(now);
    }

    playPerc() {
        const now = this.audioContext.currentTime;

        const oscillator = this.audioContext.createOscillator();
        const oscillatorGain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();

        oscillator.connect(filter);
        filter.connect(oscillatorGain);
        oscillatorGain.connect(this.masterGain);

        oscillator.frequency.setValueAtTime(800, now);
        oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.15);

        filter.type = 'bandpass';
        filter.frequency.value = 1200;
        filter.Q.value = 5;

        oscillatorGain.gain.setValueAtTime(0.4, now);
        oscillatorGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        oscillator.start(now);
        oscillator.stop(now + 0.15);
    }

    playClap() {
        const now = this.audioContext.currentTime;

        const bufferSize = this.audioContext.sampleRate * 0.15;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            output[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
        }

        const noise = this.audioContext.createBufferSource();
        const noiseGain = this.audioContext.createGain();
        const noiseFilter = this.audioContext.createBiquadFilter();

        noise.buffer = buffer;
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain);

        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 1500;
        noiseFilter.Q.value = 2;

        noiseGain.gain.setValueAtTime(0.6, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        noise.start(now);
    }

    playCymbal() {
        const now = this.audioContext.currentTime;

        const bufferSize = this.audioContext.sampleRate * 1.5;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            output[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 0.5);
        }

        const noise = this.audioContext.createBufferSource();
        const noiseGain = this.audioContext.createGain();
        const noiseFilter = this.audioContext.createBiquadFilter();

        noise.buffer = buffer;
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain);

        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 3000;

        noiseGain.gain.setValueAtTime(0.4, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);

        noise.start(now);
    }

    playTom() {
        const now = this.audioContext.currentTime;

        const oscillator = this.audioContext.createOscillator();
        const oscillatorGain = this.audioContext.createGain();

        oscillator.connect(oscillatorGain);
        oscillatorGain.connect(this.masterGain);

        oscillator.frequency.setValueAtTime(150, now);
        oscillator.frequency.exponentialRampToValueAtTime(40, now + 0.3);

        oscillatorGain.gain.setValueAtTime(0.6, now);
        oscillatorGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

        oscillator.start(now);
        oscillator.stop(now + 0.3);
    }

    playRim() {
        const now = this.audioContext.currentTime;

        const oscillator = this.audioContext.createOscillator();
        const oscillatorGain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();

        oscillator.connect(filter);
        filter.connect(oscillatorGain);
        oscillatorGain.connect(this.masterGain);

        oscillator.frequency.value = 2000;
        filter.type = 'bandpass';
        filter.frequency.value = 2000;
        filter.Q.value = 10;

        oscillatorGain.gain.setValueAtTime(0.3, now);
        oscillatorGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

        oscillator.start(now);
        oscillator.stop(now + 0.05);
    }

    playCowbell() {
        const now = this.audioContext.currentTime;

        const oscillator1 = this.audioContext.createOscillator();
        const oscillator2 = this.audioContext.createOscillator();
        const oscillatorGain = this.audioContext.createGain();

        oscillator1.connect(oscillatorGain);
        oscillator2.connect(oscillatorGain);
        oscillatorGain.connect(this.masterGain);

        oscillator1.frequency.value = 800;
        oscillator2.frequency.value = 540;

        oscillatorGain.gain.setValueAtTime(0.3, now);
        oscillatorGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

        oscillator1.start(now);
        oscillator2.start(now);
        oscillator1.stop(now + 0.25);
        oscillator2.stop(now + 0.25);
    }

    playShaker() {
        const now = this.audioContext.currentTime;

        const bufferSize = this.audioContext.sampleRate * 0.08;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            output[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 4);
        }

        const noise = this.audioContext.createBufferSource();
        const noiseGain = this.audioContext.createGain();
        const noiseFilter = this.audioContext.createBiquadFilter();

        noise.buffer = buffer;
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain);

        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 10000;

        noiseGain.gain.setValueAtTime(0.2, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

        noise.start(now);
    }

    playBass() {
        const now = this.audioContext.currentTime;

        const oscillator = this.audioContext.createOscillator();
        const oscillatorGain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();

        oscillator.connect(filter);
        filter.connect(oscillatorGain);
        oscillatorGain.connect(this.masterGain);

        oscillator.frequency.setValueAtTime(80, now);
        oscillator.frequency.exponentialRampToValueAtTime(40, now + 0.4);

        filter.type = 'lowpass';
        filter.frequency.value = 200;

        oscillatorGain.gain.setValueAtTime(0.5, now);
        oscillatorGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

        oscillator.start(now);
        oscillator.stop(now + 0.4);
    }

    // Cleanup
    destroy() {
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
    }
}

// Export for use in other modules
window.GeoS4SoundEngine = GeoS4SoundEngine;