// Place-Time Web UI
// Leaflet map with time slider, layer toggles, and point query

import type * as Leaflet from 'leaflet';
declare const L: typeof Leaflet;

// Point-in-polygon (ray casting)
function pointInRing(px: number, py: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (((yi > py) !== (yj > py)) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function pointInGeometry(lng: number, lat: number, geometry: GeoJSON.Geometry): boolean {
  try {
    if (geometry.type === 'Polygon') return pointInRing(lng, lat, geometry.coordinates[0] as number[][]);
    if (geometry.type === 'MultiPolygon') return (geometry.coordinates as number[][][][]).some(p => pointInRing(lng, lat, p[0]));
  } catch { /* skip */ }
  return false;
}

// ---------------------------------------------------------------------------
// Layer definitions
// ---------------------------------------------------------------------------
const LAYER_DEFS = [
  { id: 'wards', label: 'Wards', path: '/wards-wakefield.geojson', color: '#9c6fba', active: false },
  { id: 'constituencies', label: 'Constituencies', path: '/constituencies-five-towns.geojson', color: '#c060c0', active: true },
  { id: 'wakefield', label: 'Wakefield MDC', path: '/wakefield-mdc.geojson', color: '#50a050', active: true },
  { id: 'west-yorkshire', label: 'West Yorkshire', path: '/west-yorkshire.geojson', color: '#308030', active: false },
  { id: 'cliopatria', label: 'UK Polities', path: '/cliopatria-uk.geojson', color: '#8050b0', active: false },
  { id: 'settlements', label: 'OSM Towns', path: '/yorkshire-settlements-osm.geojson', color: '#b09040', active: true },
  { id: 'domesday', label: 'Domesday 1086', path: '/domesday-five-towns.geojson', color: '#e0b030', active: true },
  { id: 'hex-res8', label: 'H3 Res 8', path: '/five-towns-grid-res8.geojson', color: '#4090c0', active: true },
  { id: 'hex-res7', label: 'H3 Res 7', path: '/five-towns-grid-res7.geojson', color: '#2060a0', active: false },
  { id: 'geology', label: 'Bedrock', path: '/geological_provinces.geojson', color: '#a07040', active: false },
  { id: 'tectonic', label: 'Tectonic', path: '/tectonic_plates.geojson', color: '#804030', active: false },
];

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let currentYear = 1086;
const leafletLayers = new Map<string, L.GeoJSON>();
const geojsonCache = new Map<string, GeoJSON.FeatureCollection>();
const activeToggle = new Set<string>(['constituencies', 'wakefield', 'settlements', 'domesday', 'hex-res8']);

// ---------------------------------------------------------------------------
// Map init
// ---------------------------------------------------------------------------
const map = L.map('map').setView([53.693, -1.31], 11);

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '© OpenStreetMap © CartoDB',
  maxZoom: 19,
}).addTo(map);

