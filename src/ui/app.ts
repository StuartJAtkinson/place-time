import * as Cesium from 'cesium';

// ---------------------------------------------------------------------------
// No Cesium ion required — fully self-hosted
// ---------------------------------------------------------------------------
Cesium.Ion.defaultAccessToken = '';

// ---------------------------------------------------------------------------
// Layer definitions
// ---------------------------------------------------------------------------
interface LayerDef {
  id: string;
  label: string;
  path: string;
  color: string;         // CSS hex
  fillAlpha: number;     // 0–1
  strokeAlpha: number;
  strokeWidth: number;
  pointSize?: number;    // if set, render as points not polygons
  labelField?: string;   // property to use as billboard label
  active: boolean;
}

const LAYER_DEFS: LayerDef[] = [
  // Bottom layers first (drawn in order)
  { id: 'tectonic',       label: 'Tectonic',        path: '/tectonic_plates.geojson',           color: '#804030', fillAlpha: 0.06, strokeAlpha: 0.5,  strokeWidth: 0.8, active: false },
  { id: 'geology',        label: 'Bedrock (BGS)',    path: '/geological_provinces.geojson',       color: '#a07040', fillAlpha: 0.18, strokeAlpha: 0.5,  strokeWidth: 0.5, labelField: 'name', active: false },
  { id: 'hex-res7',       label: 'H3 Res 7',         path: '/five-towns-grid-res7.geojson',       color: '#2060a0', fillAlpha: 0,    strokeAlpha: 0.7,  strokeWidth: 1.2, active: false },
  { id: 'hex-res8',       label: 'H3 Res 8',         path: '/five-towns-grid-res8.geojson',       color: '/4090c0', fillAlpha: 0,    strokeAlpha: 0.55, strokeWidth: 0.5, active: true },
  { id: 'cliopatria',     label: 'UK Polities',      path: '/cliopatria-uk.geojson',              color: '#8050b0', fillAlpha: 0.12, strokeAlpha: 0.6,  strokeWidth: 0.6, labelField: 'Name', active: false },
  { id: 'west-yorkshire', label: 'West Yorkshire',   path: '/west-yorkshire.geojson',             color: '#308030', fillAlpha: 0.04, strokeAlpha: 0.7,  strokeWidth: 2.0, active: false },
  { id: 'wakefield',      label: 'Wakefield MDC',    path: '/wakefield-mdc.geojson',              color: '/50a050', fillAlpha: 0.05, strokeAlpha: 0.8,  strokeWidth: 2.0, active: true },
  { id: 'constituencies', label: 'Constituencies',   path: '/constituencies-five-towns.geojson',  color: '#c060c0', fillAlpha: 0.1,  strokeAlpha: 0.8,  strokeWidth: 1.5, labelField: 'PCON22NM', active: true },
  { id: 'wards',          label: 'Wards',            path: '/wards-wakefield.geojson',             color: '#9c6fba', fillAlpha: 0.07, strokeAlpha: 0.6,  strokeWidth: 0.7, labelField: 'WD23NM', active: false },
  { id: 'settlements',    label: 'OSM Towns',        path: '/yorkshire-settlements-osm.geojson',  color: '#b09040', fillAlpha: 1,    strokeAlpha: 1,    strokeWidth: 1,   pointSize: 5, labelField: 'name', active: true },
  { id: 'domesday',       label: 'Domesday 1086',    path: '/domesday-five-towns.geojson',        color: '#e0b030', fillAlpha: 1,    strokeAlpha: 1,    strokeWidth: 1.5, pointSize: 9, labelField: 'domesdayName', active: true },
];

// Fix the two entries with '/' prefix in color (typos)
for (const d of LAYER_DEFS) {
  if (d.color.startsWith('/')) d.color = '#' + d.color.slice(1);
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let currentYear = 1086;
const dataSources = new Map<string, Cesium.GeoJsonDataSource>();
const activeSet = new Set<string>(LAYER_DEFS.filter(d => d.active).map(d => d.id));

// ---------------------------------------------------------------------------
// Cesium viewer — no ion, no default imagery
// ---------------------------------------------------------------------------
const viewer = new Cesium.Viewer('cesiumContainer', {
  imageryProvider: false as unknown as Cesium.ImageryProvider,
  terrainProvider: new Cesium.EllipsoidTerrainProvider(),
  baseLayerPicker: false,
  geocoder: false,
  homeButton: false,
  sceneModePicker: true,
  navigationHelpButton: false,
  animation: false,
  timeline: false,
  fullscreenButton: false,
  selectionIndicator: false,
  infoBox: false,
});

// OSM base imagery
viewer.imageryLayers.addImageryProvider(
  new Cesium.UrlTemplateImageryProvider({
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    credit: '© OpenStreetMap contributors',
    maximumLevel: 19,
  })
);

// Dark space background
viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#0a0a14');

// Start over Five Towns
viewer.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(-1.31, 53.69, 60000),
  orientation: {
    heading: 0,
    pitch: Cesium.Math.toRadians(-50),
    roll: 0,
  },
});

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------
function cesiumColor(hex: string, alpha = 1): Cesium.Color {
  return Cesium.Color.fromCssColorString(hex).withAlpha(alpha);
}

