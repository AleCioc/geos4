/**
 * GeoJSONSequencer - Enhanced with sequencer_layer.js integration
 * Now accesses layer functions through the layer management system
 */
class GeoJSONSequencer {
    constructor(options = {}) {
        this.sequencerType = options.sequencerType || 'horizontal_grid';
        this.sequencer = null;

        // Layer management system integration
        this.layerManager = null;
        this.singleLayerMode = true;
        this.currentLayer = null;

        // Initialize the sequencer implementation
        this.initializeSequencer(options);

        // Initialize layer management system
        this.initializeLayerSystem();

        // Apply injected settings from Python
        this.applyInjectedSettings();
    }

    initializeSequencer(options) {
        switch (this.sequencerType) {
            case 'horizontal_grid':
                this.sequencer = new GeoJSONHorizontalGridSequencer(options);
                break;
            default:
                console.warn(`Unknown sequencer type: ${this.sequencerType}, defaulting to horizontal_grid`);
                this.sequencer = new GeoJSONHorizontalGridSequencer(options);
                break;
        }
    }

    initializeLayerSystem() {
        // Initialize layer management system if available
        if (typeof window.LayerManager !== 'undefined') {
            this.layerManager = new window.LayerManager(this.sequencer);
            console.log('Layer management system initialized');
        } else {
            console.warn('LayerManager not available - some features may be limited');
        }
    }

    // === LAYER MANAGEMENT METHODS (through sequencer_layer.js) ===

    createLayer(options = {}) {
        if (this.layerManager) {
            return this.layerManager.createLayer(options);
        } else {
            console.warn('LayerManager not available - cannot create layer');
            return null;
        }
    }

    loadLayerData(layerData) {
        console.log('Loading layer data through layer system:', layerData.name || 'Unknown');

        if (this.layerManager && typeof window.SequencerLayer !== 'undefined') {
            // Create a SequencerLayer from the data
            const layer = new window.SequencerLayer(layerData.id || 1, {
                name: layerData.name || 'Loaded Layer',
                geoData: layerData.geojson_data,
                cityBoundsData: layerData.city_bounds_data,
                activeCellsData: layerData.active_cells_data,
                gridConfig: layerData.grid_config,
                locationName: layerData.location_name,
                dataInfo: layerData.data_info
            });

            // Add layer to manager
            this.layerManager.layers.set(layer.id, layer);
            this.currentLayer = layer;

            // Update sequencer state from layer
            this.layerManager.updateSequencerState();

            // Also update the base sequencer for visual components
            if (this.sequencer && typeof this.sequencer.loadSingleLayerData === 'function') {
                this.sequencer.loadSingleLayerData(layerData);
            }

            this.updateLayerDisplay();
            return layer;
        } else {
            // Fallback to direct sequencer loading
            console.warn('Using fallback layer loading');
            this.currentLayer = {
                id: layerData.id || 1,
                name: layerData.name || 'Fallback Layer',
                data: layerData
            };

            if (this.sequencer && typeof this.sequencer.loadSingleLayerData === 'function') {
                return this.sequencer.loadSingleLayerData(layerData);
            }
        }

        return null;
    }

    getLayer(id) {
        if (this.layerManager) {
            return this.layerManager.getLayer(id);
        }
        return this.currentLayer && this.currentLayer.id === id ? this.currentLayer : null;
    }

    getAllLayers() {
        if (this.layerManager) {
            return this.layerManager.getAllLayers();
        }
        return this.currentLayer ? [this.currentLayer] : [];
    }

    getActiveLayers() {
        if (this.layerManager) {
            return this.layerManager.getActiveLayers();
        }
        return this.currentLayer ? [this.currentLayer] : [];
    }

