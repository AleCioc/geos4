"""
GeoS4 - Play Tab
Simplified version with only the sequencer component - No Streamlit messages
"""
import streamlit as st
import streamlit.components.v1 as components
import matplotlib.pyplot as plt
import base64
import json
import time
import os
from .geospatial_utils import create_background_map


def create_layer_union_for_sequencer(layer_data):
    """Create union of all patterns in a layer for sequencer use"""
    patterns = layer_data.get('patterns', [])
    if not patterns:
        return None

    try:
        # If only one pattern, use it directly
        if len(patterns) == 1:
            pattern = patterns[0]
            return {
                'geojson_data': pattern.get('geojson_data'),
                'city_bounds_data': pattern.get('city_bounds_data'),
                'active_cells_data': pattern.get('active_cells_data'),
                'grid_config': pattern.get('grid_config', {'num_steps': 16, 'num_tracks': 4}),
                'location_name': pattern.get('location_name', ''),
                'data_info': pattern.get('data_info', ''),
                'has_geodata': pattern.get('city_gdf') is not None and pattern.get('points_gdf') is not None
            }

        # Multiple patterns - create union with boundary preservation
        import geopandas as gpd
        import pandas as pd
        from .geospatial_utils import convert_gdf_to_geojson, process_points_to_sequencer

        # Collect all points and city boundaries
        all_points = []
        all_city_gdfs = []
        all_locations = []
        all_data_info = []

        for pattern in patterns:
            points_gdf = pattern.get('points_gdf')
            city_gdf = pattern.get('city_gdf')

            if points_gdf is not None and not points_gdf.empty:
                all_points.append(points_gdf)

            if city_gdf is not None and not city_gdf.empty:
                all_city_gdfs.append(city_gdf)

            if pattern.get('location_name'):
                all_locations.append(pattern['location_name'])

            if pattern.get('data_info'):
                all_data_info.append(pattern['data_info'])

        if not all_points:
            return None

        # Union all points
        if len(all_points) == 1:
            union_points_gdf = all_points[0]
        else:
            # Concatenate all points with consistent CRS
            base_crs = all_points[0].crs
            aligned_points = []
            for points_gdf in all_points:
                if points_gdf.crs != base_crs:
                    points_gdf = points_gdf.to_crs(base_crs)
                aligned_points.append(points_gdf)
            union_points_gdf = gpd.GeoDataFrame(
                pd.concat(aligned_points, ignore_index=True),
                crs=base_crs
            )

        # Union all city boundaries - PRESERVE ORIGINAL BOUNDARIES
        if len(all_city_gdfs) == 1:
            union_city_gdf = all_city_gdfs[0]
        else:
            # Keep all original boundaries instead of dissolving them
            base_crs = all_city_gdfs[0].crs
            aligned_cities = []
            for city_gdf in all_city_gdfs:
                if city_gdf.crs != base_crs:
                    city_gdf = city_gdf.to_crs(base_crs)
                aligned_cities.append(city_gdf)

            # Concatenate boundaries preserving individual shapes
            union_city_gdf = gpd.GeoDataFrame(
                pd.concat(aligned_cities, ignore_index=True),
                crs=base_crs
            )

        # Create combined metadata
        combined_location = " + ".join(all_locations) if all_locations else "Multiple Locations"
        combined_data_info = " + ".join(all_data_info) if all_data_info else "Multiple Patterns"

        # Generate optimal grid for union
        from .geospatial_utils import calculate_optimal_grid_dimensions
        optimal_steps, optimal_tracks = calculate_optimal_grid_dimensions(union_points_gdf, union_city_gdf)

        # Process union to sequencer format
        active_cells_data = process_points_to_sequencer(union_city_gdf, union_points_gdf, optimal_steps, optimal_tracks)

        # Generate GeoJSON for union
        geojson_data = convert_gdf_to_geojson(union_points_gdf)
        city_bounds_data = convert_gdf_to_geojson(union_city_gdf)

        return {
            'geojson_data': geojson_data,
            'city_bounds_data': city_bounds_data,
            'active_cells_data': active_cells_data,
            'grid_config': {'num_steps': optimal_steps, 'num_tracks': optimal_tracks},
            'location_name': combined_location,
            'data_info': combined_data_info,
            'has_geodata': True,
            'union_info': {
                'pattern_count': len(patterns),
                'total_points': len(union_points_gdf),
                'locations': all_locations,
                'data_types': all_data_info
            }
        }

    except Exception as e:
        st.error(f"Error creating layer union for sequencer: {e}")
        return None


