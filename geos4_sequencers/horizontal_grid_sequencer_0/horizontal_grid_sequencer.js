/**
 * Complete Enhanced GeoJSONHorizontalGridSequencer with Recording, Upload, and All Features
 * Professional geographic sequencer with full functionality
 */
class GeoJSONHorizontalGridSequencer {
    constructor(options = {}) {
        this.type = 'horizontal_grid';
        this.canvas = document.getElementById('mapCanvas');
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.isPlaying = false;
        this.currentBeat = 0;
        this.bpm = options.bpm || 120;
        this.playInterval = null;
        this.manualClickMuted = false;

        // Grid configuration
        this.gridCols = options.gridCols || 16;
        this.gridRows = options.gridRows || 4;

        // Single layer mode (always true now)
        this.singleLayerMode = true;
        this.currentLayer = null;
        this.manualMode = true; // Start in manual mode by default

        // Tracks and cells for the sequencer
        this.tracks = [];
        this.cells = [];

        // Geographic data and visualization (optional)
        this.geoData = null;
        this.cityBoundsData = null;
        this.gridBounds = null;
        this.persistentPointMarkers = [];

        // Grid coherence data - maintains point mapping consistency
        this.originalPointMapping = new Map(); // Maps geographic points to normalized grid positions (0-1)
        this.activeGeographicCells = new Set(); // Tracks which normalized positions have active cells

        // Enhanced audio engine with recording and upload support
        this.soundEngine = options.soundEngine || new window.GeoS4SoundEngine();
        this.isAudioInitialized = false;

        // Initialize sequencer components (works without geographic data)
        this.initializeTracks();
        this.initializeCells();
        this.createSequencerGrid();
        this.createEnhancedTrackControls();

        // Initialize canvas if available
        if (this.canvas) {
            this.resizeCanvas();
            window.addEventListener('resize', () => this.resizeCanvas());
        }

        // Set initial mode display
        this.updateModeDisplay();

        console.log('Enhanced sequencer initialized - ready for manual or layer mode');
    }

    // === ENHANCED PLAYBACK METHODS WITH COLUMN-WIDE BLINKING ===

    step() {
        this.clearBeatHighlights();

        // Process each track for the current beat
        this.tracks.forEach(async (track, trackIndex) => {
            if (this.cells[trackIndex] && this.cells[trackIndex][this.currentBeat]) {
                const cell = this.cells[trackIndex][this.currentBeat];
                cell.setCurrentBeat(true);

                if (track.isStepActive(this.currentBeat)) {
                    cell.setPlaying(true);

                    // Enhanced sound playback with custom audio support
                    await this.playTrackSound(trackIndex, false);

                    // CELL-LEVEL: Highlight points directly associated with this active cell
                    this.highlightCellPoints(cell);
                }
            }
        });

        this.currentBeat = (this.currentBeat + 1) % this.gridCols;
    }

    /**
     * Enhanced cell-level point highlighting with custom audio support
     */
    highlightCellPoints(cell) {
        try {
            if (!cell.geographicPointIndices || cell.geographicPointIndices.length === 0) {
                return;
            }

            let highlightedCount = 0;

            // Highlight each point stored in this cell
            cell.geographicPointIndices.forEach(pointIndex => {
                if (this.persistentPointMarkers[pointIndex]) {
                    this.persistentPointMarkers[pointIndex].classList.add('highlighted');
                    highlightedCount++;

                    // Remove highlight after animation
                    setTimeout(() => {
                        if (this.persistentPointMarkers[pointIndex]) {
                            this.persistentPointMarkers[pointIndex].classList.remove('highlighted');
                        }
                    }, 300);
                }
            });

            console.log(`Cell [${cell.track},${cell.step}]: Highlighted ${highlightedCount} points`);

        } catch (error) {
            console.warn('Error highlighting cell points:', error);
        }
    }

    // === ENHANCED AUDIO PLAYBACK ===

    async playTrackSound(trackIndex, isClick = false) {
        if (!this.isAudioInitialized) {
            await this.initializeAudio();
        }

        if (trackIndex >= 0 && trackIndex < this.tracks.length) {
            const track = this.tracks[trackIndex];
            await this.soundEngine.playTrackSound(
                trackIndex,
                track.sound,
                isClick,
                track.volume
            );
        }
    }

    async initializeAudio() {
        if (this.isAudioInitialized) return true;

        try {
            const success = await this.soundEngine.initializeAudio();
            this.isAudioInitialized = success;

            if (success) {
                console.log('Enhanced audio system initialized with recording and upload support');
            }

            return success;
        } catch (error) {
            console.error('Failed to initialize enhanced audio:', error);
            return false;
        }
    }