    removeLayer(id) {
        if (this.layerManager) {
            const success = this.layerManager.removeLayer(id);
            if (success && this.currentLayer && this.currentLayer.id === id) {
                this.currentLayer = null;
                this.updateLayerDisplay();
            }
            return success;
        } else {
            if (this.currentLayer && this.currentLayer.id === id) {
                this.currentLayer = null;
                this.updateLayerDisplay();
                return true;
            }
        }
        return false;
    }

    // === SINGLE LAYER MODE METHODS ===
    setSingleLayerMode(enabled) {
        this.singleLayerMode = enabled;
        if (this.sequencer && typeof this.sequencer.setSingleLayerMode === 'function') {
            this.sequencer.setSingleLayerMode(enabled);
        }
        console.log(`Single layer mode: ${enabled ? 'enabled' : 'disabled'}`);
    }

    loadSingleLayerData(layerData) {
        // Delegate to loadLayerData for consistency
        return this.loadLayerData(layerData);
    }

    getCurrentLayer() {
        return this.currentLayer;
    }

    clearCurrentLayer() {
        if (this.layerManager && this.currentLayer) {
            this.layerManager.removeLayer(this.currentLayer.id);
        }
        this.currentLayer = null;
        if (this.sequencer) {
            this.sequencer.clearPattern();
        }
        this.updateLayerDisplay();
    }

    // === DELEGATE METHODS TO SEQUENCER ===
    updateGridDimensions(newCols, newRows) {
        if (this.layerManager) {
            this.layerManager.updateMasterGrid(newCols, newRows);
        }
        return this.sequencer.updateGridDimensions(newCols, newRows);
    }

    toggleStep(trackIndex, stepIndex) {
        if (this.layerManager && this.currentLayer) {
            return this.layerManager.toggleLayerStep(this.currentLayer.id, trackIndex, stepIndex);
        }
        return this.sequencer.toggleStep(trackIndex, stepIndex);
    }

    play() {
        return this.sequencer.play();
    }

    pause() {
        return this.sequencer.pause();
    }

    stop() {
        return this.sequencer.stop();
    }

    togglePlayback() {
        return this.sequencer.togglePlayback();
    }

    randomizeSounds() {
        return this.sequencer.randomizeSounds();
    }

    randomizePattern() {
        if (this.layerManager && this.currentLayer) {
            // Use layer manager for pattern randomization
            const layer = this.layerManager.getLayer(this.currentLayer.id);
            if (layer && typeof layer.randomizePattern === 'function') {
                layer.randomizePattern();
                this.layerManager.updateSequencerState();
                return;
            }
        }
        return this.sequencer.randomizePattern();
    }

    clearPattern() {
        if (this.layerManager && this.currentLayer) {
            // Use layer manager for pattern clearing
            const layer = this.layerManager.getLayer(this.currentLayer.id);
            if (layer && typeof layer.clearPattern === 'function') {
                layer.clearPattern();
                this.layerManager.updateSequencerState();
                return;
            }
        }
        return this.sequencer.clearPattern();
    }

    // Audio controls
    async initializeAudio() {
        return this.sequencer.initializeAudio();
    }

    toggleManualClickMute() {
        if (this.sequencer.manualClickMuted !== undefined) {
            this.sequencer.manualClickMuted = !this.sequencer.manualClickMuted;

            const checkbox = document.getElementById('muteCheckbox');
            const indicator = document.getElementById('muteIndicator');

            if (checkbox && indicator) {
                checkbox.classList.toggle('checked');
                indicator.classList.toggle('muted');
            }

            console.log('Manual click muted:', this.sequencer.manualClickMuted);
        }
    }

    // Data loading methods (legacy support)
    loadGeoJSONData(geoJsonData) {
        if (this.sequencer.loadGeoJSONData) {
            return this.sequencer.loadGeoJSONData(geoJsonData);
        }
    }

    loadCityBoundsData(cityBoundsData) {
        if (this.sequencer.loadCityBoundsData) {
            return this.sequencer.loadCityBoundsData(cityBoundsData);
        }
    }

