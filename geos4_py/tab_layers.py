"""
GeoS4 - Layers Management Tab
Simplified version with layer list and maps - Preserves boundary shapes in union
"""
import streamlit as st
import folium
import geopandas as gpd
import pandas as pd
from streamlit_folium import st_folium
from .geospatial_utils import create_interactive_map_with_points_bounds, convert_gdf_to_geojson, process_points_to_sequencer


def create_layer_union(layer_data):
    """Create union of all patterns in a layer for sequencer use - PRESERVES boundary shapes"""
    patterns = layer_data.get('patterns', [])
    if not patterns:
        return None, None, None, None, None

    try:
        # Collect all points and city boundaries from patterns
        all_points = []
        all_location_gdfs = []
        all_locations = []
        all_data_info = []

        for pattern in patterns:
            points_gdf = pattern.get('points_gdf')
            location_gdf = pattern.get('city_gdf')

            if points_gdf is not None and not points_gdf.empty:
                all_points.append(points_gdf)

            if location_gdf is not None and not location_gdf.empty:
                all_location_gdfs.append(location_gdf)

            if pattern.get('location_name'):
                all_locations.append(pattern['location_name'])

            if pattern.get('data_info'):
                all_data_info.append(pattern['data_info'])

        if not all_points:
            return None, None, None, None, None

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

        # PRESERVE all city boundaries - DO NOT dissolve them
        if len(all_location_gdfs) == 1:
            union_city_gdf = all_location_gdfs[0]
        else:
            # Keep all original boundary shapes instead of creating a dissolved union
            base_crs = all_location_gdfs[0].crs
            aligned_locations = []
            for location_gdf in all_location_gdfs:
                if location_gdf.crs != base_crs:
                    location_gdf = location_gdf.to_crs(base_crs)
                aligned_locations.append(location_gdf)

            # Concatenate all city boundaries preserving individual shapes
            # This keeps bordering boundaries as separate features
            union_city_gdf = gpd.GeoDataFrame(
                pd.concat(aligned_locations, ignore_index=True),
                crs=base_crs
            )

        # Create combined metadata
        combined_location = " + ".join(all_locations) if all_locations else "Multiple Locations"
        combined_data_info = " + ".join(all_data_info) if all_data_info else "Multiple Patterns"

        # Generate GeoJSON and other data for sequencer
        geojson_data = convert_gdf_to_geojson(union_points_gdf)
        city_bounds_data = convert_gdf_to_geojson(union_city_gdf)

        return union_points_gdf, union_city_gdf, combined_location, combined_data_info, {
            'geojson_data': geojson_data,
            'city_bounds_data': city_bounds_data
        }

    except Exception as e:
        st.error(f"Error creating layer union: {e}")
        return None, None, None, None, None


