"""
GeoS4 Geospatial Utilities
Contains all geographic data processing functions
"""
import streamlit as st
import numpy as np
import geopandas as gpd
import osmnx as ox
from shapely.geometry import Point
import contextily as ctx
import matplotlib.pyplot as plt
import base64
import random
from scipy.spatial.distance import cdist
from geopy.geocoders import Nominatim
import pandas as pd


@st.cache_data(show_spinner="Finding random country...")
def load_countries_data():
    """
    Load countries data from CSV file.
    """
    try:
        df = pd.read_csv('countries.csv')
        return df
    except Exception as e:
        st.error(f"Could not load countries data: {e}")
        return None


def generate_random_location():
    """
    Generate a random country from the CSV and suggest a capital or major city.
    """
    countries_df = load_countries_data()
    if countries_df is not None:
        return countries_df.sample(1).en_short_name.values[0]
    return None


@st.cache_data(show_spinner="Fetching city data from OpenStreetMap...")
def fetch_city_boundary(city_name):
    """
    Fetches city geometry from OpenStreetMap.
    """
    try:
        city_gdf = ox.geocode_to_gdf(city_name)
        city_polygon = city_gdf.unary_union
        return city_gdf, city_polygon
    except Exception as e:
        st.error(f"Could not find '{city_name}'. Please try a different query (e.g., 'Rome, Italy'). Error: {e}")
        return None, None


@st.cache_data(show_spinner="Fetching amenities from OpenStreetMap...")
def fetch_amenities(city_name, amenity_type):
    """
    Fetches specific amenities from a city using OSMnx.
    """
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

        points_gdf = gpd.GeoDataFrame(geometry=points, crs=amenities_gdf.crs)
        return points_gdf

    except Exception as e:
        st.error(f"Could not fetch {amenity_type} amenities for '{city_name}'. Error: {e}")
        return None


def generate_random_points(city_polygon, num_points):
    """
    Generate random points within city boundaries.
    """
    minx, miny, maxx, maxy = city_polygon.bounds
    points = []

    while len(points) < num_points:
        p = Point(np.random.uniform(minx, maxx), np.random.uniform(miny, maxy))
        if city_polygon.contains(p):
            points.append(p)

    return points


def apply_spatial_transformation(points_gdf, transformation_type, **kwargs):
    """
    Apply spatial transformations to the points.
    """
    if points_gdf is None or len(points_gdf) == 0:
        return points_gdf

    new_points = []

    if transformation_type == "Clustering":
        # Simple clustering: group points and add cluster centers
        num_clusters = kwargs.get('num_clusters', 3)

        # Convert points to coordinates array
        coords = np.array([[p.x, p.y] for p in points_gdf.geometry])

        # Simple k-means-like clustering
        if len(coords) >= num_clusters:
            # Randomly select initial centroids
            centroids = coords[np.random.choice(len(coords), num_clusters, replace=False)]

            for _ in range(10):  # Simple iterations
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
                centroids = np.array(new_centroids)

            # Add cluster centers as new points
            for centroid in centroids:
                new_points.append(Point(centroid[0], centroid[1]))

    elif transformation_type == "Grid Alignment":
        # Snap points to a regular grid
        grid_size = kwargs.get('grid_size', 0.001)  # degrees

        for point in points_gdf.geometry:
            # Snap to grid
            new_x = round(point.x / grid_size) * grid_size
            new_y = round(point.y / grid_size) * grid_size
            new_points.append(Point(new_x, new_y))

    elif transformation_type == "Noise Addition":
        # Add random noise to point positions
        noise_level = kwargs.get('noise_level', 0.0001)  # degrees

        for point in points_gdf.geometry:
            noise_x = np.random.normal(0, noise_level)
            noise_y = np.random.normal(0, noise_level)
            new_points.append(Point(point.x + noise_x, point.y + noise_y))

    else:
        # No transformation
        new_points = list(points_gdf.geometry)

    if new_points:
        return gpd.GeoDataFrame(geometry=new_points, crs=points_gdf.crs)
    else:
        return points_gdf


def calculate_optimal_grid_dimensions(points_gdf, city_gdf, max_steps=32, max_tracks=8):
    """
    Calculate optimal grid dimensions based on point distribution.
    """
    if points_gdf is None or city_gdf is None or len(points_gdf) == 0:
        return 16, 4  # Default values

    city_polygon = city_gdf.unary_union
    minx, miny, maxx, maxy = city_polygon.bounds

    # Calculate aspect ratio of the city bounds
    width = maxx - minx
    height = maxy - miny
    aspect_ratio = width / height if height > 0 else 1

    # Calculate point density to determine base grid size
    num_points = len(points_gdf)

    # Base grid size based on number of points
    if num_points <= 16:
        base_steps = 8
        base_tracks = 4
    elif num_points <= 32:
        base_steps = 12
        base_tracks = 4
    elif num_points <= 64:
        base_steps = 16
        base_tracks = 6
    else:
        base_steps = 20
        base_tracks = 6

    # Adjust based on aspect ratio
    if aspect_ratio > 2:  # Very wide city
        optimal_steps = min(int(base_steps * 1.5), max_steps)
        optimal_tracks = max(int(base_tracks * 0.8), 2)
    elif aspect_ratio < 0.5:  # Very tall city
        optimal_steps = max(int(base_steps * 0.8), 8)
        optimal_tracks = min(int(base_tracks * 1.5), max_tracks)
    else:  # Roughly square city
        optimal_steps = base_steps
        optimal_tracks = base_tracks

    # Ensure within bounds
    optimal_steps = min(max(optimal_steps, 8), max_steps)
    optimal_tracks = min(max(optimal_tracks, 2), max_tracks)

    return optimal_steps, optimal_tracks


