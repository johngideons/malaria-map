import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import './App.css';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

function App() {
  const mapContainer = useRef(null);
  const map = useRef(null);

  useEffect(() => {
    if (map.current) return;


    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [0, 20],
      zoom: 2,
    });
        // Example of adding a custom tileset as a vector tile source
    map.current.on('load', () => {
      map.current.addSource('admin-boundaries', {
        type: 'vector',
        url: 'mapbox://ksymes.2bolqz9e',  // Replace with your tileset URL
      });
    map.current.addLayer({
      id: 'disease-risk-layer',
      type: 'fill',
      source: 'admin-boundaries',
      'source-layer': 'ADM0-6f4iy3', // the layer name inside your tileset
      paint: {
        'fill-color': [
          'match',
          ['get', 'MALARIA_RISK'],
          '4', '#ff0000',       // Red
          '3', '#ffa500',   // Orange
          '2', '#ffff00',        // Yellow
          '1', '#00ff00',       // Green
          '#cccccc' // default (gray)
        ],
        'fill-opacity': 0.6
      }
    });
    });




    // Faster mouse wheel zoom
    map.current.scrollZoom.enable();
    map.current.scrollZoom.setWheelZoomRate(3);

    // Built-in controls (optional)
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
  }, []);

  // Custom zoom handlers
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
      <div ref={mapContainer} className="map-container" />
      <div className="zoom-controls">
        <button onClick={zoomIn}>＋</button>
        <button onClick={zoomOut}>−</button>
      </div>
      <div className="map-legend">
        <h4>Malaria Risk Levels</h4>
        <div><span className="legend-color" style={{ background: '#ff0000' }}></span> High Risk</div>
        <div><span className="legend-color" style={{ background: '#ffa500' }}></span> Moderate Risk</div>
        <div><span className="legend-color" style={{ background: '#ffff00' }}></span> Low Risk</div>
        <div><span className="legend-color" style={{ background: '#00ff00' }}></span> No Known Risk</div>
      </div>

    </div>
  );
}

export default App;
