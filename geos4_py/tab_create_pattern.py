"""
GeoS4 - Create Spatial Pattern Tab
Enhanced with minimal layer management and conditional map display
"""
import streamlit as st
import folium
import time
from streamlit_folium import st_folium
from .geospatial_utils import (
    generate_random_location, fetch_city_boundary, fetch_amenities,
    generate_random_points, apply_spatial_transformation,
    calculate_optimal_grid_dimensions, process_points_to_sequencer,
    convert_gdf_to_geojson, create_interactive_map_with_points_bounds
)


def auto_generate_pattern(location_query, data_source, amenity_type=None, max_amenities=None,
                         num_points=None, transformation=None, transform_params=None):
    """Auto-generate pattern when parameters change"""
    if not location_query:
        return None, None, None, None, None, None, None, None

    try:
        # Step 1: Fetch city boundary
        city_gdf, city_polygon = fetch_city_boundary(location_query)

        if city_gdf is None:
            return None, None, None, None, None, None, None, None

        # Step 2: Get points based on data source
        if data_source == "Random Points" and num_points:
            points = generate_random_points(city_polygon, num_points)
            points_gdf = city_gdf.__class__(geometry=points, crs=city_gdf.crs)
            data_info = f"{num_points} random points"
        elif data_source == "Amenities" and amenity_type and max_amenities:
            points_gdf = fetch_amenities(location_query, amenity_type, max_points=max_amenities)
            if points_gdf is not None:
                data_info = f"{len(points_gdf)} {amenity_type} amenities"
            else:
                return None, None, None, None, None, None, None, None
        else:
            return None, None, None, None, None, None, None, None

        # Step 3: Apply transformations if specified
        if transformation != "None" and transform_params:
            points_gdf = apply_spatial_transformation(points_gdf, transformation, **transform_params)

            # Update data info with transformation
            if transformation == "Grid Alignment":
                grid_size_m = transform_params.get('grid_size_meters', 100)
                data_info += f" + {transformation} ({grid_size_m}m)"
            elif transformation == "Noise Addition":
                noise_level_m = transform_params.get('noise_level_meters', 10)
                data_info += f" + {transformation} ({noise_level_m}m)"
            else:
                data_info += f" + {transformation}"

        # Step 4: Use points bounding box for visualization bounds
        points_bounds = points_gdf.total_bounds
        max_bounds = {
            'min_lat': points_bounds[1],
            'max_lat': points_bounds[3],
            'min_lng': points_bounds[0],
            'max_lng': points_bounds[2]
        }

        # Step 5: Calculate optimal grid and process to sequencer format
        optimal_steps, optimal_tracks = calculate_optimal_grid_dimensions(points_gdf, city_gdf)
        active_cells_data = process_points_to_sequencer(city_gdf, points_gdf, optimal_steps, optimal_tracks)
        geojson_data = convert_gdf_to_geojson(points_gdf)
        city_bounds_data = convert_gdf_to_geojson(city_gdf)
        grid_config = {'num_steps': optimal_steps, 'num_tracks': optimal_tracks}

        return (city_gdf, points_gdf, data_info, max_bounds, active_cells_data,
                geojson_data, city_bounds_data, grid_config)

    except Exception as e:
        st.error(f"Error generating pattern: {e}")
        return None, None, None, None, None, None, None, None



def render_minimal_add_to_layer_section():
    """Render minimal add spatial pattern to layer section in a single row"""

    # Only show if there's a pattern to add
    if not st.session_state.get('pattern_generated', False):
        return

    st.markdown("### 💾 Add Pattern to Layer")

    # Single row layout
    layer_col1, layer_col2, layer_col3, layer_col4 = st.columns([2, 1, 1, 1])

    with layer_col1:
        # Layer selection/creation
        layer_options = ["Create New Layer"]

        # Add existing layers to options
        if hasattr(st.session_state, 'stored_layers') and st.session_state.stored_layers:
            layer_options.extend([f"Add to {layer['name']}" for layer in st.session_state.stored_layers.values()])

        selected_option = st.selectbox(
            "Layer Action",
            layer_options,
            key="layer_action_select",
            label_visibility="collapsed"
        )

    with layer_col2:
        # New layer name input if creating new
        if selected_option == "Create New Layer":
            new_layer_name = st.text_input(
                "Layer Name",
                value=f"Layer {len(getattr(st.session_state, 'stored_layers', {})) + 1}",
                key="new_layer_name",
                label_visibility="collapsed"
            )
        else:
            new_layer_name = None
            st.write("")  # Empty space

    with layer_col3:
        if st.button("💾 Add to Layer", type="primary", use_container_width=True):
            add_current_pattern_to_layer(selected_option, new_layer_name)

    with layer_col4:
        # Show quick layer count
        layer_count = len(getattr(st.session_state, 'stored_layers', {}))
        st.metric("Layers", layer_count)

    st.markdown("---")


