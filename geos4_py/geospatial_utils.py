"""
GeoS4 Geospatial Utilities
Enhanced for single layer mode with proper Folium map bounds
"""
import streamlit as st
import numpy as np
import geopandas as gpd
import osmnx as ox
from shapely.geometry import Point, Polygon, MultiPolygon
import contextily as ctx
import matplotlib.pyplot as plt
import base64
import random
from scipy.spatial.distance import cdist
from geopy.geocoders import Nominatim
import pandas as pd
import folium


@st.cache_data(show_spinner="Finding random country...")
def load_countries_data():
    """Load countries data from CSV file."""
    try:
        df = pd.read_csv('countries.csv')
        return df
    except Exception as e:
        st.error(f"Could not load countries data: {e}")
        return None


def generate_random_location():
    """Generate a random country from the CSV and suggest a capital or major city."""
    countries_df = load_countries_data()
    if countries_df is not None:
        return countries_df.sample(1).en_short_name.values[0]
    return None


@st.cache_data(show_spinner="Fetching city data from OpenStreetMap...")
def fetch_city_boundary(city_name):
    """Fetches city geometry from OpenStreetMap."""
    try:
        city_gdf = ox.geocode_to_gdf(city_name)
        city_polygon = city_gdf.unary_union
        return city_gdf, city_polygon
    except Exception as e:
        st.error(f"Could not find '{city_name}'. Please try a different query (e.g., 'Rome, Italy'). Error: {e}")
        return None, None


@st.cache_data(show_spinner="Fetching amenities from OpenStreetMap...")
def fetch_amenities(city_name, amenity_type, max_points=100):
    """Fetches specific amenities from a city using OSMnx with point limit."""
    try:
        # Get amenities as points of interest
        amenities_gdf = ox.features_from_place(city_name, tags={'amenity': amenity_type})

        # Convert to points (get centroids for polygons)
        points = []
        for idx, row in amenities_gdf.iterrows():
            if hasattr(row.geometry, 'centroid'):
                # It's a polygon, get centroid
                point = row.geometry.centroid
            else:
                # It's already a point
                point = row.geometry

            if hasattr(point, 'x') and hasattr(point, 'y'):
                points.append(Point(point.x, point.y))

        if not points:
            st.warning(f"No {amenity_type} amenities found in {city_name}")
            return None

        # Limit the number of points
        if len(points) > max_points:
            points = random.sample(points, max_points)

        points_gdf = gpd.GeoDataFrame(geometry=points, crs=amenities_gdf.crs)
        return points_gdf

    except Exception as e:
        st.error(f"Could not fetch {amenity_type} amenities for '{city_name}'. Error: {e}")
        return None


def generate_random_points(city_polygon, num_points):
    """Generate random points within city boundaries."""
    minx, miny, maxx, maxy = city_polygon.bounds
    points = []

    while len(points) < num_points:
        p = Point(np.random.uniform(minx, maxx), np.random.uniform(miny, maxy))
        if city_polygon.contains(p):
            points.append(p)

    return points


