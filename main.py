import streamlit as st
import numpy as np
import matplotlib.pyplot as plt
import json
import streamlit.components.v1 as components
import os
import geopandas as gpd
import osmnx as ox
from shapely.geometry import Point
import time
import hashlib

# --- Initial Page Setup ---

st.set_page_config(
    page_title="GeoS4 OSMnx Demo",
    page_icon="🌍",
    layout="wide"
)


# --- Real Geographic Data Processing ---

@st.cache_data(show_spinner="Fetching city data from OpenStreetMap...")
def fetch_and_process_city_data(city_name, num_points, num_steps=16, num_tracks=4):
    """
    Fetches city geometry, samples points, and maps them to a sequencer grid.
    Returns the city GeoDataFrame, the points GeoDataFrame, and the sequencer grid.
    """
    try:
        # Get the city's boundary polygon
        city_gdf = ox.geocode_to_gdf(city_name)
        city_polygon = city_gdf.unary_union
    except Exception as e:
        st.error(f"Could not find '{city_name}'. Please try a different query (e.g., 'Rome, Italy'). Error: {e}")
        return None, None, None

    minx, miny, maxx, maxy = city_polygon.bounds

    # Generate random points within the bounding box
    points = []
    while len(points) < num_points:
        p = Point(np.random.uniform(minx, maxx), np.random.uniform(miny, maxy))
        # Check if the point is actually within the city's boundary
        if city_polygon.contains(p):
            points.append(p)

    points_gdf = gpd.GeoDataFrame(geometry=points, crs=city_gdf.crs)

    # --- Map points to sequencer grid ---
    sequencer_grid = np.full((num_tracks, num_steps), False)

    # Define track boundaries based on latitude (y-axis)
    lat_bins = np.linspace(miny, maxy, num_tracks + 1)

    for p in points:
        # Map longitude (x-axis) to step (0-15)
        step_index = int(((p.x - minx) / (maxx - minx)) * (num_steps - 1))

        # Map latitude (y-axis) to track (0-3)
        track_index = -1
        for i in range(num_tracks):
            if p.y >= lat_bins[i] and p.y <= lat_bins[i + 1]:
                track_index = i
                break

        if track_index != -1:
            sequencer_grid[track_index, step_index] = True

    return city_gdf, points_gdf, sequencer_grid


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


def create_webaudio_sequencer(version, sequencer_data, bpm, is_playing, timestamp, geojson_data=None):
    """
    Loads sequencer HTML from a file and injects Python data including GeoJSON.
    """
    filename_map = {
        'V0': 'sequencer_1.html'
    }

    filepath = filename_map.get(version)
    if not filepath or not os.path.exists(filepath):
        return f"<div>Error: {filepath} not found. Please create this file.</div>"

    with open(filepath, 'r', encoding='utf-8') as f:
        html_template = f.read()

    sequencer_json = json.dumps(sequencer_data.tolist())
    geojson_json = json.dumps(geojson_data) if geojson_data else 'null'

    # Inject all data including GeoJSON directly into the HTML
    injection_script = f"""
    // --- Data Injected from Python ---
    const IS_PLAYING = {str(is_playing).lower()};
    const BPM = {bpm};
    const SEQUENCER_GRID = {sequencer_json};
    const GEOJSON_DATA = {geojson_json};
    const COMPONENT_TIMESTAMP = "{timestamp}";
    console.log("Component loaded at:", COMPONENT_TIMESTAMP);
    console.log("GeoJSON data injected:", GEOJSON_DATA ? GEOJSON_DATA.features?.length + " points" : "null");
    // --- End of Injected Data ---
    """

    # Replace the placeholder with the actual data
    final_html = html_template.replace('// PYTHON_DATA_INJECTION_POINT', injection_script)

    return final_html


def plot_real_city(city_gdf, points_gdf):
    """
    Uses Matplotlib to draw the city map and the sampled points.
    """
    if city_gdf is None:
        return None

    fig, ax = plt.subplots(figsize=(10, 8), facecolor='#0E1117')
    ax.set_facecolor('#1E1E1E')

    # Plot city boundary
    city_gdf.plot(ax=ax, facecolor='#262730', edgecolor='#00ff88', linewidth=2)

    # Plot sampled points
    if points_gdf is not None:
        points_gdf.plot(ax=ax, color='cyan', markersize=25, alpha=0.8)

    ax.set_xticks([])
    ax.set_yticks([])
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['bottom'].set_visible(False)
    ax.spines['left'].set_visible(False)
    plt.title("Sampled Geographic Points", color='white', fontsize=16)

    return fig


def generate_component_key(*args):
    """
    Generates a unique key for the component based on input parameters.
    This helps Streamlit know when to reload the component.
    """
    key_string = str(args)
    return hashlib.md5(key_string.encode()).hexdigest()[:8]


# --- Main Application Logic ---

