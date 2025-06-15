/**
 * GeoS4 Sequencer Layer Management System
 * Handles multiple geospatial datasets as independent sequencer layers
 */

/**
 * SequencerLayer - Represents a single layer with geospatial data and sequencer state
 */
class SequencerLayer {
    constructor(id, options = {}) {
        this.id = id;
        this.name = options.name || `Layer ${id}`;
        this.active = options.active !== undefined ? options.active : true;
        this.muted = options.muted || false;
        this.solo = options.solo || false;
        this.volume = options.volume || 1.0;
        this.color = options.color || this.generateLayerColor(id);

        // Geospatial data
        this.geoData = options.geoData || null;
        this.cityBoundsData = options.cityBoundsData || null;
        this.gridBounds = options.gridBounds || null;
        this.activeCellsData = options.activeCellsData || null;
        this.zoomBounds = options.zoomBounds || null;

        // Layer metadata
        this.locationName = options.locationName || '';
        this.dataInfo = options.dataInfo || '';
        this.gridConfig = options.gridConfig || { num_steps: 16, num_tracks: 4 };
        this.customAudioFiles = options.customAudioFiles || {};

        // Sequencer state specific to this layer
        this.layerTracks = [];
        this.layerCells = [];
        this.layerPattern = [];

        // Visual properties
        this.opacity = options.opacity || 1.0;
        this.visible = options.visible !== undefined ? options.visible : true;

        // Initialize layer sequencer state
        this.initializeLayerState();
    }

    generateLayerColor(id) {
        const colors = [
            '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4',
            '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd',
            '#00d2d3', '#ff9f43', '#10ac84', '#ee5a24'
        ];
        return colors[id % colors.length];
    }

    initializeLayerState() {
        if (!this.activeCellsData || !this.gridConfig) return;

        const { num_steps, num_tracks } = this.gridConfig;

        // Initialize tracks for this layer
        this.layerTracks = [];
        for (let i = 0; i < num_tracks; i++) {
            const track = new Track(i, {
                pattern: new Array(num_steps).fill(false),
                layerId: this.id
            });
            this.layerTracks.push(track);
        }

        // Initialize cells for this layer
        this.layerCells = [];
        for (let row = 0; row < num_tracks; row++) {
            const cellRow = [];
            for (let col = 0; col < num_steps; col++) {
                const cell = new SequencerCell(row, col, {
                    layerId: this.id,
                    active: false
                });
                cellRow.push(cell);
            }
            this.layerCells.push(cellRow);
        }

        // Apply active cells data
        if (this.activeCellsData && this.activeCellsData.active_cells) {
            this.activeCellsData.active_cells.forEach(cellData => {
                const { track, step } = cellData;
                if (track >= 0 && track < num_tracks && step >= 0 && step < num_steps) {
                    this.layerTracks[track].setStep(step, true);
                    this.layerCells[track][step].setActive(true);
                    this.layerCells[track][step].setGeographicPoint({
                        latitude: cellData.point_lat,
                        longitude: cellData.point_lng,
                        properties: { point_id: cellData.point_id }
                    });
                }
            });
        }
    }

    updateLayerData(newData) {
        // Update layer with new geospatial data
        Object.assign(this, newData);
        this.initializeLayerState();
    }

    setActive(active) {
        this.active = Boolean(active);
    }

    setMuted(muted) {
        this.muted = Boolean(muted);
    }

    setSolo(solo) {
        this.solo = Boolean(solo);
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
    }

    setVisible(visible) {
        this.visible = Boolean(visible);
    }

    setOpacity(opacity) {
        this.opacity = Math.max(0, Math.min(1, opacity));
    }

    toggleStep(trackIndex, stepIndex) {
        if (trackIndex >= 0 && trackIndex < this.layerTracks.length &&
            stepIndex >= 0 && stepIndex < this.layerTracks[trackIndex].pattern.length) {

            const newState = this.layerTracks[trackIndex].toggleStep(stepIndex);
            this.layerCells[trackIndex][stepIndex].setActive(newState);
            return newState;
        }
        return false;
    }

    isStepActive(trackIndex, stepIndex) {
        if (trackIndex >= 0 && trackIndex < this.layerTracks.length) {
            return this.layerTracks[trackIndex].isStepActive(stepIndex);
        }
        return false;
    }