    // === GRID COHERENCE METHODS ===

    /**
     * Store original point mappings in normalized coordinates (0-1)
     * This ensures points maintain their relative positions when grid changes
     */
    storeOriginalPointMapping(activeCells) {
        this.originalPointMapping.clear();
        this.activeGeographicCells.clear();

        if (!activeCells || !this.gridBounds) return;

        activeCells.forEach(cellData => {
            const { track, step, point_lat, point_lng } = cellData;

            // Convert to normalized grid coordinates (0-1)
            const normalizedX = step / this.gridCols;
            const normalizedY = track / this.gridRows;

            // Store the mapping with geographic coordinates
            const pointKey = `${point_lat},${point_lng}`;
            this.originalPointMapping.set(pointKey, {
                normalizedX,
                normalizedY,
                lat: point_lat,
                lng: point_lng,
                originalTrack: track,
                originalStep: step
            });

            // Mark this normalized position as active
            this.activeGeographicCells.add(`${normalizedX},${normalizedY}`);
        });

        console.log(`Stored ${this.originalPointMapping.size} original point mappings`);
    }

    /**
     * Remap stored points to new grid dimensions while maintaining coherence
     */
    remapPointsToNewGrid(newCols, newRows) {
        if (this.originalPointMapping.size === 0) {
            console.log('No original point mapping available - using standard grid update');
            return;
        }

        // Clear current pattern
        this.clearPattern();

        // Remap each stored point to new grid
        this.originalPointMapping.forEach((mapping, pointKey) => {
            const { normalizedX, normalizedY } = mapping;

            // Convert normalized coordinates to new grid coordinates
            const newStep = Math.floor(normalizedX * newCols);
            const newTrack = Math.floor(normalizedY * newRows);

            // Ensure coordinates are within bounds
            const clampedStep = Math.min(newStep, newCols - 1);
            const clampedTrack = Math.min(newTrack, newRows - 1);

            // Activate the cell in the new grid
            if (clampedTrack < this.tracks.length && clampedStep < this.tracks[clampedTrack].pattern.length) {
                this.tracks[clampedTrack].setStep(clampedStep, true);
                if (this.cells[clampedTrack] && this.cells[clampedTrack][clampedStep]) {
                    this.cells[clampedTrack][clampedStep].setActive(true);
                }
            }
        });

        console.log(`Remapped ${this.originalPointMapping.size} points to new grid ${newCols}x${newRows}`);
        this.updateSequencerDisplay();
    }

    // === ENHANCED GRID DIMENSION UPDATE WITH GEOGRAPHIC REMAPPING ===
    updateGridDimensions(newCols, newRows) {
        if (newCols === this.gridCols && newRows === this.gridRows) return;

        const oldCols = this.gridCols;
        const oldRows = this.gridRows;

        this.gridCols = newCols;
        this.gridRows = newRows;

        // Update tracks array with proper audio handling
        const trackColors = [
            '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4',
            '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd',
            '#00d2d3', '#ff9f43', '#10ac84', '#ee5a24'
        ];
        const trackSounds = ['kick', 'snare', 'hihat', 'perc', 'clap', 'cymbal', 'tom', 'rim'];

        // Add new tracks if needed
        while (this.tracks.length < this.gridRows) {
            const track = new Track(this.tracks.length, {
                name: `Track ${this.tracks.length + 1}`,
                color: trackColors[this.tracks.length % trackColors.length],
                pattern: new Array(this.gridCols).fill(false),
                sound: trackSounds[this.tracks.length % trackSounds.length]
            });
            this.tracks.push(track);
        }

        // Remove tracks if needed (and clear their custom audio)
        while (this.tracks.length > this.gridRows) {
            const removedTrack = this.tracks.pop();
            if (removedTrack.hasCustomAudio) {
                this.soundEngine.clearTrackCustomAudio(removedTrack.index);
            }
        }

        // Adjust pattern lengths for all tracks
        this.tracks.forEach(track => {
            if (track.pattern.length < this.gridCols) {
                // Extend pattern
                const extension = new Array(this.gridCols - track.pattern.length).fill(false);
                track.pattern = track.pattern.concat(extension);
            } else if (track.pattern.length > this.gridCols) {
                // Truncate pattern
                track.pattern = track.pattern.slice(0, this.gridCols);
            }
        });

        // Recreate cells
        this.initializeCells();

        // CRITICAL: Reprocess geographic points with new grid dimensions FIRST
        this.reprocessPointsWithNewGrid();

        // Then update UI
        this.createSequencerGrid();
        this.createEnhancedTrackControls();

        console.log(`Grid updated from ${oldCols}x${oldRows} to ${newCols}x${newRows} - Geographic points remapped`);
    }