def apply_spatial_transformation(points_gdf, transformation_type, **kwargs):
    """Apply spatial transformations to the points with extended distance ranges."""
    if points_gdf is None or len(points_gdf) == 0:
        return points_gdf

    new_points = []

    if transformation_type == "Clustering":
        # Enhanced clustering with better centroid calculation
        num_clusters = kwargs.get('num_clusters', 3)

        # Convert points to coordinates array
        coords = np.array([[p.x, p.y] for p in points_gdf.geometry])

        # Simple k-means-like clustering with improved initialization
        if len(coords) >= num_clusters:
            # Use k-means++ initialization for better cluster centers
            centroids = []
            # First centroid is random
            centroids.append(coords[np.random.choice(len(coords))])

            # Choose remaining centroids based on distance
            for _ in range(num_clusters - 1):
                distances = np.array([min([np.linalg.norm(coord - c) for c in centroids]) for coord in coords])
                probs = distances / distances.sum()
                cumulative_probs = probs.cumsum()
                r = np.random.rand()
                i = np.searchsorted(cumulative_probs, r)
                centroids.append(coords[i])

            centroids = np.array(centroids)

            # Improved k-means iterations
            for iteration in range(20):  # More iterations for better convergence
                # Assign points to closest centroid
                distances = cdist(coords, centroids)
                labels = np.argmin(distances, axis=1)

                # Update centroids
                new_centroids = []
                for i in range(num_clusters):
                    cluster_points = coords[labels == i]
                    if len(cluster_points) > 0:
                        new_centroids.append(cluster_points.mean(axis=0))
                    else:
                        new_centroids.append(centroids[i])

                new_centroids = np.array(new_centroids)

                # Check for convergence
                if np.allclose(centroids, new_centroids, atol=1e-6):
                    break
                centroids = new_centroids

            # Add cluster centers as new points
            for centroid in centroids:
                new_points.append(Point(centroid[0], centroid[1]))

    elif transformation_type == "Grid Alignment":
        # Enhanced grid alignment with extended range (up to 5000m → ~0.045 degrees)
        grid_size = kwargs.get('grid_size', 0.001)  # degrees

        # Group points by grid cell and use centroid of each cell
        grid_cells = {}
        for point in points_gdf.geometry:
            # Calculate grid cell coordinates
            grid_x = round(point.x / grid_size) * grid_size
            grid_y = round(point.y / grid_size) * grid_size
            cell_key = (grid_x, grid_y)

            if cell_key not in grid_cells:
                grid_cells[cell_key] = []
            grid_cells[cell_key].append(point)

        # Create centroid for each occupied grid cell
        for (grid_x, grid_y), cell_points in grid_cells.items():
            if len(cell_points) == 1:
                # Single point - snap to grid
                new_points.append(Point(grid_x, grid_y))
            else:
                # Multiple points - use average position within cell
                avg_x = np.mean([p.x for p in cell_points])
                avg_y = np.mean([p.y for p in cell_points])
                # Snap average to grid but add small offset for natural look
                offset_x = (avg_x - grid_x) * 0.3  # 30% of original offset
                offset_y = (avg_y - grid_y) * 0.3
                new_points.append(Point(grid_x + offset_x, grid_y + offset_y))

    elif transformation_type == "Noise Addition":
        # Enhanced noise addition with extended range (up to 1000m → ~0.009 degrees)
        noise_level = kwargs.get('noise_level', 0.0001)  # degrees

        # Use different noise patterns for more natural distribution
        noise_patterns = ['gaussian', 'uniform', 'exponential']

        for point in points_gdf.geometry:
            pattern = random.choice(noise_patterns)

            if pattern == 'gaussian':
                noise_x = np.random.normal(0, noise_level)
                noise_y = np.random.normal(0, noise_level)
            elif pattern == 'uniform':
                noise_x = np.random.uniform(-noise_level, noise_level)
                noise_y = np.random.uniform(-noise_level, noise_level)
            else:  # exponential
                noise_x = np.random.exponential(noise_level/2) * random.choice([-1, 1])
                noise_y = np.random.exponential(noise_level/2) * random.choice([-1, 1])

            new_points.append(Point(point.x + noise_x, point.y + noise_y))

    else:
        # No transformation
        new_points = list(points_gdf.geometry)

    if new_points:
        return gpd.GeoDataFrame(geometry=new_points, crs=points_gdf.crs)
    else:
        return points_gdf