def create_simple_points_map(union_city_gdf, union_points_gdf):
    """Create a simple map that manually calculates zoom and center from points"""
    if union_city_gdf is None or union_points_gdf is None:
        return None

    try:
        import folium

        # Extract all point coordinates
        point_coords = []
        for idx, row in union_points_gdf.iterrows():
            lat = row.geometry.y
            lng = row.geometry.x
            point_coords.append([lat, lng])

        if not point_coords:
            return None

        # Calculate bounds
        lats = [coord[0] for coord in point_coords]
        lngs = [coord[1] for coord in point_coords]

        min_lat, max_lat = min(lats), max(lats)
        min_lng, max_lng = min(lngs), max(lngs)

        # Calculate center
        center_lat = (min_lat + max_lat) / 2
        center_lng = (min_lng + max_lng) / 2

        # Calculate appropriate zoom level manually
        lat_diff = max_lat - min_lat
        lng_diff = max_lng - min_lng
        max_diff = max(lat_diff, lng_diff)

        # Manual zoom calculation based on degree span
        if max_diff > 10:
            zoom = 4
        elif max_diff > 5:
            zoom = 5
        elif max_diff > 2:
            zoom = 6
        elif max_diff > 1:
            zoom = 7
        elif max_diff > 0.5:
            zoom = 8
        elif max_diff > 0.2:
            zoom = 9
        elif max_diff > 0.1:
            zoom = 10
        elif max_diff > 0.05:
            zoom = 11
        elif max_diff > 0.02:
            zoom = 12
        elif max_diff > 0.01:
            zoom = 13
        else:
            zoom = 16

        # Create map with calculated center and zoom - NO fit_bounds
        m = folium.Map(
            location=[center_lat, center_lng],
            zoom_start=zoom,
            tiles='CartoDB positron'
        )

        # Add city boundaries
        boundary_colors = ['#007acc', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4']
        for idx, row in union_city_gdf.iterrows():
            color = boundary_colors[idx % len(boundary_colors)]
            folium.GeoJson(
                row.geometry,
                style_function=lambda x, color=color: {
                    'fillColor': 'transparent',
                    'color': color,
                    'weight': 3,
                    'fillOpacity': 0.1,
                    'opacity': 0.9
                }
            ).add_to(m)

        # Add all points
        for i, coord in enumerate(point_coords):
            folium.CircleMarker(
                location=coord,
                radius=5,
                popup=f"Point {i}",
                color='#ffffff',
                fillColor='#00ff88',
                fillOpacity=0.8,
                weight=2
            ).add_to(m)

        # NO fit_bounds call - rely entirely on manual zoom calculation
        return m

    except Exception as e:
        st.error(f"Error creating simple map: {e}")
        return None


def render_layers_tab():
    """Render the simplified Layers management tab"""

    st.markdown("## 📚 Layer Management")

    # Current layer display at the top
    if hasattr(st.session_state, 'current_layer') and st.session_state.current_layer:
        current_layer = st.session_state.current_layer
        patterns_count = len(current_layer.get('patterns', []))

        if patterns_count > 1:
            st.success(f"✅ **Selected Layer**: {current_layer['name']} (Union of {patterns_count} patterns)")
        else:
            st.success(f"✅ **Selected Layer**: {current_layer['name']}")
    else:
        st.info("**No layer selected**")

    st.markdown("---")

    # Check if there are any layers to manage
    has_layers = hasattr(st.session_state, 'stored_layers') and st.session_state.stored_layers

    if not has_layers:
        st.info("🌟 **No layers created yet!** Go to 'Create Spatial Pattern' tab to generate patterns and add them to layers.")
        return

    # Layer list with expanders
    st.markdown("### Available Layers")

    for layer_id, layer_data in st.session_state.stored_layers.items():
        patterns = layer_data.get('patterns', [])
        patterns_count = len(patterns)

        # Get location information from patterns
        locations = []
        for pattern in patterns:
            if pattern.get('location_name'):
                locations.append(pattern['location_name'])

        location_text = " + ".join(locations) if locations else "Unknown Location"

        # Create expander title
        layer_title = f"{layer_data['name']} - {location_text}"
        if patterns_count > 1:
            layer_title += f" ({patterns_count} patterns)"

        with st.expander(layer_title, expanded=False):
            # Layer selection and actions
            action_col1, action_col2, action_col3 = st.columns([1, 1, 1])

            with action_col1:
                if st.button("🎯 Select", key=f"select_{layer_id}", use_container_width=True):
                    st.session_state.current_layer = layer_data
                    st.success(f"Selected: {layer_data['name']}")
                    st.rerun()

            with action_col2:
                if st.button("🗑️ Delete", key=f"delete_{layer_id}", use_container_width=True, type="secondary"):
                    del st.session_state.stored_layers[layer_id]
                    if st.session_state.get('current_layer', {}).get('id') == layer_id:
                        st.session_state.current_layer = None
                    st.success("Layer deleted!")
                    st.rerun()

            # Create and display map
            try:
                # Create union of all patterns in the layer for visualization
                union_points_gdf, union_city_gdf, combined_location, combined_data_info, union_data = create_layer_union(layer_data)

                if union_points_gdf is not None and union_city_gdf is not None:
                    # Use simple manual zoom map that bypasses fit_bounds issues
                    interactive_map = create_simple_points_map(
                        union_city_gdf,
                        union_points_gdf
                    )

                    if interactive_map:
                        # Display the map
                        map_key = f"layer_map_{layer_id}"
                        st_folium(interactive_map, width=700, height=400, key=map_key)

                        # Layer information
                        total_points = len(union_points_gdf) if union_points_gdf is not None else 0
                        total_boundaries = len(union_city_gdf) if union_city_gdf is not None else 0
                        st.info(f"""
                        **Location**: {combined_location}
                        
                        **Data**: {combined_data_info}
                        
                        **Total Points**: {total_points}
                        
                        **Boundaries**: {total_boundaries}
                        
                        **Patterns**: {patterns_count}
                        """)
                    else:
                        st.error("Could not create map for this layer.")
                else:
                    st.warning("No valid geographic data found in this layer.")

            except Exception as e:
                st.error(f"Error creating layer visualization: {e}")

    # Quick actions at the bottom
    st.markdown("---")
    st.markdown("### Quick Actions")

    quick_col1, quick_col2, quick_col3 = st.columns([1, 1, 1])

    with quick_col1:
        if st.button("🔄 Refresh", use_container_width=True):
            st.rerun()

    with quick_col2:
        total_layers = len(st.session_state.stored_layers) if has_layers else 0
        total_patterns = sum(len(layer.get('patterns', [])) for layer in st.session_state.stored_layers.values()) if has_layers else 0
        st.metric("Total Layers", total_layers)

    with quick_col3:
        st.metric("Total Patterns", total_patterns)