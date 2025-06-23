/**
 * Enhanced GeoS4 Sound Engine with Recording and Custom Audio Upload
 * Professional audio system with recording capabilities and file upload support
 */
class GeoS4SoundEngine {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.isAudioInitialized = false;
        this.clickMuted = false;
        this.customAudioBuffers = new Map(); // Track-specific custom audio buffers
        this.loadingAudio = new Set(); // Track which audio files are loading

        // Recording system
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;
        this.recordingStartTime = null;
        this.recordingDuration = 0;
        this.destinationNode = null;

        // Recording settings
        this.recordingSettings = {
            mimeType: 'audio/webm;codecs=opus',
            audioBitsPerSecond: 128000
        };
    }

    async initializeAudio() {
        if (this.isAudioInitialized) return true;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.masterGain.gain.value = 0.7;

            // Initialize recording destination
            this.destinationNode = this.audioContext.createMediaStreamDestination();
            this.masterGain.connect(this.destinationNode);

            this.isAudioInitialized = true;
            console.log('Audio system initialized with recording support');
            return true;
        } catch (error) {
            console.error('Failed to initialize audio:', error);
            return false;
        }
    }

    // === RECORDING SYSTEM ===

    async startRecording() {
        if (!this.isAudioInitialized) {
            await this.initializeAudio();
        }

        if (this.isRecording) {
            console.warn('Recording already in progress');
            return false;
        }

        try {
            // Check for supported MIME types
            const mimeType = this.getSupportedMimeType();
            if (!mimeType) {
                throw new Error('No supported recording format found');
            }

            this.recordingSettings.mimeType = mimeType;

            // Create MediaRecorder
            this.mediaRecorder = new MediaRecorder(
                this.destinationNode.stream,
                this.recordingSettings
            );

            this.recordedChunks = [];
            this.recordingStartTime = Date.now();

            // Set up event handlers
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                this.handleRecordingStop();
            };

            this.mediaRecorder.onerror = (event) => {
                console.error('Recording error:', event.error);
                this.isRecording = false;
            };

            // Start recording
            this.mediaRecorder.start(100); // Collect data every 100ms
            this.isRecording = true;

            console.log('Recording started');
            this.updateRecordingUI(true);

            return true;

        } catch (error) {
            console.error('Failed to start recording:', error);
            this.isRecording = false;
            return false;
        }
    }

    stopRecording() {
        if (!this.isRecording || !this.mediaRecorder) {
            console.warn('No recording in progress');
            return false;
        }

        try {
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.recordingDuration = Date.now() - this.recordingStartTime;

            console.log(`Recording stopped. Duration: ${this.recordingDuration}ms`);
            this.updateRecordingUI(false);

            return true;

        } catch (error) {
            console.error('Failed to stop recording:', error);
            return false;
        }
    }

    handleRecordingStop() {
        if (this.recordedChunks.length === 0) {
            console.warn('No recorded data available');
            return;
        }

        // Create blob from recorded chunks
        const blob = new Blob(this.recordedChunks, {
            type: this.recordingSettings.mimeType
        });

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const extension = this.getFileExtension(this.recordingSettings.mimeType);
        const filename = `geos4-recording-${timestamp}.${extension}`;

        // Automatically download the recording
        this.downloadRecording(blob, filename);

        // Reset recording state
        this.recordedChunks = [];
        this.recordingStartTime = null;
        this.recordingDuration = 0;
    }

    getSupportedMimeType() {
        const types = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/mp4',
            'audio/ogg;codecs=opus',
            'audio/wav'
        ];

        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }

        return null;
    }

    getFileExtension(mimeType) {
        const extensionMap = {
            'audio/webm': 'webm',
            'audio/mp4': 'm4a',
            'audio/ogg': 'ogg',
            'audio/wav': 'wav'
        };

        for (const [type, ext] of Object.entries(extensionMap)) {
            if (mimeType.includes(type)) {
                return ext;
            }
        }

        return 'webm'; // Default fallback
    }

    downloadRecording(blob, filename) {
        try {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            // Clean up URL object
            setTimeout(() => URL.revokeObjectURL(url), 1000);

            console.log(`Recording downloaded: ${filename}`);

            // Show user notification
            this.showRecordingNotification(filename, blob.size);

        } catch (error) {
            console.error('Failed to download recording:', error);
        }
    }

    updateRecordingUI(isRecording) {
        const recordButton = document.getElementById('recordButton');
        if (recordButton) {
            if (isRecording) {
                recordButton.textContent = '⏹ Stop Recording';
                recordButton.classList.add('recording');
                recordButton.style.background = 'linear-gradient(45deg, #ff4444, #cc0000)';
                recordButton.style.animation = 'pulse 1s infinite';
            } else {
                recordButton.textContent = '📼 Record';
                recordButton.classList.remove('recording');
                recordButton.style.background = '';
                recordButton.style.animation = '';
            }
        }
    }

    showRecordingNotification(filename, fileSize) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'recording-notification';
        notification.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #4caf50, #388e3c);
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 10000;
                font-family: 'Courier New', monospace;
                font-size: 0.9em;
                max-width: 300px;
            ">
                <div style="font-weight: bold; margin-bottom: 5px;">
                    ✅ Recording Saved!
                </div>
                <div style="font-size: 0.8em; opacity: 0.9;">
                    ${filename}<br>
                    Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB
                </div>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto-remove notification after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    // === CUSTOM AUDIO UPLOAD SYSTEM ===

    async loadCustomAudioFile(file) {
        if (!this.audioContext) {
            await this.initializeAudio();
        }

        try {
            // Convert file to ArrayBuffer
            const arrayBuffer = await file.arrayBuffer();

            // Decode audio data
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

            console.log(`Custom audio loaded: ${file.name}, Duration: ${audioBuffer.duration.toFixed(2)}s`);
            return audioBuffer;

        } catch (error) {
            console.error('Failed to load custom audio file:', error);
            throw error;
        }
    }

    setTrackCustomAudio(trackIndex, audioBuffer) {
        if (!audioBuffer) {
            console.warn(`Cannot set custom audio for track ${trackIndex}: invalid audio buffer`);
            return;
        }

        this.customAudioBuffers.set(trackIndex, audioBuffer);
        console.log(`Custom audio buffer set for track ${trackIndex}, duration: ${audioBuffer.duration}s, channels: ${audioBuffer.numberOfChannels}`);
    }

    clearTrackCustomAudio(trackIndex) {
        const wasCleared = this.customAudioBuffers.delete(trackIndex);
        console.log(`Custom audio ${wasCleared ? 'cleared' : 'was not present'} for track ${trackIndex}`);
    }

    hasTrackCustomAudio(trackIndex) {
        const hasAudio = this.customAudioBuffers.has(trackIndex);
        console.log(`Track ${trackIndex} has custom audio: ${hasAudio}`);
        return hasAudio;
    }

    // === AUDIO PLAYBACK SYSTEM ===

    setClickMuted(muted) {
        this.clickMuted = muted;
    }

    async playTrackSound(trackIndex, soundType = null, isClick = false, volume = 1.0) {
        // Only apply mute to click sounds
        if (isClick && this.clickMuted) return;

        console.log(`Playing track ${trackIndex}, sound: ${soundType}, isClick: ${isClick}, hasCustom: ${this.customAudioBuffers.has(trackIndex)}`);

        // Try to play custom audio first
        if (this.customAudioBuffers.has(trackIndex)) {
            console.log(`Playing custom audio for track ${trackIndex}`);
            this.playCustomAudio(trackIndex, volume);
            return;
        }

        // Fallback to default sounds
        const defaultSounds = ['kick', 'snare', 'hihat', 'perc'];
        const sound = soundType || defaultSounds[trackIndex % defaultSounds.length];
        console.log(`Playing default sound: ${sound} for track ${trackIndex}`);
        this.playSound(sound, volume);
    }

    playCustomAudio(trackIndex, volume = 1.0) {
        if (!this.audioContext || !this.customAudioBuffers.has(trackIndex)) return;

        try {
            const audioBuffer = this.customAudioBuffers.get(trackIndex);
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();

            source.buffer = audioBuffer;
            source.connect(gainNode);
            gainNode.connect(this.masterGain);

            // Set volume
            gainNode.gain.value = Math.max(0, Math.min(1, volume)) * 0.8;

            source.start(0);

        } catch (error) {
            console.error(`Error playing custom audio for track ${trackIndex}:`, error);
        }
    }

    // Generate random sound parameters for variety
    getRandomSoundParams() {
        return {
            frequency: Math.random() * 200 + 50, // 50-250 Hz
            decay: Math.random() * 0.3 + 0.1, // 0.1-0.4 seconds
            volume: Math.random() * 0.3 + 0.4, // 0.4-0.7 volume
            filterFreq: Math.random() * 1000 + 500 // 500-1500 Hz
        };
    }

    playSound(soundType, volume = 1.0) {
        if (!this.audioContext) return;

        const adjustedVolume = Math.max(0, Math.min(1, volume));

        switch(soundType) {
            case 'kick':
                this.playKick(adjustedVolume);
                break;
            case 'snare':
                this.playSnare(adjustedVolume);
                break;
            case 'hihat':
                this.playHiHat(adjustedVolume);
                break;
            case 'perc':
                this.playPerc(adjustedVolume);
                break;
            case 'clap':
                this.playClap(adjustedVolume);
                break;
            case 'cymbal':
                this.playCymbal(adjustedVolume);
                break;
            case 'tom':
                this.playTom(adjustedVolume);
                break;
            case 'rim':
                this.playRim(adjustedVolume);
                break;
            case 'cowbell':
                this.playCowbell(adjustedVolume);
                break;
            case 'shaker':
                this.playShaker(adjustedVolume);
                break;
            case 'bass':
                this.playBass(adjustedVolume);
                break;
            case 'random':
                this.playRandomSound(adjustedVolume);
                break;
            default:
                this.playPerc(adjustedVolume);
                break;
        }
    }

    playRandomSound(volume = 1.0) {
        const randomTypes = ['kick', 'snare', 'hihat', 'perc', 'clap', 'cymbal', 'tom', 'rim', 'cowbell', 'shaker', 'bass'];
        const randomType = randomTypes[Math.floor(Math.random() * randomTypes.length)];
        const params = this.getRandomSoundParams();
        this.playVariedSound(randomType, params, volume);
    }

    playVariedSound(soundType, params, volume = 1.0) {
        switch(soundType) {
            case 'kick':
                this.playVariedKick(params, volume);
                break;
            case 'snare':
                this.playVariedSnare(params, volume);
                break;
            case 'hihat':
                this.playVariedHiHat(params, volume);
                break;
            default:
                this.playVariedPerc(params, volume);
                break;
        }
    }

    // Enhanced drum sounds with volume control
    playKick(volume = 1.0) {
        const now = this.audioContext.currentTime;
        const oscillator = this.audioContext.createOscillator();
        const oscillatorGain = this.audioContext.createGain();

        oscillator.connect(oscillatorGain);
        oscillatorGain.connect(this.masterGain);

        oscillator.frequency.setValueAtTime(60, now);
        oscillator.frequency.exponentialRampToValueAtTime(0.1, now + 0.5);

        oscillatorGain.gain.setValueAtTime(volume, now);
        oscillatorGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

        oscillator.start(now);
        oscillator.stop(now + 0.5);
    }

    playSnare(volume = 1.0) {
        const now = this.audioContext.currentTime;

        // Tone component
        const oscillator = this.audioContext.createOscillator();
        const oscillatorGain = this.audioContext.createGain();

        oscillator.connect(oscillatorGain);
        oscillatorGain.connect(this.masterGain);

        oscillator.frequency.value = 200;
        oscillatorGain.gain.setValueAtTime(0.3 * volume, now);
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

        noiseGain.gain.setValueAtTime(0.8 * volume, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        noise.start(now);
    }

    playHiHat(volume = 1.0) {
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

        noiseGain.gain.setValueAtTime(0.3 * volume, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        noise.start(now);
    }

    playPerc(volume = 1.0) {
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

        oscillatorGain.gain.setValueAtTime(0.4 * volume, now);
        oscillatorGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        oscillator.start(now);
        oscillator.stop(now + 0.15);
    }

    playClap(volume = 1.0) {
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

        noiseGain.gain.setValueAtTime(0.6 * volume, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        noise.start(now);
    }

    playCymbal(volume = 1.0) {
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

        noiseGain.gain.setValueAtTime(0.4 * volume, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);

        noise.start(now);
    }

    playTom(volume = 1.0) {
        const now = this.audioContext.currentTime;

        const oscillator = this.audioContext.createOscillator();
        const oscillatorGain = this.audioContext.createGain();

        oscillator.connect(oscillatorGain);
        oscillatorGain.connect(this.masterGain);

        oscillator.frequency.setValueAtTime(150, now);
        oscillator.frequency.exponentialRampToValueAtTime(40, now + 0.3);

        oscillatorGain.gain.setValueAtTime(0.6 * volume, now);
        oscillatorGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

        oscillator.start(now);
        oscillator.stop(now + 0.3);
    }

    playRim(volume = 1.0) {
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

        oscillatorGain.gain.setValueAtTime(0.3 * volume, now);
        oscillatorGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

        oscillator.start(now);
        oscillator.stop(now + 0.05);
    }

    playCowbell(volume = 1.0) {
        const now = this.audioContext.currentTime;

        const oscillator1 = this.audioContext.createOscillator();
        const oscillator2 = this.audioContext.createOscillator();
        const oscillatorGain = this.audioContext.createGain();

        oscillator1.connect(oscillatorGain);
        oscillator2.connect(oscillatorGain);
        oscillatorGain.connect(this.masterGain);

        oscillator1.frequency.value = 800;
        oscillator2.frequency.value = 540;

        oscillatorGain.gain.setValueAtTime(0.3 * volume, now);
        oscillatorGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

        oscillator1.start(now);
        oscillator2.start(now);
        oscillator1.stop(now + 0.25);
        oscillator2.stop(now + 0.25);
    }

    playShaker(volume = 1.0) {
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

        noiseGain.gain.setValueAtTime(0.2 * volume, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

        noise.start(now);
    }

    playBass(volume = 1.0) {
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

        oscillatorGain.gain.setValueAtTime(0.5 * volume, now);
        oscillatorGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

        oscillator.start(now);
        oscillator.stop(now + 0.4);
    }

    // Varied sounds with parameters
    playVariedKick(params, volume = 1.0) {
        const now = this.audioContext.currentTime;
        const oscillator = this.audioContext.createOscillator();
        const oscillatorGain = this.audioContext.createGain();

        oscillator.connect(oscillatorGain);
        oscillatorGain.connect(this.masterGain);

        oscillator.frequency.setValueAtTime(params.frequency, now);
        oscillator.frequency.exponentialRampToValueAtTime(0.1, now + params.decay);

        oscillatorGain.gain.setValueAtTime(params.volume * volume, now);
        oscillatorGain.gain.exponentialRampToValueAtTime(0.01, now + params.decay);

        oscillator.start(now);
        oscillator.stop(now + params.decay);
    }

    playVariedSnare(params, volume = 1.0) {
        const now = this.audioContext.currentTime;
        const oscillator = this.audioContext.createOscillator();
        const oscillatorGain = this.audioContext.createGain();

        oscillator.connect(oscillatorGain);
        oscillatorGain.connect(this.masterGain);

        oscillator.frequency.value = params.frequency * 2;
        oscillatorGain.gain.setValueAtTime(params.volume * 0.5 * volume, now);
        oscillatorGain.gain.exponentialRampToValueAtTime(0.01, now + params.decay);

        oscillator.start(now);
        oscillator.stop(now + params.decay);
    }

    playVariedHiHat(params, volume = 1.0) {
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
        noiseFilter.frequency.value = params.filterFreq * 8;

        noiseGain.gain.setValueAtTime(params.volume * 0.3 * volume, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + params.decay);

        noise.start(now);
    }

    playVariedPerc(params, volume = 1.0) {
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

        oscillatorGain.gain.setValueAtTime(params.volume * volume, now);
        oscillatorGain.gain.exponentialRampToValueAtTime(0.01, now + params.decay);

        oscillator.start(now);
        oscillator.stop(now + params.decay);
    }

    // === UTILITY METHODS ===

    getRecordingStatus() {
        return {
            isRecording: this.isRecording,
            duration: this.isRecording ? Date.now() - this.recordingStartTime : this.recordingDuration,
            isSupported: typeof MediaRecorder !== 'undefined',
            supportedFormats: this.getSupportedFormats()
        };
    }

    getSupportedFormats() {
        const formats = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/mp4',
            'audio/ogg;codecs=opus',
            'audio/wav'
        ];

        return formats.filter(format =>
            typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(format)
        );
    }

    // === CLEANUP ===

    destroy() {
        // Stop recording if active
        if (this.isRecording) {
            this.stopRecording();
        }

        // Clear custom audio buffers
        this.customAudioBuffers.clear();

        // Close audio context
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }

        console.log('Sound engine destroyed');
    }
}

// Export for use in other modules
window.GeoS4SoundEngine = GeoS4SoundEngine;