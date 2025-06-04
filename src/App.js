import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import './App.css';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

function App() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [showElevationLegend, setShowElevationLegend] = useState(false);
  const [showRiskLegend, setShowRiskLegend] = useState(true);

  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/ksymes/ckcxhru700vpw1is0jx79xl16',
      center: [20, 5],
      zoom: 2.5,
      pitch: 0,
      bearing: 0,
      projection: 'mercator'
    });

    map.current.on('load', async () => {
      const response = await fetch('/malaria-map/json/csvjson.json');
      const data = await response.json();
      const admin0RiskMap = {};
      const admin1RiskMap = {};
      const admin2RiskMap = {};

      data.forEach(entry => {
        const { gid0, gid1, gid2, start_elevation_meters, end_elevation_meters, risk_level } = entry;
        const isElevated = start_elevation_meters || end_elevation_meters;

        if (gid0 && !gid1 && !gid2 && !isElevated) {
          admin0RiskMap[gid0] = risk_level;
        } else if (gid1 && !gid2) {
          admin1RiskMap[gid1] = risk_level;
        } else if (gid2) {
          admin2RiskMap[gid2] = risk_level;
        }
      });

      const getColor = level => {
        switch (level) {
          case 4: return '#ff0000';
          case 3: return '#ffa500';
          case 2: return '#ffff00';
          case 1: return '#00ff00';
          default: return null;
        }
      };

      map.current.addSource('admin0', { type: 'vector', url: 'mapbox://ksymes.2r1963to' });
      map.current.addSource('admin1', { type: 'vector', url: 'mapbox://ksymes.admin1' });
      map.current.addSource('admin2', { type: 'vector', url: 'mapbox://ksymes.admin2' });

      map.current.addLayer({
        id: 'adm1-risk', type: 'fill', source: 'admin1', 'source-layer': 'layer_name',
        minzoom: 0, maxzoom: 24,
        paint: {
          'fill-color': [
            'case',
            ['has', ['get', 'GID_1'], ['literal', admin1RiskMap]],
            ['match', ['get', 'GID_1'], ...Object.entries(admin1RiskMap).flatMap(([gid1, level]) => [gid1, getColor(level)]), 'transparent'],
            ['match', ['get', 'GID_0'], ...Object.entries(admin0RiskMap).flatMap(([gid0, level]) => [gid0, getColor(level)]), '#00ff00']
          ],
          'fill-opacity': 0.6
        },
        layout: { visibility: 'visible' }
      });

      map.current.addLayer({
        id: 'adm2-risk', type: 'fill', source: 'admin2', 'source-layer': 'admin2',
        minzoom: 6, maxzoom: 24,
        paint: {
          'fill-color': [
            'case',
            ['has', ['get', 'GID_2'], ['literal', admin2RiskMap]],
            ['match', ['get', 'GID_2'], ...Object.entries(admin2RiskMap).flatMap(([gid2, level]) => [gid2, getColor(level)]), 'transparent'],
            ['has', ['get', 'GID_1'], ['literal', admin1RiskMap]],
            ['match', ['get', 'GID_1'], ...Object.entries(admin1RiskMap).flatMap(([gid1, level]) => [gid1, getColor(level)]), 'transparent'],
            ['match', ['get', 'GID_0'], ...Object.entries(admin0RiskMap).flatMap(([gid0, level]) => [gid0, getColor(level)]), '#00ff00']
          ],
          'fill-opacity': 0.7
        },
        layout: { visibility: 'visible' }
      });

      map.current.addSource('ee-elevation-mask', {
        type: 'raster',
        tiles: ['https://earthengine.googleapis.com/v1/projects/ee-jsaita47/maps/832ca37bd68e2f8dd8f5b43c7ad59289-d756dffaf5be4871711ec6a037369b3e/tiles/{z}/{x}/{y}'],
        tileSize: 256
      });
      map.current.addLayer({
        id: 'ee-elevation-layer', type: 'raster', source: 'ee-elevation-mask',
        minzoom: 0, maxzoom: 24,
        paint: { 'raster-opacity': 0.6 },
        layout: { visibility: 'visible' }
      });

      map.current.addSource('elevation-mask', {
        type: 'raster',
        tiles: ['https://earthengine.googleapis.com/v1/projects/ee-jsaita47/maps/3dda07fa64625e86bff5f57da8fe4aff-197c5fcef3b64302d2e54216a41750f1/tiles/{z}/{x}/{y}'],
        tileSize: 256
      });
      map.current.addLayer({
        id: 'elevation-layer', type: 'raster', source: 'elevation-mask',
        minzoom: 0, maxzoom: 24,
        paint: { 'raster-opacity': 0.6 },
        layout: { visibility: 'none' }
      });

      map.current.addSource('terrain-source', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14
      });

      map.current.setTerrain({ source: 'terrain-source', exaggeration: 1.5 });

      map.current.addSource('hillshade-source', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14
      });

      map.current.addLayer({
        id: 'hillshade-layer',
        type: 'hillshade',
        source: 'hillshade-source',
        layout: { visibility: 'none' },
        paint: { 'hillshade-exaggeration': 1 }
      }, 'elevation-layer');

      map.current.addLayer({ id: 'adm2-boundary', type: 'line', source: 'admin2', 'source-layer': 'admin2', minzoom: 6, maxzoom: 24, paint: { 'line-color': '#FFFFFF', 'line-width': 0.5 } });
      map.current.addLayer({ id: 'adm1-boundary', type: 'line', source: 'admin1', 'source-layer': 'layer_name', minzoom: 3, maxzoom: 10, paint: { 'line-color': '#999', 'line-width': 0.5 } });
      map.current.addLayer({ id: 'adm0-boundary', type: 'line', source: 'admin0', 'source-layer': 'ne_10m_admin_0_map_units-10f1rr', minzoom: 0, maxzoom: 6, paint: { 'line-color': '#333', 'line-width': 0.5 } });
    });
  }, []);

  const zoomIn = () => map.current && map.current.zoomTo(map.current.getZoom() + 1);
  const zoomOut = () => map.current && map.current.zoomTo(map.current.getZoom() - 1);

  return (
    <div className="App">
      <header className="menu-bar">
        <div className="logo">GIDEON</div>
        <nav className="nav-links">
          <a href="#">Explore</a><a href="#">Lab</a><a href="#">Diagnose</a><a href="#">Visualize</a><a href="#">Compare</a><a href="#">A-Z</a><a href="#">More</a>
        </nav>
        <div className="search-bar"><input type="text" placeholder="Search..." /></div>
      </header>

      <div ref={mapContainer} className="map-container" />

      <div className="zoom-controls-left">
        <button onClick={zoomIn}>＋</button>
        <button onClick={zoomOut}>−</button>
      </div>

      <div className="map-legend scrollable-legend">
        {showRiskLegend && (
          <>
            <h4>Malaria Risk Levels</h4>
            <div><span className="legend-color" style={{ background: '#ff0000' }}></span> High Risk</div>
            <div><span className="legend-color" style={{ background: '#ffa500' }}></span> Moderate Risk</div>
            <div><span className="legend-color" style={{ background: '#ffff00' }}></span> Low Risk</div>
            <div><span className="legend-color" style={{ background: '#00ff00' }}></span> No Known Risk</div>
          </>
        )}
        {showElevationLegend && (
          <>
            <h4>Elevation Ranges (meters)</h4>
            <div><span className="legend-color" style={{ background: '#FF0000' }}></span> &lt; 500</div>
            <div><span className="legend-color" style={{ background: '#FF7F00' }}></span> 500–1000</div>
            <div><span className="legend-color" style={{ background: '#FFFF00' }}></span> 1000–1500</div>
            <div><span className="legend-color" style={{ background: '#7FFF00' }}></span> 1500–2000</div>
            <div><span className="legend-color" style={{ background: '#00FF00' }}></span> 2000–2500</div>
            <div><span className="legend-color" style={{ background: '#00FF7F' }}></span> 2500–3000</div>
            <div><span className="legend-color" style={{ background: '#00FFFF' }}></span> 3000–3500</div>
            <div><span className="legend-color" style={{ background: '#007FFF' }}></span> 3500–4000</div>
            <div><span className="legend-color" style={{ background: '#0000FF' }}></span> &gt; 4000</div>
          </>
        )}
      </div>

      <div className="layers-panel">
        <button className="layers-toggle-btn" onClick={() => document.querySelector('.layers-dropdown').classList.toggle('visible')}>Layers</button>
        <div className="layers-dropdown">
          <label>
            <input type="checkbox" defaultChecked onChange={(e) => {
              const visible = e.target.checked ? 'visible' : 'none';
              ['adm1-risk', 'adm2-risk', 'ee-elevation-layer'].forEach(id => {
                if (map.current.getLayer(id)) {
                  map.current.setLayoutProperty(id, 'visibility', visible);
                }
              });
              setShowRiskLegend(e.target.checked);
            }} />
            Risk Map
          </label>
          <label>
            <input type="checkbox" onChange={(e) => {
              const visible = e.target.checked ? 'visible' : 'none';
              ['hillshade-layer', 'elevation-layer'].forEach(id => {
                if (map.current.getLayer(id)) {
                  map.current.setLayoutProperty(id, 'visibility', visible);
                }
              });
              setShowElevationLegend(e.target.checked);
            }} />
            Elevation
          </label>
        </div>
      </div>

      <footer className="footer">
        <div>Copyright © 1994 - 2025 GIDEON Informatics, Inc. All Rights Reserved.</div>
        <div className="footer-links">
          <a href="#">Site Map</a><a href="#">Help</a><a href="#">License Agreement</a><a href="#">Get in touch</a>
        </div>
      </footer>
    </div>
  );
}

export default App;