    loadActiveCellsData(activeCellsData) {
        if (this.sequencer.loadActiveCellsData) {
            return this.sequencer.loadActiveCellsData(activeCellsData);
        }
    }

    async loadCustomAudioFiles(customAudioFiles) {
        if (this.sequencer.loadCustomAudioFiles) {
            return await this.sequencer.loadCustomAudioFiles(customAudioFiles);
        }
    }

    // Initialization and setup
    async applyInjectedSettings() {
        // Always enable single layer mode by default
        this.setSingleLayerMode(true);

        // Grid configuration
        if (typeof GRID_CONFIG !== 'undefined' && GRID_CONFIG) {
            const gridCols = GRID_CONFIG.num_steps || 16;
            const gridRows = GRID_CONFIG.num_tracks || 4;

            if (this.sequencer.updateGridDimensions) {
                this.sequencer.updateGridDimensions(gridCols, gridRows);
            }

            // Update UI controls
            const stepsInput = document.getElementById('stepsInput');
            const tracksInput = document.getElementById('tracksInput');
            if (stepsInput) stepsInput.value = gridCols;
            if (tracksInput) tracksInput.value = gridRows;

            console.log(`Grid configuration: ${gridCols} × ${gridRows}`);
        }

        // BPM configuration
        if (typeof BPM !== 'undefined') {
            if (this.sequencer.bpm !== undefined) {
                this.sequencer.bpm = BPM;
            }

            const bpmInput = document.getElementById('bpm');
            const bpmDisplay = document.getElementById('bpmDisplay');
            if (bpmInput) bpmInput.value = BPM;
            if (bpmDisplay) bpmDisplay.textContent = BPM;
        }

        // Load custom audio files
        if (typeof CUSTOM_AUDIO_FILES !== 'undefined' && CUSTOM_AUDIO_FILES) {
            await this.loadCustomAudioFiles(CUSTOM_AUDIO_FILES);
        }

        // Load layer data if available (primary method)
        if (typeof LAYER_DATA !== 'undefined' && LAYER_DATA) {
            console.log('Loading layer data through layer system:', LAYER_DATA.name || 'Unknown');
            const layer = this.loadLayerData(LAYER_DATA);
            if (layer) {
                console.log('Layer loaded successfully through layer system');
            }
        }
        // Legacy data support
        else if (typeof ACTIVE_CELLS_DATA !== 'undefined' && ACTIVE_CELLS_DATA) {
            // Check if we have a complete legacy dataset
            if (typeof GEOJSON_DATA !== 'undefined' && GEOJSON_DATA &&
                typeof CITY_BOUNDS_DATA !== 'undefined' && CITY_BOUNDS_DATA) {

                // Create a layer from the injected legacy data
                const layerData = {
                    id: 0,
                    name: 'Legacy Pattern',
                    geojson_data: GEOJSON_DATA,
                    city_bounds_data: CITY_BOUNDS_DATA,
                    active_cells_data: ACTIVE_CELLS_DATA,
                    grid_config: GRID_CONFIG,
                    location_name: 'Legacy Location',
                    data_info: 'Legacy Data'
                };

                this.loadLayerData(layerData);
                console.log('Created layer from legacy data through layer system');
            } else {
                // Legacy mode: load as active cells
                this.loadActiveCellsData(ACTIVE_CELLS_DATA);
            }
        }

        // Load additional data for legacy support
        if (typeof GEOJSON_DATA !== 'undefined' && GEOJSON_DATA) {
            this.loadGeoJSONData(GEOJSON_DATA);
        }

        if (typeof CITY_BOUNDS_DATA !== 'undefined' && CITY_BOUNDS_DATA) {
            this.loadCityBoundsData(CITY_BOUNDS_DATA);
        }

        // Setup event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Grid opacity control
        const gridOpacity = document.getElementById('gridOpacity');
        if (gridOpacity) {
            gridOpacity.addEventListener('input', (e) => {
                const opacity = e.target.value / 100;
                const sequencerGrid = document.querySelector('.sequencer-grid');
                if (sequencerGrid) {
                    sequencerGrid.style.opacity = opacity;
                }
                const gridOpacityDisplay = document.getElementById('gridOpacityDisplay');
                if (gridOpacityDisplay) {
                    gridOpacityDisplay.textContent = `${e.target.value}%`;
                }
            });
        }

        // BPM control
        const bpmInput = document.getElementById('bpm');
        if (bpmInput) {
            bpmInput.addEventListener('input', (e) => {
                const bpm = parseInt(e.target.value);
                if (this.sequencer.bpm !== undefined) {
                    this.sequencer.bpm = bpm;
                }
                const bpmDisplay = document.getElementById('bpmDisplay');
                if (bpmDisplay) {
                    bpmDisplay.textContent = bpm;
                }

                if (this.sequencer.isPlaying && this.sequencer.updatePlaybackTiming) {
                    this.sequencer.updatePlaybackTiming();
                }
            });
        }

        // Grid dimension controls
        this.setupGridDimensionControls();

        // Transport controls
        this.setupTransportControls();

        // Random controls
        this.setupRandomControls();

        // Mute control
        this.setupMuteControl();

        // Layer display updates
        this.setupLayerDisplay();
    }

