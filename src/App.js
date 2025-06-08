import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import './App.css';
import * as turf from '@turf/turf';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

function App() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [showElevationLegend, setShowElevationLegend] = useState(false);
  const [showRiskLegend, setShowRiskLegend] = useState(true);
  const [countryList, setCountryList] = useState([]);
  const [countryLookup, setCountryLookup] = useState({}); // map name -> {iso, latitude, longitude}
  const [selectedCountry, setSelectedCountry] = useState(null);

  const handleCountrySelect = (countryName) => {
    if (!map.current) return;

    if (countryName === 'All Countries') {
      setSelectedCountry(null);
      map.current.easeTo({
        center: [20, 5],
        zoom: 2,
        duration: 1000,
        essential: true
      });
      return;
    }
    setSelectedCountry(countryName);
    const { iso, latitude, longitude } = countryLookup[countryName];

    // Zoom out then fly to lat/lon
    map.current.easeTo({
      zoom: 0,
      duration: 1000,
      essential: true
    });

    setTimeout(() => {
      map.current.flyTo({
        center: [longitude, latitude],
        zoom: 5,
        speed: 1.2,
        essential: true
      });

      // After flying to center, fit bounds using boundary feature
      setTimeout(() => {
        const features = map.current.querySourceFeatures('admin0', {
          sourceLayer: 'ne_10m_admin_0_map_units-10f1rr',
          filter: ['==', ['get', 'ISO_A2'], iso]
        });

        if (!features.length) {
          return;
        }
        const bbox = turf.bbox(features[0]);
        map.current.fitBounds(bbox, {
          padding: 50,
          duration: 1000,
          essential: true
        });
      }, 1000);
    }, 1100);
  };

  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/ksymes/ckcxhru700vpw1is0jx79xl16',
      center: [20, 5],
      zoom: 2,
      pitch: 0,
      bearing: 0,
      projection: 'mercator'
    });

    map.current.on('load', async () => {
      // Fetch admin0.json to populate dropdown and lookup
      const admin0Response = await fetch('/malaria-map/json/admin0.json');
      const admin0Data = await admin0Response.json();
      const lookup = {};
      admin0Data.forEach(entry => {
        lookup[entry.name] = {
          iso: entry.country,
          latitude: entry.latitude,
          longitude: entry.longitude
        };
      });
      const uniqueNames = Object.keys(lookup).sort();
      setCountryLookup(lookup);
      setCountryList(['All Countries', ...uniqueNames]);

      // Malaria data processing
      const response = await fetch('/malaria-map/json/malaria_v4.json');
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

      const getColor = (level) => {
        switch (level) {
          case 4: return '#ff0000';
          case 3: return '#ffa500';
          case 2: return '#ffff00';
          case 1: return '#00ff00';
          default: return null;
        }
      };

      // Add vector sources
      map.current.addSource('admin0', { type: 'vector', url: 'mapbox://ksymes.2r1963to' });
      map.current.addSource('admin1', { type: 'vector', url: 'mapbox://ksymes.admin1' });
      map.current.addSource('admin2', { type: 'vector', url: 'mapbox://ksymes.admin2' });

      // Add malaria risk layers
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
            ['match', ['get', 'GID_1'], ...Object.entries(admin1RiskMap).flatMap(([gid1, level]) => [gid1, getColor(level)]), 'transparent'],
            ['match', ['get', 'GID_0'], ...Object.entries(admin0RiskMap).flatMap(([gid0, level]) => [gid0, getColor(level)]), '#00ff00']
          ],
          'fill-opacity': 0.6
        },
        layout: { visibility: 'visible' }
      });

      map.current.addLayer({
        id: 'adm2-risk',
        type: 'fill',
        source: 'admin2',
        'source-layer': 'admin2',
        minzoom: 3,
        maxzoom: 24,
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

      // Add elevation (EE) layers
      map.current.addSource('ee-elevation-mask', {
        type: 'raster',
        tiles: ['https://earthengine.googleapis.com/v1/projects/ee-jsaita47/maps/9650a7275910edb08f245fec81de73ad-69bbdb116be51d2ec02442203d0ce23f/tiles/{z}/{x}/{y}'],
        tileSize: 256
      });
      map.current.addLayer({
        id: 'ee-elevation-layer',
        type: 'raster',
        source: 'ee-elevation-mask',
        minzoom: 0,
        maxzoom: 24,
        paint: { 'raster-opacity': 0.6 },
        layout: { visibility: 'visible' }
      });

      // Add elevation mask layer
      map.current.addSource('elevation-mask', {
        type: 'raster',
        tiles: ['https://earthengine.googleapis.com/v1/projects/ee-jsaita47/maps/27d0c579099b744e9b31abc0664b452b-60153c192d6e0967a1ca3de21cd6f69f/tiles/{z}/{x}/{y}'],
        tileSize: 256
      });
      map.current.addLayer({
        id: 'elevation-layer',
        type: 'raster',
        source: 'elevation-mask',
        minzoom: 0,
        maxzoom: 24,
        paint: { 'raster-opacity': 0.6 },
        layout: { visibility: 'none' }
      });

      // Add terrain + hillshade
      map.current.addSource('terrain-source', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14
      });
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
        paint: { 'hillshade-exaggeration': 1 },
        layout: { visibility: 'none' }
      }, 'elevation-layer');
      // Add mask layer for admin0, initially hidden
      map.current.addLayer({
        id: 'admin0-mask',
        type: 'fill',
        source: 'admin0',
        'source-layer': 'ne_10m_admin_0_map_units-10f1rr',
        paint: {
          'fill-color': '#cccccc',
          'fill-opacity': 1
        },
        layout: { visibility: 'none' },
        filter: ['!=', 'ISO_A2', '']
      });

      // Add boundary lines on top
      map.current.addLayer({
        id: 'adm2-boundary',
        type: 'line',
        source: 'admin2',
        'source-layer': 'admin2',
        minzoom: 6,
        maxzoom: 24,
        paint: { 'line-color': '#FFFFFF', 'line-width': 0.5 }
      });
      map.current.addLayer({
        id: 'adm1-boundary',
        type: 'line',
        source: 'admin1',
        'source-layer': 'layer_name',
        minzoom: 3,
        maxzoom: 10,
        paint: { 'line-color': '#999', 'line-width': 0.5 }
      });
      map.current.addLayer({
        id: 'adm0-boundary',
        type: 'line',
        source: 'admin0',
        'source-layer': 'ne_10m_admin_0_map_units-10f1rr',
        minzoom: 0,
        maxzoom: 15,
        paint: { 'line-color': '#333', 'line-width': 0.5 }
      });
    });
  }, []);

  // Whenever selectedCountry changes, update the mask filter & visibility
  useEffect(() => {
    if (!map.current || !map.current.getLayer('admin0-mask')) return;
    if (selectedCountry) {
      const { iso } = countryLookup[selectedCountry];
      map.current.setFilter('admin0-mask', ['!=', 'ISO_A2', iso]);
      map.current.setLayoutProperty('admin0-mask', 'visibility', 'visible');
    } else {
      map.current.setLayoutProperty('admin0-mask', 'visibility', 'none');
    }
  }, [selectedCountry]);

  const zoomIn = () => map.current && map.current.zoomTo(map.current.getZoom() + 1);
  const zoomOut = () => map.current && map.current.zoomTo(map.current.getZoom() - 1);

  return (
    <div className="App">
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

      <div ref={mapContainer} className="map-container" />

      <div className="zoom-controls-left">
        <button onClick={zoomIn}>＋</button>
        <button onClick={zoomOut}>−</button>
      </div>

      <div className="map-legend scrollable-legend">
        {showRiskLegend && (
          <>
            <h4>Malaria Risk Levels</h4>
            <div>
              <span className="legend-color" style={{ background: '#ff0000' }} /> High Risk
            </div>
            <div>
              <span className="legend-color" style={{ background: '#ffa500' }} /> Moderate Risk
            </div>
            <div>
              <span className="legend-color" style={{ background: '#ffff00' }} /> Low Risk
            </div>
            <div>
              <span className="legend-color" style={{ background: '#00ff00' }} /> No Known Risk
            </div>
          </>
        )}
        {showElevationLegend && (
          <>
            <h4>Elevation Ranges (meters)</h4>
            <div>
              <span className="legend-color" style={{ background: '#FF0000' }} /> &lt; 500
            </div>
            <div>
              <span className="legend-color" style={{ background: '#FF7F00' }} /> 500–1000
            </div>
            <div>
              <span className="legend-color" style={{ background: '#FFFF00' }} /> 1000–1500
            </div>
            <div>
              <span className="legend-color" style={{ background: '#7FFF00' }} /> 1500–2000
            </div>
            <div>
              <span className="legend-color" style={{ background: '#00FF00' }} /> 2000–2500
            </div>
            <div>
              <span className="legend-color" style={{ background: '#00FF7F' }} /> 2500–3000
            </div>
            <div>
              <span className="legend-color" style={{ background: '#00FFFF' }} /> 3000–3500
            </div>
            <div>
              <span className="legend-color" style={{ background: '#007FFF' }} /> 3500–4000
            </div>
            <div>
              <span className="legend-color" style={{ background: '#0000FF' }} /> &gt; 4000
            </div>
          </>
        )}
      </div>

      <div className="country-select-panel">
        <button
          className="country-toggle-btn"
          onClick={() => {
            const dropdown = document.querySelector('.country-dropdown');
            dropdown.classList.toggle('visible');
          }}
        >
          Select Country ▼
        </button>
        <div className="country-dropdown scrollable-legend">
          {countryList.map((country) => (
            <div key={country} onClick={() => handleCountrySelect(country)}>
              {country}
            </div>
          ))}
        </div>
      </div>

      <div className="layers-panel">
        <button
          className="layers-toggle-btn"
          onClick={() => document.querySelector('.layers-dropdown').classList.toggle('visible')}
        >
          Layers
        </button>
        <div className="layers-dropdown">
          <label>
            <input
              id="risk-map-checkbox"
              type="checkbox"
              checked={showRiskLegend}
              onChange={(e) => {
                const isChecked = e.target.checked;
                ['adm1-risk', 'adm2-risk', 'ee-elevation-layer'].forEach((id) => {
                  if (map.current.getLayer(id)) {
                    map.current.setLayoutProperty(id, 'visibility', isChecked ? 'visible' : 'none');
                  }
                });
                setShowRiskLegend(isChecked);
                if (isChecked) {
                  if (map.current.getLayer('elevation-layer')) {
                    map.current.setLayoutProperty('elevation-layer', 'visibility', 'none');
                  }
                  setShowElevationLegend(false);
                  const elevationCheckbox = document.querySelector('#elevation-checkbox');
                  if (elevationCheckbox) elevationCheckbox.checked = false;
                }
              }}
            />
            Risk Map
          </label>

          <label>
            <input
              type="checkbox"
              checked={showElevationLegend}
              onChange={(e) => {
                const isChecked = e.target.checked;
                if (map.current.getLayer('elevation-layer')) {
                  map.current.setLayoutProperty('elevation-layer', 'visibility', isChecked ? 'visible' : 'none');
                }
                setShowElevationLegend(isChecked);
                if (isChecked) {
                  ['adm1-risk', 'adm2-risk', 'ee-elevation-layer'].forEach((id) => {
                    if (map.current.getLayer(id)) {
                      map.current.setLayoutProperty(id, 'visibility', 'none');
                    }
                  });
                  setShowRiskLegend(false);
                  const riskCheckbox = document.querySelector('#risk-map-checkbox');
                  if (riskCheckbox) riskCheckbox.checked = false;
                }
              }}
            />
            Elevation
          </label>

          <label>
            <input
              type="checkbox"
              onChange={(e) => {
                const enabled = e.target.checked;
                if (map.current) {
                  if (enabled) {
                    map.current.setTerrain({ source: 'terrain-source', exaggeration: 1.5 });
                  } else {
                    map.current.setTerrain(null);
                  }
                  if (map.current.getLayer('hillshade-layer')) {
                    map.current.setLayoutProperty('hillshade-layer', 'visibility', enabled ? 'visible' : 'none');
                  }
                }
              }}
            />
            Terrain
          </label>
        </div>
      </div>

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
