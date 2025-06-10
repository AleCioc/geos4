import streamlit as st
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import json
import streamlit.components.v1 as components
import os

# --- Initial Page Setup ---

st.set_page_config(
    page_title="GeoS4 Hybrid Demo",
    page_icon="🎵",
    layout="wide"
)


# --- Geospatial Data Generation ("The Material") ---
# These functions are unchanged. They generate the raw data for the algorithm.

def generate_grid_city(grid_size=10):
    """Generates data for a structured, grid-like city."""
    buildings = []
    streets = []
    for i in range(1, grid_size - 1, 2):
        for j in range(1, grid_size - 1, 2):
            buildings.append({'coords': (i, j), 'size': 0.8})
    for i in range(0, grid_size + 1, 2):
        streets.append({'path': [(i, 0), (i, grid_size)]})
        streets.append({'path': [(0, i), (grid_size, i)]})
    landmarks = [{'coords': (2.5, 2.5)}, {'coords': (8.5, 8.5)}, {'coords': (2.5, 8.5)}]
    return {"polygons": buildings, "lines": streets, "points": landmarks}


def generate_organic_city(num_buildings=30):
    """Generates data for an irregular, organic city."""
    np.random.seed(42)
    buildings = [{'coords': (np.random.rand() * 10, np.random.rand() * 10), 'size': 0.5 + np.random.rand() * 1.0} for _
                 in range(num_buildings)]
    streets = [
        {'path': [(np.random.rand() * 10, np.random.rand() * 10), (np.random.rand() * 10, np.random.rand() * 10)]} for _
        in range(4)]
    landmarks = [{'coords': (np.random.randn() + 5, np.random.randn() + 5)} for _ in range(10)]
    return {"polygons": buildings, "lines": streets, "points": landmarks}


def generate_suburban_sprawl(num_houses=25):
    """Generates data for a sparse suburban area."""
    np.random.seed(0)
    houses = [{'coords': (np.random.rand() * 10, np.random.rand() * 10), 'size': 0.4} for _ in range(num_houses)]
    streets = [
        {'path': [(0, 1.5), (10, 1.5)]}, {'path': [(0, 7.5), (10, 7.5)]}, {'path': [(2.5, 0), (2.5, 10)]}
    ]
    landmarks = [{'coords': (5, 5)}]
    return {"polygons": houses, "lines": streets, "points": landmarks}


# --- Algorithmic Mapping Engine ("The Procedure") ---
# This is primarily used by the V1 sequencer.

def map_data_to_sequencer(city_data, city_type, num_steps=16):
    """Translates geospatial data into a boolean sequencer grid."""
    sequencer_grid = np.full((4, num_steps), False)

    # Rule 1: Polygons -> Kick
    if city_data.get('polygons'):
        x_coords = [p['coords'][0] for p in city_data['polygons']]
        steps = (np.array(x_coords) / 10.0 * (num_steps - 1)).astype(int)
        sequencer_grid[0, np.unique(steps)] = True

    # Rule 2: Lines -> Snare
    if city_data.get('lines') and len(city_data['lines']) > 3:
        sequencer_grid[1, 4] = True;
        sequencer_grid[1, 12] = True
    else:
        sequencer_grid[1, 5] = True;
        sequencer_grid[1, 13] = True

    # Rule 3: Points -> Hi-Hat
    if city_data.get('points'):
        x_coords = [p['coords'][0] for p in city_data['points']]
        steps = (np.array(x_coords) / 10.0 * (num_steps - 1)).astype(int)
        unique_steps = np.unique(steps)
        for step in unique_steps:
            sequencer_grid[2, step] = True
        if 'Grid' in city_type:
            for i in range(num_steps):
                sequencer_grid[2, i] = (i % 2 == 0)

    # Rule 4: Polygon Area / Street Angles -> Synth Melody
    if city_data.get('polygons'):
        avg_size = np.mean([p['size'] for p in city_data['polygons']])
        note_density = int(avg_size * 4)
        if city_data.get('lines'):
            angles = [np.arctan2(l['path'][1][1] - l['path'][0][1], l['path'][1][0] - l['path'][0][0]) for l in
                      city_data['lines']]
            steps = (np.abs(np.array(angles)) / np.pi * (num_steps - 1)).astype(int)
            unique_steps = np.unique(steps)
            for i, step in enumerate(unique_steps):
                if i < note_density:
                    sequencer_grid[3, step] = True

    return sequencer_grid


# --- UI and Visualization ---

def plot_city(city_data):
    """Uses Matplotlib to draw the city map."""
    fig, ax = plt.subplots(figsize=(6, 6))
    ax.set_facecolor('#1E1E1E')
    fig.patch.set_facecolor('#0E1117')

    if city_data.get('polygons'):
        for p in city_data['polygons']:
            rect = patches.Rectangle(p['coords'], p['size'], p['size'], linewidth=1, edgecolor='cyan', facecolor='cyan',
                                     alpha=0.6)
            ax.add_patch(rect)
    if city_data.get('lines'):
        for line in city_data['lines']:
            ax.plot([line['path'][0][0], line['path'][1][0]], [line['path'][0][1], line['path'][1][1]], color='gray',
                    linewidth=2, alpha=0.8)
    if city_data.get('points'):
        px = [p['coords'][0] for p in city_data['points']]
        py = [p['coords'][1] for p in city_data['points']]
        ax.scatter(px, py, color='yellow', s=100, marker='*', zorder=5)

    ax.set_xlim(0, 10);
    ax.set_ylim(0, 10)
    ax.set_xticks([]);
    ax.set_yticks([])
    ax.set_aspect('equal', adjustable='box')
    plt.title("Geospatial Data ('The Material')", color='white')
    return fig


