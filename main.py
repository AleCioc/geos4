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
import contextily as ctx
import matplotlib.patches as patches

# --- Initial Page Setup ---

st.set_page_config(
    page_title="GeoS4 OSMnx Demo",
    page_icon="🌍",
    layout="wide"
)


# --- Real Geographic Data Processing ---

@st.cache_data(show_spinner="Fetching city data from OpenStreetMap...")
def fetch_and_process_city_data(city_name, num_points, generation_mode, num_steps=16, num_tracks=4):
    """
    Fetches city geometry, samples points, and maps them to a sequencer grid.
    Returns the city GeoDataFrame, the points GeoDataFrame, and active cells data.
    """
    try:
        # Get the city's boundary polygon
        city_gdf = ox.geocode_to_gdf(city_name)
        city_polygon = city_gdf.unary_union
    except Exception as e:
        st.error(f"Could not find '{city_name}'. Please try a different query (e.g., 'Rome, Italy'). Error: {e}")
        return None, None, None

    minx, miny, maxx, maxy = city_polygon.bounds

    # Generate points based on mode
    points = []
    if generation_mode == "Random Points in Space":
        while len(points) < num_points:
            p = Point(np.random.uniform(minx, maxx), np.random.uniform(miny, maxy))
            # Check if the point is actually within the city's boundary
            if city_polygon.contains(p):
                points.append(p)

    points_gdf = gpd.GeoDataFrame(geometry=points, crs=city_gdf.crs)

    # --- Create active cells data structure ---
    # Calculate grid cell dimensions in geographic coordinates
    lng_step = (maxx - minx) / num_steps
    lat_step = (maxy - miny) / num_tracks

    active_cells = []

    # For each point, determine which sequencer cell it belongs to and create active cell data
    for point_idx, p in enumerate(points):
        # Map longitude to step (0-15)
        step_index = int((p.x - minx) / lng_step)
        step_index = min(step_index, num_steps - 1)  # Ensure within bounds

        # Map latitude to track (0-3) - invert the mapping so track 0 is at the top
        track_index = num_tracks - 1 - int((p.y - miny) / lat_step)
        track_index = max(0, min(track_index, num_tracks - 1))  # Ensure within bounds

        # Create active cell entry
        active_cells.append({
            "track": track_index,
            "step": step_index,
            "point_lng": p.x,
            "point_lat": p.y,
            "point_id": point_idx
        })

    # Also store the grid bounds for coordinate conversion in JavaScript
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

    return city_gdf, points_gdf, {"active_cells": active_cells, "grid_bounds": grid_bounds}


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


def create_webaudio_sequencer(version, active_cells_data, bpm, is_playing, timestamp, geojson_data=None):
    """
    Loads sequencer HTML from a file and injects Python data including GeoJSON and active cells.
    """
    filename_map = {
        'V0': 'sequencer_1.html'
    }

    filepath = filename_map.get(version)
    if not filepath or not os.path.exists(filepath):
        return f"<div>Error: {filepath} not found. Please create this file.</div>"

    with open(filepath, 'r', encoding='utf-8') as f:
        html_template = f.read()

    active_cells_json = json.dumps(active_cells_data)
    geojson_json = json.dumps(geojson_data) if geojson_data else 'null'

    # Inject all data including active cells directly into the HTML
    injection_script = f"""
        // --- Data Injected from Python ---
        const IS_PLAYING = {str(is_playing).lower()};
        const BPM = {bpm};
        const ACTIVE_CELLS_DATA = {active_cells_json};
        const GEOJSON_DATA = {geojson_json};
        const COMPONENT_TIMESTAMP = "{timestamp}";
        console.log("Component loaded at:", COMPONENT_TIMESTAMP);
        console.log("Active cells data:", ACTIVE_CELLS_DATA);
        console.log("GeoJSON data injected:", GEOJSON_DATA ? GEOJSON_DATA.features?.length + " points" : "null");
        // --- End of Injected Data ---
    """

    # Replace the placeholder with the actual data
    final_html = html_template.replace('// PYTHON_DATA_INJECTION_POINT', injection_script)

    return final_html


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

        # Add contextily basemap - using light theme
        try:
            ctx.add_basemap(ax, crs=city_web.crs, source=ctx.providers.CartoDB.Positron, alpha=0.8)
        except:
            # Fallback if contextily fails
            pass

        # Remove axes
        ax.set_xticks([])
        ax.set_yticks([])
        for spine in ax.spines.values():
            spine.set_visible(False)

        plt.tight_layout()
        return fig

    except Exception as e:
        # Fallback to simple plot
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


def generate_component_key(*args):
    """
    Generates a unique key for the component based on input parameters.
    This helps Streamlit know when to reload the component.
    """
    key_string = str(args)
    return hashlib.md5(key_string.encode()).hexdigest()[:8]


# --- Main Application Logic ---

