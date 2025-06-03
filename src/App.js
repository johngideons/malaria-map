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
      style: 'mapbox://styles/ksymes/ckcxhru700vpw1is0jx79xl16',
      center: [-98, 39],
      zoom: 2,
      pitch: 0,
      bearing: 0,
      projection: 'mercator'
    });

    map.current.on('load', async () => {
      const response = await fetch('/malaria-map/json/csvjson.json');
      const data = await response.json();

      // Add Earth Engine elevation mask tile as raster
      map.current.addSource('ee-elevation-mask', {
        type: 'raster',
        tiles: [
          'https://earthengine.googleapis.com/v1/projects/ee-jsaita47/maps/d6b52ec480c601c00d35bd40bec3135b-09d3592265a9be107451b14a46958dde/tiles/{z}/{x}/{y}'
        ],
        tileSize: 256
      });

      map.current.addLayer({
        id: 'ee-elevation-layer',
        type: 'raster',
        source: 'ee-elevation-mask',
        minzoom: 0,
        maxzoom: 24,
        paint: {
          'raster-opacity': 1
        }
      }, null); // Insert on top of everything initially

      
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
          case 4: return '#ff0000';   // High
          case 3: return '#ffa500';   // Moderate
          case 2: return '#ffff00';   // Low
          case 1: return '#00ff00';   // No known risk
          default: return null;
        }
      };

      // Fallback helper
      const resolveRisk = (gid2, gid1, gid0) =>
        admin2RiskMap[gid2] ??
        admin1RiskMap[gid1] ??
        admin0RiskMap[gid0] ??
        null;

      // -------------------
      // Admin0 Expression
      // -------------------
      const admin0Expression = ['match', ['get', 'ISO_A3']];
      for (const gid0 of Object.keys(admin0RiskMap)) {
        admin0Expression.push(gid0, getColor(admin0RiskMap[gid0]));
      }

      // Assign default color (risk level 1) only to missing admin0
      admin0Expression.push('#00ff00');

      map.current.addSource('admin0', {
        type: 'vector',
        url: 'mapbox://ksymes.2r1963to'
      });

      // -------------------
      // Admin1 Expression (fallback to admin0)
      // -------------------
      const admin1Expression = ['match', ['get', 'GID_1']];
      for (const [gid1, level] of Object.entries(admin1RiskMap)) {
        admin1Expression.push(gid1, getColor(level));
      }
      admin1Expression.push('transparent');

      map.current.addSource('admin1', {
        type: 'vector',
        url: 'mapbox://ksymes.admin1'
      });

      map.current.addLayer({
        id: 'adm1-risk',
        type: 'fill',
        source: 'admin1',
        'source-layer': 'layer_name',
        minzoom: 0,
        maxzoom: 24,
        paint: {
          'fill-color': [
            'case',
            ['has', ['get', 'GID_1'], ['literal', admin1RiskMap]],
            ['match', ['get', 'GID_1'],
              ...Object.entries(admin1RiskMap).flatMap(([gid1, level]) => [gid1, getColor(level)]),
              'transparent'
            ],
            ['match', ['get', 'GID_0'],
              ...Object.entries(admin0RiskMap).flatMap(([gid0, level]) => [gid0, getColor(level)]),
              '#00ff00'
            ]
          ],
          'fill-opacity': 0.6
        }
      });

      // -------------------
      // Admin2 Expression (fallback to admin1/admin0)
      // -------------------
      const admin2Expression = ['match', ['get', 'GID_2']];
      for (const [gid2, level] of Object.entries(admin2RiskMap)) {
        admin2Expression.push(gid2, getColor(level));
      }
      admin2Expression.push('transparent');

      map.current.addSource('admin2', {
        type: 'vector',
        url: 'mapbox://ksymes.admin2'
      });

      map.current.addLayer({
        id: 'adm2-risk',
        type: 'fill',
        source: 'admin2',
        'source-layer': 'admin2',
        minzoom: 6,
        maxzoom: 24,
        paint: {
          'fill-color': [
            'case',
            ['has', ['get', 'GID_2'], ['literal', admin2RiskMap]],
            ['match', ['get', 'GID_2'],
              ...Object.entries(admin2RiskMap).flatMap(([gid2, level]) => [gid2, getColor(level)]),
              'transparent'
            ],
            ['has', ['get', 'GID_1'], ['literal', admin1RiskMap]],
            ['match', ['get', 'GID_1'],
              ...Object.entries(admin1RiskMap).flatMap(([gid1, level]) => [gid1, getColor(level)]),
              'transparent'
            ],
            ['match', ['get', 'GID_0'],
              ...Object.entries(admin0RiskMap).flatMap(([gid0, level]) => [gid0, getColor(level)]),
              '#00ff00'
            ]
          ],
          'fill-opacity': 0.7
        }
      });

      map.current.addLayer({
        id: 'adm2-boundary',
        type: 'line',
        source: 'admin2',
        'source-layer': 'admin2',
        minzoom: 6,
        maxzoom: 24,
        paint: {
          'line-color': '#FFFFFF',
          'line-width': 0.5
        }
      });

      map.current.addLayer({
        id: 'adm1-boundary',
        type: 'line',
        source: 'admin1',
        'source-layer': 'layer_name',
        minzoom: 3,
        maxzoom: 10,
        paint: {
          'line-color': '#999',
          'line-width': 0.5
        }
      });
    
    
      map.current.addLayer({
        id: 'adm0-boundary',
        type: 'line',
        source: 'admin0',
        'source-layer': 'ne_10m_admin_0_map_units-10f1rr',
        minzoom: 0,
        maxzoom: 6,
        paint: {
          'line-color': '#333',
          'line-width': 0.5
        }
    });
    });
    

  }, []);

  const zoomIn = () => map.current && map.current.zoomTo(map.current.getZoom() + 1);
  const zoomOut = () => map.current && map.current.zoomTo(map.current.getZoom() - 1);

  return (
    <div className="App">
      <header className="menu-bar">
        <div className="logo">GIDEON</div>
        <nav className="nav-links">
          <a href="https://app.gideononline.com/explore">Explore</a>
          <a href="https://app.gideononline.com/lab">Lab</a>
          <a href="https://app.gideononline.com/diagnose">Diagnose</a>
          <a href="https://app.gideononline.com/visualize">Visualize</a>
          <a href="https://app.gideononline.com/compare">Compare</a>
          <a href="https://app.gideononline.com/az">A-Z</a>
          <a href="#">More</a>
        </nav>
        <div className="search-bar">
          <input type="text" placeholder="Search..." />
        </div>
      </header>

      <div ref={mapContainer} className="map-container" />

      <div className="zoom-controls-left">
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

      <footer className="footer">
        <div>Copyright © 1994 - 2025 GIDEON Informatics, Inc. All Rights Reserved.</div>
        <div className="footer-links">
          <a href="https://app.gideononline.com/sitemap">Site Map</a>
          <a href="https://learn.gideononline.com/help">Help</a>
          <a href="https://app.gideononline.com/explore/diseases/meningitis-bacterial-11480/china-G140#">License Agreement</a>
          <a href="https://www.gideononline.com/contact">Get in touch</a>
        </div>
      </footer>
    </div>
  );
}

export default App;