// ---------------------------------------------------------------------------
// Temporal filter — does this feature exist at currentYear?
// ---------------------------------------------------------------------------
function featureActiveAt(props: Record<string, unknown>, year: number): boolean {
  const from = props['FromYear'] ?? props['validFrom'] ?? null;
  const to   = props['ToYear']   ?? props['validTo']   ?? null;
  const fromOk = from === null || from === undefined || (from as number) <= year;
  const toOk   = to   === null || to   === undefined || (to   as number) >= year;
  return fromOk && toOk;
}

// ---------------------------------------------------------------------------
// Load and style a single layer
// ---------------------------------------------------------------------------
async function loadLayer(def: LayerDef): Promise<void> {
  if (dataSources.has(def.id)) return;

  try {
    const ds = new Cesium.GeoJsonDataSource(def.id);
    await ds.load(def.path, {
      stroke: cesiumColor(def.color, def.strokeAlpha),
      strokeWidth: def.strokeWidth,
      fill: cesiumColor(def.color, def.fillAlpha),
      markerSize: def.pointSize ?? 0,
    });

    styleDataSource(ds, def);
    applyTemporalFilter(ds, def);

    dataSources.set(def.id, ds);
    if (activeSet.has(def.id)) {
      viewer.dataSources.add(ds);
    }
  } catch (err) {
    console.warn(`Failed to load ${def.id}:`, err);
  }
}