    reprocessPointsWithNewGrid() {
        if (!this.geoData || !this.gridBounds) {
            console.log('No geographic data available for remapping');
            return;
        }

        console.log(`Remapping ${this.geoData.features.length} geographic points to new ${this.gridCols}x${this.gridRows} grid`);

        // Clear ALL current patterns and cell point references
        this.tracks.forEach(track => {
            track.pattern.fill(false);
        });

        // Clear geographic point references from all cells
        this.cells.forEach(row => {
            row.forEach(cell => {
                cell.geographicPointIndices = [];
            });
        });

        // Get original geographic bounds (not grid-dependent)
        const { minLng, maxLng, minLat, maxLat } = this.gridBounds;

        // Recalculate grid steps with new dimensions
        const lng_step = (maxLng - minLng) / this.gridCols;
        const lat_step = (maxLat - minLat) / this.gridRows;

        // Update grid bounds with new step sizes
        this.gridBounds.lng_step = lng_step;
        this.gridBounds.lat_step = lat_step;
        this.gridBounds.num_steps = this.gridCols;
        this.gridBounds.num_tracks = this.gridRows;

        let remappedPoints = 0;

        // Reprocess each geographic point and assign to cells
        this.geoData.features.forEach((feature, pointIndex) => {
            const [lng, lat] = feature.geometry.coordinates;

            // Map longitude to step (0 to gridCols-1)
            let step_index = Math.floor((lng - minLng) / lng_step);
            step_index = Math.max(0, Math.min(step_index, this.gridCols - 1));

            // Map latitude to track (0 to gridRows-1) - invert mapping for proper orientation
            let track_index = this.gridRows - 1 - Math.floor((lat - minLat) / lat_step);
            track_index = Math.max(0, Math.min(track_index, this.gridRows - 1));

            // Activate the corresponding cell and store point reference
            if (step_index >= 0 && step_index < this.gridCols &&
                track_index >= 0 && track_index < this.gridRows) {

                // Set pattern in track
                this.tracks[track_index].pattern[step_index] = true;

                // Set cell active state and store geographic point reference
                if (this.cells[track_index] && this.cells[track_index][step_index]) {
                    this.cells[track_index][step_index].setActive(true);

                    // CRITICAL: Store the point index in the cell
                    if (!this.cells[track_index][step_index].geographicPointIndices) {
                        this.cells[track_index][step_index].geographicPointIndices = [];
                    }
                    this.cells[track_index][step_index].geographicPointIndices.push(pointIndex);
                }

                remappedPoints++;
            }
        });

        // Update the visual display
        this.updateSequencerDisplay();

        console.log(`Successfully remapped ${remappedPoints} points to new grid dimensions`);
        console.log('Geographic point references stored in cells');
    }

    // === SINGLE LAYER MODE METHODS ===
    setSingleLayerMode(enabled) {
        this.singleLayerMode = enabled;
        this.updateModeDisplay();
        console.log(`Single layer mode: ${enabled ? 'enabled' : 'disabled'}`);
    }

    loadSingleLayerData(layerData) {
        console.log('Loading single layer data:', layerData.name);
        this.currentLayer = layerData;

        // Load geographic data FIRST
        this.geoData = layerData.geojson_data;
        this.cityBoundsData = layerData.city_bounds_data;

        // Set grid bounds to maximum city bounds (always)
        if (layerData.active_cells_data && layerData.active_cells_data.grid_bounds) {
            this.gridBounds = layerData.active_cells_data.grid_bounds;
            console.log('Grid bounds loaded:', this.gridBounds);
        }

        // Update grid dimensions if specified
        if (layerData.grid_config) {
            this.updateGridDimensions(
                layerData.grid_config.num_steps || 16,
                layerData.grid_config.num_tracks || 4
            );
        }

        // Load active cells pattern (this will trigger geographic remapping)
        if (layerData.active_cells_data && layerData.active_cells_data.active_cells) {
            this.loadActiveCellsPattern(layerData.active_cells_data.active_cells);
        }

        // Update visualization
        this.drawMap();
        this.createPersistentPointMarkers();
        this.updateModeDisplay();

        console.log('Single layer loaded successfully with enhanced features');
        return this.currentLayer;
    }