def add_current_pattern_to_layer(selected_option, new_layer_name=None):
    """Add current pattern to a layer (new or existing)"""
    try:
        # Initialize stored layers if not exists
        if not hasattr(st.session_state, 'stored_layers'):
            st.session_state.stored_layers = {}

        # Get current pattern data
        city_gdf = st.session_state.get('city_gdf')
        points_gdf = st.session_state.get('points_gdf')

        if city_gdf is None or points_gdf is None:
            st.error("No valid geographic data available to add.")
            return

        # Create pattern data
        pattern_data = {
            'city_gdf': city_gdf,
            'points_gdf': points_gdf,
            'location_name': st.session_state.get('city_name', 'Unknown'),
            'data_info': st.session_state.get('data_info', 'No data'),
            'grid_config': st.session_state.get('grid_config', {'num_steps': 16, 'num_tracks': 4}),
            'active_cells_data': st.session_state.get('active_cells_data'),
            'geojson_data': st.session_state.get('geojson_data'),
            'city_bounds_data': st.session_state.get('city_bounds_data'),
            'zoom_bounds': st.session_state.get('zoom_bounds'),
            'created_at': time.time()
        }

        if selected_option == "Create New Layer":
            # Create new layer
            layer_id = len(st.session_state.stored_layers) + 1
            layer_data = {
                'id': layer_id,
                'name': new_layer_name or f"Layer {layer_id}",
                'patterns': [pattern_data],
                'created_at': time.time()
            }
            st.session_state.stored_layers[layer_id] = layer_data
            st.session_state.current_layer = layer_data  # Auto-select new layer
            st.success(f"✅ Created layer: {layer_data['name']} with 1 pattern")

        else:
            # Add to existing layer
            layer_name = selected_option.replace("Add to ", "")
            target_layer = None

            for layer_data in st.session_state.stored_layers.values():
                if layer_data['name'] == layer_name:
                    target_layer = layer_data
                    break

            if target_layer:
                target_layer['patterns'].append(pattern_data)
                st.session_state.current_layer = target_layer  # Auto-select updated layer
                st.success(f"✅ Added pattern to {layer_name} (now has {len(target_layer['patterns'])} patterns)")
            else:
                st.error("Could not find target layer")

    except Exception as e:
        st.error(f"Error adding pattern to layer: {e}")


def render_location_and_data_section():
    """Render the location and data source section with random country in expander"""
    st.markdown("### 📍 Location & Data Source")

    # RANDOM COUNTRY TOOL IN EXPANDER (NEW)
    with st.expander("🎲 Random Country Discovery"):
        col1, col2 = st.columns([3, 1])

        with col1:
            st.markdown("**Discover cities from around the world!**")
            st.markdown("Generate a random country and explore its urban patterns.")

        with col2:
            if st.button("🎲 Random Country", help="Get a city from a random country",
                         use_container_width=True, key="random_expander"):
                random_location = generate_random_location()
                if random_location:
                    st.session_state["random_location"] = random_location
                    st.session_state["selected_location"] = random_location
                    st.rerun()

        # Show current random location if it exists
        if st.session_state.get("random_location"):
            st.info(f"🎲 **Random selection**: {st.session_state['random_location']}")

    # MAIN LOCATION INPUT
    # Get current location from session state or use default
    current_location = st.session_state.get("random_location") or st.session_state.get("selected_location", "Bari, Italy")

    new_location = st.text_input(
        "Enter a geographic location",
        value=current_location,
        key="location_input_tab2"
    )

    # Update session state if location changed
    if new_location != current_location:
        st.session_state["selected_location"] = new_location
        st.session_state["random_location"] = None

    # Data source selection
    location_query = st.session_state.get("random_location") or st.session_state.get("selected_location", "Bari, Italy")

    data_source = st.selectbox(
        "Data Source",
        ["Random Points", "Amenities"],
        help="Choose between random points or real amenities from OpenStreetMap",
        key="data_source_select"
    )

    # Data source specific parameters
    amenity_type = None
    max_amenities = None
    num_points = None

    if data_source == "Amenities":
        amenity_col1, amenity_col2 = st.columns([2, 1])
        with amenity_col1:
            amenity_type = st.selectbox(
                "Amenity Type",
                ["restaurant", "cafe", "bar", "shop", "bank", "pharmacy", "school", "hospital", "fuel"],
                help="Type of amenity to fetch from the city",
                key="amenity_type_select"
            )
        with amenity_col2:
            max_amenities = st.number_input(
                "Max Points",
                min_value=10,
                max_value=500,
                value=100,
                step=10,
                help="Maximum number of amenity points to fetch",
                key="max_amenities_input"
            )
    else:
        num_points = st.slider(
            "Number of Random Points",
            10, 200, 50,
            key="num_points_slider"
        )

    return location_query, data_source, amenity_type, max_amenities, num_points


