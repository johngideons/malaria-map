import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import './App.css';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

function App() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [elevationVisible, setElevationVisible] = useState(false);

  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-98, 39],
      zoom: 2,
    });

    map.current.on('load', () => {
      // Admin boundaries and risk levels
      map.current.addSource('admin-boundaries', {
        type: 'vector',
        url: 'mapbox://ksymes.2bolqz9e',
      });

      map.current.addSource('us-admin1', {
        type: 'vector',
        url: 'mapbox://ksymes.2ticiwrd',
      });

      map.current.addSource('us-admin2', {
        type: 'vector',
        url: 'mapbox://ksymes.3t4a391a',
      });

      map.current.addLayer({
        id: 'adm0-risk',
        type: 'fill',
        source: 'admin-boundaries',
        'source-layer': 'ADM0-6f4iy3',
        minzoom: 0,
        maxzoom: 3,
        paint: {
          'fill-color': [
            'match',
            ['get', 'MALARIA_RISK'],
            '4', '#ff0000',
            '3', '#ffa500',
            '2', '#ffff00',
            '1', '#00ff00',
            '#cccccc'
          ],
          'fill-opacity': 0.6
        }
      });

      map.current.addLayer({
        id: 'us-admin1-risk',
        type: 'fill',
        source: 'us-admin1',
        'source-layer': 'us_admin1-8mciso',
        minzoom: 3,
        maxzoom: 6,
        paint: {
          'fill-color': [
            'match',
            ['get', 'Risk_Level'],
            4, '#ff0000',
            3, '#ffa500',
            2, '#ffff00',
            1, '#00ff00',
            '#cccccc'
          ],
          'fill-opacity': 0.6
        }
      });

      map.current.addLayer({
        id: 'us-admin2-risk',
        type: 'fill',
        source: 'us-admin2',
        'source-layer': 'us_admin2-aufexs',
        minzoom: 6,
        paint: {
          'fill-color': [
            'match',
            ['get', 'Level'],
            4, '#ff0000',
            3, '#ffa500',
            2, '#ffff00',
            1, '#00ff00',
            '#cccccc'
          ],
          'fill-opacity': 0.5
        }
      });

      // GEE Elevation Raster Layer
      map.current.addSource('ee-dem', {
        type: 'raster',
        tiles: [
          'https://earthengine.googleapis.com/v1/projects/ee-jsaita47/maps/43265f5115ccb45ab4ecb4925cce7b80-d80fd97724da03dd73552796343ab64d/tiles/{z}/{x}/{y}'
        ],
        tileSize: 256
      });

      map.current.addLayer({
        id: 'ee-dem',
        type: 'raster',
        source: 'ee-dem',
        layout: { visibility: 'none' },
        paint: {}
      });

      // US boundary lines
      map.current.addLayer({
        id: 'us-boundary-lines',
        type: 'line',
        source: 'us-admin2',
        'source-layer': 'us_admin2-aufexs',
        minzoom: 6,
        paint: {
          'line-color': '#5A5A5A',
          'line-width': 0.5
        }
      });
            // US boundary lines
      map.current.addLayer({
        id: 'us-boundary-lines0',
        type: 'line',
        source: 'admin-boundaries',
        'source-layer': 'ADM0-6f4iy3',
        minzoom: 0,
        maxzoom: 3,
        paint: {
          'line-color': '#5A5A5A',
          'line-width': 0.5
        }
      });

            // US boundary lines
      map.current.addLayer({
        id: 'us-boundary-lines1',
        type: 'line',
        source: 'us-admin1',
        'source-layer': 'us_admin1-8mciso',
        minzoom: 3,
        maxzoom: 6,
        paint: {
          'line-color': '#5A5A5A',
          'line-width': 0.8
        }
      });



      map.current.scrollZoom.enable();
      map.current.scrollZoom.setWheelZoomRate(3);
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    });
  }, []);

  const toggleElevation = () => {
    if (!map.current) return;
    const visibility = map.current.getLayoutProperty('ee-dem', 'visibility');
    if (visibility === 'visible') {
      map.current.setLayoutProperty('ee-dem', 'visibility', 'none');
      setElevationVisible(false);
    } else {
      map.current.setLayoutProperty('ee-dem', 'visibility', 'visible');
      setElevationVisible(true);
    }
  };

  const zoomIn = () => {
    if (!map.current) return;
    map.current.zoomTo(map.current.getZoom() + 1);
  };

  const zoomOut = () => {
    if (!map.current) return;
    map.current.zoomTo(map.current.getZoom() - 1);
  };

return (
  <div className="App">
    {/* Menu Bar */}
    <header className="menu-bar">
      <div className="logo">GIDEON</div>
      <nav className="nav-links">
        <a href="#">Explore</a>
        <a href="#">Lab</a>
        <a href="#">Diagnose</a>
        <a href="#">Visualize</a>
        <a href="#">Compare</a>
        <a href="#">A-Z</a>
        <a href="#">More</a>
      </nav>
      <div className="search-bar">
        <input type="text" placeholder="Search..." />
      </div>
    </header>

    {/* Map Container */}
    <div ref={mapContainer} className="map-container" />

    {/* Controls */}
  <div className="zoom-controls-left">
    <button onClick={zoomIn}>＋</button>
    <button onClick={zoomOut}>−</button>
  </div>

  <div className="zoom-controls-right">
    <button onClick={toggleElevation}>
      {elevationVisible ? 'Hide Elevation' : 'Show Elevation'}
    </button>
  </div>


    {/* Legend */}
    <div className="map-legend">
      <h4>Malaria Risk Levels</h4>
      <div><span className="legend-color" style={{ background: '#ff0000' }}></span> High Risk</div>
      <div><span className="legend-color" style={{ background: '#ffa500' }}></span> Moderate Risk</div>
      <div><span className="legend-color" style={{ background: '#ffff00' }}></span> Low Risk</div>
      <div><span className="legend-color" style={{ background: '#00ff00' }}></span> No Known Risk</div>
      <h4>Elevation (m)</h4>
      <div><span className="legend-color" style={{ background: '#ff0000' }}></span> Below 1000</div>
      <div><span className="legend-color" style={{ background: '#ffff00' }}></span> 1000 - 2000</div>
      <div><span className="legend-color" style={{ background: '#ffa500' }}></span> 2000 - 3000</div>
      <div><span className="legend-color" style={{ background: '#00ff00' }}></span> Above 3000</div>
    </div>

    {/* Footer */}
    <footer className="footer">
      <div>Copyright © 1994 - 2025 GIDEON Informatics, Inc. All Rights Reserved.</div>
      <div className="footer-links">
        <a href="#">Site Map</a>
        <a href="#">Help</a>
        <a href="#">License Agreement</a>
        <a href="#">Get in touch</a>
      </div>
    </footer>
  </div>
);

}

export default App;
