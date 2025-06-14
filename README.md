# 🌍 GeoS4 - Geographic Sequencer

**Transform city geography into musical patterns**

GeoS4 is an innovative web application that bridges the gap between geography and music by converting real-world urban data into rhythmic compositions. By mapping spatial information from cities onto an interactive drum sequencer, users can explore the sonic landscape of any location on Earth.

![GeoS4 Demo](https://img.shields.io/badge/Status-Active-brightgreen) ![Python](https://img.shields.io/badge/Python-3.8+-blue) ![Streamlit](https://img.shields.io/badge/Streamlit-1.28+-red) ![License](https://img.shields.io/badge/License-MIT-yellow)

## 🎵 What is GeoS4?

GeoS4 stands for **Geographic Sequencer for Spatial Soundscapes**. It's a creative tool that:

- **Fetches real geographic data** from OpenStreetMap (city boundaries, amenities, points of interest)
- **Processes spatial information** through mathematical transformations
- **Maps coordinates to a drum sequencer** where each geographic point becomes a potential sound trigger
- **Creates adaptive grids** that automatically adjust to the shape and density of your data
- **Generates unique rhythms** that reflect the actual urban landscape of any city

## ✨ Key Features

### 🗺️ **Real Geographic Data Integration**
- Fetches actual city boundaries from OpenStreetMap
- Supports various amenity types: restaurants, cafes, shops, banks, hospitals, and more
- Random point generation within city boundaries
- Works with any city worldwide

### 🎛️ **Adaptive Sequencer Grid**
- Automatically calculates optimal grid dimensions based on city shape and point density
- Real-time grid resizing (8-32 steps × 2-8 tracks)
- Geographic points map directly to sequencer cells
- Visual feedback showing which points trigger sounds during playback

### 🎵 **Advanced Audio Engine**
- 12+ built-in synthesized drum sounds (kick, snare, hi-hat, percussion, etc.)
- Custom audio file upload support (MP3, WAV, OGG, M4A, AAC)
- Web Audio API-based synthesis with randomization options
- Individual track muting and sound assignment
- BPM control (1-180 BPM)

### 🔧 **Spatial Transformations**
- **Clustering**: Groups points and adds cluster centers for rhythmic emphasis
- **Grid Alignment**: Snaps points to regular grids for structured patterns
- **Noise Addition**: Adds controlled randomness to point positions
- **None**: Uses raw geographic data unchanged

### 🗺️ **Interactive Visualization**
- **Static Background Maps**: Matplotlib-based visualizations with contextily basemaps
- **Interactive Maps**: Folium-powered maps with zoom, pan, and point exploration
- **Real-time Point Highlighting**: Visual feedback during sequencer playback
- **Map Integration**: Background city imagery in the sequencer interface

### 🎲 **Discovery Features**
- Random country generator with 249+ countries
- Quick pattern generation for instant experimentation
- Non-disruptive pattern updates that preserve playback state
- Exploration tools for finding interesting geographic patterns

## 🚀 Getting Started

### Prerequisites

- Python 3.8 or higher
- Git

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/yourusername/geos4.git
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

## 🎮 How to Use

### **Step 1: Get Started**
- Launch the app and read the introduction in the "Get Started" tab
- Learn about the features and see example cities to try

### **Step 2: Create Your Spatial Pattern**
1. **Choose a Location**: Enter any city name (e.g., "Barcelona, Spain") or use the random country generator
2. **Select Data Source**: 
   - **Amenities**: Real points of interest from OpenStreetMap
   - **Random Points**: Algorithmically generated points within city boundaries
3. **Apply Transformations**: Optionally modify your data with clustering, grid alignment, or noise
4. **Generate Pattern**: Click "Generate Spatial Pattern" to process your data
5. **Explore**: View your pattern on an interactive map

### **Step 3: Play Your Creation**
1. **Switch to Play Tab**: Navigate to the "Play!" tab
2. **Control Playback**: Use transport controls (Play/Pause/Stop)
3. **Customize Sounds**: 
   - Select different drum sounds for each track
   - Upload custom audio files
   - Use randomization features
4. **Adjust Grid**: Modify steps and tracks in real-time
5. **Visual Feedback**: Watch geographic points highlight as they trigger sounds

## 🏗️ Architecture

### **Frontend Components**
- **Streamlit Interface**: Main application framework with tab-based navigation
- **HTML5 Sequencer**: Custom web component with canvas-based visualization
- **JavaScript Sound Engine**: Web Audio API-based synthesis and playback
- **Interactive Maps**: Folium integration for geographic exploration

### **Backend Processing**
- **Geospatial Module** (`geospatial_utils.py`): All geographic data processing
- **OSMnx Integration**: Fetching city boundaries and amenities
- **GeoPandas**: Spatial data manipulation and coordinate transformations
- **Mathematical Transformations**: Clustering, noise, and grid alignment algorithms

### **Data Flow**
1. **Geographic Query** → OSMnx API → City boundaries and points
2. **Spatial Processing** → Coordinate transformations and optimizations
3. **Grid Mapping** → Geographic coordinates to sequencer grid positions
4. **Audio Synthesis** → Web Audio API sound generation
5. **Visual Feedback** → Real-time highlighting and user interface updates

## 🎨 Use Cases

### **Music Production**
- Generate unique rhythmic patterns inspired by cities
- Create location-based compositions
- Explore unconventional rhythm structures

### **Education**
- Visualize urban geography through sound
- Understand spatial data concepts
- Explore the relationship between geography and music

### **Art Installations**
- Interactive exhibits exploring urban soundscapes
- Location-aware musical experiences
- Data sonification projects

### **Research**
- Urban density analysis through audio representation
- Spatial pattern recognition experiments
- Human-computer interaction studies

### **Entertainment**
- Discover how different cities "sound"
- Create collaborative musical maps
- Gamify geographic exploration

## 🛠️ Technical Details

### **Geographic Data Processing**
- **OpenStreetMap Integration**: Real-time data fetching via OSMnx
- **Coordinate Systems**: Automatic CRS handling and transformations
- **Spatial Algorithms**: K-means clustering, grid snapping, noise injection
- **Boundary Calculation**: Optimal grid sizing based on city aspect ratios

### **Audio Technology**
- **Web Audio API**: Low-latency sound synthesis
- **Custom Buffer Management**: Efficient audio file loading and playback
- **Real-time Parameter Control**: Dynamic BPM, volume, and effect adjustments
- **Cross-browser Compatibility**: Support for modern web browsers

### **Performance Optimizations**
- **Caching**: Streamlit cache for expensive geographic operations
- **Lazy Loading**: On-demand audio file processing
- **Efficient Rendering**: Canvas-based visualization with minimal redraws
- **Memory Management**: Proper cleanup of audio resources

## 🔧 Configuration

### **Customization Options**
- **Grid Limits**: Modify maximum steps (32) and tracks (8) in `geospatial_utils.py`
- **Audio Settings**: Adjust synthesis parameters in `sound_engine.js`
- **Visual Styling**: Customize appearance in `styles.css`
- **Map Providers**: Change basemap sources in map creation functions

### **Environment Variables**
No environment variables required for basic functionality.

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**: Implement new features or fix bugs
4. **Test thoroughly**: Ensure all functionality works as expected
5. **Commit your changes**: `git commit -m 'Add amazing feature'`
6. **Push to branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**: Describe your changes and their impact

### **Areas for Contribution**
- Additional spatial transformation algorithms
- New audio synthesis methods
- Enhanced visualization options
- Performance optimizations
- Documentation improvements
- Bug fixes and testing

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenStreetMap**: For providing free, open geographic data
- **OSMnx**: For simplifying OpenStreetMap data access
- **Streamlit**: For enabling rapid web app development
- **Web Audio API**: For powerful browser-based audio synthesis
- **Folium**: For interactive map capabilities
- **The Open Source Community**: For countless libraries and tools that make this project possible

## 📞 Contact

- **Project Maintainer**: [Your Name]
- **Email**: [your.email@example.com]
- **GitHub**: [https://github.com/yourusername/geos4](https://github.com/yourusername/geos4)
- **Issues**: [https://github.com/yourusername/geos4/issues](https://github.com/yourusername/geos4/issues)

## 🔮 Future Roadmap

- **Open Sound Control (OSC) Integration**: Real-time parameter control from external devices
- **MIDI Export**: Save generated patterns as MIDI files
- **Collaborative Features**: Share and remix patterns with other users
- **Mobile Optimization**: Enhanced mobile device support
- **Advanced Synthesis**: More sophisticated audio generation algorithms
- **Machine Learning**: AI-powered pattern generation and optimization
- **API Development**: Programmatic access to GeoS4 functionality
- **Cloud Deployment**: Hosted service for easier access

---

**Transform your world into music with GeoS4! 🌍🎵**