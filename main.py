import streamlit as st
import numpy as np
import matplotlib.pyplot as plt
import json
import streamlit.components.v1 as components
import os
import time
import base64
import random
import folium
from streamlit_folium import st_folium

# Import geospatial utilities
from geospatial_utils import (
    generate_random_location, fetch_city_boundary, fetch_amenities,
    generate_random_points, apply_spatial_transformation,
    calculate_optimal_grid_dimensions, process_points_to_sequencer,
    convert_gdf_to_geojson, create_background_map
)

# --- Initial Page Setup ---

st.set_page_config(
    page_title="🌍 GeoS4 - Geographic Sequencer | Transform city geography into musical patterns",
    page_icon="🌍",
    layout="wide"
)

# Move header to Streamlit topbar using custom CSS
st.markdown("""
<style>
    /* Hide default Streamlit header and show custom one */
    header[data-testid="stHeader"] {
        height: 60px !important;
        background: linear-gradient(90deg, #0f0f0f 0%, #1a1a2e 100%) !important;
        border-bottom: 2px solid #00ff88 !important;
    }

    /* Custom header content in topbar */
    header[data-testid="stHeader"]::before {
        content: "🌍 GeoS4 - Geographic Sequencer | Transform city geography into musical patterns";
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #00ff88;
        font-family: 'Courier New', monospace;
        font-weight: bold;
        font-size: 1.2rem;
        text-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
        white-space: nowrap;
        z-index: 999;
    }

    /* Hide deploy button to make more space */
    .stDeployButton {
        display: none !important;
    }

    /* Adjust main content to account for custom header */
    .main .block-container {
        padding-top: 1rem !important;
    }
</style>
""", unsafe_allow_html=True)


# --- Audio File Processing ---

def process_uploaded_audio(uploaded_file, track_index):
    """
    Process an uploaded audio file and store it for the sequencer.
    """
    if uploaded_file is not None:
        # Read the file content
        audio_bytes = uploaded_file.read()

        # Convert to base64 for embedding in HTML
        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')

        # Determine MIME type based on file extension
        file_extension = uploaded_file.name.split('.')[-1].lower()
        mime_types = {
            'mp3': 'audio/mpeg',
            'wav': 'audio/wav',
            'ogg': 'audio/ogg',
            'm4a': 'audio/mp4',
            'aac': 'audio/aac'
        }
        mime_type = mime_types.get(file_extension, 'audio/mpeg')

        return {
            'data': audio_base64,
            'mime_type': mime_type,
            'filename': uploaded_file.name,
            'size': len(audio_bytes)
        }
    return None


def create_interactive_map(city_gdf, points_gdf):
    """
    Create an interactive Folium map showing city boundaries and points.
    """
    if city_gdf is None:
        return None

    try:
        # Get city bounds for map centering
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

        # Add points if available
        if points_gdf is not None and len(points_gdf) > 0:
            for idx, point in points_gdf.iterrows():
                folium.CircleMarker(
                    location=[point.geometry.y, point.geometry.x],
                    radius=5,
                    popup=f"Point {idx}",
                    color='#ff4444',
                    fillColor='#ff4444',
                    fillOpacity=0.8,
                    weight=2
                ).add_to(m)

        # Fit map to city bounds
        m.fit_bounds([[bounds[1], bounds[0]], [bounds[3], bounds[2]]])

        return m

    except Exception as e:
        st.error(f"Could not create interactive map: {e}")
        return None