def render_customization_section():
    """Render the spatial pattern customization section"""
    with st.expander("🔧 Spatial Transformations", expanded=False):
        transformation = st.selectbox(
            "Transformation Type",
            ["None", "Clustering", "Grid Alignment", "Noise Addition"],
            help="Apply spatial transformations to modify point distributions",
            key="transformation_select"
        )

        # Extended transformation parameters with larger distance ranges
        transform_params = {}
        if transformation == "Clustering":
            num_clusters = st.number_input(
                "Number of Clusters",
                min_value=2, max_value=10, value=3,
                key="num_clusters_input"
            )
            transform_params = {"num_clusters": num_clusters}
        elif transformation == "Grid Alignment":
            grid_size_meters = st.number_input(
                "Grid Size (meters)",
                min_value=1.0,
                max_value=5000.0,
                value=100.0,
                step=50.0,
                help="Size of grid cells in meters",
                key="grid_size_input"
            )
            # Convert meters to degrees for the transformation
            grid_size_degrees = grid_size_meters / 111320
            transform_params = {"grid_size": grid_size_degrees, "grid_size_meters": grid_size_meters}
        elif transformation == "Noise Addition":
            noise_level_meters = st.number_input(
                "Noise Level (meters)",
                min_value=0.1,
                max_value=1000.0,
                value=10.0,
                step=1.0,
                help="Standard deviation of noise in meters",
                key="noise_level_input"
            )
            # Convert meters to degrees for the transformation
            noise_level_degrees = noise_level_meters / 111320
            transform_params = {"noise_level": noise_level_degrees, "noise_level_meters": noise_level_meters}

        return transformation, transform_params


def get_current_parameters():
    """Get current parameters as a hashable tuple for change detection"""
    location_query = st.session_state.get("random_location") or st.session_state.get("selected_location", "Bari, Italy")
    data_source = st.session_state.get("data_source_select", "Random Points")
    amenity_type = st.session_state.get("amenity_type_select", "restaurant")
    max_amenities = st.session_state.get("max_amenities_input", 100)
    num_points = st.session_state.get("num_points_slider", 50)
    transformation = st.session_state.get("transformation_select", "None")

    # Get transformation parameters
    transform_params = {}
    if transformation == "Clustering":
        transform_params["num_clusters"] = st.session_state.get("num_clusters_input", 3)
    elif transformation == "Grid Alignment":
        transform_params["grid_size_meters"] = st.session_state.get("grid_size_input", 100.0)
    elif transformation == "Noise Addition":
        transform_params["noise_level_meters"] = st.session_state.get("noise_level_input", 10.0)

    return (location_query, data_source, amenity_type, max_amenities, num_points, transformation, tuple(sorted(transform_params.items())))


def has_parameters_changed():
    """Check if any parameters have changed since last generation"""
    current_params = get_current_parameters()
    last_params = st.session_state.get('last_parameters')

    if last_params != current_params:
        st.session_state['last_parameters'] = current_params
        return True
    return False