    setupGridDimensionControls() {
        const stepsInput = document.getElementById('stepsInput');
        const tracksInput = document.getElementById('tracksInput');
        const stepsDown = document.getElementById('stepsDown');
        const stepsUp = document.getElementById('stepsUp');
        const tracksDown = document.getElementById('tracksDown');
        const tracksUp = document.getElementById('tracksUp');

        if (stepsInput) {
            stepsInput.addEventListener('change', (e) => {
                const newSteps = Math.max(8, Math.min(32, parseInt(e.target.value) || 16));
                e.target.value = newSteps;
                this.updateGridDimensions(newSteps, this.sequencer.gridRows || 4);
            });
        }

        if (tracksInput) {
            tracksInput.addEventListener('change', (e) => {
                const newTracks = Math.max(2, Math.min(8, parseInt(e.target.value) || 4));
                e.target.value = newTracks;
                this.updateGridDimensions(this.sequencer.gridCols || 16, newTracks);
            });
        }

        if (stepsDown) {
            stepsDown.addEventListener('click', () => {
                if (stepsInput) {
                    const newValue = Math.max(8, parseInt(stepsInput.value) - 2);
                    stepsInput.value = newValue;
                    this.updateGridDimensions(newValue, this.sequencer.gridRows || 4);
                }
            });
        }

        if (stepsUp) {
            stepsUp.addEventListener('click', () => {
                if (stepsInput) {
                    const newValue = Math.min(32, parseInt(stepsInput.value) + 2);
                    stepsInput.value = newValue;
                    this.updateGridDimensions(newValue, this.sequencer.gridRows || 4);
                }
            });
        }

        if (tracksDown) {
            tracksDown.addEventListener('click', () => {
                if (tracksInput) {
                    const newValue = Math.max(2, parseInt(tracksInput.value) - 1);
                    tracksInput.value = newValue;
                    this.updateGridDimensions(this.sequencer.gridCols || 16, newValue);
                }
            });
        }

        if (tracksUp) {
            tracksUp.addEventListener('click', () => {
                if (tracksInput) {
                    const newValue = Math.min(8, parseInt(tracksInput.value) + 1);
                    tracksInput.value = newValue;
                    this.updateGridDimensions(this.sequencer.gridCols || 16, newValue);
                }
            });
        }
    }

    setupTransportControls() {
        const playButton = document.getElementById('playButton');
        const stopButton = document.getElementById('stopButton');
        const clearButton = document.getElementById('clearButton');

        if (playButton) {
            playButton.addEventListener('click', async () => {
                if (!this.sequencer.isAudioInitialized) {
                    await this.initializeAudio();
                }
                this.togglePlayback();
            });
        }

        if (stopButton) {
            stopButton.addEventListener('click', () => {
                this.stop();
            });
        }

        if (clearButton) {
            clearButton.addEventListener('click', () => {
                this.clearPattern();
            });
        }
    }