def prepare_layer_data_for_sequencer():
    """Prepare layer data for the sequencer component with union support"""

    # Check for stored layers and current layer selection
    if hasattr(st.session_state, 'stored_layers') and st.session_state.stored_layers:
        if st.session_state.get('current_layer'):
            layer = st.session_state.current_layer

            # Create union of all patterns in the layer
            union_data = create_layer_union_for_sequencer(layer)

            if union_data:
                return {
                    'mode': 'layer_union',
                    'layer_data': {
                        'id': layer.get('id', 1),
                        'name': layer.get('name', 'Selected Layer'),
                        'active': True,
                        'muted': False,
                        'solo': False,
                        'volume': 1.0,
                        'color': '#00ff88',
                        **union_data  # Include all union data
                    }
                }

    # Fallback to session state pattern (legacy mode)
    elif st.session_state.get('pattern_generated', False):
        return {
            'mode': 'legacy_pattern',
            'layer_data': {
                'id': 0,
                'name': 'Session Pattern',
                'active': True,
                'muted': False,
                'solo': False,
                'volume': 1.0,
                'color': '#ff9800',
                'geojson_data': st.session_state.get('geojson_data'),
                'city_bounds_data': st.session_state.get('city_bounds_data'),
                'active_cells_data': st.session_state.get('active_cells_data'),
                'grid_config': st.session_state.get('grid_config', {'num_steps': 16, 'num_tracks': 4}),
                'location_name': st.session_state.get('city_name', ''),
                'data_info': st.session_state.get('data_info', ''),
                'has_geodata': st.session_state.get('city_gdf') is not None and st.session_state.get('points_gdf') is not None
            }
        }

    else:
        return {
            'mode': 'no_data',
            'layer_data': None
        }


def create_webaudio_sequencer(version, active_cells_data, bpm, is_playing, timestamp, geojson_data=None,
                              grid_config=None, custom_audio_files=None, city_bounds_data=None,
                              initial_zoom_bounds=None, layer_data=None, mode='layer_union'):
    """Create sequencer HTML with enhanced controls organization"""

    # Updated path to sequencer module
    sequencer_base_path = '../geos4_sequencers/horizontal_grid_sequencer_0'

    st.write(sequencer_base_path)

    filename_map = {
        'V0': 'horizontal_grid_sequencer_single_layer.html'
    }

    filepath = os.path.join(sequencer_base_path, filename_map.get(version, 'horizontal_grid_sequencer_single_layer.html'))

    if not os.path.exists(filepath):
        return f"<div>Error: {filepath} not found. Please ensure the sequencer module is properly installed.</div>"

    with open(filepath, 'r', encoding='utf-8') as f:
        html_template = f.read()

    # Load external JavaScript files
    js_files = [
        'sound_engine.js',
        'track.js',
        'sequencer_cell.js',
        'sequencer_layer.js',
        'horizontal_grid_sequencer.js',
        'sequencer.js',
        'geographic_visualizer.js'
    ]

    combined_js = ""

    for js_file in js_files:
        js_path = os.path.join(sequencer_base_path, js_file)
        try:
            with open(js_path, 'r', encoding='utf-8') as f:
                combined_js += f"\n// --- {js_file} ---\n"
                combined_js += f.read()
                combined_js += "\n"
        except FileNotFoundError:
            st.warning(f"{js_file} not found in sequencer module - some features may not work")

    # Prepare data for injection
    active_cells_json = json.dumps(active_cells_data) if active_cells_data else 'null'
    geojson_json = json.dumps(geojson_data) if geojson_data else 'null'
    grid_config_json = json.dumps(grid_config) if grid_config else 'null'
    custom_audio_json = json.dumps(custom_audio_files) if custom_audio_files else 'null'
    city_bounds_json = json.dumps(city_bounds_data) if city_bounds_data else 'null'
    initial_zoom_bounds_json = json.dumps(initial_zoom_bounds) if initial_zoom_bounds else 'null'
    layer_data_json = json.dumps(layer_data) if layer_data else 'null'
    mode_json = json.dumps(mode)

    # Inject all data including external JS modules
    injection_script = f"""
        // --- External JavaScript Modules ---
        {combined_js}

        // --- Data Injected from Python ---
        const IS_PLAYING = {str(is_playing).lower()};
        const BPM = {bpm};
        const ACTIVE_CELLS_DATA = {active_cells_json};
        const GEOJSON_DATA = {geojson_json};
        const GRID_CONFIG = {grid_config_json};
        const CUSTOM_AUDIO_FILES = {custom_audio_json};
        const CITY_BOUNDS_DATA = {city_bounds_json};
        const INITIAL_ZOOM_BOUNDS = {initial_zoom_bounds_json};
        const LAYER_DATA = {layer_data_json};
        const SEQUENCER_MODE = {mode_json};
        const COMPONENT_TIMESTAMP = "{timestamp}";
        
        console.log("Component loaded at:", COMPONENT_TIMESTAMP);
        console.log("Sequencer mode:", SEQUENCER_MODE);
        console.log("Layer data:", LAYER_DATA);
        console.log("Active cells data:", ACTIVE_CELLS_DATA);
        console.log("GeoJSON data injected:", GEOJSON_DATA ? GEOJSON_DATA.features?.length + " points" : "null");
        console.log("Grid config:", GRID_CONFIG);
        console.log("City bounds data:", CITY_BOUNDS_DATA ? "loaded" : "null");
        
        // Initialize sequencer
        document.addEventListener('DOMContentLoaded', () => {{
            setTimeout(() => {{
                if (window.sequencer) {{
                    console.log("Sequencer initialized in layer union mode");
                    
                    // Load layer data if available
                    if (LAYER_DATA) {{
                        console.log("Loading layer union data:", LAYER_DATA.name || "Unknown");
                        
                        // Load the layer data into sequencer through layer system
                        if (typeof window.sequencer.loadLayerData === 'function') {{
                            window.sequencer.loadLayerData(LAYER_DATA);
                        }} else {{
                            console.warn("Layer loading not available - using legacy mode");
                        }}
                    }}
                    
                }} else {{
                    console.error("Sequencer not available");
                }}
            }}, 100);
        }});
        
        // --- End of Injected Data ---
    """

    # Replace the placeholder with the actual data
    final_html = html_template.replace('// PYTHON_DATA_INJECTION_POINT', injection_script)

    return final_html


