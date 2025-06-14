/**
 * GeoS4 Sequencer - Main Sequencer Logic
 * Handles sequencer grid, playback, and geographic data visualization
 */
class GeoJSONSequencer {
    constructor() {
        this.geoData = null;
        this.gridBounds = null;
        this.canvas = document.getElementById('mapCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.isPlaying = false;
        this.currentBeat = 0;
        this.bpm = 120;
        this.playInterval = null;
        this.persistentPointMarkers = [];

        // Default grid configuration
        this.gridCols = 16;
        this.gridRows = 4;

        // Default track configuration
        this.tracks = [];

        // Audio setup using external sound engine
        this.soundEngine = new window.GeoS4SoundEngine();
        this.isAudioInitialized = false;

        this.setupEventListeners();
        this.resizeCanvas();

        // Apply injected settings from Python and load data
        this.applyInjectedSettings();

        window.addEventListener('resize', () => this.resizeCanvas());
    }

    initializeTracks() {
        const trackColors = [
            '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4',
            '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd',
            '#00d2d3', '#ff9f43', '#10ac84', '#ee5a24'
        ];

        const trackSounds = ['kick', 'snare', 'hihat', 'perc', 'clap', 'cymbal', 'tom', 'rim'];

        this.tracks = [];
        for (let i = 0; i < this.gridRows; i++) {
            this.tracks.push({
                name: `Track ${i + 1}`,
                color: trackColors[i % trackColors.length],
                pattern: new Array(this.gridCols).fill(false),
                sound: trackSounds[i % trackSounds.length]
            });
        }
    }

    randomizeSounds() {
        const allSounds = ['kick', 'snare', 'hihat', 'perc', 'clap', 'cymbal', 'tom', 'rim', 'cowbell', 'shaker', 'bass', 'random'];

        this.tracks.forEach((track, index) => {
            const randomSound = allSounds[Math.floor(Math.random() * allSounds.length)];
            track.sound = randomSound;

            const select = document.querySelector(`#trackControls .track-control:nth-child(${index + 1}) .track-select`);
            if (select) {
                select.value = randomSound;
            }
        });

        console.log('Randomized all track sounds');
    }

    randomizePattern() {
        this.tracks.forEach(track => {
            track.pattern = track.pattern.map(() => Math.random() < 0.25); // 25% chance for each cell
        });

        this.updateSequencerDisplay();
        console.log('Randomized pattern');
    }

    updateGridDimensions(newCols, newRows) {
        if (newCols === this.gridCols && newRows === this.gridRows) return;

        this.gridCols = newCols;
        this.gridRows = newRows;

        // Adjust tracks array
        while (this.tracks.length < this.gridRows) {
            const trackColors = [
                '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4',
                '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd',
                '#00d2d3', '#ff9f43', '#10ac84', '#ee5a24'
            ];
            const trackSounds = ['kick', 'snare', 'hihat', 'perc', 'clap', 'cymbal', 'tom', 'rim'];

            this.tracks.push({
                name: `Track ${this.tracks.length + 1}`,
                color: trackColors[this.tracks.length % trackColors.length],
                pattern: new Array(this.gridCols).fill(false),
                sound: trackSounds[this.tracks.length % trackSounds.length]
            });
        }

        if (this.tracks.length > this.gridRows) {
            this.tracks = this.tracks.slice(0, this.gridRows);
        }

        // Adjust pattern lengths
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

        // Recreate UI
        this.createSequencerGrid();
        this.createTrackControls();

        // Reprocess points with new grid dimensions
        if (this.geoData && this.gridBounds) {
            this.reprocessPointsWithNewGrid();
        }

        console.log(`Grid updated to ${this.gridCols} × ${this.gridRows}`);
    }

    reprocessPointsWithNewGrid() {
        if (!this.geoData || !this.gridBounds) return;

        // Clear current pattern
        this.tracks.forEach(track => track.pattern.fill(false));

        // Get original bounds (not grid-dependent)
        const { minLng, maxLng, minLat, maxLat } = this.gridBounds;

        // Recalculate with new grid dimensions
        const lng_step = (maxLng - minLng) / this.gridCols;
        const lat_step = (maxLat - minLat) / this.gridRows;

        // Update grid bounds
        this.gridBounds.lng_step = lng_step;
        this.gridBounds.lat_step = lat_step;
        this.gridBounds.num_steps = this.gridCols;
        this.gridBounds.num_tracks = this.gridRows;

        // Reprocess each point
        this.geoData.features.forEach(feature => {
            const [lng, lat] = feature.geometry.coordinates;

            // Map longitude to step (0 to gridCols-1)
            let step_index = Math.floor((lng - minLng) / lng_step);
            step_index = Math.min(step_index, this.gridCols - 1);

            // Map latitude to track (0 to gridRows-1) - invert mapping
            let track_index = this.gridRows - 1 - Math.floor((lat - minLat) / lat_step);
            track_index = Math.max(0, Math.min(track_index, this.gridRows - 1));

            if (step_index >= 0 && step_index < this.gridCols &&
                track_index >= 0 && track_index < this.gridRows) {
                this.tracks[track_index].pattern[step_index] = true;
            }
        });

        this.updateSequencerDisplay();
    }

    createTrackControls() {
        const container = document.getElementById('trackControls');
        container.innerHTML = '';

        this.tracks.forEach((track, index) => {
            const control = document.createElement('div');
            control.className = 'track-control';

            const label = document.createElement('div');
            label.className = 'track-label';
            label.textContent = `Track ${index + 1}`;

            const colorBox = document.createElement('div');
            colorBox.className = 'track-color';
            colorBox.style.backgroundColor = track.color;

            const select = document.createElement('select');
            select.className = 'track-select';
            select.innerHTML = `
                <option value="kick" ${track.sound === 'kick' ? 'selected' : ''}>Kick</option>
                <option value="snare" ${track.sound === 'snare' ? 'selected' : ''}>Snare</option>
                <option value="hihat" ${track.sound === 'hihat' ? 'selected' : ''}>Hi-Hat</option>
                <option value="perc" ${track.sound === 'perc' ? 'selected' : ''}>Perc</option>
                <option value="clap" ${track.sound === 'clap' ? 'selected' : ''}>Clap</option>
                <option value="cymbal" ${track.sound === 'cymbal' ? 'selected' : ''}>Cymbal</option>
                <option value="tom" ${track.sound === 'tom' ? 'selected' : ''}>Tom</option>
                <option value="rim" ${track.sound === 'rim' ? 'selected' : ''}>Rim</option>
                <option value="cowbell" ${track.sound === 'cowbell' ? 'selected' : ''}>Cowbell</option>
                <option value="shaker" ${track.sound === 'shaker' ? 'selected' : ''}>Shaker</option>
                <option value="bass" ${track.sound === 'bass' ? 'selected' : ''}>Bass</option>
                <option value="random" ${track.sound === 'random' ? 'selected' : ''}>🎲 Random</option>
                <option value="custom" data-custom="true">🎵 Upload</option>
            `;

            select.addEventListener('change', (e) => {
                if (e.target.value === 'custom') {
                    this.openFileUpload(index);
                    e.target.value = this.tracks[index].sound;
                } else {
                    this.tracks[index].sound = e.target.value;
                }
            });

            const randomizeButton = document.createElement('button');
            randomizeButton.className = 'randomize-button';
            randomizeButton.textContent = '🎲';
            randomizeButton.title = 'Randomize this track sound';
            randomizeButton.addEventListener('click', () => {
                const allSounds = ['kick', 'snare', 'hihat', 'perc', 'clap', 'cymbal', 'tom', 'rim', 'cowbell', 'shaker', 'bass', 'random'];
                const randomSound = allSounds[Math.floor(Math.random() * allSounds.length)];
                this.tracks[index].sound = randomSound;
                select.value = randomSound;
            });

            const customIndicator = document.createElement('div');
            customIndicator.className = 'custom-audio-indicator';
            customIndicator.id = `custom-indicator-${index}`;
            customIndicator.style.display = 'none';
            customIndicator.textContent = 'CUSTOM';

            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.className = 'file-input';
            fileInput.accept = '.mp3,.wav,.ogg,.m4a,.aac';
            fileInput.id = `file-input-${index}`;
            fileInput.addEventListener('change', (e) => {
                this.handleFileUpload(e, index);
            });

            control.appendChild(label);
            control.appendChild(colorBox);
            control.appendChild(select);
            control.appendChild(randomizeButton);
            control.appendChild(customIndicator);
            control.appendChild(fileInput);
            container.appendChild(control);
        });
    }

    openFileUpload(trackIndex) {
        const fileInput = document.getElementById(`file-input-${trackIndex}`);
        if (fileInput) {
            fileInput.click();
        }
    }

    async handleFileUpload(event, trackIndex) {
        const file = event.target.files[0];
        if (!file) return;

        const trackKey = `track_${trackIndex}`;
        const indicator = document.getElementById(`custom-indicator-${trackIndex}`);

        if (indicator) {
            indicator.style.display = 'block';
            indicator.textContent = 'LOADING...';
            indicator.className = 'custom-audio-indicator audio-loading';
        }

        try {
            const arrayBuffer = await file.arrayBuffer();

            const audioData = {
                data: btoa(String.fromCharCode(...new Uint8Array(arrayBuffer))),
                mime_type: file.type || 'audio/mpeg',
                filename: file.name,
                size: file.size
            };

            const success = await this.soundEngine.loadCustomAudio(trackKey, audioData);

            if (indicator) {
                if (success) {
                    indicator.textContent = file.name.length > 6 ? file.name.substring(0, 6) + '...' : file.name;
                    indicator.className = 'custom-audio-indicator';
                    indicator.title = file.name;
                } else {
                    indicator.textContent = 'ERROR';
                    indicator.className = 'custom-audio-indicator audio-error';
                }
            }

            event.target.value = '';

        } catch (error) {
            console.error(`Failed to load custom audio for track ${trackIndex}:`, error);
            if (indicator) {
                indicator.textContent = 'ERROR';
                indicator.className = 'custom-audio-indicator audio-error';
            }
        }
    }

    async applyInjectedSettings() {
        if (typeof GRID_CONFIG !== 'undefined' && GRID_CONFIG) {
            this.gridCols = GRID_CONFIG.num_steps || 16;
            this.gridRows = GRID_CONFIG.num_tracks || 4;
            console.log(`Grid configuration: ${this.gridCols} × ${this.gridRows}`);

            // Update UI controls
            document.getElementById('stepsInput').value = this.gridCols;
            document.getElementById('tracksInput').value = this.gridRows;
        }

        this.initializeTracks();
        this.createSequencerGrid();
        this.createTrackControls();

        if (typeof BPM !== 'undefined') {
            this.bpm = BPM;
            document.getElementById('bpm').value = BPM;
            document.getElementById('bpmDisplay').textContent = BPM;
        }

        if (typeof CUSTOM_AUDIO_FILES !== 'undefined' && CUSTOM_AUDIO_FILES) {
            await this.loadCustomAudioFiles(CUSTOM_AUDIO_FILES);
        }

        if (typeof ACTIVE_CELLS_DATA !== 'undefined' && ACTIVE_CELLS_DATA) {
            this.loadActiveCellsData(ACTIVE_CELLS_DATA);
        }

        if (typeof GEOJSON_DATA !== 'undefined' && GEOJSON_DATA) {
            this.loadGeoJSONData(GEOJSON_DATA);
        }
    }

    async loadCustomAudioFiles(customAudioFiles) {
        if (!this.soundEngine) return;

        await this.soundEngine.initializeAudio();

        for (const [trackKey, audioData] of Object.entries(customAudioFiles)) {
            const trackIndex = parseInt(trackKey.split('_')[1]);
            const indicator = document.getElementById(`custom-indicator-${trackIndex}`);

            if (indicator) {
                indicator.style.display = 'block';
                indicator.textContent = 'LOADING...';
                indicator.className = 'custom-audio-indicator audio-loading';
            }

            try {
                const success = await this.soundEngine.loadCustomAudio(trackKey, audioData);

                if (indicator) {
                    if (success) {
                        indicator.textContent = 'CUSTOM';
                        indicator.className = 'custom-audio-indicator';
                    } else {
                        indicator.textContent = 'ERROR';
                        indicator.className = 'custom-audio-indicator audio-error';
                    }
                }
            } catch (error) {
                console.error(`Failed to load custom audio for ${trackKey}:`, error);
                if (indicator) {
                    indicator.textContent = 'ERROR';
                    indicator.className = 'custom-audio-indicator audio-error';
                }
            }
        }
    }

    loadActiveCellsData(activeCellsData) {
        try {
            this.tracks.forEach(track => track.pattern.fill(false));

            this.gridBounds = activeCellsData.grid_bounds;

            activeCellsData.active_cells.forEach(cell => {
                if (cell.track >= 0 && cell.track < this.gridRows &&
                    cell.step >= 0 && cell.step < this.gridCols) {
                    this.tracks[cell.track].pattern[cell.step] = true;
                }
            });

            this.updateSequencerDisplay();
            console.log('Loaded active cells:', activeCellsData.active_cells.length);

        } catch (error) {
            console.error('Error loading active cells data:', error);
        }
    }

    loadGeoJSONData(geoJsonData) {
        try {
            if (!geoJsonData.features || geoJsonData.features.length === 0) {
                throw new Error('No features found in GeoJSON');
            }

            geoJsonData.features = geoJsonData.features.filter(
                feature => feature.geometry && feature.geometry.type === 'Point'
            );

            if (geoJsonData.features.length === 0) {
                throw new Error('No point features found in GeoJSON');
            }

            this.geoData = geoJsonData;
            this.drawMap();
            this.createPersistentPointMarkers();

        } catch (error) {
            console.error('Error loading GeoJSON:', error);
        }
    }

    createPersistentPointMarkers() {
        this.persistentPointMarkers.forEach(marker => {
            if (marker.parentElement) {
                marker.parentElement.removeChild(marker);
            }
        });
        this.persistentPointMarkers = [];

        if (!this.geoData || !this.gridBounds) return;

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
    }

    setupEventListeners() {
        document.getElementById('gridOpacity').addEventListener('input', (e) => {
            const opacity = e.target.value / 100;
            document.querySelector('.sequencer-grid').style.opacity = opacity;
        });

        document.getElementById('bpm').addEventListener('input', (e) => {
            this.bpm = parseInt(e.target.value);
            document.getElementById('bpmDisplay').textContent = this.bpm;

            if (this.isPlaying) {
                this.updatePlaybackTiming();
            }
        });

        // Grid dimension controls
        document.getElementById('stepsInput').addEventListener('change', (e) => {
            const newSteps = Math.max(8, Math.min(32, parseInt(e.target.value) || 16));
            e.target.value = newSteps;
            this.updateGridDimensions(newSteps, this.gridRows);
        });

        document.getElementById('tracksInput').addEventListener('change', (e) => {
            const newTracks = Math.max(2, Math.min(8, parseInt(e.target.value) || 4));
            e.target.value = newTracks;
            this.updateGridDimensions(this.gridCols, newTracks);
        });

        document.getElementById('stepsDown').addEventListener('click', () => {
            const input = document.getElementById('stepsInput');
            const newValue = Math.max(8, parseInt(input.value) - 2);
            input.value = newValue;
            this.updateGridDimensions(newValue, this.gridRows);
        });

        document.getElementById('stepsUp').addEventListener('click', () => {
            const input = document.getElementById('stepsInput');
            const newValue = Math.min(32, parseInt(input.value) + 2);
            input.value = newValue;
            this.updateGridDimensions(newValue, this.gridRows);
        });

        document.getElementById('tracksDown').addEventListener('click', () => {
            const input = document.getElementById('tracksInput');
            const newValue = Math.max(2, parseInt(input.value) - 1);
            input.value = newValue;
            this.updateGridDimensions(this.gridCols, newValue);
        });

        document.getElementById('tracksUp').addEventListener('click', () => {
            const input = document.getElementById('tracksInput');
            const newValue = Math.min(8, parseInt(input.value) + 1);
            input.value = newValue;
            this.updateGridDimensions(this.gridCols, newValue);
        });

        document.getElementById('playButton').addEventListener('click', async () => {
            if (!this.isAudioInitialized) {
                await this.initializeAudio();
            }
            this.togglePlayback();
        });

        document.getElementById('stopButton').addEventListener('click', () => {
            this.stop();
        });

        document.getElementById('clearButton').addEventListener('click', () => {
            this.clearPattern();
        });

        document.getElementById('randomizeSoundsButton').addEventListener('click', () => {
            this.randomizeSounds();
        });

        document.getElementById('randomizePatternButton').addEventListener('click', () => {
            this.randomizePattern();
        });

        document.getElementById('muteCheckbox').addEventListener('click', () => {
            this.toggleMute();
        });
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

    async initializeAudio() {
        if (this.isAudioInitialized) return;

        try {
            const success = await this.soundEngine.initializeAudio();
            this.isAudioInitialized = success;
        } catch (error) {
            console.error('Failed to initialize audio:', error);
        }
    }

    toggleMute() {
        const checkbox = document.getElementById('muteCheckbox');
        const indicator = document.getElementById('muteIndicator');

        checkbox.classList.toggle('checked');
        indicator.classList.toggle('muted');

        const isMuted = checkbox.classList.contains('checked');
        this.soundEngine.setClickMuted(isMuted);
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;

        if (this.geoData) {
            this.drawMap();
            this.createPersistentPointMarkers();
        }
    }

    createSequencerGrid() {
        const grid = document.getElementById('sequencerGrid');
        grid.innerHTML = '';

        grid.style.gridTemplateColumns = `repeat(${this.gridCols}, 1fr)`;
        grid.style.gridTemplateRows = `repeat(${this.gridRows}, 1fr)`;

        for (let row = 0; row < this.gridRows; row++) {
            for (let col = 0; col < this.gridCols; col++) {
                const cell = document.createElement('div');
                cell.className = 'sequencer-cell';
                cell.style.setProperty('--track-color', this.tracks[row].color);
                cell.dataset.track = row;
                cell.dataset.step = col;

                cell.addEventListener('click', () => {
                    this.toggleStep(row, col);
                });

                grid.appendChild(cell);
            }
        }
    }

    drawMap() {
        if (!this.geoData || !this.gridBounds) return;

        const { width, height } = this.canvas;
        this.ctx.clearRect(0, 0, width, height);

        this.ctx.fillStyle = 'rgba(26, 26, 46, 0.3)';
        this.ctx.fillRect(0, 0, width, height);

        this.geoData.features.forEach(feature => {
            const [lng, lat] = feature.geometry.coordinates;
            const { x, y } = this.coordsToPixel(lng, lat);

            this.ctx.beginPath();
            this.ctx.arc(x, y, 2, 0, 2 * Math.PI);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fill();
            this.ctx.strokeStyle = '#00ff88';
            this.ctx.lineWidth = 0.5;
            this.ctx.stroke();
        });
    }

    coordsToPixel(lng, lat) {
        if (!this.gridBounds) return { x: 0, y: 0 };

        const { width, height } = this.canvas;
        const { minLng, maxLng, minLat, maxLat } = this.gridBounds;

        const x = ((lng - minLng) / (maxLng - minLng)) * width;
        const y = height - ((lat - minLat) / (maxLat - minLat)) * height;

        return { x, y };
    }

    updateSequencerDisplay() {
        this.tracks.forEach((track, trackIndex) => {
            track.pattern.forEach((active, stepIndex) => {
                const cell = document.querySelector(`[data-track="${trackIndex}"][data-step="${stepIndex}"]`);
                if (cell) {
                    cell.classList.toggle('active', active);
                }
            });
        });
    }

    toggleStep(trackIndex, stepIndex) {
        this.tracks[trackIndex].pattern[stepIndex] = !this.tracks[trackIndex].pattern[stepIndex];
        this.updateSequencerDisplay();

        if (this.isAudioInitialized && this.tracks[trackIndex].pattern[stepIndex]) {
            this.soundEngine.playTrackSound(trackIndex, this.tracks[trackIndex].sound, true);
        }
    }

    togglePlayback() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    play() {
        if (!this.geoData) {
            return;
        }

        this.isPlaying = true;
        const playButton = document.getElementById('playButton');
        playButton.textContent = '⏸ Pause';
        playButton.classList.add('active');

        const interval = (60 / this.bpm / 4) * 1000;

        this.playInterval = setInterval(() => {
            this.step();
        }, interval);
    }

    pause() {
        this.isPlaying = false;
        const playButton = document.getElementById('playButton');
        playButton.textContent = '▶ Play';
        playButton.classList.remove('active');

        if (this.playInterval) {
            clearInterval(this.playInterval);
            this.playInterval = null;
        }

        this.clearBeatHighlights();
    }

    stop() {
        this.isPlaying = false;
        const playButton = document.getElementById('playButton');
        playButton.textContent = '▶ Play';
        playButton.classList.remove('active');

        if (this.playInterval) {
            clearInterval(this.playInterval);
            this.playInterval = null;
        }

        this.currentBeat = 0;
        this.clearBeatHighlights();
    }

    step() {
        this.clearBeatHighlights();

        this.tracks.forEach((track, trackIndex) => {
            const cell = document.querySelector(`[data-track="${trackIndex}"][data-step="${this.currentBeat}"]`);
            if (cell) {
                cell.classList.add('current-beat');

                if (track.pattern[this.currentBeat]) {
                    cell.classList.add('playing');
                    this.soundEngine.playTrackSound(trackIndex, track.sound, false);
                    this.highlightRelevantPoints(trackIndex, this.currentBeat);

                    setTimeout(() => {
                        cell.classList.remove('playing');
                    }, 100);
                }
            }
        });

        this.currentBeat = (this.currentBeat + 1) % this.gridCols;
    }

    highlightRelevantPoints(trackIndex, stepIndex) {
        if (!this.geoData || !this.gridBounds) return;

        this.persistentPointMarkers.forEach(marker => {
            marker.classList.remove('highlighted');
        });

        const { width, height } = this.canvas;
        const cellWidth = width / this.gridCols;
        const cellHeight = height / this.gridRows;

        const cellMinX = stepIndex * cellWidth;
        const cellMaxX = (stepIndex + 1) * cellWidth;
        const cellMinY = trackIndex * cellHeight;
        const cellMaxY = (trackIndex + 1) * cellHeight;

        this.geoData.features.forEach((feature, index) => {
            const [lng, lat] = feature.geometry.coordinates;
            const { x, y } = this.coordsToPixel(lng, lat);

            if (x >= cellMinX && x < cellMaxX && y >= cellMinY && y < cellMaxY) {
                if (this.persistentPointMarkers[index]) {
                    this.persistentPointMarkers[index].classList.add('highlighted');

                    setTimeout(() => {
                        if (this.persistentPointMarkers[index]) {
                            this.persistentPointMarkers[index].classList.remove('highlighted');
                        }
                    }, 200);
                }
            }
        });
    }

    clearBeatHighlights() {
        document.querySelectorAll('.current-beat').forEach(el => {
            el.classList.remove('current-beat');
        });
    }

    clearPattern() {
        this.tracks.forEach(track => track.pattern.fill(false));
        this.updateSequencerDisplay();
    }

    destroy() {
        if (this.playInterval) {
            clearInterval(this.playInterval);
        }
        if (this.soundEngine) {
            this.soundEngine.destroy();
        }

        this.persistentPointMarkers.forEach(marker => {
            if (marker.parentElement) {
                marker.parentElement.removeChild(marker);
            }
        });
        this.persistentPointMarkers = [];
    }
}

// Export for use
window.GeoJSONSequencer = GeoJSONSequencer;