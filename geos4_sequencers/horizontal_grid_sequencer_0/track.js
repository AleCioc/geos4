/**
 * Enhanced Track Controls with Audio Upload and Improved Styling
 * Updated track.js with upload functionality and better visual design
 */

/**
 * Track - Enhanced with audio upload capabilities and improved styling
 */
class Track {
    constructor(index, options = {}) {
        this.index = index;
        this.name = options.name || `Track ${index + 1}`;
        this.color = options.color || this.generateColor(index);
        this.sound = options.sound || this.getDefaultSound(index);
        this.pattern = options.pattern || [];
        this.volume = options.volume || 1.0;
        this.muted = options.muted || false;
        this.solo = options.solo || false;
        this.customParameters = options.customParameters || {};

        // Audio upload properties
        this.hasCustomAudio = false;
        this.customAudioFile = null;
        this.customAudioBuffer = null;

        // Track-specific audio effects and parameters
        this.effects = options.effects || {};
        this.pan = options.pan || 0;
        this.reverb = options.reverb || 0;
        this.delay = options.delay || 0;
        this.filter = options.filter || { type: 'none', frequency: 1000, resonance: 1 };

        // Geographic parameters
        this.geographicZone = options.geographicZone || null;
        this.spatialWeight = options.spatialWeight || 1.0;
    }

    generateColor(index) {
        const colors = [
            '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4',
            '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd',
            '#00d2d3', '#ff9f43', '#10ac84', '#ee5a24'
        ];
        return colors[index % colors.length];
    }

    getDefaultSound(index) {
        const sounds = ['kick', 'snare', 'hihat', 'perc', 'clap', 'cymbal', 'tom', 'rim'];
        return sounds[index % sounds.length];
    }

    // Audio upload methods
    setCustomAudio(audioFile, audioBuffer) {
        this.hasCustomAudio = true;
        this.customAudioFile = audioFile;
        this.customAudioBuffer = audioBuffer;
        this.sound = 'custom';
        console.log(`Custom audio set for track ${this.index}: ${audioFile.name}`);
    }

    clearCustomAudio() {
        this.hasCustomAudio = false;
        this.customAudioFile = null;
        this.customAudioBuffer = null;
        this.sound = this.getDefaultSound(this.index);
        console.log(`Custom audio cleared for track ${this.index}`);
    }

    getCustomAudioName() {
        return this.customAudioFile ? this.customAudioFile.name : null;
    }

