"""
GeoS4 - Get Started Tab
Introduction and overview of the application
"""
import streamlit as st


def render_get_started_tab():
    """Render the Get Started tab content"""

    col1, col2 = st.columns([2, 1])

    with col1:
        st.markdown("## Welcome to GeoS4!")
        st.markdown("""
        **GeoS4** is an innovative tool for sharing patterns between geography and music. 
        By mapping spatial information onto a sequencer grid, you can create unique rhythmic 
        compositions that reflect the characteristics of different geographic locations from several viewpoints.

        ### How it works:

        1. **🗺️ Select a Location**: Choose any city in the world or use our random country generator
        2. **📍 Choose Data Source**: Pick between real amenities (restaurants, shops, etc.) or random points
        3. **🔧 Apply Transformations**: Modify the spatial data with clustering, grid alignment, or noise (extended ranges up to 5km)
        4. **🔍 Zoom and Filter**: Use immediate zoom controls with configurable step sizes
        5. **🎵 Create Music**: Points are mapped to a drum sequencer where each track represents different spatial zones
        6. **🎚️ Customize**: Upload your own sounds or use built-in drum samples

        ### Features:

        - **Real Geographic Data**: Uses OpenStreetMap to fetch actual city boundaries and amenities
        - **Random Country Discovery**: Explore cities from random countries around the world
        - **Extended Spatial Transformations**: Apply mathematical operations with ranges up to 5km (grid) and 1km (noise)
        - **Interactive Sequencer**: Visual feedback showing which geographic points trigger sounds (1200px height)
        - **Adaptive Grid**: Sequencer automatically adapts to the shape of your geographic data
        - **Interactive Maps**: Explore your data with interactive Folium maps
        - **Custom Audio**: Upload your own sound files for each track
        - **Visual Mapping**: See exactly where your sounds come from on the city map

        ### Getting Started:

        Ready to share patterns between your favorite city and music? Head over to the **"Create Spatial Pattern"** tab 
        to select your location and generate your first geographic pattern!

        ### Repository:

        Visit our GitHub repository for the latest updates: **https://github.com/AleCioc/geos4**
        """)

    with col2:
        st.markdown("### 🎯 Quick Tips")
        st.info("""
        **Best Results:**
        - Try cities with distinctive geographic features
        - Dense urban areas create complex rhythms
        - Coastal cities offer interesting patterns
        """)

# "        - Use immediate zoom for precise area selection"
#         st.markdown("### 🌟 Examples to Try")
#         st.success("""
#         **Great Cities:**
#         - "Manhattan, New York, USA"
#         - "Venice, Italy"
#         - "Amsterdam, Netherlands"
#         - "Bari, Italy"
#         - "Barcelona, Spain"
#         """)
#
#         st.markdown("### 🎵 Music Tips")
#         st.warning("""
#         **For Better Sounds:**
#         - Grid dimensions adapt automatically
#         - Use different amenity types for variety
#         - Try the random country generator
#         - Use separate lat/lng zoom for precision
#         """)