def calculate_optimal_grid_dimensions(points_gdf, city_gdf, max_steps=32, max_tracks=8):
    """Calculate optimal grid dimensions based on point distribution."""
    if points_gdf is None or city_gdf is None or len(points_gdf) == 0:
        return 16, 4  # Default values

    city_polygon = city_gdf.unary_union
    minx, miny, maxx, maxy = city_polygon.bounds

    # Calculate aspect ratio of the city bounds
    width = maxx - minx
    height = maxy - miny
    aspect_ratio = width / height if height > 0 else 1

    # Calculate point density and distribution
    num_points = len(points_gdf)
    area = city_polygon.area if hasattr(city_polygon, 'area') else width * height
    point_density = num_points / area if area > 0 else 0

    # Enhanced grid calculation based on multiple factors
    # Base grid size from point count
    if num_points <= 16:
        base_steps, base_tracks = 8, 4
    elif num_points <= 32:
        base_steps, base_tracks = 12, 4
    elif num_points <= 64:
        base_steps, base_tracks = 16, 6
    elif num_points <= 128:
        base_steps, base_tracks = 20, 6
    else:
        base_steps, base_tracks = 24, 8

    # Adjust based on aspect ratio
    if aspect_ratio > 2.5:  # Very wide city
        optimal_steps = min(int(base_steps * 1.5), max_steps)
        optimal_tracks = max(int(base_tracks * 0.7), 2)
    elif aspect_ratio < 0.4:  # Very tall city
        optimal_steps = max(int(base_steps * 0.7), 8)
        optimal_tracks = min(int(base_tracks * 1.5), max_tracks)
    elif aspect_ratio > 1.5:  # Moderately wide
        optimal_steps = min(int(base_steps * 1.2), max_steps)
        optimal_tracks = max(int(base_tracks * 0.9), 2)
    elif aspect_ratio < 0.7:  # Moderately tall
        optimal_steps = max(int(base_steps * 0.9), 8)
        optimal_tracks = min(int(base_tracks * 1.2), max_tracks)
    else:  # Roughly square city
        optimal_steps = base_steps
        optimal_tracks = base_tracks

    # Adjust based on point density
    if point_density > 0.001:  # High density
        optimal_steps = min(optimal_steps + 4, max_steps)
        optimal_tracks = min(optimal_tracks + 2, max_tracks)
    elif point_density < 0.0001:  # Low density
        optimal_steps = max(optimal_steps - 2, 8)
        optimal_tracks = max(optimal_tracks - 1, 2)

    # Ensure even numbers for better musical patterns
    optimal_steps = optimal_steps + (optimal_steps % 2)
    optimal_tracks = optimal_tracks + (optimal_tracks % 2) if optimal_tracks > 2 else optimal_tracks

    # Final bounds check
    optimal_steps = min(max(optimal_steps, 8), max_steps)
    optimal_tracks = min(max(optimal_tracks, 2), max_tracks)

    return optimal_steps, optimal_tracks


