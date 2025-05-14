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
      map.current.addSource('custom-tileset', {
        type: 'vector',
        url: 'mapbox://ksymes.2r1963to',  // Replace with your tileset URL
      });

      map.current.addLayer({
        id: 'custom-layer',
        type: 'fill',  // You can change this based on your tileset type
        source: 'custom-tileset',
        'source-layer': 'ne_10m_admin_0_map_units-10f1rr',  // Layer name inside your tileset
        paint: {
          'fill-color': '#008000',
          'fill-opacity': 0.5,
        },
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
    </div>
  );
}

export default App;