    setupRandomControls() {
        const randomizeSoundsButton = document.getElementById('randomizeSoundsButton');
        const randomizePatternButton = document.getElementById('randomizePatternButton');

        if (randomizeSoundsButton) {
            randomizeSoundsButton.addEventListener('click', () => {
                this.randomizeSounds();
            });
        }

        if (randomizePatternButton) {
            randomizePatternButton.addEventListener('click', () => {
                this.randomizePattern();
            });
        }
    }

    setupMuteControl() {
        const muteCheckbox = document.getElementById('muteCheckbox');
        if (muteCheckbox) {
            muteCheckbox.addEventListener('click', () => {
                this.toggleManualClickMute();
            });
        }
    }

    setupLayerDisplay() {
        // Update layer display every few seconds
        setInterval(() => {
            this.updateLayerDisplay();
        }, 2000);

        // Initial update
        this.updateLayerDisplay();
    }

    updateLayerDisplay() {
        const layerInfoElement = document.getElementById('layerInfo');
        const currentLayerNameElement = document.getElementById('currentLayerName');
        const activePatternsCountElement = document.getElementById('activePatternsCount');
        const layerModeElement = document.getElementById('layerModeDisplay');

        if (layerInfoElement) {
            if (this.currentLayer) {
                layerInfoElement.textContent = `Layer Active: ${this.currentLayer.name}`;
                layerInfoElement.style.color = '#00ff88';
            } else {
                layerInfoElement.textContent = `Manual Mode (${this.sequencer.gridCols || 16} × ${this.sequencer.gridRows || 4})`;
                layerInfoElement.style.color = '#ff9800';
            }
        }

        if (currentLayerNameElement) {
            currentLayerNameElement.textContent = this.currentLayer ? this.currentLayer.name : 'None';
        }

        if (activePatternsCountElement) {
            // If using layer manager, get pattern count
            if (this.layerManager && this.currentLayer) {
                const layer = this.layerManager.getLayer(this.currentLayer.id);
                activePatternsCountElement.textContent = layer ? '1' : '0';
            } else {
                activePatternsCountElement.textContent = this.currentLayer ? '1' : '0';
            }
        }

        if (layerModeElement) {
            layerModeElement.textContent = 'Single Layer';
            layerModeElement.style.color = '#00ff88';
        }
    }

    // === LAYER PROCESSING METHODS (through sequencer_layer.js) ===

    setLayerProcessingMode(mode) {
        if (this.layerManager && typeof this.layerManager.setLayerProcessingMode === 'function') {
            this.layerManager.setLayerProcessingMode(mode);
        } else {
            console.log(`⚠️ Layer processing modes not available. Requested mode: ${mode}`);
        }
    }

    getLayerProcessingMode() {
        if (this.layerManager && typeof this.layerManager.getLayerProcessingMode === 'function') {
            return this.layerManager.getLayerProcessingMode();
        }
        return 'single_layer';
    }

    updateSequencerFromLayers() {
        if (this.layerManager && typeof this.layerManager.updateSequencerState === 'function') {
            this.layerManager.updateSequencerState();
        } else {
            console.log('⚠️ Multiple layer updates not available.');
        }
    }

    getLayersStats() {
        if (this.layerManager && typeof this.layerManager.getLayersStats === 'function') {
            return this.layerManager.getLayersStats();
        }
        return this.currentLayer ? [this.getCurrentLayerStats()] : [];
    }

    getCurrentLayerStats() {
        if (!this.currentLayer) return null;

        return {
            id: this.currentLayer.id,
            name: this.currentLayer.name,
            active: true,
            muted: false,
            solo: false,
            visible: true
        };
    }