    shouldTrigger(trackIndex, stepIndex) {
        if (!this.active || this.muted) return false;
        return this.isStepActive(trackIndex, stepIndex);
    }

    getEffectiveVolume(soloLayers = []) {
        if (this.muted) return 0;
        if (soloLayers.length > 0 && !this.solo) return 0;
        return this.volume * this.opacity;
    }

    clearPattern() {
        this.layerTracks.forEach(track => track.clearPattern());
        this.layerCells.forEach(row => row.forEach(cell => cell.setActive(false)));
    }

    randomizePattern(probability = 0.25) {
        this.layerTracks.forEach(track => track.randomizePattern(probability));
        this.updateCellsFromTracks();
    }

    updateCellsFromTracks() {
        for (let track = 0; track < this.layerTracks.length; track++) {
            for (let step = 0; step < this.layerTracks[track].pattern.length; step++) {
                const isActive = this.layerTracks[track].isStepActive(step);
                if (this.layerCells[track] && this.layerCells[track][step]) {
                    this.layerCells[track][step].setActive(isActive);
                }
            }
        }
    }

    getLayerStats() {
        const totalCells = this.layerTracks.reduce((sum, track) => sum + track.pattern.length, 0);
        const activeCells = this.layerTracks.reduce((sum, track) =>
            sum + track.pattern.filter(step => step).length, 0);

        return {
            id: this.id,
            name: this.name,
            locationName: this.locationName,
            dataInfo: this.dataInfo,
            gridConfig: this.gridConfig,
            totalCells,
            activeCells,
            active: this.active,
            muted: this.muted,
            solo: this.solo,
            visible: this.visible,
            volume: this.volume,
            opacity: this.opacity
        };
    }

    serialize() {
        return {
            id: this.id,
            name: this.name,
            active: this.active,
            muted: this.muted,
            solo: this.solo,
            volume: this.volume,
            color: this.color,
            opacity: this.opacity,
            visible: this.visible,

            // Geospatial data
            geoData: this.geoData,
            cityBoundsData: this.cityBoundsData,
            gridBounds: this.gridBounds,
            activeCellsData: this.activeCellsData,
            zoomBounds: this.zoomBounds,

            // Metadata
            locationName: this.locationName,
            dataInfo: this.dataInfo,
            gridConfig: this.gridConfig,
            customAudioFiles: this.customAudioFiles,

            // Sequencer state
            layerTracks: this.layerTracks.map(track => track.serialize()),
            layerCells: this.layerCells.map(row => row.map(cell => cell.serialize()))
        };
    }

    static deserialize(data) {
        const layer = new SequencerLayer(data.id, data);

        // Restore tracks
        if (data.layerTracks) {
            layer.layerTracks = data.layerTracks.map(trackData => Track.deserialize(trackData));
        }

        // Restore cells
        if (data.layerCells) {
            layer.layerCells = data.layerCells.map(rowData =>
                rowData.map(cellData => SequencerCell.deserialize(cellData))
            );
        }

        return layer;
    }

    destroy() {
        // Clean up layer resources
        this.layerCells.forEach(row => {
            row.forEach(cell => cell.destroy());
        });
        this.layerCells = [];
        this.layerTracks = [];
    }
}

/**
 * LayerManager - Manages multiple sequencer layers
 */
class LayerManager {
    constructor(sequencer) {
        this.sequencer = sequencer;
        this.layers = new Map();
        this.nextLayerId = 1;
        this.masterGridConfig = { num_steps: 16, num_tracks: 4 };
    }

    createLayer(options = {}) {
        const id = this.nextLayerId++;
        const layer = new SequencerLayer(id, {
            name: options.name || `Layer ${id}`,
            ...options
        });

        this.layers.set(id, layer);
        console.log(`Created layer ${id}: ${layer.name}`);
        return layer;
    }

    getLayer(id) {
        return this.layers.get(id);
    }

    getAllLayers() {
        return Array.from(this.layers.values());
    }

    getActiveLayers() {
        return this.getAllLayers().filter(layer => layer.active);
    }

    getSoloLayers() {
        return this.getAllLayers().filter(layer => layer.solo);
    }

    removeLayer(id) {
        const layer = this.layers.get(id);
        if (layer) {
            layer.destroy();
            this.layers.delete(id);
            console.log(`Removed layer ${id}`);
            this.updateSequencerState();
            return true;
        }
        return false;
    }