def process_points_to_sequencer(city_gdf, points_gdf, num_steps=16, num_tracks=4):
    """Process points and map them to sequencer grid using maximum city bounds."""
    if city_gdf is None or points_gdf is None:
        return None

    # Always use the full city bounds for grid mapping
    city_polygon = city_gdf.unary_union
    minx, miny, maxx, maxy = city_polygon.bounds

    # Calculate grid cell dimensions in geographic coordinates
    lng_step = (maxx - minx) / num_steps
    lat_step = (maxy - miny) / num_tracks

    active_cells = []
    cell_occupancy = {}  # Track how many points per cell

    # For each point, determine which sequencer cell it belongs to
    for point_idx, p in enumerate(points_gdf.geometry):
        # Map longitude to step (0 to num_steps-1)
        step_index = int((p.x - minx) / lng_step)
        step_index = min(step_index, num_steps - 1)

        # Map latitude to track (0 to num_tracks-1) - invert mapping
        track_index = num_tracks - 1 - int((p.y - miny) / lat_step)
        track_index = max(0, min(track_index, num_tracks - 1))

        cell_key = (track_index, step_index)

        # Count points per cell for density information
        if cell_key not in cell_occupancy:
            cell_occupancy[cell_key] = []
        cell_occupancy[cell_key].append({
            "point_lng": p.x,
            "point_lat": p.y,
            "point_id": point_idx
        })

    # Create active cells with aggregated information
    for (track_index, step_index), points_in_cell in cell_occupancy.items():
        # Use the centroid of all points in the cell
        avg_lng = np.mean([pt["point_lng"] for pt in points_in_cell])
        avg_lat = np.mean([pt["point_lat"] for pt in points_in_cell])

        active_cells.append({
            "track": track_index,
            "step": step_index,
            "point_lng": avg_lng,
            "point_lat": avg_lat,
            "point_id": points_in_cell[0]["point_id"],  # Representative point ID
            "point_count": len(points_in_cell),  # Number of points in this cell
            "point_density": len(points_in_cell) / (lng_step * lat_step) if lng_step * lat_step > 0 else 0
        })

    # Grid bounds for coordinate conversion (always maximum city bounds)
    grid_bounds = {
        "minLng": minx,
        "maxLng": maxx,
        "minLat": miny,
        "maxLat": maxy,
        "lng_step": lng_step,
        "lat_step": lat_step,
        "num_steps": num_steps,
        "num_tracks": num_tracks,
        "total_points": len(points_gdf),
        "active_cells_count": len(active_cells),
        "grid_efficiency": len(active_cells) / (num_steps * num_tracks)  # How much of grid is used
    }

    return {"active_cells": active_cells, "grid_bounds": grid_bounds}


def convert_gdf_to_geojson(gdf):
    """Converts a GeoDataFrame to GeoJSON format."""
    if gdf is None:
        return None

    features = []
    for idx, row in gdf.iterrows():
        geometry = row.geometry

        # Create base properties
        properties = {
            "id": idx,
            "index": idx
        }

        # Add any additional attributes from the GeoDataFrame
        for column in gdf.columns:
            if column != 'geometry':
                try:
                    value = row[column]
                    # Convert numpy types to native Python types for JSON serialization
                    if hasattr(value, 'item'):
                        value = value.item()
                    elif isinstance(value, (np.integer, np.floating)):
                        value = float(value)
                    elif isinstance(value, np.ndarray):
                        value = value.tolist()
                    properties[column] = value
                except:
                    pass  # Skip problematic attributes

        if hasattr(geometry, 'x') and hasattr(geometry, 'y'):
            # Point geometry
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [geometry.x, geometry.y]
                },
                "properties": {
                    **properties,
                    "type": "point"
                }
            }
        elif isinstance(geometry, (Polygon, MultiPolygon)):
            # Polygon geometry (for city boundaries)
            if isinstance(geometry, Polygon):
                coordinates = [list(geometry.exterior.coords)]
                # Add holes if they exist
                for interior in geometry.interiors:
                    coordinates.append(list(interior.coords))
                geom_data = {
                    "type": "Polygon",
                    "coordinates": coordinates
                }
            else:  # MultiPolygon
                polygons = []
                for poly in geometry.geoms:
                    coords = [list(poly.exterior.coords)]
                    for interior in poly.interiors:
                        coords.append(list(interior.coords))
                    polygons.append(coords)
                geom_data = {
                    "type": "MultiPolygon",
                    "coordinates": polygons
                }

            feature = {
                "type": "Feature",
                "geometry": geom_data,
                "properties": {
                    **properties,
                    "type": "boundary"
                }
            }
        else:
            # Skip unsupported geometry types
            continue

        features.append(feature)

    return {
        "type": "FeatureCollection",
        "features": features,
        "properties": {
            "total_features": len(features),
            "feature_types": list(set(f["properties"].get("type", "unknown") for f in features))
        }
    }