function styleDataSource(ds: Cesium.GeoJsonDataSource, def: LayerDef): void {
  const fill   = cesiumColor(def.color, def.fillAlpha);
  const stroke = cesiumColor(def.color, def.strokeAlpha);

  for (const entity of ds.entities.values) {
    const props = entity.properties?.getValue(Cesium.JulianDate.now()) as Record<string, unknown> ?? {};

    if (entity.polygon) {
      entity.polygon.material = new Cesium.ColorMaterialProperty(fill) as unknown as Cesium.MaterialProperty;
      entity.polygon.outlineColor = new Cesium.ConstantProperty(stroke);
      entity.polygon.outline = new Cesium.ConstantProperty(true);
      entity.polygon.outlineWidth = new Cesium.ConstantProperty(def.strokeWidth);
      // height:0 keeps polygon on ellipsoid surface and allows outlines (clampToGround disables outlines)
      entity.polygon.height = new Cesium.ConstantProperty(0);
    }

    if (entity.polyline) {
      entity.polyline.material = new Cesium.ColorMaterialProperty(stroke) as unknown as Cesium.MaterialProperty;
      entity.polyline.width = new Cesium.ConstantProperty(def.strokeWidth);
      entity.polyline.clampToGround = new Cesium.ConstantProperty(true);
    }

    if (entity.point) {
      entity.point.color = new Cesium.ConstantProperty(fill);
      entity.point.outlineColor = new Cesium.ConstantProperty(Cesium.Color.WHITE.withAlpha(0.6));
      entity.point.outlineWidth = new Cesium.ConstantProperty(1);
      entity.point.pixelSize = new Cesium.ConstantProperty(def.pointSize ?? 6);
      entity.point.heightReference = new Cesium.ConstantProperty(Cesium.HeightReference.CLAMP_TO_GROUND);
      entity.point.disableDepthTestDistance = new Cesium.ConstantProperty(Number.POSITIVE_INFINITY);
    }

    // Label
    if (def.labelField && props[def.labelField]) {
      entity.label = new Cesium.LabelGraphics({
        text: new Cesium.ConstantProperty(String(props[def.labelField])),
        font: new Cesium.ConstantProperty(def.pointSize ? '11px system-ui' : '10px system-ui'),
        fillColor: new Cesium.ConstantProperty(cesiumColor(def.color, 0.95)),
        outlineColor: new Cesium.ConstantProperty(Cesium.Color.BLACK),
        outlineWidth: new Cesium.ConstantProperty(2),
        style: new Cesium.ConstantProperty(Cesium.LabelStyle.FILL_AND_OUTLINE),
        pixelOffset: new Cesium.ConstantProperty(new Cesium.Cartesian2(0, def.pointSize ? -(def.pointSize + 4) : -2)),
        heightReference: new Cesium.ConstantProperty(Cesium.HeightReference.CLAMP_TO_GROUND),
        disableDepthTestDistance: new Cesium.ConstantProperty(Number.POSITIVE_INFINITY),
        show: new Cesium.ConstantProperty(true),
        distanceDisplayCondition: new Cesium.ConstantProperty(
          def.pointSize
            ? new Cesium.DistanceDisplayCondition(0, 50000)   // points: show within 50km
            : new Cesium.DistanceDisplayCondition(0, 200000)  // polygons: show within 200km
        ),
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Temporal filter — show/hide entities based on currentYear
// ---------------------------------------------------------------------------
function applyTemporalFilter(ds: Cesium.GeoJsonDataSource, def: LayerDef): void {
  for (const entity of ds.entities.values) {
    const props = entity.properties?.getValue(Cesium.JulianDate.now()) as Record<string, unknown> ?? {};
    const visible = featureActiveAt(props, currentYear);
    entity.show = visible;
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

function onYearChange(): void {
  currentYear = parseInt(slider.value);
  yearDisplay.textContent = formatYear(currentYear);

  for (const [id, ds] of dataSources) {
    const def = LAYER_DEFS.find(d => d.id === id)!;
    applyTemporalFilter(ds, def);
  }
}

slider.addEventListener('input', onYearChange);
yearDisplay.textContent = formatYear(currentYear);

// ---------------------------------------------------------------------------
// Layer toggle buttons
// ---------------------------------------------------------------------------
const toggleContainer = document.getElementById('layer-toggles') as HTMLDivElement;

for (const def of LAYER_DEFS) {
  const btn = document.createElement('button');
  btn.className = `layer-btn${activeSet.has(def.id) ? ' active' : ''}`;
  btn.textContent = def.label;
  btn.style.borderColor = def.color;
  if (activeSet.has(def.id)) btn.style.backgroundColor = def.color;

  btn.onclick = async () => {
    if (activeSet.has(def.id)) {
      activeSet.delete(def.id);
      btn.classList.remove('active');
      btn.style.backgroundColor = 'transparent';
      btn.style.color = '#e0e0e0';
      const ds = dataSources.get(def.id);
      if (ds) viewer.dataSources.remove(ds, false);
    } else {
      activeSet.add(def.id);
      btn.classList.add('active');
      btn.style.backgroundColor = def.color;
      btn.style.color = '#0a0a14';
      await loadLayer(def);
      const ds = dataSources.get(def.id);
      if (ds && !viewer.dataSources.contains(ds)) viewer.dataSources.add(ds);
    }
  };

  toggleContainer.appendChild(btn);

  // Start loading active layers
  if (activeSet.has(def.id)) loadLayer(def);
}

// ---------------------------------------------------------------------------
// Click to query
// ---------------------------------------------------------------------------
const infoPanel = document.getElementById('info-panel') as HTMLDivElement;

viewer.screenSpaceEventHandler.setInputAction(
  (event: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
    const picked = viewer.scene.pick(event.position);

    if (!Cesium.defined(picked) || !picked.id) {
      // Clicked empty space — show coordinates
      const ray = viewer.camera.getPickRay(event.position);
      if (!ray) return;
      const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
      if (!cartesian) return;
      const carto = Cesium.Cartographic.fromCartesian(cartesian);
      const lat = Cesium.Math.toDegrees(carto.latitude).toFixed(5);
      const lng = Cesium.Math.toDegrees(carto.longitude).toFixed(5);
      const elev = (carto.height / 1000).toFixed(1);
      infoPanel.innerHTML = `<h3>📍 ${lat}°N, ${lng}°E</h3><div style="color:#666;font-size:0.7rem;">${elev}km elevation · Year: ${formatYear(currentYear)}</div>`;
      return;
    }

    const entity = picked.id as Cesium.Entity;
    const props = entity.properties?.getValue(Cesium.JulianDate.now()) as Record<string, unknown> ?? {};
    const sourceId = entity.entityCollection?.owner instanceof Cesium.GeoJsonDataSource
      ? (entity.entityCollection.owner as Cesium.GeoJsonDataSource).name
      : '';
    const def = LAYER_DEFS.find(d => d.id === sourceId);

    let html = `<h3>${def?.label ?? 'Feature'}</h3>`;
    html += `<div style="color:#666;font-size:0.7rem;margin-bottom:0.4rem;">Year: ${formatYear(currentYear)}</div>`;
    html += `<div class="info-section"><div class="info-section">`;

    // Show meaningful properties — skip internal/boilerplate ones
    const skip = new Set(['layerId', 'source', 'validFrom', 'validTo', 'FID', 'GlobalID',
      'Shape__Area', 'Shape__Length', 'BNG_E', 'BNG_N', 'LONG', 'LAT']);

    for (const [key, val] of Object.entries(props)) {
      if (skip.has(key) || val === null || val === undefined || val === '') continue;
      html += `<div class="info-item"><span style="color:#888">${key}:</span> ${val}</div>`;
    }

    html += `</div></div>`;
    infoPanel.innerHTML = html;
  },
  Cesium.ScreenSpaceEventType.LEFT_CLICK
);

// ---------------------------------------------------------------------------
// Keyboard: G = fly to Five Towns, Escape = reset info panel
// ---------------------------------------------------------------------------
window.addEventListener('keydown', (e) => {
  if (e.key === 'g' || e.key === 'G') {
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(-1.31, 53.69, 60000),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-50), roll: 0 },
      duration: 2,
    });
  }
  if (e.key === 'Escape') {
    infoPanel.innerHTML = '<h3>Click the globe</h3><p style="color:#666;font-size:0.72rem;">Select a location to see what existed there at the chosen year.</p>';
  }
});