    updateMasterGrid(num_steps, num_tracks) {
        this.masterGridConfig = { num_steps, num_tracks };

        // Update sequencer grid if no active layers
        if (this.getActiveLayers().length === 0) {
            this.sequencer.updateGridDimensions(num_steps, num_tracks);
        }
    }

    updateSequencerState() {
        const activeLayers = this.getActiveLayers();

        if (activeLayers.length === 0) {
            // No active layers - use manual mode with master grid
            this.sequencer.updateGridDimensions(
                this.masterGridConfig.num_steps,
                this.masterGridConfig.num_tracks
            );
            this.sequencer.clearPattern();
            this.sequencer.manualMode = true;
        } else {
            // Merge layers into sequencer state
            this.mergeLayersToSequencer(activeLayers);
            this.sequencer.manualMode = false;
        }
    }

    mergeLayersToSequencer(activeLayers) {
        if (activeLayers.length === 0) return;

        // Find the largest grid dimensions needed
        let maxSteps = this.masterGridConfig.num_steps;
        let maxTracks = this.masterGridConfig.num_tracks;

        activeLayers.forEach(layer => {
            if (layer.gridConfig) {
                maxSteps = Math.max(maxSteps, layer.gridConfig.num_steps);
                maxTracks = Math.max(maxTracks, layer.gridConfig.num_tracks);
            }
        });

        // Update sequencer grid
        this.sequencer.updateGridDimensions(maxSteps, maxTracks);

        // Clear current pattern
        this.sequencer.clearPattern();

        // Merge all layer patterns
        const soloLayers = this.getSoloLayers();
        const layersToPlay = soloLayers.length > 0 ? soloLayers : activeLayers;

        layersToPlay.forEach(layer => {
            if (layer.muted) return;

            for (let track = 0; track < layer.layerTracks.length && track < maxTracks; track++) {
                for (let step = 0; step < layer.layerTracks[track].pattern.length && step < maxSteps; step++) {
                    if (layer.isStepActive(track, step)) {
                        this.sequencer.tracks[track].setStep(step, true);
                        this.sequencer.cells[track][step].setActive(true);

                        // Copy geographic data if available
                        const layerCell = layer.layerCells[track][step];
                        if (layerCell && layerCell.getGeographicPoint()) {
                            this.sequencer.cells[track][step].setGeographicPoint(
                                layerCell.getGeographicPoint()
                            );
                        }
                    }
                }
            }
        });

        this.sequencer.updateSequencerDisplay();
    }

    playStep(currentBeat) {
        const activeLayers = this.getActiveLayers();
        const soloLayers = this.getSoloLayers();
        const layersToPlay = soloLayers.length > 0 ? soloLayers : activeLayers;

        layersToPlay.forEach(layer => {
            if (layer.muted) return;

            for (let track = 0; track < layer.layerTracks.length; track++) {
                if (layer.shouldTrigger(track, currentBeat)) {
                    const volume = layer.getEffectiveVolume(soloLayers);
                    const trackSound = layer.layerTracks[track].sound;

                    this.sequencer.soundEngine.playTrackSound(track, trackSound, false, volume);
                }
            }
        });
    }

    toggleLayerStep(layerId, trackIndex, stepIndex) {
        const layer = this.getLayer(layerId);
        if (layer) {
            const result = layer.toggleStep(trackIndex, stepIndex);
            this.updateSequencerState();
            return result;
        }
        return false;
    }

    getLayersStats() {
        return this.getAllLayers().map(layer => layer.getLayerStats());
    }

    serialize() {
        return {
            layers: Array.from(this.layers.values()).map(layer => layer.serialize()),
            nextLayerId: this.nextLayerId,
            masterGridConfig: this.masterGridConfig
        };
    }

    deserialize(data) {
        this.layers.clear();
        this.nextLayerId = data.nextLayerId || 1;
        this.masterGridConfig = data.masterGridConfig || { num_steps: 16, num_tracks: 4 };

        if (data.layers) {
            data.layers.forEach(layerData => {
                const layer = SequencerLayer.deserialize(layerData);
                this.layers.set(layer.id, layer);
            });
        }

        this.updateSequencerState();
    }

    destroy() {
        this.layers.forEach(layer => layer.destroy());
        this.layers.clear();
    }
}

// Export for use
window.SequencerLayer = SequencerLayer;
window.LayerManager = LayerManager;