    loadActiveCellsPattern(activeCells) {
        console.log('Loading active cells pattern with geographic data');

        // Clear current pattern
        this.clearPattern();

        // If we have geographic data, use remapping instead of direct cell loading
        if (this.geoData && this.gridBounds) {
            console.log('Using geographic remapping for pattern loading');
            this.reprocessPointsWithNewGrid();
        } else {
            console.log('Using direct cell mapping for pattern loading');
            // Fallback: Apply active cells directly to tracks
            activeCells.forEach(cellData => {
                const { track, step } = cellData;
                if (track >= 0 && track < this.gridRows && step >= 0 && step < this.gridCols) {
                    this.tracks[track].setStep(step, true);
                    this.cells[track][step].setActive(true);
                    // Initialize point storage for fallback cells
                    if (!this.cells[track][step].geographicPointIndices) {
                        this.cells[track][step].geographicPointIndices = [];
                    }
                }
            });
        }

        this.updateSequencerDisplay();
        this.manualMode = false;
    }

    updateModeDisplay() {
        // Update UI to show current mode
        const modeIndicators = document.querySelectorAll('.mode-indicator');
        modeIndicators.forEach(indicator => {
            if (this.currentLayer) {
                indicator.textContent = 'LAYER';
                indicator.style.color = '#00ff88';
            } else {
                indicator.textContent = 'MANUAL';
                indicator.style.color = '#ff9800';
            }
        });

        // Update layer info display
        const layerInfo = document.getElementById('layerInfo');
        if (layerInfo) {
            if (this.currentLayer) {
                layerInfo.textContent = `Layer Mode: ${this.currentLayer.name}`;
                layerInfo.style.color = '#00ff88';
            } else {
                layerInfo.textContent = `Manual Mode (${this.gridCols} × ${this.gridRows}) - Ready to Create`;
                layerInfo.style.color = '#ff9800';
            }
        }
    }

    // === ENHANCED TRACK AND CELL MANAGEMENT ===
    initializeTracks() {
        this.tracks = [];
        const trackColors = [
            '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4',
            '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd',
            '#00d2d3', '#ff9f43', '#10ac84', '#ee5a24'
        ];
        const trackSounds = ['kick', 'snare', 'hihat', 'perc', 'clap', 'cymbal', 'tom', 'rim'];

        for (let i = 0; i < this.gridRows; i++) {
            const track = new Track(i, {
                name: `Track ${i + 1}`,
                color: trackColors[i % trackColors.length],
                pattern: new Array(this.gridCols).fill(false),
                sound: trackSounds[i % trackSounds.length]
            });
            this.tracks.push(track);
        }
    }

    initializeCells() {
        this.cells = [];
        for (let row = 0; row < this.gridRows; row++) {
            const cellRow = [];
            for (let col = 0; col < this.gridCols; col++) {
                const cell = new SequencerCell(row, col);
                // Initialize geographic point storage
                cell.geographicPointIndices = [];
                cellRow.push(cell);
            }
            this.cells.push(cellRow);
        }
    }

    // === ENHANCED TRACK CONTROLS WITH UPLOAD ===
    createEnhancedTrackControls() {
        const container = document.getElementById('trackControls');
        if (!container) return;

        container.innerHTML = '';

        this.tracks.forEach((track, index) => {
            // Use the enhanced Track.createTrackControl method
            const control = track.createTrackControl(container, this.soundEngine);

            // Additional sequencer-specific event handling
            this.setupTrackControlEvents(control, track, index);
        });

        console.log('Enhanced track controls created with upload functionality');
    }

    setupTrackControlEvents(control, track, index) {
        // Handle sound changes
        const select = control.querySelector('.enhanced-select');
        if (select) {
            select.addEventListener('change', (e) => {
                console.log(`Track ${index} sound changed to: ${e.target.value}`);

                // If custom audio was selected and uploaded, ensure it's registered
                if (e.target.value === 'custom' && track.hasCustomAudio && track.customAudioBuffer) {
                    this.soundEngine.setTrackCustomAudio(index, track.customAudioBuffer);
                    console.log(`Custom audio registered for playback on track ${index}`);
                }
            });
        }

        // Handle custom audio upload completion
        control.addEventListener('audioUploaded', (e) => {
            const { trackIndex, audioBuffer } = e.detail;
            console.log(`Custom audio upload event received for track ${trackIndex}`);

            // Ensure the sound engine has the audio buffer
            this.soundEngine.setTrackCustomAudio(trackIndex, audioBuffer);

            // Update the track's sound to custom
            this.tracks[trackIndex].setSound('custom');

            console.log(`Custom audio fully integrated for track ${trackIndex}`);
        });

        // Handle custom audio clearing
        control.addEventListener('audioCleared', (e) => {
            const { trackIndex } = e.detail;
            this.soundEngine.clearTrackCustomAudio(trackIndex);
            console.log(`Custom audio cleared for track ${trackIndex}`);
        });
    }

