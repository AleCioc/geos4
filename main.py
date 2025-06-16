"""
GeoS4 - Main Application Entry Point
Simplified for single layer management with multiple layer placeholders
"""
import streamlit as st
import os
import sys

# Add the Python module to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'geos4_py'))

# Import tab modules from the Python package
from geos4_py.tab_get_started import render_get_started_tab
from geos4_py.tab_create_pattern import render_create_pattern_tab
from geos4_py.tab_layers import render_layers_tab
from geos4_py.tab_play import render_play_tab

# --- Initial Page Setup ---

st.set_page_config(
    page_title="GeoS4",
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
        content: "🌍 GeoS4 - Geographic Sequencer | Sharing patterns between geography and music";
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

    /* Hide sidebar completely */
    .css-1d391kg, .css-1n76uvr, .st-emotion-cache-1d391kg {
        display: none !important;
    }
    
    /* Adjust main content area to fill full width */
    .main .block-container {
        padding-left: 1rem !important;
        padding-right: 1rem !important;
        max-width: 100% !important;
    }

    /* Single layer mode indicators */
    .single-layer-mode {
        border-left: 4px solid #00ff88;
        background: rgba(0, 255, 136, 0.1);
    }

    .multiple-layer-placeholder {
        border-left: 4px solid #666666;
        background: rgba(102, 102, 102, 0.1);
        opacity: 0.5;
    }

    .not-implemented {
        color: #ff9800;
        font-style: italic;
    }
</style>
""", unsafe_allow_html=True)


def initialize_session_state():
    """Initialize session state variables for single layer mode"""
    if "selected_location" not in st.session_state:
        st.session_state["selected_location"] = ""

    if "random_location" not in st.session_state:
        st.session_state["random_location"] = None

    if "pattern_generated" not in st.session_state:
        st.session_state.pattern_generated = False

    if "music_playing" not in st.session_state:
        st.session_state.music_playing = False

    if "zoom_bounds" not in st.session_state:
        st.session_state.zoom_bounds = None

    if "zoom_step_size" not in st.session_state:
        st.session_state.zoom_step_size = 0.001

    # Single layer session state (simplified)
    if "current_layer" not in st.session_state:
        st.session_state.current_layer = None

    if "layer_id_counter" not in st.session_state:
        st.session_state.layer_id_counter = 1

    # Placeholder for future multiple layer support
    if "sequencer_layers" not in st.session_state:
        st.session_state.sequencer_layers = {}  # Empty placeholder

    if "layer_processing_mode" not in st.session_state:
        st.session_state.layer_processing_mode = "single"  # Always single for now


def main():
    """Main application logic focused on single layer management"""

    # Initialize session state
    initialize_session_state()

    # Create tabs with updated focus
    tab1, tab2, tab3, tab4 = st.tabs([
        "🚀 Get Started",
        "🗺️ Create Spatial Pattern",
        "📚 Data Layers",
        "🎵 Play!"
    ])

    col1, col2 = st.columns((3, 1))
    # Render tabs using separate modules
    with tab1:
        render_get_started_tab()

    # --- TAB 2: Create Spatial Pattern ---
    with tab2:
        render_create_pattern_tab()

    with tab3:
        render_layers_tab()

    with tab4:
        render_play_tab()


if __name__ == "__main__":
    main()
