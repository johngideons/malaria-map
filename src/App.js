import React, { useEffect, useRef} from 'react';
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
      center: [-98, 39],
      zoom: 2,
      pitch: 0,
      bearing: 0,
      projection: 'mercator'
    });

    map.current.on('load', () => {
      
      Promise.all([
        fetch('/malaria-map/json/admin0.json').then(res => res.json()),
        fetch('/malaria-map/json/admin1.json').then(res => res.json())
      ]).then(([admin0Data, admin1Data]) => {
        // Step 1: Build admin0 risk map (country-level)
        const admin0RiskMap = {};
        admin0Data.forEach(entry => {
          admin0RiskMap[entry.ISO_2_DIGI] = entry.risk_level;
        });

        // Step 2: Build admin1 risk map (state-level)
        const admin1RiskMap = {};
        admin1Data.forEach(entry => {
          admin1RiskMap[entry.ISO_3166_2] = entry.risk_level;
        });

        // ----------------------------------------
        // Admin0 Layer (base map for all countries)
        // ----------------------------------------

        const admin0MatchExpression = ['match', ['get', 'ISO_A2']];
        Object.entries(admin0RiskMap).forEach(([iso2, level]) => {
          let color;
          switch (level) {
            case 4: color = '#ff0000'; break;
            case 3: color = '#ffa500'; break;
            case 2: color = '#ffff00'; break;
            case 1: color = '#00ff00'; break;
            default: color = '#cccccc';
          }
          admin0MatchExpression.push(iso2, color);
        });
        admin0MatchExpression.push('#cccccc');

        map.current.addSource('admin0', {
          type: 'vector',
          url: 'mapbox://ksymes.2r1963to',
        });

        map.current.addLayer({
          id: 'adm0-risk',
          type: 'fill',
          source: 'admin0',
          'source-layer': 'ne_10m_admin_0_map_units-10f1rr',
          minzoom: 0,
          maxzoom: 6,
          paint: {
            'fill-color': admin0MatchExpression,
            'fill-opacity': 0.6
          }
        });

        map.current.addLayer({
          id: 'admin-boundary-lines0',
          type: 'line',
          source: 'admin0',
          'source-layer': 'ne_10m_admin_0_map_units-10f1rr',
          minzoom: 0,
          maxzoom: 3,
          paint: {
            'line-color': '#5A5A5A',
            'line-width': 0.5
          }
        });

        // ----------------------------------------
        // Admin1 Layer (drawn over admin0)
        // Only for regions that exist in admin1 JSON
        // ----------------------------------------

        const admin1MatchExpression = ['match', ['get', 'iso_3166_2']];
        Object.entries(admin1RiskMap).forEach(([isoCode, level]) => {
          let color;
          switch (level) {
            case 4: color = '#ff0000'; break;
            case 3: color = '#ffa500'; break;
            case 2: color = '#ffff00'; break;
            case 1: color = '#00ff00'; break;
            default: color = '#cccccc';
          }
          admin1MatchExpression.push(isoCode, color);
        });
        admin1MatchExpression.push('transparent'); // hide unmatched regions so admin0 shows

        map.current.addSource('admin1', {
          type: 'vector',
          url: 'mapbox://ksymes.0idmwc9i',
        });

        map.current.addLayer({
          id: 'adm1-risk',
          type: 'fill',
          source: 'admin1',
          'source-layer': 'ne_10m_admin_1_states_provinc-8jcdng',
          minzoom: 3,
          maxzoom: 6,
          paint: {
            'fill-color': admin1MatchExpression,
            'fill-opacity': 0.6
          }
        });

        map.current.addLayer({
          id: 'admin-boundary-lines1',
          type: 'line',
          source: 'admin1',
          'source-layer': 'ne_10m_admin_1_states_provinc-8jcdng',
          minzoom: 3,
          maxzoom: 6,
          paint: {
            'line-color': '#5A5A5A',
            'line-width': 0.5
          }
        });
                map.current.addLayer({
          id: 'admin-boundary-lines0_1',
          type: 'line',
          source: 'admin0',
          'source-layer': 'ne_10m_admin_0_map_units-10f1rr',
          minzoom: 3,
          maxzoom: 6,
          paint: {
            'line-color': '#FF0000',
            'line-width': 0.5
          }
        });

      });
      //------------------------------------------------------

            
      map.current.addSource('us-admin1', {
        type: 'vector',
        url: 'mapbox://ksymes.2ticiwrd',
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

      // Admin Level 2 raster boundaries (new layer)
      map.current.addSource('admin2-boundaries', {
        type: 'raster',
        tiles: [
          'https://earthengine.googleapis.com/v1/projects/ee-jsaita47/maps/b9ce81c3c702cd4136883a668f32a02d-a317161130509adfcb92a080f484f4d7/tiles/{z}/{x}/{y}'
        ],
        tileSize: 256
      });

      map.current.addLayer({
        id: 'admin2-boundaries-layer',
        type: 'raster',
        source: 'admin2-boundaries',
        minzoom: 6,
        maxzoom: 9,
        layout: { visibility: 'visible' },
        paint: { 'raster-opacity': 0.6 }
      });

         // Admin Level 2 elevation
        map.current.addSource('admin2-elevation', {
        type: 'raster',
        tiles: [
          'https://earthengine.googleapis.com/v1/projects/ee-jsaita47/maps/fd4dd90c97236f0ba7c7caf6dec6c192-e611774b637d71c32f3b310b54510804/tiles/{z}/{x}/{y}'
        ],
        tileSize: 256
      });

      map.current.addLayer({
        id: 'admin2-elevation-layer',
        type: 'raster',
        source: 'admin2-elevation',
        minzoom: 9,
        maxzoom: 24,
        layout: { visibility: 'visible' },
        paint: { 'raster-opacity': 0.6 }
      });



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

      {/* Map Container */}
      <div ref={mapContainer} className="map-container" />

      {/* Controls */}
      <div className="zoom-controls-left">
        <button onClick={zoomIn}>＋</button>
        <button onClick={zoomOut}>−</button>
      </div>

      {/* Legend */}
      <div className="map-legend">
        <h4>Malaria Risk Levels</h4>
        <div><span className="legend-color" style={{ background: '#ff0000' }}></span> High Risk</div>
        <div><span className="legend-color" style={{ background: '#ffa500' }}></span> Moderate Risk</div>
        <div><span className="legend-color" style={{ background: '#ffff00' }}></span> Low Risk</div>
        <div><span className="legend-color" style={{ background: '#00ff00' }}></span> No Known Risk</div>
      </div>

      {/* Footer */}
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