# --- HTML/JS Web Audio Component Factory ---

def create_webaudio_sequencer(version, sequencer_data, bpm, is_playing, city_type_v2):
    """
    Acts as a factory to return the HTML for the selected sequencer version,
    loading from an external file and injecting Python data.
    """
    filename_map = {
        'V1 (Simple)': 'sequencer_0.html',
        'V2 (Cyberpunk)': 'sequencer_1.html'
    }

    filepath = filename_map.get(version)
    if not filepath or not os.path.exists(filepath):
        return f"<div>Error: {filepath} not found. Please create this file.</div>"

    with open(filepath, 'r', encoding='utf-8') as f:
        html_template = f.read()

    # Prepare the data injection string
    if version == 'V1 (Simple)':
        sequencer_json = json.dumps(sequencer_data.tolist())
        injection_script = f"""
        const IS_PLAYING = {str(is_playing).lower()};
        const BPM = {bpm};
        const SEQUENCER_GRID = {sequencer_json};
        """
    else:  # V2 (Cyberpunk)
        injection_script = f"""
        const IS_PLAYING = {str(is_playing).lower()};
        const BPM = {bpm};
        const CITY_TYPE = '{city_type_v2}';
        """

    # Replace the placeholder with the actual data
    final_html = html_template.replace('// PYTHON_DATA_INJECTION_POINT', injection_script)

    return final_html


# --- Main Application Logic ---

def main():
    st.title("GeoS4 Hybrid: Python Backend + Web Audio Frontend")
    st.markdown(
        "This version loads the sequencer interface from external HTML files, allowing for cleaner code and easier UI development.")

    # --- Sidebar for Controls ---
    with st.sidebar:
        st.header("GeoS4 Controls")

        sequencer_version = st.selectbox(
            "Select Sequencer Style",
            ('V1 (Simple)', 'V2 (Cyberpunk)'),
            key='sequencer_version_selector'
        )

        # Dynamically set controls based on selected sequencer
        if sequencer_version == 'V2 (Cyberpunk)':
            city_type_key = 'city_type_v2'
            city_type_options = ('urban', 'coastal', 'forest', 'suburban')
            city_type_label = "Select Geographic Theme"
        else:
            city_type_key = 'city_type_v1'
            city_type_options = ('Grid City (Manhattan-like)', 'Organic City (Old European Town)', 'Suburban Sprawl')
            city_type_label = "Select Urban 'Material'"

        city_type = st.radio(
            city_type_label,
            city_type_options,
            key=city_type_key
        )

        bpm = st.slider("Tempo (BPM)", 60, 240, 120)

        st.markdown("---")
        if st.button("Play / Stop", use_container_width=True, type="primary"):
            st.session_state.is_playing = not st.session_state.get('is_playing', False)

    # --- Data Generation and State Management ---
    city_type_for_v1 = city_type if sequencer_version == 'V1 (Simple)' else st.session_state.get('last_city_type_v1',
                                                                                                 'Grid City (Manhattan-like)')
    city_type_for_v2 = city_type if sequencer_version == 'V2 (Cyberpunk)' else 'urban'

    # Regenerate V1 data only when its controls are active and changed
    if st.session_state.get('last_city_type_v1') != city_type_for_v1:
        if 'Grid' in city_type_for_v1:
            city_data = generate_grid_city()
        elif 'Organic' in city_type_for_v1:
            city_data = generate_organic_city()
        else:
            city_data = generate_suburban_sprawl()

        sequencer_grid = map_data_to_sequencer(city_data, city_type_for_v1)

        st.session_state.city_data = city_data
        st.session_state.sequencer_grid = sequencer_grid
        st.session_state.last_city_type_v1 = city_type_for_v1

    # Ensure data exists on first run
    if 'city_data' not in st.session_state:
        st.session_state.city_data = generate_grid_city()
        st.session_state.sequencer_grid = map_data_to_sequencer(st.session_state.city_data,
                                                                'Grid City (Manhattan-like)')
        st.session_state.last_city_type_v1 = 'Grid City (Manhattan-like)'

    # Retrieve from cache
    city_data = st.session_state.city_data
    sequencer_grid = st.session_state.sequencer_grid
    is_playing = st.session_state.get('is_playing', False)

    # --- Main Layout ---

    if sequencer_version == 'V1 (Simple)':
        map_col, seq_col = st.columns([1, 2], gap="large")
        with map_col:
            st.subheader("Geospatial Map")
            fig = plot_city(city_data)
            st.pyplot(fig, use_container_width=True)
            plt.close(fig)
    else:
        map_col, seq_col = st.columns([1, 500], gap="large")

    with seq_col:
        st.subheader(f"Generated Sequence ({sequencer_version})")
        webaudio_component = create_webaudio_sequencer(sequencer_version, sequencer_grid, bpm, is_playing,
                                                       city_type_for_v2)

        component_height = 800 if sequencer_version == 'V2 (Cyberpunk)' else 350
        components.html(webaudio_component, height=component_height, scrolling=False)


if __name__ == "__main__":
    main()