    createSequencerGrid() {
        const grid = document.getElementById('sequencerGrid');
        if (!grid) return;

        grid.innerHTML = '';

        grid.style.gridTemplateColumns = `repeat(${this.gridCols}, 1fr)`;
        grid.style.gridTemplateRows = `repeat(${this.gridRows}, 1fr)`;

        for (let row = 0; row < this.gridRows; row++) {
            for (let col = 0; col < this.gridCols; col++) {
                if (this.cells[row] && this.cells[row][col]) {
                    const cell = this.cells[row][col];
                    const cellElement = cell.createElement(grid, this.tracks[row].color);

                    cellElement.addEventListener('cellToggled', async (e) => {
                        const { track, step, active } = e.detail;

                        // Allow manual editing in any mode
                        this.tracks[track].setStep(step, active);

                        // Enhanced manual click with upload support (always works)
                        if (this.isAudioInitialized && active && !this.manualClickMuted) {
                            await this.playTrackSound(track, true);
                        }

                        // Switch to manual mode only if we had layer data before
                        if (this.currentLayer && !this.manualMode) {
                            this.manualMode = true;
                            this.updateModeDisplay();
                            console.log('Switched to manual mode due to manual editing');
                        }
                    });
                }
            }
        }
    }

    toggleStep(trackIndex, stepIndex) {
        if (trackIndex >= 0 && trackIndex < this.gridRows &&
            stepIndex >= 0 && stepIndex < this.gridCols) {

            const newState = this.tracks[trackIndex].toggleStep(stepIndex);
            this.cells[trackIndex][stepIndex].setActive(newState);

            // Enhanced manual click with volume control (always works)
            if (this.isAudioInitialized && newState && !this.manualClickMuted) {
                this.playTrackSound(trackIndex, true);
            }

            // Switch to manual mode only if we had layer data before
            if (this.currentLayer && !this.manualMode) {
                this.manualMode = true;
                this.updateModeDisplay();
                console.log('Switched to manual mode due to manual editing');
            }

            return newState;
        }
        return false;
    }

    updateSequencerDisplay() {
        for (let row = 0; row < this.gridRows; row++) {
            for (let col = 0; col < this.gridCols; col++) {
                if (this.cells[row] && this.cells[row][col]) {
                    const isActive = this.tracks[row].isStepActive(col);
                    this.cells[row][col].setActive(isActive);
                }
            }
        }
    }

    // === ENHANCED PLAYBACK METHODS ===
    play() {
        // Always allow playback - sequencer can work without geographic data
        this.isPlaying = true;
        const playButton = document.getElementById('playButton');
        if (playButton) {
            playButton.textContent = '⏸ Pause';
            playButton.classList.add('active');
        }

        const interval = (60 / this.bpm / 4) * 1000;
        this.playInterval = setInterval(() => {
            this.step();
        }, interval);

        // Log current mode for debugging
        if (!this.geoData && !this.cityBoundsData && !this.currentLayer) {
            console.log('Playing in manual mode - no geographic data loaded');
        } else {
            console.log('Playing with geographic data');
        }
    }

    pause() {
        this.isPlaying = false;
        const playButton = document.getElementById('playButton');
        if (playButton) {
            playButton.textContent = '▶ Play';
            playButton.classList.remove('active');
        }

        if (this.playInterval) {
            clearInterval(this.playInterval);
            this.playInterval = null;
        }

        this.clearBeatHighlights();
    }

    stop() {
        this.isPlaying = false;
        const playButton = document.getElementById('playButton');
        if (playButton) {
            playButton.textContent = '▶ Play';
            playButton.classList.remove('active');
        }

        if (this.playInterval) {
            clearInterval(this.playInterval);
            this.playInterval = null;
        }

        this.currentBeat = 0;
        this.clearBeatHighlights();
    }

    updatePlaybackTiming() {
        if (!this.isPlaying) return;

        if (this.playInterval) {
            clearInterval(this.playInterval);
        }

        const interval = (60 / this.bpm / 4) * 1000;
        this.playInterval = setInterval(() => {
            this.step();
        }, interval);
    }

