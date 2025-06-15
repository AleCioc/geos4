/**
 * SequencerCell - Represents a single cell in the sequencer grid with custom parameters
 */
class SequencerCell {
    constructor(track, step, options = {}) {
        this.track = track;
        this.step = step;
        this.active = options.active || false;
        this.velocity = options.velocity || 1.0;
        this.probability = options.probability || 1.0;
        this.customParameters = options.customParameters || {};

        // Visual properties
        this.color = options.color || null; // Override track color if set
        this.highlighted = false;
        this.playing = false;
        this.currentBeat = false;

        // Geographic properties
        this.geographicPoint = options.geographicPoint || null;
        this.spatialData = options.spatialData || {};

        // Timing properties
        this.microTiming = options.microTiming || 0; // -0.5 to 0.5 (swing/humanization)
        this.duration = options.duration || 1.0; // Relative to step duration

        // Audio properties
        this.pitch = options.pitch || 0; // Semitones offset
        this.gain = options.gain || 1.0; // Cell-specific gain multiplier
        this.effects = options.effects || {};

        // Conditional properties
        this.conditions = options.conditions || {}; // For conditional triggering
        this.triggers = options.triggers || []; // Multiple trigger conditions

        // DOM element reference
        this.element = null;
        this.created = false;
    }

    toggle() {
        this.active = !this.active;
        this.updateVisualState();
        return this.active;
    }

    setActive(active) {
        this.active = Boolean(active);
        this.updateVisualState();
    }

    isActive() {
        return this.active;
    }

    setVelocity(velocity) {
        this.velocity = Math.max(0, Math.min(1, velocity));
    }

    getVelocity() {
        return this.velocity;
    }

    setProbability(probability) {
        this.probability = Math.max(0, Math.min(1, probability));
    }

    getProbability() {
        return this.probability;
    }

    shouldTrigger() {
        if (!this.active) return false;
        return Math.random() <= this.probability;
    }

    setMicroTiming(timing) {
        this.microTiming = Math.max(-0.5, Math.min(0.5, timing));
    }

    getMicroTiming() {
        return this.microTiming;
    }

    setDuration(duration) {
        this.duration = Math.max(0.1, Math.min(4.0, duration));
    }

    getDuration() {
        return this.duration;
    }

    setPitch(pitch) {
        this.pitch = Math.max(-24, Math.min(24, pitch));
    }

    getPitch() {
        return this.pitch;
    }

    setGain(gain) {
        this.gain = Math.max(0, Math.min(2, gain));
    }

    getGain() {
        return this.gain;
    }

    setGeographicPoint(point) {
        this.geographicPoint = point;
        if (point) {
            this.spatialData = {
                latitude: point.latitude || point.lat,
                longitude: point.longitude || point.lng || point.lon,
                properties: point.properties || {}
            };
        }
    }

    getGeographicPoint() {
        return this.geographicPoint;
    }

    setSpatialData(data) {
        this.spatialData = { ...data };
    }

    getSpatialData() {
        return { ...this.spatialData };
    }

    setCustomParameter(key, value) {
        this.customParameters[key] = value;
    }

    getCustomParameter(key, defaultValue = null) {
        return this.customParameters.hasOwnProperty(key) ? this.customParameters[key] : defaultValue;
    }

    setCondition(type, condition) {
        this.conditions[type] = condition;
    }

    getCondition(type) {
        return this.conditions[type];
    }

    addTrigger(trigger) {
        this.triggers.push(trigger);
    }

    removeTrigger(index) {
        if (index >= 0 && index < this.triggers.length) {
            this.triggers.splice(index, 1);
        }
    }

    evaluateConditions(context = {}) {
        // Evaluate all conditions for conditional triggering
        for (const [type, condition] of Object.entries(this.conditions)) {
            if (!this.evaluateCondition(type, condition, context)) {
                return false;
            }
        }
        return true;
    }

    evaluateCondition(type, condition, context) {
        switch (type) {
            case 'probability':
                return Math.random() <= condition.value;
            case 'step_count':
                return context.stepCount ? (context.stepCount % condition.modulo) === condition.remainder : true;
            case 'geographic':
                return this.evaluateGeographicCondition(condition, context);
            case 'custom':
                return condition.evaluate ? condition.evaluate(this, context) : true;
            default:
                return true;
        }
    }

    evaluateGeographicCondition(condition, context) {
        if (!this.spatialData || !context.currentZoom) return true;

        const { latitude, longitude } = this.spatialData;
        const { min_lat, max_lat, min_lng, max_lng } = context.currentZoom;

        return (latitude >= min_lat && latitude <= max_lat &&
                longitude >= min_lng && longitude <= max_lng);
    }