def create_interactive_map_with_points_bounds(city_gdf, points_gdf):
    """Create an interactive Folium map using points bounding box for visualization."""
    if city_gdf is None:
        return None, None

    try:
        # Always use points bounds for map framing and visualization
        if points_gdf is not None and len(points_gdf) > 0:
            bounds = points_gdf.total_bounds
        else:
            bounds = city_gdf.total_bounds

        center_lat = (bounds[1] + bounds[3]) / 2
        center_lon = (bounds[0] + bounds[2]) / 2

        # Create Folium map
        m = folium.Map(
            location=[center_lat, center_lon],
            zoom_start=12,
            tiles='CartoDB positron'
        )

        # Add city boundary
        folium.GeoJson(
            city_gdf.geometry.iloc[0].__geo_interface__,
            style_function=lambda x: {
                'fillColor': 'transparent',
                'color': '#007acc',
                'weight': 3,
                'fillOpacity': 0.1
            }
        ).add_to(m)

        # Show all points
        all_points = []
        if points_gdf is not None and len(points_gdf) > 0:
            for idx, point in points_gdf.iterrows():
                lat, lng = point.geometry.y, point.geometry.x
                all_points.append(idx)

                folium.CircleMarker(
                    location=[lat, lng],
                    radius=5,
                    popup=f"Point {idx}",
                    color='#00ff88',
                    fillColor='#00ff88',
                    fillOpacity=0.8,
                    weight=2
                ).add_to(m)

        # Fit map to points bounds (not city bounds)
        m.fit_bounds([[bounds[1], bounds[0]], [bounds[3], bounds[2]]])

        return m, all_points

    except Exception as e:
        st.error(f"Could not create interactive map: {e}")
        return None, None


def create_background_map(city_gdf, points_gdf):
    """Creates a background map with contextily for better visualization using points bounds."""
    if city_gdf is None:
        return None

    try:
        # Convert to Web Mercator for contextily
        city_web = city_gdf.to_crs(epsg=3857)
        points_web = points_gdf.to_crs(epsg=3857) if points_gdf is not None else None

        fig, ax = plt.subplots(figsize=(12, 8), facecolor='#f8f9fa')
        ax.set_facecolor('#ffffff')

        # Plot city boundary with enhanced styling
        city_web.plot(
            ax=ax,
            facecolor='none',
            edgecolor='#007acc',
            linewidth=2.5,
            alpha=0.9,
            linestyle='-'
        )

        # Plot ALL points with enhanced styling
        if points_web is not None and len(points_web) > 0:
            points_web.plot(
                ax=ax,
                color='#ff4444',
                markersize=35,
                alpha=0.9,
                edgecolor='white',
                linewidth=1.5,
                marker='o'
            )

            # Set bounds to points bounds instead of city bounds
            points_bounds = points_web.total_bounds
            ax.set_xlim(points_bounds[0], points_bounds[2])
            ax.set_ylim(points_bounds[1], points_bounds[3])

        # Add contextily basemap with error handling
        try:
            ctx.add_basemap(
                ax,
                crs=city_web.crs,
                source=ctx.providers.CartoDB.Positron,
                alpha=0.8,
                zoom='auto'
            )
        except Exception as ctx_error:
            print(f"Could not add basemap: {ctx_error}")
            # Continue without basemap

        # Remove axes and clean up
        ax.set_xticks([])
        ax.set_yticks([])
        for spine in ax.spines.values():
            spine.set_visible(False)

        # Add subtle grid if no basemap
        if points_web is not None and len(points_web) > 0:
            ax.grid(True, alpha=0.1, color='#cccccc', linestyle='-', linewidth=0.5)

        plt.tight_layout()
        return fig

    except Exception as e:
        st.warning(f"Could not create background map: {e}. Using simple plot.")
        return plot_simple_city(city_gdf, points_gdf)