def create_webaudio_sequencer(version, active_cells_data, bpm, is_playing, timestamp, geojson_data=None,
                              grid_config=None, custom_audio_files=None):
    """
    Loads sequencer HTML from a file and injects Python data and external JS files.
    """
    filename_map = {
        'V0': 'sequencer_1.html'
    }

    filepath = filename_map.get(version)
    if not filepath or not os.path.exists(filepath):
        return f"<div>Error: {filepath} not found. Please create this file.</div>"

    with open(filepath, 'r', encoding='utf-8') as f:
        html_template = f.read()

    # Load external JavaScript files
    sound_engine_js = ""
    sequencer_js = ""

    try:
        with open('sound_engine.js', 'r', encoding='utf-8') as f:
            sound_engine_js = f.read()
    except FileNotFoundError:
        st.warning("sound_engine.js not found - using inline version")

    try:
        with open('sequencer.js', 'r', encoding='utf-8') as f:
            sequencer_js = f.read()
    except FileNotFoundError:
        st.warning("sequencer.js not found - using inline version")

    active_cells_json = json.dumps(active_cells_data)
    geojson_json = json.dumps(geojson_data) if geojson_data else 'null'
    grid_config_json = json.dumps(grid_config) if grid_config else 'null'
    custom_audio_json = json.dumps(custom_audio_files) if custom_audio_files else 'null'

    # Inject all data including active cells directly into the HTML
    injection_script = f"""
        // --- External JavaScript Modules ---
        {sound_engine_js}

        {sequencer_js}

        // --- Data Injected from Python ---
        const IS_PLAYING = {str(is_playing).lower()};
        const BPM = {bpm};
        const ACTIVE_CELLS_DATA = {active_cells_json};
        const GEOJSON_DATA = {geojson_json};
        const GRID_CONFIG = {grid_config_json};
        const CUSTOM_AUDIO_FILES = {custom_audio_json};
        const COMPONENT_TIMESTAMP = "{timestamp}";
        console.log("Component loaded at:", COMPONENT_TIMESTAMP);
        console.log("Active cells data:", ACTIVE_CELLS_DATA);
        console.log("GeoJSON data injected:", GEOJSON_DATA ? GEOJSON_DATA.features?.length + " points" : "null");
        console.log("Grid config:", GRID_CONFIG);
        console.log("Custom audio files:", CUSTOM_AUDIO_FILES);
        // --- End of Injected Data ---
    """

    # Replace the placeholder with the actual data
    final_html = html_template.replace('// PYTHON_DATA_INJECTION_POINT', injection_script)

    return final_html


# --- Main Application Logic ---