def main():

    def load_css(file_name):
        with open(file_name, 'r', encoding='utf-8') as f:
            st.markdown(f'<style>{f.read()}</style>', unsafe_allow_html=True)

    load_css("styles.css")


    # Add top bar
    st.markdown("""
    <div style="background: linear-gradient(90deg, #1f1f1f 0%, #2d2d2d 100%); 
                padding: 15px 20px; 
                margin: -1rem -1rem 2rem -1rem; 
                border-bottom: 2px solid #00ff88;">
        <h1 style="color: #00ff88; margin: 0; font-family: 'Courier New', monospace; 
                   text-align: center; font-size: 2.5rem; font-weight: bold;">
            🌍 GeoS4 - Geographic Sequencer
        </h1>
        <p style="color: #e0e0e0; margin: 5px 0 0 0; text-align: center; 
                  font-size: 1rem; opacity: 0.8;">
            Transform city geography into musical patterns
        </p>
    </div>
    """, unsafe_allow_html=True)

    # --- Sidebar for Controls ---
    with st.sidebar:
        st.markdown("""
        <div>
            <h2>
                🎛️ CONTROL PANEL
            </h2>
        </div>
        """, unsafe_allow_html=True)

        sequencer_version = st.selectbox(
            "Select Sequencer Style",
            ('V0',),
            key='sequencer_version_selector'
        )

        st.markdown("---")
        st.subheader("📍 Points Generation")

        city_query = st.text_input("Enter a City Name", "Bari, Italy")

        generation_mode = st.selectbox(
            "Points Generation Mode",
            ("Random Points in Space",),
            key='generation_mode'
        )

        num_points = st.slider("Number of Sample Points", 5, 200, 50,
                               help="More points create a denser pattern.")

        if st.button("🏗️ Generate Pattern from City", type="primary"):
            with st.spinner(f"Fetching data for {city_query}..."):
                city_gdf, points_gdf, active_cells_data = fetch_and_process_city_data(
                    city_query, num_points, generation_mode)

                if city_gdf is not None:
                    # Convert to GeoJSON
                    geojson_data = convert_gdf_to_geojson(points_gdf)

                    # Store in session state
                    st.session_state.city_gdf = city_gdf
                    st.session_state.points_gdf = points_gdf
                    st.session_state.active_cells_data = active_cells_data
                    st.session_state.geojson_data = geojson_data
                    st.session_state.data_timestamp = time.time()

                    st.success(f"✅ Generated {num_points} points for {city_query}")
                    st.rerun()  # Force component reload with new data

    # --- Initialize State ---
    if 'active_cells_data' not in st.session_state:
        st.info("👆 Enter a city name and click 'Generate Pattern' to begin creating your geographical sequencer!")
        st.markdown("### How it works:")
        st.markdown("""
        1. **Select a city** - Enter any city name (e.g., 'Paris, France', 'Tokyo, Japan')
        2. **Generate points** - The app samples random geographic points within the city boundaries
        3. **Create patterns** - Points are mapped to a 16-step, 4-track sequencer grid
        4. **Play music** - Each track represents different spatial zones of the city
        """)
        st.stop()

    # --- Retrieve from State ---
    is_playing = st.session_state.get('is_playing', False)
    city_gdf = st.session_state.get('city_gdf')
    points_gdf = st.session_state.get('points_gdf')
    active_cells_data = st.session_state.get('active_cells_data')
    geojson_data = st.session_state.get('geojson_data')
    data_timestamp = st.session_state.get('data_timestamp', 0)
    control_timestamp = st.session_state.get('control_timestamp', 0)

    # --- Main Layout with Background ---

    # Create background map and convert to base64 for CSS background
    background_fig = create_background_map(city_gdf, points_gdf)

    if background_fig:
        # Save figure as temporary image
        import io
        import base64

        buf = io.BytesIO()
        background_fig.savefig(buf, format='png', bbox_inches='tight',
                               facecolor='#0E1117', dpi=150)
        buf.seek(0)
        img_data = base64.b64encode(buf.read()).decode()
        plt.close(background_fig)

        # Apply background CSS
        background_css = f"""
        <style>
        .stApp {{
            background-image: linear-gradient(rgba(248, 249, 250, 0.9), rgba(248, 249, 250, 0.9)), 
                             url('data:image/png;base64,{img_data}');
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            background-attachment: fixed;
        }}

        """
        st.markdown(background_css, unsafe_allow_html=True)

    # Sequencer component
    bpm = 90  # Default BPM since we removed controls

    webaudio_component = create_webaudio_sequencer(
        sequencer_version,
        active_cells_data,
        bpm,
        is_playing,
        str(time.time()),
        geojson_data
    )

    component_height = 900
    components.html(
        webaudio_component,
        height=component_height,
        scrolling=False
    )


if __name__ == "__main__":
    main()