// ---------------------------------------------------------------------------
// GeoJSON loader (cached)
// ---------------------------------------------------------------------------
async function loadGeoJson(path: string): Promise<GeoJSON.FeatureCollection | null> {
  if (geojsonCache.has(path)) return geojsonCache.get(path)!;
  try {
    const r = await fetch(path);
    if (!r.ok) return null;
    const data = await r.json() as GeoJSON.FeatureCollection;
    geojsonCache.set(path, data);
    return data;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Layer style helpers
// ---------------------------------------------------------------------------
function styleForLayer(id: string, color: string): L.PathOptions {
  if (id === 'domesday' || id === 'settlements') {
    return { color, fillColor: color, fillOpacity: 0.9, radius: 5 } as L.PathOptions;
  }
  return { color, weight: id === 'wakefield' || id === 'west-yorkshire' ? 2.5 : 1.2, fillOpacity: 0.06, fillColor: color };
}

function isPointLayer(id: string): boolean {
  return id === 'domesday' || id === 'settlements';
}

// ---------------------------------------------------------------------------
// Render layer filtered by year
// ---------------------------------------------------------------------------
async function renderLayer(def: typeof LAYER_DEFS[0]) {
  const existing = leafletLayers.get(def.id);
  if (existing) map.removeLayer(existing);
  if (!activeToggle.has(def.id)) return;

  const data = await loadGeoJson(def.path);
  if (!data) return;

  const features = data.features.filter(f => {
    const from = f.properties?.FromYear ?? f.properties?.validFrom;
    const to = f.properties?.ToYear ?? f.properties?.validTo;
    const fromOk = from === null || from === undefined || from <= currentYear;
    const toOk = to === null || to === undefined || to >= currentYear;
    return fromOk && toOk;
  });

  const style = styleForLayer(def.id, def.color);
  const isPoint = isPointLayer(def.id);

  // Hex layers — rendered with tooltips showing H3 index and nearest settlement
  if (def.id.startsWith('hex')) {
    const hexStyle = { color: def.color, weight: 1.5, fillOpacity: 0.15, fillColor: def.color };
    const layer = L.geoJSON({ type: 'FeatureCollection', features } as GeoJSON.FeatureCollection, {
      style: () => hexStyle,
      onEachFeature: (f, layer) => {
        const p = f.properties as Record<string, unknown>;
        const res = p['resolution'];
        const h3 = p['h3Index'] as string;
        const settlement = p['settlement'] as string || 'Unassigned';
        const distM = p['settlementDistM'] as number | null;
        const edgeM = p['cellEdgeM'] as number | null;
        const distStr = distM !== null ? ` — ${Math.round(distM)}m from ${settlement}` : '';
        const edgeStr = edgeM !== null ? ` — ${edgeM}m cell edge` : '';
        const label = `H3 Res ${res}\n${h3}\n${settlement}${distStr}${edgeStr}`;
        (layer as L.Path).bindTooltip(label, { sticky: true });
      },
    });
    map.addLayer(layer);
    leafletLayers.set(def.id, layer);
    return;
  }

  const layer = L.geoJSON({ type: 'FeatureCollection', features } as GeoJSON.FeatureCollection, {
    style: isPoint ? undefined : () => style,
    pointToLayer: isPoint ? (f: GeoJSON.Feature, latlng: Leaflet.LatLng) => {
      const m = L.circleMarker(latlng, { ...style, radius: def.id === 'domesday' ? 8 : 4, weight: 1.5 });
      const p = f.properties as Record<string, unknown>;
      if (p['domesdayName']) {
        m.bindTooltip(`${p['domesdayName']} → ${p['modernName']}`, { permanent: false });
      } else if (p['name']) {
        m.bindTooltip(p['name'] as string, { permanent: false });
      }
      return m;
    } : undefined,
  });

  map.addLayer(layer);
  leafletLayers.set(def.id, layer);
}

async function renderAllLayers() {
  for (const def of LAYER_DEFS) {
    await renderLayer(def);
  }
}

// ---------------------------------------------------------------------------
// Year slider
// ---------------------------------------------------------------------------
const slider = document.getElementById('year-slider') as HTMLInputElement;
const yearDisplay = document.getElementById('year-display') as HTMLSpanElement;

function formatYear(y: number): string {
  return y >= 0 ? `${y} CE` : `${Math.abs(y)} BCE`;
}

slider.addEventListener('input', () => {
  currentYear = parseInt(slider.value);
  yearDisplay.textContent = formatYear(currentYear);
  renderAllLayers();
});

// ---------------------------------------------------------------------------
// Layer toggle buttons
// ---------------------------------------------------------------------------
const toggleContainer = document.getElementById('layer-toggles') as HTMLDivElement;
for (const def of LAYER_DEFS) {
  const btn = document.createElement('button');
  btn.className = `layer-btn${activeToggle.has(def.id) ? ' active' : ''}`;
  btn.textContent = def.label;
  btn.style.borderColor = def.color;
  if (activeToggle.has(def.id)) btn.style.backgroundColor = def.color;
  btn.onclick = () => {
    if (activeToggle.has(def.id)) {
      activeToggle.delete(def.id);
      btn.classList.remove('active');
      btn.style.backgroundColor = 'transparent';
      const l = leafletLayers.get(def.id);
      if (l) map.removeLayer(l);
    } else {
      activeToggle.add(def.id);
      btn.classList.add('active');
      btn.style.backgroundColor = def.color;
      renderLayer(def);
    }
  };
  toggleContainer.appendChild(btn);
}

// ---------------------------------------------------------------------------
// Map click query
// ---------------------------------------------------------------------------
const infoPanel = document.getElementById('info-panel') as HTMLDivElement;

map.on('click', async (e: Leaflet.LeafletMouseEvent) => {
  const { lat, lng } = e.latlng;

  const clickMarker = L.circleMarker([lat, lng], { radius: 6, color: '#e94560', fillColor: '#e94560', fillOpacity: 0.8 })
    .addTo(map);
  clickMarker.on('click', () => map.removeLayer(clickMarker));

  let html = `<h3>📍 ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°W</h3>`;
  html += `<div style="color:#888;font-size:0.7rem;margin-bottom:0.5rem;">Year: ${formatYear(currentYear)}</div>`;

  // Domesday
  const domesday = await loadGeoJson('/domesday-five-towns.geojson');
  if (domesday && Math.abs(currentYear - 1086) < 100) {
    const nearby = domesday.features
      .filter(f => f.geometry.type === 'Point')
      .map(f => {
        const [fLng, fLat] = (f.geometry as GeoJSON.Point).coordinates;
        return { ...f.properties, dist: Math.sqrt((fLat - lat) ** 2 + (fLng - lng) ** 2) };
      })
      .filter((p) => p.dist < 0.15)
      .sort((a, b) => a.dist - b.dist);

    if (nearby.length > 0) {
      html += `<div class="info-section"><h4>Domesday (1086)</h4>`;
      for (const p of nearby.slice(0, 3)) {
        const props = p as Record<string, unknown>;
        html += `<div class="info-item"><strong>${props['domesdayName']}</strong> → ${props['modernName']} (${props['hundred']})</div>`;
      }
      html += '</div>';
    }
  }

  // H3 hex — show which cell and nearest settlement
  const hexRes8 = await loadGeoJson('/five-towns-grid-res8.geojson');
  if (hexRes8) {
    const matching = hexRes8.features.filter(f => {
      if (f.geometry?.type !== 'Polygon') return false;
      return pointInGeometry(lng, lat, f.geometry);
    });
    if (matching.length > 0) {
      const p = matching[0].properties as Record<string, unknown>;
      html += `<div class="info-section"><h4>H3 Cell (Res 8)</h4>`;
      html += `<div class="info-item"><strong>${p['h3Index']}</strong></div>`;
      html += `<div class="info-item">Nearest: ${p['settlement']} (${Math.round(p['settlementDistM'] as number)}m)</div>`;
      html += `<div class="info-item">Cell edge: ${p['cellEdgeM']}m | Area: ${p['cellAreaKm2']}km²</div>`;
      html += '</div>';
    }
  }

  // Cliopatria
  const clio = await loadGeoJson('/cliopatria-uk.geojson');
  if (clio) {
    const active = clio.features.filter(f => {
      if (!f.geometry) return false;
      const from = f.properties?.FromYear;
      const to = f.properties?.ToYear;
      const timeOk = (from == null || from <= currentYear) && (to == null || to >= currentYear);
      if (!timeOk) return false;
      return pointInGeometry(lng, lat, f.geometry as GeoJSON.Geometry);
    });

    if (active.length > 0) {
      html += `<div class="info-section"><h4>Polities</h4>`;
      for (const f of active.slice(0, 5)) {
        const from = f.properties?.FromYear ?? '?';
        const to = f.properties?.ToYear ?? '?';
        html += `<div class="info-item">${f.properties?.Name} (${from}–${to})</div>`;
      }
      html += '</div>';
    }
  }

  infoPanel.innerHTML = html;
});

// ---------------------------------------------------------------------------
// Initial render
// ---------------------------------------------------------------------------
yearDisplay.textContent = formatYear(currentYear);
renderAllLayers();