def main():
    # Initialize session state variables consistently
    if "selected_location" not in st.session_state:
        st.session_state["selected_location"] = "Bari, Italy"

    if "random_location" not in st.session_state:
        st.session_state["random_location"] = None

    if "pattern_generated" not in st.session_state:
        st.session_state.pattern_generated = False

    # Track if music is playing to avoid stopping it
    if "music_playing" not in st.session_state:
        st.session_state.music_playing = False

    def load_css(file_name):
        if os.path.exists(file_name):
            with open(file_name, 'r', encoding='utf-8') as f:
                st.markdown(f'<style>{f.read()}</style>', unsafe_allow_html=True)

    load_css("styles.css")

    # Create tabs
    tab1, tab2, tab3 = st.tabs(["🚀 Get Started", "🗺️ Create Spatial Pattern", "🎵 Play!"])

    # --- TAB 1: Get Started ---
    with tab1:
        col1, col2 = st.columns([2, 1])

        with col1:
            st.markdown("## Welcome to GeoS4!")
            st.markdown("""
            **GeoS4** ( https://github.com/AleCioc/geos4 ) is an innovative tool that transforms real-world geographic data into musical patterns. 
            By mapping spatial information from cities onto a sequencer grid, you can create unique rhythmic 
            compositions inspired by urban landscapes.

            ### How it works:

            1. **🗺️ Select a Location**: Choose any city in the world or use our random country generator
            2. **📍 Choose Data Source**: Pick between real amenities (restaurants, shops, etc.) or random points
            3. **🔧 Apply Transformations**: Modify the spatial data with clustering, grid alignment, or noise
            4. **🎵 Create Music**: Points are mapped to a drum sequencer where each track represents different spatial zones
            5. **🎚️ Customize**: Upload your own sounds or use built-in drum samples

            ### Features:

            - **Real Geographic Data**: Uses OpenStreetMap to fetch actual city boundaries and amenities
            - **Random Country Discovery**: Explore cities from random countries around the world
            - **Spatial Transformations**: Apply mathematical operations to modify point distributions
            - **Interactive Sequencer**: Visual feedback showing which geographic points trigger sounds
            - **Adaptive Grid**: Sequencer automatically adapts to the shape of your geographic data
            - **Interactive Maps**: Explore your data with interactive Folium maps
            - **Custom Audio**: Upload your own sound files for each track
            - **Visual Mapping**: See exactly where your sounds come from on the city map

            ### Getting Started:

            Ready to turn your favorite city into a beat? Head over to the **"Create Spatial Pattern"** tab 
            to select your location and generate your first geographic pattern!
            """)

        with col2:
            st.markdown("### 🎯 Quick Tips")
            st.info("""
            **Best Results:**
            - Try cities with distinctive geographic features
            - Dense urban areas create complex rhythms
            - Coastal cities offer interesting patterns
            """)

            st.markdown("### 🌟 Examples to Try")
            st.success("""
            **Great Cities:**
            - "Manhattan, New York, USA"
            - "Venice, Italy" 
            - "Amsterdam, Netherlands"
            - "Bari, Italy"
            - "Barcelona, Spain"
            """)

            st.markdown("### 🎵 Music Tips")
            st.warning("""
            **For Better Sounds:**
            - Grid dimensions adapt automatically
            - Use different amenity types for variety
            - Try the random country generator
            """)

    # --- TAB 2: Create Spatial Pattern ---
    with tab2:
        st.markdown("## 🗺️ Create Your Spatial Pattern")

        col1, col2 = st.columns([1, 1])

        with col1:
            st.markdown("### 📍 Location & Data Source")

            # Location input with random location button
            location_col1, location_col2 = st.columns([3, 1])

            with location_col1:
                current_location = st.session_state.get("random_location") or st.session_state["selected_location"]
                new_location = st.text_input(
                    "Enter a geographic location",
                    value=current_location,
                    key="location_input_tab2"
                )
                if new_location != current_location:
                    st.session_state["selected_location"] = new_location
                    st.session_state["random_location"] = None

            with location_col2:
                if st.button("🎲 Random Country", help="Get a city from a random country", use_container_width=True,
                             key="random_tab2"):
                    random_location = generate_random_location()
                    if random_location:
                        st.session_state["random_location"] = random_location
                        st.session_state["selected_location"] = random_location
                        st.rerun()

            # Show current location
            location_query = st.session_state.get("random_location") or st.session_state["selected_location"]
            if st.session_state.get("random_location"):
                st.info(f"🎲 Random location: {location_query}")

            data_source = st.selectbox(
                "Data Source",
                ["Random Points", "Amenities"],
                help="Choose between random points or real amenities from OpenStreetMap"
            )

            if data_source == "Amenities":
                amenity_type = st.selectbox(
                    "Amenity Type",
                    ["restaurant", "cafe", "bar", "shop", "bank", "pharmacy", "school", "hospital", "fuel"],
                    help="Type of amenity to fetch from the city"
                )

            if data_source == "Random Points":
                num_points = st.slider("Number of Random Points", 10, 200, 50)

        with col2:
            st.markdown("### 🔧 Spatial Transformations")

            transformation = st.selectbox(
                "Transformation Type",
                ["None", "Clustering", "Grid Alignment", "Noise Addition"],
                help="Apply spatial transformations to modify point distributions"
            )

            # Transformation parameters
            if transformation == "Clustering":
                num_clusters = st.slider("Number of Clusters", 2, 10, 3)
            elif transformation == "Grid Alignment":
                grid_size = st.slider("Grid Size (degrees)", 0.0001, 0.01, 0.001, format="%.4f")
            elif transformation == "Noise Addition":
                noise_level = st.slider("Noise Level (degrees)", 0.00001, 0.001, 0.0001, format="%.5f")

        # Generate button
        st.markdown("---")
        if st.button("🏗️ Generate Spatial Pattern", type="primary", use_container_width=True):
            with st.spinner(f"Processing {location_query}..."):
                # Step 1: Fetch city boundary
                city_gdf, city_polygon = fetch_city_boundary(location_query)

                if city_gdf is not None:
                    # Step 2: Get points based on data source
                    if data_source == "Random Points":
                        points = generate_random_points(city_polygon, num_points)
                        points_gdf = city_gdf.__class__(geometry=points, crs=city_gdf.crs)
                        data_info = f"{num_points} random points"
                    else:  # Amenities
                        points_gdf = fetch_amenities(location_query, amenity_type)
                        if points_gdf is not None:
                            data_info = f"{len(points_gdf)} {amenity_type} amenities"
                        else:
                            st.stop()

                    # Step 3: Apply spatial transformation
                    if transformation != "None" and points_gdf is not None:
                        transform_params = {}
                        if transformation == "Clustering":
                            transform_params['num_clusters'] = num_clusters
                        elif transformation == "Grid Alignment":
                            transform_params['grid_size'] = grid_size
                        elif transformation == "Noise Addition":
                            transform_params['noise_level'] = noise_level

                        points_gdf = apply_spatial_transformation(points_gdf, transformation, **transform_params)
                        data_info += f" + {transformation}"

                    # Step 4: Calculate optimal grid dimensions
                    optimal_steps, optimal_tracks = calculate_optimal_grid_dimensions(points_gdf, city_gdf)

                    # Step 5: Process to sequencer format
                    active_cells_data = process_points_to_sequencer(city_gdf, points_gdf, optimal_steps, optimal_tracks)
                    geojson_data = convert_gdf_to_geojson(points_gdf)

                    # Store in session state
                    st.session_state.city_gdf = city_gdf
                    st.session_state.points_gdf = points_gdf
                    st.session_state.active_cells_data = active_cells_data
                    st.session_state.geojson_data = geojson_data
                    st.session_state.grid_config = {'num_steps': optimal_steps, 'num_tracks': optimal_tracks}
                    st.session_state.data_info = data_info
                    st.session_state.city_name = location_query
                    st.session_state.pattern_generated = True

                    st.success(f"✅ Generated pattern from {data_info} in {location_query}")
                    st.balloons()

        # Show current pattern info
        if st.session_state.pattern_generated:
            st.markdown("---")
            st.markdown("### 📊 Current Pattern")

            col5, col6 = st.columns([2, 1])

            with col5:
                # Create and display interactive map
                interactive_map = create_interactive_map(
                    st.session_state.get('city_gdf'),
                    st.session_state.get('points_gdf')
                )
                if interactive_map:
                    st.markdown("#### 🗺️ Interactive Map")
                    st_folium(interactive_map, width=700, height=400)

            with col6:
                grid_config = st.session_state.get('grid_config', {})
                st.info(f"""
                **City:** {st.session_state.get('city_name', 'Unknown')}

                **Data:** {st.session_state.get('data_info', 'Unknown')}

                **Adaptive Grid:** {grid_config.get('num_steps', 0)} × {grid_config.get('num_tracks', 0)}

                **Active Cells:** {len(st.session_state.get('active_cells_data', {}).get('active_cells', []))}
                """)

                # Enhanced navigation with clearer buttons
                st.markdown("### 🎵 Ready to Play!")

                st.success("✅ Pattern ready! Switch to the 'Play!' tab to hear your creation.")

                st.markdown("### 📊 Quick Preview")
                st.write(
                    f"🗺️ **{len(st.session_state.get('geojson_data', {}).get('features', []))} points** mapped to sequencer")
                st.write(
                    f"🎛️ **{len(st.session_state.get('active_cells_data', {}).get('active_cells', []))} active cells** will trigger sounds")

    # --- TAB 3: Play! ---
    with tab3:
        if not st.session_state.get('pattern_generated', False):
            # Show pattern generation interface in Play tab
            st.markdown("## 🎵 Geographic Sequencer")
            st.warning("⚠️ No pattern generated yet!")

            # Quick pattern generation interface
            st.markdown("### 🚀 Quick Pattern Generation")

            quick_col1, quick_col2 = st.columns([2, 1])

            with quick_col1:
                # Random location generator
                if st.button("🎲 Random Country + Random Amenity", type="primary", use_container_width=True,
                             key="random_tab3"):
                    generate_random_pattern_for_play()

            with quick_col2:
                st.info("Or go to 'Create Spatial Pattern' tab for more control")

            if not st.session_state.get('pattern_generated', False):
                st.stop()

        # Show sequencer interface
        grid_config = st.session_state.get('grid_config', {'num_steps': 16, 'num_tracks': 4})
        data_info = st.session_state.get('data_info', 'Unknown')
        city_name = st.session_state.get('city_name', 'Unknown')

        # Top section with pattern info and new pattern control
        top_col1, top_col2 = st.columns([3, 1])

        with top_col1:
            st.markdown(f"""
            <div style="background: rgba(0, 0, 0, 0.8); padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                <h4 style="color: #00ff88; margin: 0 0 10px 0;">🎼 {city_name}</h4>
                <p style="color: #e0e0e0; margin: 0; font-size: 0.9rem;">
                    📊 {data_info} • 🎛️ {grid_config['num_steps']} × {grid_config['num_tracks']} adaptive grid
                </p>
            </div>
            """, unsafe_allow_html=True)

        with top_col2:
            # Spatial pattern controls in Play tab
            with st.expander("🗺️ New Pattern", expanded=False):
                if st.button("🎲 Random Country + Amenity", key="play_random", use_container_width=True):
                    # Use separate function to avoid stopping music
                    generate_random_pattern_for_play()

        # Retrieve from session state
        city_gdf = st.session_state.get('city_gdf')
        points_gdf = st.session_state.get('points_gdf')
        active_cells_data = st.session_state.get('active_cells_data')
        geojson_data = st.session_state.get('geojson_data')
        custom_audio_files = st.session_state.get('custom_audio_files', {})

        # Create background map
        background_fig = create_background_map(city_gdf, points_gdf)

        if background_fig:
            # Save figure as temporary image
            import io
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
            </style>
            """
            st.markdown(background_css, unsafe_allow_html=True)

        # Sequencer component
        bpm = 90
        is_playing = st.session_state.get('is_playing', False)
        sequencer_version = 'V0'

        webaudio_component = create_webaudio_sequencer(
            sequencer_version,
            active_cells_data,
            bpm,
            is_playing,
            str(time.time()),
            geojson_data,
            grid_config,
            custom_audio_files
        )

        # Adjust component height based on number of tracks
        base_height = 700
        extra_height_per_track = 30
        component_height = base_height + (grid_config['num_tracks'] - 4) * extra_height_per_track
        component_height = max(600, min(component_height, 1200))

        components.html(
            webaudio_component,
            height=component_height,
            scrolling=False,
            #key=f"sequencer_{st.session_state.get('sequencer_key', 0)}"  # Use key to avoid recreation
        )


def generate_random_pattern_for_play():
    """
    Generate a random pattern without stopping the current music by preserving sequencer state.
    """
    with st.spinner("Generating new pattern..."):
        # Get random location
        random_location = generate_random_location()
        if random_location:
            location_query = random_location
            amenities = ["restaurant", "cafe", "bar", "shop", "bank", "pharmacy"]
            amenity_type = random.choice(amenities)

            city_gdf, city_polygon = fetch_city_boundary(location_query)

            if city_gdf is not None:
                points_gdf = fetch_amenities(location_query, amenity_type)

                if points_gdf is None or len(points_gdf) == 0:
                    points = generate_random_points(city_polygon, random.randint(20, 60))
                    points_gdf = city_gdf.__class__(geometry=points, crs=city_gdf.crs)
                    data_info = f"{len(points)} random points"
                else:
                    data_info = f"{len(points_gdf)} {amenity_type} amenities"

                # Calculate optimal grid dimensions
                optimal_steps, optimal_tracks = calculate_optimal_grid_dimensions(points_gdf, city_gdf)

                active_cells_data = process_points_to_sequencer(city_gdf, points_gdf, optimal_steps, optimal_tracks)
                geojson_data = convert_gdf_to_geojson(points_gdf)

                # Update session state without triggering component recreation
                st.session_state.city_gdf = city_gdf
                st.session_state.points_gdf = points_gdf
                st.session_state.active_cells_data = active_cells_data
                st.session_state.geojson_data = geojson_data
                st.session_state.grid_config = {'num_steps': optimal_steps, 'num_tracks': optimal_tracks}
                st.session_state.data_info = data_info
                st.session_state.city_name = location_query
                st.session_state["random_location"] = location_query
                st.session_state["selected_location"] = location_query

                # Increment sequencer key to update data without stopping music
                if 'sequencer_key' not in st.session_state:
                    st.session_state.sequencer_key = 0
                st.session_state.sequencer_key += 1

                st.success(f"🎉 New pattern: {location_query}")
                st.rerun()


if __name__ == "__main__":
    main()