    clearBeatHighlights() {
        this.cells.forEach(row => {
            row.forEach(cell => {
                cell.setCurrentBeat(false);
                cell.setPlaying(false);
            });
        });

        // Also clear point highlights
        this.persistentPointMarkers.forEach(marker => {
            marker.classList.remove('highlighted');
        });
    }

    togglePlayback() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    // === ENHANCED RANDOMIZATION ===
    randomizeSounds() {
        const allSounds = ['kick', 'snare', 'hihat', 'perc', 'clap', 'cymbal', 'tom', 'rim', 'cowbell', 'shaker', 'bass', 'random'];

        this.tracks.forEach((track, index) => {
            // Don't randomize tracks that have custom audio unless explicitly requested
            if (!track.hasCustomAudio) {
                const randomSound = allSounds[Math.floor(Math.random() * allSounds.length)];
                track.setSound(randomSound);
            }
        });

        // Recreate track controls to reflect changes
        this.createEnhancedTrackControls();
        console.log('Randomized track sounds (preserved custom audio)');
    }

    randomizePattern() {
        // Create a random pattern regardless of geographic data
        const activeRatio = 0.25; // 25% chance for each cell

        this.tracks.forEach((track, trackIndex) => {
            track.pattern = track.pattern.map(() => Math.random() < activeRatio);
        });

        this.updateSequencerDisplay();

        // We're in manual mode when randomizing manually
        if (this.currentLayer) {
            this.manualMode = true;
            this.updateModeDisplay();
        }

        console.log('Pattern randomized - ready for playback');
    }

    clearPattern() {
        this.tracks.forEach(track => track.clearPattern());
        this.cells.forEach(row => row.forEach(cell => cell.setActive(false)));

        // We're always in manual mode when clearing manually
        if (this.currentLayer) {
            this.manualMode = true;
            this.updateModeDisplay();
        }

        console.log('Pattern cleared - ready for manual creation');
    }

    // === RECORDING METHODS ===
    async startRecording() {
        if (!this.isAudioInitialized) {
            await this.initializeAudio();
        }

        return await this.soundEngine.startRecording();
    }

    stopRecording() {
        return this.soundEngine.stopRecording();
    }

    getRecordingStatus() {
        return this.soundEngine.getRecordingStatus();
    }