def process_points_to_sequencer(city_gdf, points_gdf, num_steps=16, num_tracks=4):
    """
    Process points and map them to sequencer grid.
    """
    if city_gdf is None or points_gdf is None:
        return None

    city_polygon = city_gdf.unary_union
    minx, miny, maxx, maxy = city_polygon.bounds

    # Calculate grid cell dimensions in geographic coordinates
    lng_step = (maxx - minx) / num_steps
    lat_step = (maxy - miny) / num_tracks

    active_cells = []

    # For each point, determine which sequencer cell it belongs to
    for point_idx, p in enumerate(points_gdf.geometry):
        # Map longitude to step (0 to num_steps-1)
        step_index = int((p.x - minx) / lng_step)
        step_index = min(step_index, num_steps - 1)

        # Map latitude to track (0 to num_tracks-1) - invert mapping
        track_index = num_tracks - 1 - int((p.y - miny) / lat_step)
        track_index = max(0, min(track_index, num_tracks - 1))

        active_cells.append({
            "track": track_index,
            "step": step_index,
            "point_lng": p.x,
            "point_lat": p.y,
            "point_id": point_idx
        })

    # Grid bounds for coordinate conversion
    grid_bounds = {
        "minLng": minx,
        "maxLng": maxx,
        "minLat": miny,
        "maxLat": maxy,
        "lng_step": lng_step,
        "lat_step": lat_step,
        "num_steps": num_steps,
        "num_tracks": num_tracks
    }

    return {"active_cells": active_cells, "grid_bounds": grid_bounds}


def convert_gdf_to_geojson(gdf):
    """
    Converts a GeoDataFrame to GeoJSON format.
    """
    if gdf is None:
        return None

    features = []
    for idx, row in gdf.iterrows():
        if hasattr(row.geometry, 'x') and hasattr(row.geometry, 'y'):
            # Point geometry
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [row.geometry.x, row.geometry.y]
                },
                "properties": {
                    "id": idx,
                    "type": "generated_point"
                }
            }
            features.append(feature)

    return {
        "type": "FeatureCollection",
        "features": features
    }


def create_background_map(city_gdf, points_gdf):
    """
    Creates a background map with contextily for better visualization.
    """
    if city_gdf is None:
        return None

    try:
        # Convert to Web Mercator for contextily
        city_web = city_gdf.to_crs(epsg=3857)
        points_web = points_gdf.to_crs(epsg=3857) if points_gdf is not None else None

        fig, ax = plt.subplots(figsize=(12, 8), facecolor='#f8f9fa')
        ax.set_facecolor('#ffffff')

        # Plot city boundary
        city_web.plot(ax=ax, facecolor='none', edgecolor='#007acc', linewidth=2, alpha=0.8)

        # Plot points if available
        if points_web is not None and len(points_web) > 0:
            points_web.plot(ax=ax, color='#ff4444', markersize=30, alpha=0.9, edgecolor='white', linewidth=1)

        # Add contextily basemap
        try:
            ctx.add_basemap(ax, crs=city_web.crs, source=ctx.providers.CartoDB.Positron, alpha=0.8)
        except:
            pass

        # Remove axes
        ax.set_xticks([])
        ax.set_yticks([])
        for spine in ax.spines.values():
            spine.set_visible(False)

        plt.tight_layout()
        return fig

    except Exception as e:
        st.warning(f"Could not create contextily map: {e}. Using simple plot.")
        return plot_simple_city(city_gdf, points_gdf)


def plot_simple_city(city_gdf, points_gdf):
    """
    Fallback simple city plot without contextily.
    """
    if city_gdf is None:
        return None

    fig, ax = plt.subplots(figsize=(12, 8), facecolor='#f8f9fa')
    ax.set_facecolor('#ffffff')

    # Plot city boundary
    city_gdf.plot(ax=ax, facecolor='#f0f0f0', edgecolor='#007acc', linewidth=2)

    # Plot sampled points
    if points_gdf is not None:
        points_gdf.plot(ax=ax, color='#ff4444', markersize=25, alpha=0.8)

    ax.set_xticks([])
    ax.set_yticks([])
    for spine in ax.spines.values():
        spine.set_visible(False)

    plt.tight_layout()
    return fig

