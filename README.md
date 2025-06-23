# 🌍 GeoS4 - Geographic Sequencer

**Transform city geography into musical patterns with advanced data layers and recording capabilities**

GeoS4 is an innovative web application that bridges the gap between geography and music by converting real-world urban data into rhythmic compositions. Users can organize multiple spatial patterns into data layers, upload custom sounds, and record their geographic musical creations.

![GeoS4 Demo](https://img.shields.io/badge/Status-Active-brightgreen) ![Python](https://img.shields.io/badge/Python-3.8+-blue) ![Streamlit](https://img.shields.io/badge/Streamlit-1.28+-red) ![License](https://img.shields.io/badge/License-MIT-yellow)

## 🎵 What is GeoS4?

GeoS4 stands for **Geographic Sequencer for Spatial Soundscapes**. It's a creative tool that:

- **Fetches real geographic data** from OpenStreetMap (city boundaries, amenities, points of interest)
- **Organizes spatial patterns** into manageable data layers for complex compositions
- **Processes spatial information** through mathematical transformations (clustering, grid alignment, noise)
- **Maps coordinates to an adaptive drum sequencer** where each geographic point becomes a potential sound trigger
- **Supports custom audio uploads** for personalized soundscapes
- **Records high-quality audio** of your geographic musical performances
- **Creates complex multi-city compositions** by combining patterns from different locations

## ✨ Key Features

### 📚 **Advanced Data Layer System**
- **Layer Organization**: Group multiple spatial patterns from different cities into thematic collections
- **Geographic Union Processing**: Combine patterns while preserving individual city boundary shapes
- **Multi-City Compositions**: Create complex rhythms by merging patterns from multiple locations
- **Workflow Management**: Organize related geographic explorations for systematic creative work

**Example Layer Ideas:**
- *"European Capitals"*: Rome + Paris + Berlin restaurant patterns
- *"Coastal Mediterranean"*: Barcelona + Nice + Genoa cafe distributions  
- *"University Towns"*: Cambridge + Oxford + Bologna academic amenities
- *"Trading Routes"*: Venice + Amsterdam + Bruges historical commerce points

### 🗺️ **Real Geographic Data Integration**
- Fetches actual city boundaries from OpenStreetMap
- Supports various amenity types: restaurants, cafes, shops, banks, hospitals, and more
- Random point generation within city boundaries
- Works with any city worldwide
- Random country discovery tool with 249+ countries

### 🎛️ **Adaptive Sequencer Grid**
- Automatically calculates optimal grid dimensions (8-32 steps × 2-8 tracks) based on city shape and point density
- Real-time grid resizing maintains geographic coherence
- Geographic points map directly to sequencer cells
- Visual feedback showing which points trigger sounds during playback
- Dynamic adaptation when combining multiple city patterns

### 🎵 **Professional Audio System**
- **Built-in Synthesized Drums**: 12+ high-quality drum sounds (kick, snare, hi-hat, percussion, etc.)
- **Custom Audio Upload**: Add your own sound files (MP3, WAV, OGG, M4A, AAC) to any track
- **Web Audio API Synthesis**: Low-latency, professional-quality audio generation
- **Randomization Tools**: Instantly generate new sound combinations
- **Individual Track Controls**: Mute, solo, and customize each track independently

### 📼 **Built-in Recording System**
- **High-Quality Recording**: Professional audio capture using Web Audio API
- **Real-time Performance Capture**: Record your live geographic musical performances
- **Instant Download**: Save compositions as audio files for sharing and archiving
- **Session Integration**: Recordings preserve exact spatial-musical relationships
- **Multiple Format Support**: Export in various audio formats

### 🔧 **Spatial Transformations**
- **Clustering**: Groups points and adds cluster centers for rhythmic emphasis (K-means algorithm)
- **Grid Alignment**: Snaps points to regular grids for structured patterns (up to 5km grid sizes)
- **Noise Addition**: Adds controlled randomness to point positions (up to 1km variation)
- **Geographic Filtering**: Focus on specific spatial regions within larger datasets

### 🗺️ **Interactive Visualization**
- **Static Background Maps**: Matplotlib-based visualizations with contextily basemaps
- **Interactive Maps**: Folium-powered maps with zoom, pan, and point exploration
- **Real-time Point Highlighting**: Visual feedback during sequencer playback with column-wide blinking
- **Map Integration**: Background city imagery appears behind the sequencer interface
- **Multi-layer Visualization**: Clear display of combined geographic datasets

## 🚀 Getting Started

### Prerequisites

- Python 3.8 or higher
- Git

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/alecioc/geos4.git
cd geos4
```

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

3. **Run the application:**
```bash
streamlit run main.py
```

4. **Open your browser** and navigate to `http://localhost:8501`

## 🎮 Complete User Guide

### **Step 1: Understanding Data Layers**

**Data Layers** are the organizational foundation of GeoS4. They allow you to:
- Group multiple spatial patterns from different cities
- Create thematic collections of geographic data
- Build complex, multi-city musical compositions
- Organize your creative geographic explorations

### **Step 2: Create Your First Spatial Pattern**
1. **Navigate** to the "Create Spatial Pattern" tab
2. **Choose a Location**: Enter any city name (e.g., "Barcelona, Spain") or use the random country generator
3. **Select Data Source**: 
   - **Amenities**: Real points of interest from OpenStreetMap (restaurants, cafes, shops, etc.)
   - **Random Points**: Algorithmically generated points within city boundaries
4. **Apply Transformations** (optional): Modify your data with clustering, grid alignment, or noise
5. **Create Layer**: Add your pattern to a new or existing data layer

### **Step 3: Build Data Layer Collections**
1. **Single-City Layers**: Focus on one location for detailed exploration
   - Example: "Manhattan Restaurants" - Deep dive into NYC dining patterns
2. **Multi-City Layers**: Combine patterns from multiple locations
   - Example: "Mediterranean Coastal Cities" - Barcelona + Nice + Naples cafe patterns
3. **Themed Layers**: Organize by geographic or cultural themes
   - Example: "European University Towns" - Cambridge + Bologna + Heidelberg academic facilities

### **Step 4: Manage Your Layers**
1. **Switch** to the "Data Layers" tab
2. **View** all your created layers with interactive maps
3. **Select** layers for sequencer use
4. **Delete** layers you no longer need
5. **Navigate** quickly between layer exploration and musical playback

### **Step 5: Create Music with the Sequencer**
1. **Navigate** to the "Play!" tab (your selected layer should auto-load)
2. **Control Playback**: Use transport controls (Play/Pause/Stop/Record)
3. **Customize Grid**: Modify steps (8-32) and tracks (2-8) in real-time
4. **Upload Custom Sounds**: 
   - Click the upload button on any track
   - Support for MP3, WAV, OGG, M4A, AAC formats
   - Replace default drums with your own audio samples
5. **Adjust Audio Settings**: 
   - Select different drum sounds for each track
   - Use randomization features for instant variety
   - Control individual track volumes and effects

### **Step 6: Record Your Creations**
1. **Start Recording**: Click the record button in the sequencer controls
2. **Perform Live**: Play, stop, modify settings while recording
3. **Stop Recording**: Click record again to finish
4. **Download Audio**: Automatically save your geographic composition
5. **Share Your Work**: Use recorded files for sharing or further production

## 🏗️ Technical Architecture

### **Frontend Components**
- **Streamlit Interface**: Main application framework with enhanced tab-based navigation
- **HTML5 Sequencer**: Custom web component with canvas-based visualization and recording
- **JavaScript Audio Engine**: Web Audio API-based synthesis, custom audio support, and recording
- **Interactive Maps**: Folium integration with multi-layer support

### **Backend Processing**
- **Geospatial Module** (`geospatial_utils.py`): All geographic data processing and layer management
- **Layer Union System**: Advanced geographic data merging with boundary preservation
- **OSMnx Integration**: Real-time fetching of city boundaries and amenities
- **Mathematical Transformations**: Sophisticated clustering, noise, and grid alignment algorithms

### **Data Flow**
1. **Geographic Query** → OSMnx API → City boundaries and points
2. **Layer Organization** → Multiple pattern storage and management
3. **Spatial Processing** → Union creation with boundary preservation
4. **Grid Mapping** → Geographic coordinates to adaptive sequencer grid positions
5. **Audio Synthesis** → Web Audio API with custom sample support
6. **Recording System** → Real-time audio capture and export
7. **Visual Feedback** → Multi-layer highlighting and user interface updates

## 🎨 Advanced Use Cases

### **Music Production**
- Generate unique rhythmic patterns inspired by urban geography
- Create location-based concept albums using data layers
- Develop signature sounds by uploading custom audio samples
- Record geographic compositions for professional music production

### **Educational Applications**
- **Geography Classes**: Explore urban planning differences through sound
- **Music Technology**: Understand spatial data sonification principles
- **Cultural Studies**: Compare rhythmic patterns across different cities and regions
- **Data Science**: Learn about geographic data processing and visualization

### **Art Installations**
- **Interactive Exhibits**: Create location-aware musical experiences
- **Urban Soundscapes**: Generate city-specific audio environments
- **Cultural Documentation**: Preserve geographic patterns as audio archives
- **Collaborative Art**: Build community geographic music collections

### **Research Applications**
- **Urban Density Analysis**: Analyze spatial distribution patterns through audio
- **Cross-Cultural Studies**: Compare urban development patterns across regions
- **Human-Computer Interaction**: Study spatial data interaction methods
- **Musicology**: Explore algorithmic composition techniques

## 🛠️ Technical Details

### **Data Layer Processing**
- **Geographic Union Algorithm**: Combines multiple city datasets while preserving boundary shapes
- **Adaptive Grid Calculation**: Dynamic sizing based on combined spatial extents and point density
- **Memory Management**: Efficient storage and retrieval of large geographic datasets
- **Real-time Updates**: Live layer switching and modification capabilities

### **Audio Technology**
- **Web Audio API**: Professional-grade low-latency synthesis and recording
- **Custom Sample Management**: Efficient loading and playback of user-uploaded audio
- **Recording Engine**: High-quality real-time audio capture with Web Audio API
- **Cross-browser Compatibility**: Comprehensive support for modern web browsers
- **Format Support**: Multiple audio file formats for maximum compatibility

### **Performance Optimizations**
- **Streamlit Caching**: Intelligent caching for expensive geographic operations
- **Lazy Loading**: On-demand audio file processing and layer loading
- **Efficient Rendering**: Canvas-based visualization with minimal redraws
- **Memory Management**: Proper cleanup of audio resources and layer data

## 📂 Project Structure

```
geos4/
├── main.py                          # Main Streamlit application
├── geos4_py/
│   ├── tab_get_started.py          # Enhanced intro with layers explanation
│   ├── tab_create_pattern.py       # Pattern creation and layer management
│   ├── tab_layers.py               # Data layer organization and selection
│   ├── tab_play.py                 # Sequencer with recording capabilities
│   └── geospatial_utils.py         # Core geographic processing and layer union
├── geos4_sequencers/
│   └── horizontal_grid_sequencer_0/
│       ├── horizontal_grid_sequencer_single_layer.html  # Enhanced sequencer UI
│       ├── sequencer.js            # Main sequencer coordinator
│       ├── horizontal_grid_sequencer.js  # Grid implementation with recording
│       ├── sound_engine.js         # Audio synthesis with custom upload support
│       ├── sequencer_layer.js      # Layer management system
│       ├── track.js               # Enhanced track controls with upload
│       ├── sequencer_cell.js      # Cell behavior and properties
│       └── geographic_visualizer.js # Multi-layer visualization
├── requirements.txt               # Python dependencies
└── README.md                     # This documentation
```

## 🔧 Configuration Options

### **Audio Settings**
- **Recording Quality**: Adjust sample rate and bit depth in sound_engine.js
- **Synthesis Parameters**: Customize drum sound generation algorithms
- **Upload Limits**: Configure maximum file size for custom audio samples
- **Export Formats**: Modify available recording export formats

### **Layer Management**
- **Maximum Patterns**: Set limits on patterns per layer
- **Geographic Bounds**: Configure spatial extent calculations
- **Grid Adaptation**: Adjust automatic grid sizing algorithms
- **Memory Limits**: Set constraints on layer data storage

## 🤝 Contributing

We welcome contributions! Here's how you can help improve GeoS4:

### **Priority Areas**
1. **Advanced Recording Features**: Multi-track recording, loop capabilities, real-time effects
2. **Layer Enhancement**: Layer-specific audio effects, advanced merging algorithms
3. **Audio Improvements**: More synthesis options, professional audio export formats
4. **User Interface**: Enhanced track controls, better file management, visual improvements
5. **Performance**: Optimization for large datasets, faster layer switching
6. **Documentation**: User tutorials, video guides, example projects

### **Development Workflow**
1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-improvement`
3. **Implement changes**: Add features, fix bugs, improve documentation
4. **Test thoroughly**: Ensure all functionality works with various datasets
5. **Commit changes**: `git commit -m 'Add amazing improvement'`
6. **Push to branch**: `git push origin feature/amazing-improvement`
7. **Open a Pull Request**: Describe your changes and their impact

## 📞 Contact & Community

- **Project Maintainer**: [Alessandro Ciociola (Choxee)]
- **Email**: [choxee.g@gmail.com]
- **GitHub**: [https://github.com/AleCioc/geos4](https://github.com/AleCioc/geos4)
- **Issues**: [https://github.com/AleCioc/geos4/issues](https://github.com/AleCioc/geos4/issues)

## 🔮 Future Roadmap

### **Immediate Priorities**
- **Advanced Recording**: Multi-track recording, loop stations, real-time effects
- **Enhanced Audio**: Professional plugin support, advanced synthesis options
- **Layer Evolution**: Layer-specific transformations, advanced merging modes
- **UI/UX Improvements**: Better file management, enhanced visualization options

### **Medium-term Goals**
- **Collaboration Features**: Share and remix data layers with other users
- **Cloud Integration**: Online layer storage and sharing platform
- **API Development**: Programmatic access to GeoS4 functionality
- **Mobile Optimization**: Enhanced mobile device support and touch interfaces

### **Long-term Vision**
- **AI Integration**: Machine learning-powered pattern generation and optimization
- **Real-world Integration**: IoT sensors, GPS integration, live geographic data
- **Professional Tools**: DAW integration, MIDI export, advanced audio processing
- **Community Platform**: User-generated content, collaborative geographic music projects

---

**Transform your world into music with GeoS4's advanced data layers and recording capabilities! 🌍🎵📼**