def main():
    st.title("🌍 GeoS4: Real-World Data Sequencer")
    st.markdown("This version uses **OpenStreetMap** data to generate musical patterns from real city geographies.")

    # --- Sidebar for Controls ---
    with st.sidebar:
        st.header("🎛️ GeoS4 Controls")

        sequencer_version = st.selectbox(
            "Select Sequencer Style",
            ('V0',),
            key='sequencer_version_selector'
        )

        st.markdown("---")
        st.subheader("📍 Data Generation")

        city_query = st.text_input("Enter a City Name", "Bari, Italy")
        num_points = st.slider("Number of Sample Points", 5, 200, 50,
                               help="More points create a denser pattern.")

        if st.button("🏗️ Generate Pattern from City", type="primary"):
            with st.spinner(f"Fetching data for {city_query}..."):
                city_gdf, points_gdf, sequencer_grid = fetch_and_process_city_data(city_query, num_points)

                if city_gdf is not None:
                    # Convert to GeoJSON
                    geojson_data = convert_gdf_to_geojson(points_gdf)

                    # Store in session state
                    st.session_state.city_gdf = city_gdf
                    st.session_state.points_gdf = points_gdf
                    st.session_state.sequencer_grid = sequencer_grid
                    st.session_state.geojson_data = geojson_data
                    st.session_state.data_timestamp = time.time()

                    st.success(f"✅ Generated {num_points} points for {city_query}")
                    st.rerun()  # Force component reload with new data

        st.markdown("---")
        st.subheader("🎵 Playback")
        bpm = st.slider("Tempo (BPM)", 60, 240, 120)

        # Playback controls
        col1, col2 = st.columns(2)
        with col1:
            if st.button("▶️ Play", use_container_width=True):
                st.session_state.is_playing = True
                st.session_state.control_timestamp = time.time()
                st.rerun()

        with col2:
            if st.button("⏹️ Stop", use_container_width=True):
                st.session_state.is_playing = False
                st.session_state.control_timestamp = time.time()
                st.rerun()

        # Display current status
        is_playing = st.session_state.get('is_playing', False)
        status_text = "🎵 Playing" if is_playing else "⏸️ Stopped"
        st.info(f"Status: {status_text}")

        st.markdown("---")
        st.subheader("📊 Data Info")
        if 'geojson_data' in st.session_state:
            geojson_data = st.session_state.geojson_data
            if geojson_data and 'features' in geojson_data:
                st.metric("Points Loaded", len(geojson_data['features']))
                st.metric("BPM Setting", bpm)
        else:
            st.info("No data loaded yet")

    # --- Initialize State ---
    if 'sequencer_grid' not in st.session_state:
        st.info("👆 Enter a city name and click 'Generate Pattern' to begin creating your geographical sequencer!")
        st.markdown("### How it works:")
        st.markdown("""
        1. **Select a city** - Enter any city name (e.g., 'Paris, France', 'Tokyo, Japan')
        2. **Generate points** - The app samples random geographic points within the city boundaries
        3. **Create patterns** - Points are mapped to a 16-step, 4-track sequencer grid
        4. **Play music** - Each track represents different spatial features (density, clusters, edges, outliers)
        """)
        st.stop()

    # --- Retrieve from State ---
    is_playing = st.session_state.get('is_playing', False)
    city_gdf = st.session_state.get('city_gdf')
    points_gdf = st.session_state.get('points_gdf')
    sequencer_grid = st.session_state.get('sequencer_grid')
    geojson_data = st.session_state.get('geojson_data')
    data_timestamp = st.session_state.get('data_timestamp', 0)
    control_timestamp = st.session_state.get('control_timestamp', 0)

    # --- Main Layout ---
    col1, col2 = st.columns([2, 1])

    with col1:
        st.subheader(f"🎹 Interactive Sequencer ({sequencer_version})")

        # Generate unique component content based on current state
        webaudio_component = create_webaudio_sequencer(
            sequencer_version,
            sequencer_grid,
            bpm,
            is_playing,
            str(time.time()),  # Use current timestamp as unique identifier
            geojson_data  # Pass GeoJSON data directly
        )

        component_height = 900
        components.html(
            webaudio_component,
            height=component_height,
            scrolling=False
        )

    with col2:
        st.subheader("🗺️ Geographic Data")

        # Show the map
        fig = plot_real_city(city_gdf, points_gdf)
        if fig:
            st.pyplot(fig, use_container_width=True)
            plt.close(fig)
        else:
            st.info("Generate data to see the map")

        # Show some statistics
        if points_gdf is not None:
            st.markdown("### 📈 Pattern Statistics")
            total_active = np.sum(sequencer_grid)
            total_possible = sequencer_grid.size
            density = (total_active / total_possible) * 100

            st.metric("Active Steps", f"{total_active}/{total_possible}")
            st.metric("Pattern Density", f"{density:.1f}%")

            # Track breakdown
            track_names = ["🥁 Density", "🎯 Clusters", "⚡ Edges", "✨ Outliers"]
            for i, name in enumerate(track_names):
                count = np.sum(sequencer_grid[i])
                st.metric(name, f"{count}/16")


if __name__ == "__main__":
    main()