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
      center: [-98, 39], // Center on the USA
      zoom: 2,
    });

    map.current.on('load', () => {
      // Add all sources
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
        url: 'mapbox://ksymes.2cfmv9jr',
      });

      // National-level (ADM0) fill
      map.current.addLayer({
        id: 'adm0-risk',
        type: 'fill',
        source: 'admin-boundaries',
        'source-layer': 'ADM0-6f4iy3',
        minzoom: 0,
        maxzoom: 3, // Only show at low zoom levels
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

      // State-level (ADM1) fill
      map.current.addLayer({
        id: 'us-admin1-risk',
        type: 'fill',
        source: 'us-admin1',
        'source-layer': 'us_admin1-8mciso',
        minzoom: 3,
        maxzoom: 6, // Show at medium zoom
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

      // County-level (ADM2) fill
      map.current.addLayer({
        id: 'us-admin2-risk',
        type: 'fill',
        source: 'us-admin2',
        'source-layer': 'us_admin2-a06jog',
        minzoom: 6, // Only show at high zoom
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
          'fill-opacity': 0.6
        }
      });

      // Outline layer for all zooms (optional)
      map.current.addLayer({
        id: 'us-boundary-lines',
        type: 'line',
        source: 'us-admin2',
        'source-layer': 'us_admin2-a06jog',
        minzoom: 6, 
        paint: {
          'line-color': '#d3d3d3',
          'line-width': 1
        }
      });
    });

    map.current.scrollZoom.enable();
    map.current.scrollZoom.setWheelZoomRate(3);
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
  }, []);

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