    setHighlighted(highlighted) {
        this.highlighted = Boolean(highlighted);
        this.updateVisualState();
    }

    setPlaying(playing) {
        this.playing = Boolean(playing);
        this.updateVisualState();

        if (playing) {
            // Auto-remove playing state after animation
            setTimeout(() => {
                this.playing = false;
                this.updateVisualState();
            }, 100);
        }
    }

    setCurrentBeat(current) {
        this.currentBeat = Boolean(current);
        this.updateVisualState();
    }

    createElement(parentElement, trackColor) {
        if (this.created && this.element) return this.element;

        const cell = document.createElement('div');
        cell.className = 'sequencer-cell';
        cell.style.setProperty('--track-color', this.color || trackColor);
        cell.dataset.track = this.track;
        cell.dataset.step = this.step;

        // Add click listener
        cell.addEventListener('click', () => {
            this.toggle();
            // Emit custom event for cell interaction
            cell.dispatchEvent(new CustomEvent('cellToggled', {
                detail: { cell: this, track: this.track, step: this.step, active: this.active }
            }));
        });

        // Add right-click for cell properties
        cell.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            // Emit custom event for cell properties
            cell.dispatchEvent(new CustomEvent('cellProperties', {
                detail: { cell: this, track: this.track, step: this.step }
            }));
        });

        this.element = cell;
        this.created = true;

        if (parentElement) {
            parentElement.appendChild(cell);
        }

        this.updateVisualState();
        return cell;
    }

    updateVisualState() {
        if (!this.element) return;

        // Update CSS classes based on state
        this.element.classList.toggle('active', this.active);
        this.element.classList.toggle('highlighted', this.highlighted);
        this.element.classList.toggle('playing', this.playing);
        this.element.classList.toggle('current-beat', this.currentBeat);

        // Update visual indicators for special properties
        if (this.velocity !== 1.0) {
            this.element.classList.add('has-velocity');
            this.element.style.setProperty('--velocity', this.velocity);
        } else {
            this.element.classList.remove('has-velocity');
        }

        if (this.probability !== 1.0) {
            this.element.classList.add('has-probability');
            this.element.style.setProperty('--probability', this.probability);
        } else {
            this.element.classList.remove('has-probability');
        }

        if (this.microTiming !== 0) {
            this.element.classList.add('has-timing');
        } else {
            this.element.classList.remove('has-timing');
        }

        if (this.geographicPoint) {
            this.element.classList.add('has-geographic-data');
        } else {
            this.element.classList.remove('has-geographic-data');
        }
    }

    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        this.element = null;
        this.created = false;
    }

    clone() {
        return new SequencerCell(this.track, this.step, {
            active: this.active,
            velocity: this.velocity,
            probability: this.probability,
            customParameters: { ...this.customParameters },
            color: this.color,
            geographicPoint: this.geographicPoint ? { ...this.geographicPoint } : null,
            spatialData: { ...this.spatialData },
            microTiming: this.microTiming,
            duration: this.duration,
            pitch: this.pitch,
            gain: this.gain,
            effects: { ...this.effects },
            conditions: { ...this.conditions },
            triggers: [...this.triggers]
        });
    }

    serialize() {
        return {
            track: this.track,
            step: this.step,
            active: this.active,
            velocity: this.velocity,
            probability: this.probability,
            customParameters: { ...this.customParameters },
            color: this.color,
            geographicPoint: this.geographicPoint ? { ...this.geographicPoint } : null,
            spatialData: { ...this.spatialData },
            microTiming: this.microTiming,
            duration: this.duration,
            pitch: this.pitch,
            gain: this.gain,
            effects: { ...this.effects },
            conditions: { ...this.conditions },
            triggers: [...this.triggers]
        };
    }

    static deserialize(data) {
        return new SequencerCell(data.track, data.step, data);
    }

    getStatus() {
        return {
            track: this.track,
            step: this.step,
            active: this.active,
            velocity: this.velocity,
            probability: this.probability,
            hasGeographicData: !!this.geographicPoint,
            customParameters: Object.keys(this.customParameters).length
        };
    }

    validate() {
        const errors = [];

        if (typeof this.track !== 'number' || this.track < 0) {
            errors.push('Invalid track index');
        }

        if (typeof this.step !== 'number' || this.step < 0) {
            errors.push('Invalid step index');
        }

        if (this.velocity < 0 || this.velocity > 1) {
            errors.push('Velocity must be between 0 and 1');
        }

        if (this.probability < 0 || this.probability > 1) {
            errors.push('Probability must be between 0 and 1');
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
}

// Export for use
window.SequencerCell = SequencerCell;