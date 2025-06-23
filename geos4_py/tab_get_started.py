"""
GeoS4 - Get Started Tab
Enhanced with comprehensive data layers explanation and workflow guidance
"""
import streamlit as st


def render_get_started_tab():
    """Render the enhanced Get Started tab content with data layers explanation"""

    col1, col2 = st.columns([2, 1])

    with col1:
        st.markdown("## Welcome to GeoS4!")
        st.markdown("""
        **GeoS4** is an innovative tool for transforming geographic patterns into musical compositions. 
        By mapping spatial information onto a sequencer grid, you can create unique rhythmic 
        patterns that reflect the characteristics of different geographic locations from multiple perspectives.

        ### 🎯 How it works:

        1. **🗺️ Create Spatial Patterns**: Choose any city in the world or use our random country generator
        2. **📍 Select Data Sources**: Pick between real amenities (restaurants, shops, etc.) or random points
        3. **🔧 Apply Transformations**: Modify the spatial data with clustering, grid alignment, or noise (ranges up to 5km)
        4. **📚 Organize with Data Layers**: Group and manage multiple spatial patterns
        5. **🎵 Create Music**: Points are mapped to a drum sequencer where each spatial zone becomes a musical track
        6. **🎚️ Customize Audio**: Upload your own sounds or use built-in drum samples
        7. **📼 Record Your Creations**: Capture your performances with the built-in recording tool

        ---

        ## 📚 Understanding Data Layers

        **Data Layers** are the core organizational system in GeoS4. Think of them as musical "albums" that contain one or more geographic patterns from different cities or regions.

        ### What are Data Layers?

        - **Container System**: Each layer can hold multiple spatial patterns from different locations
        - **Musical Units**: Layers become the foundation for your sequencer compositions
        - **Combination Tool**: Merge patterns from multiple cities into unified musical experiences
        - **Workflow Organization**: Keep related geographic explorations together

        ### Layer Workflow:

        #### Step 1: Create Spatial Patterns
        - Go to **"Create Spatial Pattern"** tab
        - Generate patterns for any city (e.g., "Manhattan, New York" or "Venice, Italy")
        - Experiment with different data sources and transformations
        - Each pattern represents one geographic dataset

        #### Step 2: Build Data Layers  
        - **Create New Layer**: Start fresh with a single pattern
        - **Add to Existing Layer**: Combine multiple patterns (e.g., "European Cities" layer with Rome + Paris + Barcelona)
        - **Layer Benefits**: 
          - Unified sequencer experience across multiple cities
          - Preserved individual boundary shapes
          - Complex rhythmic interactions between different urban patterns

        #### Step 3: Use Layers in Sequencer
        - Go to **"Data Layers"** tab to select your layer
        - Click **"Play"** to automatically load it into the sequencer
        - Or manually select layers from the **"Play!"** tab

        ### Layer Examples:

        **Single City Layer**: "Manhattan Restaurants"
        - One pattern: Restaurant locations in Manhattan
        - Simple, focused musical representation

        **Multi-City Layer**: "Mediterranean Coastal Cities"  
        - Pattern 1: Barcelona cafes
        - Pattern 2: Venice restaurants  
        - Pattern 3: Naples shops
        - Rich, complex musical combination

        **Themed Layer**: "University Towns"
        - Pattern 1: Cambridge, UK - Academic amenities
        - Pattern 2: Bologna, Italy - Student areas
        - Pattern 3: Berkeley, USA - Campus facilities
        - Comparative geographic music analysis

        ### Advanced Layer Features:

        #### Geographic Union Processing
        - **Boundary Preservation**: Multiple city boundaries remain distinct in visualizations
        - **Point Consolidation**: All geographic points combine into a unified dataset
        - **Adaptive Grids**: Sequencer automatically adjusts to accommodate merged spatial data
        - **Smart Mapping**: Points maintain their geographic relationships across grid changes

        #### Musical Benefits
        - **Layered Complexity**: Multiple cities create richer rhythmic patterns
        - **Spatial Relationships**: Geographic proximity influences musical timing
        - **Cultural Patterns**: Different urban planning styles become audible
        - **Scalable Compositions**: From single neighborhood to entire regions

        ---

        ## 🎵 Sequencer Features

        ### Built-in Audio Engine
        - **12+ Synthesized Drum Sounds**: Kick, snare, hi-hat, percussion, and more
        - **Custom Audio Upload**: Add your own sound files to any track
        - **Web Audio Synthesis**: High-quality, low-latency audio generation
        - **Randomization Tools**: Instantly generate new sound combinations

        ### Visual Feedback System
        - **Real-time Point Highlighting**: See exactly which geographic points trigger sounds
        - **Interactive Maps**: Explore your data with zoom, pan, and visual feedback
        - **Background Integration**: City imagery appears behind the sequencer grid
        - **Dynamic Grid Adaptation**: Sequencer automatically fits your geographic data

        ### Recording Capabilities
        - **Built-in Recorder**: Capture your performances directly in the browser
        - **High-Quality Audio**: Professional recording using Web Audio API
        - **Instant Download**: Save your geographic compositions as audio files
        - **Session Memory**: Recordings preserve your exact spatial-musical relationships

        ---

        ## 🚀 Quick Start Guide

        ### First-Time Users:
        1. **Start Simple**: Go to "Create Spatial Pattern" → Enter "Bari, Italy" → Select "Random Points"
        2. **Create Your First Layer**: Click "Create New Layer" → Name it "My First Geographic Music"
        3. **Play Your Creation**: Go to "Play!" tab → Your layer should auto-load → Press Play
        4. **Experiment**: Try different cities, amenity types, and transformations

        ### Advanced Users:
        1. **Build Themed Collections**: Create layers around geographic themes (coastal cities, mountain towns, historic centers)
        2. **Upload Custom Sounds**: Replace default drums with your own audio samples
        3. **Record Compositions**: Use the recording tool to capture your geographic performances
        4. **Explore Transformations**: Apply clustering and grid alignment to discover new patterns

        ### Pro Tips:
        - **Dense Urban Areas** create complex, rich rhythms
        - **Coastal Cities** offer interesting linear patterns  
        - **Historic Centers** often have clustered, organic rhythms
        - **Modern Cities** tend to create more regular, grid-like patterns
        - **Different Amenity Types** (restaurants vs banks vs shops) create distinct rhythmic characters

        ---

        ## 📖 Example Workflows

        ### Workflow 1: Single City Deep Dive
        ```
        1. Create pattern: "Amsterdam, Netherlands" → "cafe" amenities
        2. Apply transformation: Grid Alignment (100m)
        3. Create layer: "Amsterdam Cafe Culture"
        4. Upload custom sound: Dutch folk percussion
        5. Record composition: "Amsterdam Morning Rhythm"
        ```

        ### Workflow 2: Multi-City Comparison
        ```
        1. Create pattern: "Tokyo, Japan" → "restaurant" amenities
        2. Add to layer: Create "Asian Food Cities"
        3. Create pattern: "Bangkok, Thailand" → "restaurant" amenities  
        4. Add to layer: "Asian Food Cities"
        5. Create pattern: "Seoul, South Korea" → "restaurant" amenities
        6. Add to layer: "Asian Food Cities"
        7. Play unified composition combining all three cities
        8. Record: "Asian Culinary Rhythms"
        ```

        ### Workflow 3: Geographic Storytelling
        ```
        1. Create themed layer: "European Trading Routes"
        2. Add pattern: "Venice, Italy" → Historic trading points
        3. Add pattern: "Amsterdam, Netherlands" → Canal commerce
        4. Add pattern: "Bruges, Belgium" → Medieval markets
        5. Apply transformations to highlight historical patterns
        6. Upload period-appropriate sounds
        7. Record: "Sounds of Historical Commerce"
        ```

        ---

        Ready to transform geography into music? Head over to the **"Create Spatial Pattern"** tab 
        to generate your first spatial pattern and build your first data layer!
        """)

    with col2:
        st.markdown("### 🎯 Data Layer Benefits")
        st.info("""
        **Organized Workflow:**
        - Group related patterns
        - Compare different cities
        - Build thematic collections
        
        **Musical Advantages:**
        - Richer, more complex rhythms
        - Cross-cultural pattern mixing
        - Scalable compositions
        
        **Creative Possibilities:**
        - Geographic storytelling
        - Cultural rhythm analysis
        - Urban pattern exploration
        """)

        st.markdown("### 🌟 Quick Examples")
        st.success("""
        **Try These Layer Ideas:**
        - "European Capitals": Rome + Paris + Berlin
        - "Coastal Cities": Barcelona + Nice + Genoa  
        - "University Towns": Cambridge + Oxford + Bologna
        - "Island Cities": Venice + Amsterdam + Stockholm
        """)

        st.markdown("### 🎵 Audio Tips")
        st.warning("""
        **Recording Best Practices:**
        - Use quality headphones for monitoring
        - Record 30-60 second clips
        - Experiment with different BPM settings
        - Try various grid dimensions
        - Upload custom sounds for unique character
        """)

        st.markdown("### 🔧 Technical Features")
        st.info("""
        **Advanced Capabilities:**
        - Grid dimensions: 8-32 steps × 2-8 tracks
        - Spatial transformations: Up to 5km ranges
        - Real-time audio synthesis
        - Custom audio upload support
        - Professional recording quality
        - Cross-platform compatibility
        """)