    // Enhanced track control creation with upload functionality
    createTrackControl(container, soundEngine) {
        const control = document.createElement('div');
        control.className = 'track-control';
        control.dataset.trackIndex = this.index;

        // Track name
        const name = document.createElement('div');
        name.className = 'track-name';
        name.textContent = this.name;

        // Color indicator
        const colorBox = document.createElement('div');
        colorBox.className = 'track-color';
        colorBox.style.backgroundColor = this.color;

        // Enhanced sound selection dropdown with better styling
        const selectContainer = document.createElement('div');
        selectContainer.className = 'sound-select-container';

        const select = document.createElement('select');
        select.className = 'track-select enhanced-select';
        select.innerHTML = this.createSoundOptions();

        // Apply enhanced styling to select
        this.styleSelectElement(select);

        select.addEventListener('change', (e) => {
            if (e.target.value === 'custom' && !this.hasCustomAudio) {
                // Reset to previous value if custom selected but no audio uploaded
                e.target.value = this.sound;
                alert('Please upload a custom audio file first');
                return;
            }

            this.setSound(e.target.value);

            // CRITICAL: If custom audio is selected, ensure it's registered with sound engine
            if (e.target.value === 'custom' && this.hasCustomAudio && this.customAudioBuffer) {
                soundEngine.setTrackCustomAudio(this.index, this.customAudioBuffer);
                console.log(`Custom audio reactivated for track ${this.index}`);
            }
        });

        selectContainer.appendChild(select);

        // Custom audio upload section
        const uploadSection = document.createElement('div');
        uploadSection.className = 'upload-section';

        // Upload button
        const uploadButton = document.createElement('button');
        uploadButton.className = 'upload-button';
        uploadButton.innerHTML = '📁 Upload';
        uploadButton.title = 'Upload custom audio file';

        // Hidden file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'audio/*';
        fileInput.style.display = 'none';

        uploadButton.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await this.handleAudioUpload(file, soundEngine, select, uploadSection);
            }
        });

        // Clear custom audio button (initially hidden)
        const clearButton = document.createElement('button');
        clearButton.className = 'clear-button';
        clearButton.innerHTML = '❌';
        clearButton.title = 'Remove custom audio';
        clearButton.style.display = 'none';

        clearButton.addEventListener('click', () => {
            this.clearCustomAudio();
            select.value = this.sound;
            this.updateUploadSection(uploadSection, null);

            // CRITICAL: Clear custom audio from sound engine
            soundEngine.clearTrackCustomAudio(this.index);

            // Remove custom option from select
            const customOption = select.querySelector('option[value="custom"]');
            if (customOption && !this.hasCustomAudio) {
                customOption.remove();
            }

            // Dispatch event to notify sequencer
            const event = new CustomEvent('audioCleared', {
                detail: { trackIndex: this.index }
            });
            uploadSection.dispatchEvent(event);
        });

        uploadSection.appendChild(uploadButton);
        uploadSection.appendChild(clearButton);
        uploadSection.appendChild(fileInput);

        // Update upload section if custom audio already exists
        if (this.hasCustomAudio) {
            this.updateUploadSection(uploadSection, this.customAudioFile);
        }

        // Randomize button with enhanced styling
        const randomizeButton = document.createElement('button');
        randomizeButton.className = 'randomize-button enhanced-button';
        randomizeButton.innerHTML = '🎲';
        randomizeButton.title = 'Randomize track sound';

        randomizeButton.addEventListener('click', () => {
            const allSounds = ['kick', 'snare', 'hihat', 'perc', 'clap', 'cymbal', 'tom', 'rim', 'cowbell', 'shaker', 'bass', 'random'];
            const randomSound = allSounds[Math.floor(Math.random() * allSounds.length)];
            this.setSound(randomSound);
            select.value = randomSound;
        });

        // Assemble control
        control.appendChild(name);
        control.appendChild(colorBox);
        control.appendChild(selectContainer);
        control.appendChild(uploadSection);
        control.appendChild(randomizeButton);

        if (container) {
            container.appendChild(control);
        }

        return control;
    }

    createSoundOptions() {
        let options = `
            <option value="kick" ${this.sound === 'kick' ? 'selected' : ''}>🥁 Kick</option>
            <option value="snare" ${this.sound === 'snare' ? 'selected' : ''}>🥁 Snare</option>
            <option value="hihat" ${this.sound === 'hihat' ? 'selected' : ''}>🎵 Hi-Hat</option>
            <option value="perc" ${this.sound === 'perc' ? 'selected' : ''}>🎶 Perc</option>
            <option value="clap" ${this.sound === 'clap' ? 'selected' : ''}>👏 Clap</option>
            <option value="cymbal" ${this.sound === 'cymbal' ? 'selected' : ''}>🎵 Cymbal</option>
            <option value="tom" ${this.sound === 'tom' ? 'selected' : ''}>🥁 Tom</option>
            <option value="rim" ${this.sound === 'rim' ? 'selected' : ''}>🎵 Rim</option>
            <option value="cowbell" ${this.sound === 'cowbell' ? 'selected' : ''}>🔔 Cowbell</option>
            <option value="shaker" ${this.sound === 'shaker' ? 'selected' : ''}>🎶 Shaker</option>
            <option value="bass" ${this.sound === 'bass' ? 'selected' : ''}>🎸 Bass</option>
            <option value="random" ${this.sound === 'random' ? 'selected' : ''}>🎲 Random</option>
        `;

        // Add custom option if custom audio is loaded
        if (this.hasCustomAudio) {
            const fileName = this.getCustomAudioName();
            const displayName = fileName.length > 15 ? fileName.substring(0, 12) + '...' : fileName;
            options += `<option value="custom" ${this.sound === 'custom' ? 'selected' : ''}>🎤 ${displayName}</option>`;
        }

        return options;
    }

    styleSelectElement(select) {
        // Enhanced CSS styling for better appearance
        select.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)';
        select.style.border = '1px solid #555';
        select.style.borderRadius = '6px';
        select.style.color = '#e0e0e0';
        select.style.padding = '4px 8px';
        select.style.fontSize = '0.7em';
        select.style.width = '100%';
        select.style.textAlign = 'center';
        select.style.transition = 'all 0.3s ease';
        select.style.cursor = 'pointer';

        // Enhanced focus styling
        select.addEventListener('focus', () => {
            select.style.borderColor = '#00ff88';
            select.style.outline = 'none';
            select.style.background = 'linear-gradient(135deg, rgba(0, 255, 136, 0.15) 0%, rgba(0, 255, 136, 0.05) 100%)';
            select.style.boxShadow = '0 0 10px rgba(0, 255, 136, 0.3)';
        });

        select.addEventListener('blur', () => {
            select.style.borderColor = '#555';
            select.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)';
            select.style.boxShadow = 'none';
        });

        // Hover effect
        select.addEventListener('mouseenter', () => {
            if (document.activeElement !== select) {
                select.style.borderColor = '#777';
                select.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.08) 100%)';
            }
        });

        select.addEventListener('mouseleave', () => {
            if (document.activeElement !== select) {
                select.style.borderColor = '#555';
                select.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)';
            }
        });
    }

    async handleAudioUpload(file, soundEngine, select, uploadSection) {
        // Validate file type
        if (!file.type.startsWith('audio/')) {
            alert('Please select a valid audio file');
            return;
        }

        // Check file size (limit to 10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('File size must be less than 10MB');
            return;
        }

        try {
            // Show loading indicator
            this.showUploadProgress(uploadSection, 'Loading...');

            // Load audio using sound engine
            const audioBuffer = await soundEngine.loadCustomAudioFile(file);

            if (audioBuffer) {
                // Set custom audio in track
                this.setCustomAudio(file, audioBuffer);

                // CRITICAL: Register the custom audio with the sound engine for this track
                soundEngine.setTrackCustomAudio(this.index, audioBuffer);

                // Update select options
                select.innerHTML = this.createSoundOptions();
                select.value = 'custom';

                // Update upload section UI
                this.updateUploadSection(uploadSection, file);

                // Dispatch event to notify sequencer
                const event = new CustomEvent('audioUploaded', {
                    detail: { trackIndex: this.index, audioBuffer: audioBuffer }
                });
                uploadSection.dispatchEvent(event);

                console.log(`Audio uploaded and registered for track ${this.index}: ${file.name}`);
            } else {
                throw new Error('Failed to load audio file');
            }

        } catch (error) {
            console.error('Error uploading audio:', error);
            alert('Error uploading audio file. Please try a different file.');
            this.updateUploadSection(uploadSection, null);
        }
    }

    showUploadProgress(uploadSection, message) {
        const progressDiv = uploadSection.querySelector('.upload-progress') || document.createElement('div');
        progressDiv.className = 'upload-progress';
        progressDiv.textContent = message;
        progressDiv.style.fontSize = '0.6em';
        progressDiv.style.color = '#00ff88';
        progressDiv.style.textAlign = 'center';
        progressDiv.style.marginTop = '2px';

        if (!uploadSection.querySelector('.upload-progress')) {
            uploadSection.appendChild(progressDiv);
        }
    }

    updateUploadSection(uploadSection, file) {
        const uploadButton = uploadSection.querySelector('.upload-button');
        const clearButton = uploadSection.querySelector('.clear-button');
        const progressDiv = uploadSection.querySelector('.upload-progress');

        if (progressDiv) {
            progressDiv.remove();
        }

        if (file) {
            // Show custom audio is loaded
            uploadButton.innerHTML = '✅ Custom';
            uploadButton.style.background = 'linear-gradient(45deg, #4caf50, #388e3c)';
            uploadButton.title = `Custom audio: ${file.name}`;
            clearButton.style.display = 'inline-block';

            // Show file info
            const fileInfo = document.createElement('div');
            fileInfo.className = 'file-info';
            fileInfo.textContent = file.name.length > 12 ? file.name.substring(0, 9) + '...' : file.name;
            fileInfo.style.fontSize = '0.6em';
            fileInfo.style.color = '#4caf50';
            fileInfo.style.textAlign = 'center';
            fileInfo.style.marginTop = '1px';
            uploadSection.appendChild(fileInfo);

        } else {
            // Reset to default state
            uploadButton.innerHTML = '📁 Upload';
            uploadButton.style.background = '';
            uploadButton.title = 'Upload custom audio file';
            clearButton.style.display = 'none';

            // Remove file info
            const fileInfo = uploadSection.querySelector('.file-info');
            if (fileInfo) {
                fileInfo.remove();
            }
        }
    }

    // Existing methods remain the same...
    setPattern(pattern) {
        this.pattern = [...pattern];
    }

    getPattern() {
        return [...this.pattern];
    }

    toggleStep(stepIndex) {
        if (stepIndex >= 0 && stepIndex < this.pattern.length) {
            this.pattern[stepIndex] = !this.pattern[stepIndex];
            return this.pattern[stepIndex];
        }
        return false;
    }

    setStep(stepIndex, value) {
        if (stepIndex >= 0 && stepIndex < this.pattern.length) {
            this.pattern[stepIndex] = Boolean(value);
        }
    }

    isStepActive(stepIndex) {
        return stepIndex >= 0 && stepIndex < this.pattern.length && this.pattern[stepIndex];
    }

    clearPattern() {
        this.pattern.fill(false);
    }

    randomizePattern(probability = 0.25) {
        this.pattern = this.pattern.map(() => Math.random() < probability);
    }

    setSound(soundType) {
        this.sound = soundType;
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
    }

    setMuted(muted) {
        this.muted = Boolean(muted);
    }

    setSolo(solo) {
        this.solo = Boolean(solo);
    }

    // Enhanced serialization with custom audio support
    serialize() {
        return {
            index: this.index,
            name: this.name,
            color: this.color,
            sound: this.sound,
            pattern: [...this.pattern],
            volume: this.volume,
            muted: this.muted,
            solo: this.solo,
            customParameters: { ...this.customParameters },
            effects: { ...this.effects },
            pan: this.pan,
            reverb: this.reverb,
            delay: this.delay,
            filter: { ...this.filter },
            geographicZone: this.geographicZone,
            spatialWeight: this.spatialWeight,
            hasCustomAudio: this.hasCustomAudio,
            customAudioName: this.getCustomAudioName()
        };
    }

    static deserialize(data) {
        const track = new Track(data.index, data);
        // Note: Custom audio buffers cannot be serialized and would need to be re-uploaded
        return track;
    }

    getStatus() {
        const activeSteps = this.pattern.filter(step => step).length;
        return {
            name: this.name,
            sound: this.sound,
            activeSteps: activeSteps,
            totalSteps: this.pattern.length,
            volume: this.volume,
            muted: this.muted,
            solo: this.solo,
            geographicZone: this.geographicZone,
            hasCustomAudio: this.hasCustomAudio,
            customAudioName: this.getCustomAudioName()
        };
    }

    validate() {
        const errors = [];

        if (!this.name || this.name.trim() === '') {
            errors.push('Track name cannot be empty');
        }

        if (!this.color || !/^#[0-9A-F]{6}$/i.test(this.color)) {
            errors.push('Invalid color format');
        }

        if (this.volume < 0 || this.volume > 1) {
            errors.push('Volume must be between 0 and 1');
        }

        if (this.pan < -1 || this.pan > 1) {
            errors.push('Pan must be between -1 and 1');
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
}

// Export for use
window.Track = Track;