    // === SEQUENCER MODE MANAGEMENT ===

    setSequencerMode(mode, selectedLayerId = null) {
        console.log(`⚠️ Multiple sequencer modes not implemented. Mode: ${mode}, Layer: ${selectedLayerId}`);
        // For now, always use single layer mode
        this.setSingleLayerMode(true);
    }

    getSequencerMode() {
        return 'single';
    }

    getSelectedLayerId() {
        return this.currentLayer ? this.currentLayer.id : null;
    }

    // === PLACEHOLDER METHODS FOR FUTURE MULTIPLE LAYER COMPATIBILITY ===

    // Global vs Layer Controls Management (placeholders)
    setGlobalControlsActive(active) {
        console.log(`⚠️ Global controls toggle not implemented. Active: ${active}`);
    }

    setLayerControlsActive(active) {
        console.log(`⚠️ Layer controls toggle not implemented. Active: ${active}`);
    }

    updateControlsVisibility() {
        console.log('⚠️ Controls visibility management not implemented.');
    }

    // Filter and zoom methods (placeholders)
    applyFilters() {
        console.log('⚠️ Filter application not implemented.');
    }

    clearFilters() {
        console.log('⚠️ Filter clearing not implemented.');
    }

    updateFilterControls() {
        console.log('⚠️ Filter controls update not implemented.');
    }

    readaptSequencerToZoom() {
        console.log('⚠️ Zoom adaptation not implemented.');
    }

    // Zoom controls (placeholders)
    zoomLatIn() {
        console.log('⚠️ Latitude zoom not implemented.');
    }

    zoomLatOut() {
        console.log('⚠️ Latitude zoom not implemented.');
    }

    zoomLngIn() {
        console.log('⚠️ Longitude zoom not implemented.');
    }

    zoomLngOut() {
        console.log('⚠️ Longitude zoom not implemented.');
    }

    // Serialization methods
    serialize() {
        const baseData = {
            sequencerType: this.sequencerType,
            singleLayerMode: this.singleLayerMode,
            currentLayer: this.currentLayer,
            sequencerData: this.sequencer.serialize ? this.sequencer.serialize() : null
        };

        // Include layer manager data if available
        if (this.layerManager && typeof this.layerManager.serialize === 'function') {
            baseData.layerManagerData = this.layerManager.serialize();
        }

        return baseData;
    }

    deserialize(data) {
        if (data.sequencerType === this.sequencerType && this.sequencer.deserialize) {
            this.sequencer = this.sequencer.constructor.deserialize(data.sequencerData);
        }

        if (data.singleLayerMode !== undefined) {
            this.setSingleLayerMode(data.singleLayerMode);
        }

        if (data.currentLayer) {
            this.loadLayerData(data.currentLayer);
        }

        // Restore layer manager data if available
        if (data.layerManagerData && this.layerManager && typeof this.layerManager.deserialize === 'function') {
            this.layerManager.deserialize(data.layerManagerData);
        }
    }

    // Cleanup
    destroy() {
        if (this.layerManager && typeof this.layerManager.destroy === 'function') {
            this.layerManager.destroy();
        }

        if (this.sequencer && this.sequencer.destroy) {
            this.sequencer.destroy();
        }
    }

    // Getters for common properties
    get isPlaying() {
        return this.sequencer.isPlaying;
    }

    get bpm() {
        return this.sequencer.bpm;
    }

    set bpm(value) {
        this.sequencer.bpm = value;
    }

    get gridCols() {
        return this.sequencer.gridCols;
    }

    get gridRows() {
        return this.sequencer.gridRows;
    }

    get tracks() {
        return this.sequencer.tracks;
    }

    get cells() {
        return this.sequencer.cells;
    }

    get manualMode() {
        return this.sequencer.manualMode;
    }
}

// Export for use
window.GeoJSONSequencer = GeoJSONSequencer;