    // === MANUAL MODE BACKGROUND ===
    drawManualModeBackground() {
        if (!this.canvas || !this.ctx) return;

        try {
            const { width, height } = this.canvas;

            // Draw a subtle grid pattern for manual mode
            this.ctx.save();
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
            this.ctx.lineWidth = 1;

            // Vertical lines based on grid columns
            const colWidth = width / this.gridCols;
            for (let i = 0; i <= this.gridCols; i++) {
                const x = i * colWidth;
                this.ctx.beginPath();
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, height);
                this.ctx.stroke();
            }

            // Horizontal lines based on grid rows
            const rowHeight = height / this.gridRows;
            for (let i = 0; i <= this.gridRows; i++) {
                const y = i * rowHeight;
                this.ctx.beginPath();
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(width, y);
                this.ctx.stroke();
            }

            // Add a subtle center indicator
            this.ctx.fillStyle = 'rgba(0, 255, 136, 0.1)';
            this.ctx.beginPath();
            this.ctx.arc(width / 2, height / 2, 50, 0, 2 * Math.PI);
            this.ctx.fill();

            // Add text indicating manual mode
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            this.ctx.font = '16px Courier New';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Manual Mode - Click cells to create patterns', width / 2, height / 2 + 80);

            this.ctx.restore();
        } catch (error) {
            console.warn('Error drawing manual mode background:', error);
        }
    }
    // === VISUALIZATION METHODS ===
    drawMap() {
        if (!this.canvas || !this.ctx) {
            console.warn('Canvas not available for drawing');
            return;
        }

        const { width, height } = this.canvas;
        this.ctx.clearRect(0, 0, width, height);

        // Background
        this.ctx.fillStyle = 'rgba(26, 26, 46, 0.3)';
        this.ctx.fillRect(0, 0, width, height);

        // Only draw geographic data if we have it
        if (this.geoData || this.cityBoundsData) {
            // Draw city boundaries if available
            if (this.cityBoundsData && this.gridBounds) {
                this.drawCityBoundaries();
            }

            // Draw ALL points if available (no filtering)
            if (this.geoData && this.gridBounds) {
                this.drawAllPoints();
            }
        } else {
            // Draw manual mode background
            this.drawManualModeBackground();
        }
    }

    drawCityBoundaries() {
        if (!this.cityBoundsData || !this.gridBounds) return;

        this.ctx.save();

        try {
            this.cityBoundsData.features.forEach(feature => {
                const geometry = feature.geometry;

                if (geometry.type === 'Polygon') {
                    this.drawPolygon(geometry.coordinates);
                } else if (geometry.type === 'MultiPolygon') {
                    geometry.coordinates.forEach(polygon => {
                        this.drawPolygon(polygon);
                    });
                }
            });
        } catch (error) {
            console.warn('Error drawing city boundaries:', error);
        }

        this.ctx.restore();
    }

    drawAllPoints() {
        if (!this.geoData) return;

        try {
            // Draw ALL points (no filtering for maximum bounds)
            this.geoData.features.forEach(feature => {
                const [lng, lat] = feature.geometry.coordinates;
                const { x, y } = this.coordsToPixel(lng, lat);

                this.ctx.beginPath();
                this.ctx.arc(x, y, 2.5, 0, 2 * Math.PI);
                this.ctx.fillStyle = '#ffffff';
                this.ctx.fill();
                this.ctx.strokeStyle = '#00ff88';
                this.ctx.lineWidth = 0.8;
                this.ctx.stroke();
            });
        } catch (error) {
            console.warn('Error drawing points:', error);
        }
    }

    drawPolygon(coordinates) {
        try {
            // Draw exterior ring
            if (coordinates.length > 0) {
                this.drawRing(coordinates[0]);
            }

            // Draw holes (interior rings) if they exist
            for (let i = 1; i < coordinates.length; i++) {
                this.drawRing(coordinates[i], true);
            }
        } catch (error) {
            console.warn('Error drawing polygon:', error);
        }
    }

    drawRing(ring, isHole = false) {
        if (ring.length < 3) return;

        try {
            this.ctx.beginPath();

            const firstPoint = this.coordsToPixel(ring[0][0], ring[0][1]);
            this.ctx.moveTo(firstPoint.x, firstPoint.y);

            for (let i = 1; i < ring.length; i++) {
                const point = this.coordsToPixel(ring[i][0], ring[i][1]);
                this.ctx.lineTo(point.x, point.y);
            }

            this.ctx.closePath();

            // Style for city boundaries
            if (!isHole) {
                this.ctx.fillStyle = 'rgba(0, 119, 204, 0.1)';
                this.ctx.fill();
            }

            this.ctx.strokeStyle = '#007acc';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        } catch (error) {
            console.warn('Error drawing ring:', error);
        }
    }

    coordsToPixel(lng, lat) {
        if (!this.gridBounds || !this.canvas) return { x: 0, y: 0 };

        try {
            const { width, height } = this.canvas;
            const { minLng, maxLng, minLat, maxLat } = this.gridBounds;

            const x = ((lng - minLng) / (maxLng - minLng)) * width;
            const y = height - ((lat - minLat) / (maxLat - minLat)) * height;

            return { x, y };
        } catch (error) {
            console.warn('Error converting coordinates to pixels:', error);
            return { x: 0, y: 0 };
        }
    }

    // === POINT MARKERS ===
    createPersistentPointMarkers() {
        // Clear existing markers
        this.persistentPointMarkers.forEach(marker => {
            if (marker.parentElement) {
                marker.parentElement.removeChild(marker);
            }
        });
        this.persistentPointMarkers = [];

        // Only create markers if we have geographic data
        if (this.geoData && this.gridBounds && this.canvas) {
            try {
                this.geoData.features.forEach(feature => {
                    const [lng, lat] = feature.geometry.coordinates;
                    const { x, y } = this.coordsToPixel(lng, lat);

                    const marker = document.createElement('div');
                    marker.className = 'point-marker';
                    marker.style.left = `${x}px`;
                    marker.style.top = `${y}px`;

                    this.canvas.parentElement.appendChild(marker);
                    this.persistentPointMarkers.push(marker);
                });

                console.log(`Created ${this.persistentPointMarkers.length} point markers`);
            } catch (error) {
                console.warn('Error creating markers:', error);
            }
        } else {
            console.log('No geographic data - running in manual mode without point markers');
        }
    }

    resizeCanvas() {
        if (!this.canvas) {
            // No canvas available - sequencer works without it
            console.log('No canvas available - sequencer running in manual mode');
            return;
        }

        try {
            const container = this.canvas.parentElement;
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;

            // Only draw if we have geographic data
            if (this.geoData || this.cityBoundsData) {
                this.drawMap();
                this.createPersistentPointMarkers();
            } else {
                // Clear canvas for manual mode
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.fillStyle = 'rgba(26, 26, 46, 0.3)';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

                // Add a subtle grid or pattern for visual interest
                this.drawManualModeBackground();
            }
        } catch (error) {
            console.warn('Error resizing canvas:', error);
        }
    }

    // === LEGACY SUPPORT METHODS ===
    loadLayerData(layerData) {
        return this.loadSingleLayerData(layerData);
    }

    loadGeoJSONData(geoJsonData) {
        this.geoData = geoJsonData;
        this.drawMap();
        this.createPersistentPointMarkers();
    }

    loadCityBoundsData(cityBoundsData) {
        this.cityBoundsData = cityBoundsData;
        this.drawMap();
    }

    loadActiveCellsData(activeCellsData) {
        if (activeCellsData && activeCellsData.active_cells) {
            // Store original mapping before loading
            this.storeOriginalPointMapping(activeCellsData.active_cells);
            this.loadActiveCellsPattern(activeCellsData.active_cells);

            if (activeCellsData.grid_bounds) {
                this.gridBounds = activeCellsData.grid_bounds;
                this.drawMap();
                this.createPersistentPointMarkers();
            }
        }
    }

    async loadCustomAudioFiles(customAudioFiles) {
        if (this.soundEngine && typeof this.soundEngine.loadCustomAudioFiles === 'function') {
            return await this.soundEngine.loadCustomAudioFiles(customAudioFiles);
        }
    }

    // === ENHANCED SERIALIZATION ===
    serialize() {
        return {
            type: this.type,
            gridCols: this.gridCols,
            gridRows: this.gridRows,
            currentLayer: this.currentLayer,
            tracks: this.tracks.map(track => track.serialize()),
            cells: this.cells.map(row => row.map(cell => cell.serialize())),
            geoData: this.geoData,
            cityBoundsData: this.cityBoundsData,
            gridBounds: this.gridBounds,
            manualMode: this.manualMode,
            recordingSupported: this.getRecordingStatus().isSupported
        };
    }

    // === UTILITY METHODS ===
    getTrackCustomAudioStatus() {
        return this.tracks.map(track => ({
            index: track.index,
            hasCustomAudio: track.hasCustomAudio,
            customAudioName: track.getCustomAudioName()
        }));
    }

    // === ENHANCED CLEANUP ===
    destroy() {
        if (this.playInterval) {
            clearInterval(this.playInterval);
        }

        // Destroy all cells
        this.cells.forEach(row => {
            row.forEach(cell => cell.destroy());
        });

        // Clean up markers
        this.persistentPointMarkers.forEach(marker => {
            if (marker.parentElement) {
                marker.parentElement.removeChild(marker);
            }
        });
        this.persistentPointMarkers = [];

        // Clear mappings
        this.originalPointMapping.clear();
        this.activeGeographicCells.clear();

        // Enhanced sound engine cleanup
        if (this.soundEngine) {
            this.soundEngine.destroy();
        }

        console.log('Enhanced sequencer destroyed');
    }

    // === PLACEHOLDER METHODS FOR MULTIPLE LAYER COMPATIBILITY ===
    getAllLayers() {
        return [];
    }

    getActiveLayers() {
        return this.currentLayer ? [this.currentLayer] : [];
    }

    setSequencerMode(mode, selectedLayerId = null) {
        console.log('⚠️ Multiple sequencer modes not implemented. Running in single layer mode.');
    }

    setLayerProcessingMode(mode) {
        console.log('⚠️ Layer processing modes not implemented. Using single layer.');
    }

    updateSequencerFromLayers() {
        console.log('⚠️ Multiple layer updates not implemented.');
        this.updateSequencerDisplay();
    }

    // === GETTERS ===
    get isPlaying() {
        return this._isPlaying || false;
    }

    set isPlaying(value) {
        this._isPlaying = value;
    }

    get bpm() {
        return this._bpm || 120;
    }

    set bpm(value) {
        this._bpm = value;
    }

    get gridCols() {
        return this._gridCols || 16;
    }

    set gridCols(value) {
        this._gridCols = value;
    }

    get gridRows() {
        return this._gridRows || 4;
    }

    set gridRows(value) {
        this._gridRows = value;
    }

    get tracks() {
        return this._tracks || [];
    }

    set tracks(value) {
        this._tracks = value;
    }

    get cells() {
        return this._cells || [];
    }

    set cells(value) {
        this._cells = value;
    }

    get manualMode() {
        return this._manualMode || false;
    }

    set manualMode(value) {
        this._manualMode = value;
    }
}

// Export for use
window.GeoJSONHorizontalGridSequencer = GeoJSONHorizontalGridSequencer;