def render_play_tab():
    """Render the simplified Play tab with only the sequencer component - NO Streamlit messages"""

    # REMOVED: All Streamlit info messages about layer selection

    # Prepare data for sequencer
    sequencer_data = prepare_layer_data_for_sequencer()
    layer_data = sequencer_data['layer_data']
    mode = sequencer_data['mode']

    # Create background map if we have data
    background_fig = None
    if layer_data and layer_data.get('has_geodata'):
        # Get the actual GeoDataFrames from layer patterns
        if sequencer_data['mode'] == 'layer_union' and st.session_state.get('current_layer'):
            # For layer union, create union GeoDataFrames for background
            try:
                from .tab_layers import create_layer_union
                union_points_gdf, union_city_gdf, _, _, _ = create_layer_union(st.session_state.current_layer)
                if union_points_gdf is not None and union_city_gdf is not None:
                    background_fig = create_background_map(union_city_gdf, union_points_gdf)
            except Exception as e:
                st.error(f"Error creating union background map: {e}")
        else:
            # Legacy mode
            city_gdf = st.session_state.get('city_gdf')
            points_gdf = st.session_state.get('points_gdf')
            if city_gdf is not None and points_gdf is not None:
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

    # SEQUENCER COMPONENT - FULL HEIGHT AND ONLY COMPONENT
    bpm = 90
    is_playing = st.session_state.get('is_playing', False)
    sequencer_version = 'V0'

    # Prepare sequencer data
    if layer_data:
        active_cells_data = layer_data.get('active_cells_data')
        geojson_data = layer_data.get('geojson_data')
        grid_config = layer_data.get('grid_config')
        city_bounds_data = layer_data.get('city_bounds_data')
        initial_zoom_bounds = None  # Use maximum bounds
        custom_audio_files = {}
    else:
        active_cells_data = None
        geojson_data = None
        grid_config = {'num_steps': 16, 'num_tracks': 4}
        city_bounds_data = None
        initial_zoom_bounds = None
        custom_audio_files = {}

    webaudio_component = create_webaudio_sequencer(
        sequencer_version,
        active_cells_data,
        bpm,
        is_playing,
        str(time.time()),
        geojson_data,
        grid_config,
        custom_audio_files,
        city_bounds_data,
        initial_zoom_bounds,
        layer_data,
        mode
    )

    component_height = 1300  # Keep same for good functionality

    components.html(
        webaudio_component,
        height=component_height,
        scrolling=False,
    )