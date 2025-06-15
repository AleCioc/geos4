/**
 * GeoS4 Geographic Visualizer
 * Handles all geographic visualization including points, boundaries, and background maps
 */
class GeographicVisualizer {
    constructor(canvas, gridBounds) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.gridBounds = gridBounds;
        this.geoData = null;
        this.cityBoundsData = null;
        this.backgroundMapData = null;
        this.persistentPointMarkers = [];
        this.latitudeFilter = { min: null, max: null };
        this.longitudeFilter = { min: null, max: null };
    }

    setGridBounds(gridBounds) {
        this.gridBounds = gridBounds;
    }

    setLatitudeFilter(min, max) {
        this.latitudeFilter = { min, max };
        this.updateVisualization();
    }

    setLongitudeFilter(min, max) {
        this.longitudeFilter = { min, max };
        this.updateVisualization();
    }

    clearFilters() {
        this.latitudeFilter = { min: null, max: null };
        this.longitudeFilter = { min: null, max: null };
        this.updateVisualization();
    }

    loadGeoJSONData(geoJsonData) {
        try {
            if (!geoJsonData.features || geoJsonData.features.length === 0) {
                console.warn('No features found in GeoJSON');
                return;
            }

            // Filter for point features only for points visualization
            const pointFeatures = geoJsonData.features.filter(
                feature => feature.geometry && feature.geometry.type === 'Point'
            );

            if (pointFeatures.length === 0) {
                console.warn('No point features found in GeoJSON');
            }

            this.geoData = {
                type: "FeatureCollection",
                features: pointFeatures
            };

            this.updateVisualization();
            this.createPersistentPointMarkers();

        } catch (error) {
            console.error('Error loading GeoJSON:', error);
        }
    }

    loadCityBoundsData(cityBoundsData) {
        try {
            if (!cityBoundsData.features || cityBoundsData.features.length === 0) {
                console.warn('No city boundary features found');
                return;
            }

            // Filter for polygon/multipolygon features for boundary visualization
            const boundaryFeatures = cityBoundsData.features.filter(
                feature => feature.geometry &&
                (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon')
            );

            if (boundaryFeatures.length === 0) {
                console.warn('No boundary features found in city bounds data');
                return;
            }

            this.cityBoundsData = {
                type: "FeatureCollection",
                features: boundaryFeatures
            };

            console.log('Loaded city bounds:', boundaryFeatures.length, 'features');
            this.updateVisualization();

        } catch (error) {
            console.error('Error loading city bounds data:', error);
        }
    }

    loadBackgroundMapData(backgroundMapData) {
        try {
            this.backgroundMapData = backgroundMapData;
            this.updateVisualization();
            console.log('Loaded background map data');
        } catch (error) {
            console.error('Error loading background map data:', error);
        }
    }

    getFilteredPoints() {
        if (!this.geoData) return [];

        return this.geoData.features.filter(feature => {
            const [lng, lat] = feature.geometry.coordinates;

            // Apply latitude filter
            if (this.latitudeFilter.min !== null && lat < this.latitudeFilter.min) return false;
            if (this.latitudeFilter.max !== null && lat > this.latitudeFilter.max) return false;

            // Apply longitude filter
            if (this.longitudeFilter.min !== null && lng < this.longitudeFilter.min) return false;
            if (this.longitudeFilter.max !== null && lng > this.longitudeFilter.max) return false;

            return true;
        });
    }

    updateVisualization() {
        this.drawMap();
        this.createPersistentPointMarkers();
    }

    drawMap() {
        if (!this.gridBounds) return;

        const { width, height } = this.canvas;
        this.ctx.clearRect(0, 0, width, height);

        // Background
        this.ctx.fillStyle = 'rgba(26, 26, 46, 0.3)';
        this.ctx.fillRect(0, 0, width, height);

        // Draw background map with transparency (if available)
        if (this.backgroundMapData) {
            this.drawBackgroundMap();
        }

        // Draw city boundaries (background)
        if (this.cityBoundsData) {
            this.drawCityBoundaries();
        }

        // Draw filtered points on top
        const filteredPoints = this.getFilteredPoints();
        filteredPoints.forEach(feature => {
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

        // Draw filter bounds if active
        this.drawFilterBounds();
    }

    drawBackgroundMap() {
        if (!this.backgroundMapData || !this.gridBounds) return;

        this.ctx.save();
        this.ctx.globalAlpha = 0.3; // Transparency for background map

        try {
            // If backgroundMapData is an image URL or base64
            if (typeof this.backgroundMapData === 'string') {
                const img = new Image();
                img.onload = () => {
                    this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
                };
                img.src = this.backgroundMapData;
            }
            // Add more background map rendering logic here as needed
        } catch (error) {
            console.warn('Could not render background map:', error);
        }

        this.ctx.restore();
    }

    drawFilterBounds() {
        if (!this.gridBounds) return;

        const { width, height } = this.canvas;
        const { minLng, maxLng, minLat, maxLat } = this.gridBounds;

        this.ctx.save();
        this.ctx.strokeStyle = '#ff9800';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);

        // Draw latitude filter bounds
        if (this.latitudeFilter.min !== null) {
            const y = height - ((this.latitudeFilter.min - minLat) / (maxLat - minLat)) * height;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }

        if (this.latitudeFilter.max !== null) {
            const y = height - ((this.latitudeFilter.max - minLat) / (maxLat - minLat)) * height;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }

        // Draw longitude filter bounds
        if (this.longitudeFilter.min !== null) {
            const x = ((this.longitudeFilter.min - minLng) / (maxLng - minLng)) * width;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
        }

        if (this.longitudeFilter.max !== null) {
            const x = ((this.longitudeFilter.max - minLng) / (maxLng - minLng)) * width;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    drawCityBoundaries() {
        if (!this.cityBoundsData || !this.gridBounds) return;

        this.ctx.save();

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

        this.ctx.restore();
    }

    drawPolygon(coordinates) {
        // Draw exterior ring
        if (coordinates.length > 0) {
            this.drawRing(coordinates[0]);
        }

        // Draw holes (interior rings) if they exist
        for (let i = 1; i < coordinates.length; i++) {
            this.drawRing(coordinates[i], true);
        }
    }

    drawRing(ring, isHole = false) {
        if (ring.length < 3) return;

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
    }

    coordsToPixel(lng, lat) {
        if (!this.gridBounds) return { x: 0, y: 0 };

        const { width, height } = this.canvas;
        const { minLng, maxLng, minLat, maxLat } = this.gridBounds;

        const x = ((lng - minLng) / (maxLng - minLng)) * width;
        const y = height - ((lat - minLat) / (maxLat - minLat)) * height;

        return { x, y };
    }

    createPersistentPointMarkers() {
        // Clear existing markers
        this.persistentPointMarkers.forEach(marker => {
            if (marker.parentElement) {
                marker.parentElement.removeChild(marker);
            }
        });
        this.persistentPointMarkers = [];

        if (!this.gridBounds) return;

        const filteredPoints = this.getFilteredPoints();
        filteredPoints.forEach(feature => {
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

    highlightRelevantPoints(trackIndex, stepIndex, gridCols, gridRows) {
        this.persistentPointMarkers.forEach(marker => {
            marker.classList.remove('highlighted');
        });

        const { width, height } = this.canvas;
        const cellWidth = width / gridCols;
        const cellHeight = height / gridRows;

        const cellMinX = stepIndex * cellWidth;
        const cellMaxX = (stepIndex + 1) * cellWidth;
        const cellMinY = trackIndex * cellHeight;
        const cellMaxY = (trackIndex + 1) * cellHeight;

        const filteredPoints = this.getFilteredPoints();
        filteredPoints.forEach((feature, index) => {
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

    resize() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.updateVisualization();
    }

    getFilterStats() {
        if (!this.geoData) return { total: 0, filtered: 0 };

        const total = this.geoData.features.length;
        const filtered = this.getFilteredPoints().length;

        return { total, filtered };
    }

    destroy() {
        this.persistentPointMarkers.forEach(marker => {
            if (marker.parentElement) {
                marker.parentElement.removeChild(marker);
            }
        });
        this.persistentPointMarkers = [];
    }
}

// Export for use
window.GeographicVisualizer = GeographicVisualizer;