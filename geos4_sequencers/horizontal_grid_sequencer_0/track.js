/**
 * Track - Represents a sequencer track with sound and custom parameters
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

        // Track-specific audio effects and parameters
        this.effects = options.effects || {};
        this.pan = options.pan || 0; // -1 (left) to 1 (right)
        this.reverb = options.reverb || 0; // 0 to 1
        this.delay = options.delay || 0; // 0 to 1
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

    setPan(pan) {
        this.pan = Math.max(-1, Math.min(1, pan));
    }

    setReverb(reverb) {
        this.reverb = Math.max(0, Math.min(1, reverb));
    }

    setDelay(delay) {
        this.delay = Math.max(0, Math.min(1, delay));
    }

    setFilter(type, frequency, resonance) {
        this.filter = {
            type: type || 'none',
            frequency: Math.max(20, Math.min(20000, frequency || 1000)),
            resonance: Math.max(0.1, Math.min(100, resonance || 1))
        };
    }

    setGeographicZone(zone) {
        this.geographicZone = zone;
    }

    setSpatialWeight(weight) {
        this.spatialWeight = Math.max(0, Math.min(2, weight));
    }

    setCustomParameter(key, value) {
        this.customParameters[key] = value;
    }

    getCustomParameter(key, defaultValue = null) {
        return this.customParameters.hasOwnProperty(key) ? this.customParameters[key] : defaultValue;
    }

    // Get effective volume considering mute, solo states
    getEffectiveVolume(soloTracks = []) {
        if (this.muted) return 0;
        if (soloTracks.length > 0 && !this.solo) return 0;
        return this.volume * this.spatialWeight;
    }

    // Clone track for duplication
    clone(newIndex = null) {
        return new Track(newIndex !== null ? newIndex : this.index, {
            name: this.name + ' (Copy)',
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
            spatialWeight: this.spatialWeight
        });
    }

    // Serialize track for saving/loading
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
            spatialWeight: this.spatialWeight
        };
    }

    // Deserialize track from saved data
    static deserialize(data) {
        return new Track(data.index, data);
    }

    // Get track status information
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
            geographicZone: this.geographicZone
        };
    }

    // Validate track configuration
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