def render_create_pattern_tab():
    """Render the Create Spatial Pattern tab content with minimal layer management"""

    st.markdown("## 🗺️ Create Your Spatial Pattern")
    st.markdown("Generate geographic patterns and add them to layers for sequencer use.")

    # Minimal add to layer section (only shown when pattern exists)
    render_minimal_add_to_layer_section()

    # Two column layout: Controls on left, Map on right
    col1, col2 = st.columns([1, 1])

    with col1:
        # Get current parameters (with random country in expander)
        location_query, data_source, amenity_type, max_amenities, num_points = render_location_and_data_section()
        transformation, transform_params = render_customization_section()

    # Check if parameters have changed
    parameters_changed = has_parameters_changed()

    # Only auto-generate pattern if parameters changed and we have a valid location
    if location_query and parameters_changed:
        with st.spinner(f"Processing {location_query}..."):
            result = auto_generate_pattern(
                location_query, data_source, amenity_type, max_amenities,
                num_points, transformation, transform_params
            )

            (city_gdf, points_gdf, data_info, max_bounds, active_cells_data,
             geojson_data, city_bounds_data, grid_config) = result

            if city_gdf is not None and points_gdf is not None:
                # Update session state
                st.session_state.city_gdf = city_gdf
                st.session_state.points_gdf = points_gdf
                st.session_state.data_info = data_info
                st.session_state.city_name = location_query
                st.session_state.pattern_generated = True

                # Use points bounds for visualization
                st.session_state.zoom_bounds = max_bounds

                # Update processed data
                st.session_state.active_cells_data = active_cells_data
                st.session_state.geojson_data = geojson_data
                st.session_state.city_bounds_data = city_bounds_data
                st.session_state.grid_config = grid_config

            else:
                st.error(f"Could not generate pattern for {location_query}")

    with col2:
        st.markdown("### 🗺️ Interactive Map")

        # Only show map if there are layers or a generated pattern
        has_layers = hasattr(st.session_state, 'stored_layers') and st.session_state.stored_layers
        has_pattern = st.session_state.get('pattern_generated', False)

        if has_layers or has_pattern:
            if has_pattern:
                # Create and display interactive map with points bounds
                interactive_map, all_points = create_interactive_map_with_points_bounds(
                    st.session_state.get('city_gdf'),
                    st.session_state.get('points_gdf')
                )

                if interactive_map:
                    map_key = f"pattern_map_{st.session_state.get('city_name', 'unknown')}_{hash(str(st.session_state.get('last_parameters', '')))}"
                    st_folium(interactive_map, width=700, height=600, key=map_key)

                    # Show pattern information below the map
                    grid_config = st.session_state.get('grid_config', {})
                    points_gdf = st.session_state.get('points_gdf')

                    # Safe point count calculation
                    if points_gdf is not None and hasattr(points_gdf, '__len__'):
                        total_points = len(points_gdf)
                    else:
                        total_points = 0

                    # Calculate active cells
                    if st.session_state.get('active_cells_data'):
                        active_cells_count = len(st.session_state.active_cells_data.get('active_cells', []))
                    else:
                        active_cells_count = 0

                    st.info(f"""
                    **City:** {st.session_state.get('city_name', 'Unknown')}
                    
                    **Data:** {st.session_state.get('data_info', 'Unknown')}
                    
                    **Adaptive Grid:** {grid_config.get('num_steps', 0)} × {grid_config.get('num_tracks', 0)}
                    
                    **Total Points:** {total_points}
                    
                    **Active Cells:** {active_cells_count}
                    """)
                else:
                    st.error("Could not create map. Please check your location input.")
            else:
                st.info("Generated patterns will appear here. Enter a location to start.")
        else:
            # No layers and no pattern - show placeholder
            st.info("""
            🗺️ **Map will appear here when you:**
            - Generate a spatial pattern, or
            - Have existing layers saved
            
            Enter a location below to get started!
            """)

    # Quick layer status at bottom
    if hasattr(st.session_state, 'stored_layers') and st.session_state.stored_layers:
        st.markdown("---")
        st.markdown("### 📚 Quick Layer Status")

        status_col1, status_col2, status_col3 = st.columns([1, 1, 1])

        with status_col1:
            layer_count = len(st.session_state.stored_layers)
            total_patterns = sum(len(layer.get('patterns', [])) for layer in st.session_state.stored_layers.values())
            st.metric("Total Layers", layer_count)

        with status_col2:
            st.metric("Total Patterns", total_patterns)

        with status_col3:
            current_layer = st.session_state.get('current_layer')
            current_name = current_layer['name'] if current_layer else 'None'
            st.metric("Selected Layer", current_name)