def plot_simple_city(city_gdf, points_gdf):
    """Fallback simple city plot without contextily using points bounds."""
    if city_gdf is None:
        return None

    fig, ax = plt.subplots(figsize=(12, 8), facecolor='#f8f9fa')
    ax.set_facecolor('#ffffff')

    # Plot city boundary
    city_gdf.plot(
        ax=ax,
        facecolor='#f0f8ff',
        edgecolor='#007acc',
        linewidth=2.5,
        alpha=0.7
    )

    # Plot ALL points
    if points_gdf is not None and len(points_gdf) > 0:
        points_gdf.plot(
            ax=ax,
            color='#ff4444',
            markersize=30,
            alpha=0.8,
            edgecolor='white',
            linewidth=1.5
        )

        # Set bounds to points bounds
        points_bounds = points_gdf.total_bounds
        ax.set_xlim(points_bounds[0], points_bounds[2])
        ax.set_ylim(points_bounds[1], points_bounds[3])

    # Add grid for reference
    ax.grid(True, alpha=0.2, color='#cccccc', linestyle='-', linewidth=0.5)

    ax.set_xticks([])
    ax.set_yticks([])
    for spine in ax.spines.values():
        spine.set_visible(False)

    plt.tight_layout()
    return fig


# Placeholder functions for future multiple layer support
def process_layers_for_sequencer(layers, processing_mode="single"):
    """Placeholder for future multiple layer processing."""
    st.warning("⚠️ Multiple layer processing not implemented. Using single layer mode.")
    return {}


def create_global_bounds_for_layers(layers, processing_mode="single"):
    """Placeholder for future global bounds calculation."""
    st.warning("⚠️ Global bounds for multiple layers not implemented.")
    return None


def validate_layer_data(layer_data):
    """Validate single layer data for consistency and completeness."""
    required_fields = ['name', 'city_gdf', 'points_gdf', 'grid_config']
    missing_fields = []

    for field in required_fields:
        if field not in layer_data or layer_data[field] is None:
            missing_fields.append(field)

    if missing_fields:
        return False, f"Missing required fields: {', '.join(missing_fields)}"

    # Validate grid configuration
    grid_config = layer_data['grid_config']
    if not isinstance(grid_config, dict) or 'num_steps' not in grid_config or 'num_tracks' not in grid_config:
        return False, "Invalid grid configuration"

    # Validate GeoDataFrames
    try:
        if not isinstance(layer_data['city_gdf'], gpd.GeoDataFrame):
            return False, "city_gdf must be a GeoDataFrame"
        if not isinstance(layer_data['points_gdf'], gpd.GeoDataFrame):
            return False, "points_gdf must be a GeoDataFrame"
    except:
        return False, "Invalid GeoDataFrame format"

    return True, "Valid layer data"


def calculate_layer_statistics(layer_data):
    """Calculate comprehensive statistics for a single layer."""
    stats = {}

    if 'points_gdf' in layer_data and layer_data['points_gdf'] is not None:
        points_gdf = layer_data['points_gdf']
        stats['total_points'] = len(points_gdf)

        # Calculate point density using points bounds
        if len(points_gdf) > 0:
            points_bounds = points_gdf.total_bounds
            points_area = (points_bounds[2] - points_bounds[0]) * (points_bounds[3] - points_bounds[1])
            stats['point_density'] = len(points_gdf) / points_area if points_area > 0 else 0

        # Calculate spatial distribution
        if len(points_gdf) > 1:
            coords = np.array([[p.x, p.y] for p in points_gdf.geometry])
            center = coords.mean(axis=0)
            distances = np.sqrt(np.sum((coords - center)**2, axis=1))
            stats['spatial_spread'] = np.std(distances)
            stats['spatial_centroid'] = center.tolist()

    if 'active_cells_data' in layer_data and layer_data['active_cells_data'] is not None:
        active_cells = layer_data['active_cells_data']['active_cells']
        stats['active_cells'] = len(active_cells)

        if 'grid_config' in layer_data:
            grid_config = layer_data['grid_config']
            total_cells = grid_config['num_steps'] * grid_config['num_tracks']
            stats['grid_efficiency'] = len(active_cells) / total_cells if total_cells > 0 else 0

    return stats

