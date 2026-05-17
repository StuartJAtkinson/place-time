import * as Cesium from 'cesium';
import {
  polygonToCells, cellToBoundary, cellToLatLng,
  latLngToCell, getRes0Cells, cellToChildren,
} from 'h3-js';
import { COLUMN_TOP_M, hexAreaKm2 } from '../core/hexalog.js';
import { yearToPosition, geologicalEpochAtPosition, politicalEpochAtPosition, DEFAULT_CONFIG } from '../core/timescale.js';

// ---------------------------------------------------------------------------
// Tectonic mesh
// ---------------------------------------------------------------------------
interface TectonicMesh {
  timeStepsMa: number[];
  vertices: Record<string, {
    lat: number; lng: number; plate: string;
    positions: Record<number, [number, number] | null>;
  }>;
  cells: Record<string, string[]>;
}

let tectonicMesh: TectonicMesh | null = null;

fetch('/tectonic-mesh.json')
  .then(r => r.ok ? r.json() : null)
  .then((data: TectonicMesh | null) => {
    if (data) {
      tectonicMesh = data;
      console.log(`Tectonic mesh loaded: ${Object.keys(data.vertices).length} vertices`);
    }
  })
  .catch(() => {});

function getCellPositionsAtTime(cellId: string, timeMa: number): Cesium.Cartesian3[] | null {
  if (!tectonicMesh || !tectonicMesh.cells[cellId]) {
    const boundary = cellToBoundary(cellId);
    return boundary.map(([lat, lng]) => Cesium.Cartesian3.fromDegrees(lng, lat, WIRE_HEIGHT));
  }

  const vertexIds = tectonicMesh.cells[cellId];
  const steps = tectonicMesh.timeStepsMa;
  const hi = steps.findIndex(t => t >= timeMa);
  const lo = hi <= 0 ? 0 : hi - 1;
  const t0 = steps[lo], t1 = steps[hi < 0 ? steps.length - 1 : hi];
  const alpha = t0 === t1 ? 0 : (timeMa - t0) / (t1 - t0);

  const positions: Cesium.Cartesian3[] = [];
  for (const vid of vertexIds) {
    const v = tectonicMesh.vertices[vid];
    if (!v) return null;
    const p0 = v.positions[t0];
    const p1 = v.positions[t1];
    if (p0 === null && p1 === null) return null;
    const pos0 = p0 ?? p1!;
    const pos1 = p1 ?? p0!;
    const lat = pos0[0] + (pos1[0] - pos0[0]) * alpha;
    const lng = pos0[1] + (pos1[1] - pos0[1]) * alpha;
    positions.push(Cesium.Cartesian3.fromDegrees(lng, lat, WIRE_HEIGHT));
  }
  positions.push(positions[0]);
  return positions;
}

function yearToMa(year: number): number {
  if (year >= 0) return 0;
  if (year >= -1_000_000) return -year / 1e6;
  return -year / 1e6;
}

Cesium.Ion.defaultAccessToken = '';

const GRID_RESOLUTION = 6;

function resolutionForYear(year: number): number | null {
  return year < -4_540_000_000 ? null : GRID_RESOLUTION;
}

// ---------------------------------------------------------------------------
// Viewer
// ---------------------------------------------------------------------------
const viewer = new Cesium.Viewer('cesiumContainer', {
  imageryProvider: false as unknown as Cesium.ImageryProvider,
  terrainProvider: new Cesium.EllipsoidTerrainProvider(),
  baseLayerPicker: false as unknown as boolean,
  geocoder: false as unknown as boolean,
  homeButton: false as unknown as boolean,
  sceneModePicker: false as unknown as boolean,
  navigationHelpButton: false as unknown as boolean,
  animation: false as unknown as boolean,
  timeline: false as unknown as boolean,
  fullscreenButton: false as unknown as boolean,
  selectionIndicator: false as unknown as boolean,
  infoBox: false as unknown as boolean,
} as unknown as Cesium.Viewer.ConstructorOptions);

viewer.imageryLayers.addImageryProvider(
  new Cesium.UrlTemplateImageryProvider({
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    credit: '© OpenStreetMap contributors',
    maximumLevel: 19,
  })
);

viewer.scene.globe.translucency.enabled = true;
viewer.scene.globe.translucency.frontFaceAlpha = 1.0;
viewer.scene.globe.translucency.backFaceAlpha = 1.0;
viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#060608');

viewer.camera.constrainedAxis = Cesium.Cartesian3.UNIT_Z;
viewer.scene.screenSpaceCameraController.maximumZoomDistance = 1e9;
viewer.scene.screenSpaceCameraController.minimumZoomDistance = 100;

viewer.scene.postRender.addEventListener(() => {
  if (viewer.camera.pitch > -Math.PI / 4) {
    viewer.camera.setView({
      destination: viewer.camera.position.clone(),
      orientation: { heading: viewer.camera.heading, pitch: -Math.PI / 4, roll: 0 },
    });
  }
});

viewer.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(-1.31, 53.4, 150_000),
  orientation: { heading: 0, pitch: Cesium.Math.toRadians(-50), roll: 0 },
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const WIRE_COLOR = Cesium.Color.WHITE.withAlpha(0.45);
const WIRE_WIDTH = 1.6;
const WIRE_HEIGHT = 100;
const MAX_CELLS = 3_000;
const EARTH_FORMED = -4_540_000_000;

const H3_CELL_AREA_KM2: Partial<Record<number, number>> = {
  0: 4_310_000, 1: 609_882, 2: 86_745, 3: 12_392,
  4: 1_770, 5: 253, 6: 36, 7: 5.16, 8: 0.74,
};

function estimateCellCount(resolution: number, altitudeM: number): number {
  const R = 6_371;
  const h = altitudeM / 1_000;
  const visibleKm2 = 2 * Math.PI * R * R * h / (R + h);
  return visibleKm2 / (H3_CELL_AREA_KM2[resolution] ?? 36);
}

// ---------------------------------------------------------------------------
// Dynamic H3 Grid
// ---------------------------------------------------------------------------
class DynamicHexGrid {
  private readonly scene: Cesium.Scene;
  private readonly lines: Cesium.PolylineCollection;
  private readonly displayed = new Map<string, Cesium.Polyline>();
  private currentRes = -1;

  constructor(scene: Cesium.Scene) {
    this.scene = scene;
    this.lines = scene.primitives.add(new Cesium.PolylineCollection());
  }

  clear(): void {
    this.lines.removeAll();
    this.displayed.clear();
    this.currentRes = -1;
  }

  update(resolution: number): void {
    const visible = this.computeVisible(resolution);
    const visSet = new Set(visible);

    for (const [id, line] of this.displayed) {
      if (!visSet.has(id)) {
        this.lines.remove(line);
        this.displayed.delete(id);
      }
    }

    for (const id of visible) {
      if (!this.displayed.has(id)) {
        const positions = this.cellPositions(id);
        if (!positions) continue;
        const line = this.lines.add({
          positions,
          material: Cesium.Material.fromType('Color', { color: WIRE_COLOR }),
          width: WIRE_WIDTH,
          followSurface: true,
        });
        this.displayed.set(id, line);
      }
    }

    this.currentRes = resolution;
  }

  private cellPositions(id: string): Cesium.Cartesian3[] | null {
    const timeMa = yearToMa(currentYear);
    if (timeMa > 0 && tectonicMesh) return getCellPositionsAtTime(id, timeMa);
    const boundary = cellToBoundary(id);
    const pts = boundary.map(([lat, lng]) => Cesium.Cartesian3.fromDegrees(lng, lat, WIRE_HEIGHT));
    pts.push(pts[0]);
    return pts;
  }

  private computeVisible(resolution: number): string[] {
    const alt = this.scene.camera.positionCartographic.height;
    if (estimateCellCount(resolution, alt) > MAX_CELLS) return [];

    if (resolution <= 2) {
      const res0 = getRes0Cells();
      return resolution === 0 ? [...res0] : res0.flatMap(r0 => cellToChildren(r0, resolution));
    }

    const polygon = this.viewportPolygon();
    if (polygon.length < 4) {
      if (resolution <= 3) {
        const res0 = getRes0Cells();
        return res0.flatMap(r0 => cellToChildren(r0, resolution));
      }
      return [];
    }

    try {
      return polygonToCells(polygon, resolution);
    } catch {
      return [];
    }
  }

  private viewportPolygon(): [number, number][] {
    const canvas = this.scene.canvas;
    const w = canvas.clientWidth, h = canvas.clientHeight;

    const samples: [number, number][] = [
      [0, 0], [w * .25, 0], [w * .5, 0], [w * .75, 0], [w, 0],
      [w, h * .25], [w, h * .5], [w, h * .75], [w, h],
      [w * .75, h], [w * .5, h], [w * .25, h], [0, h],
      [0, h * .75], [0, h * .5], [0, h * .25],
    ];

    const latLngs: [number, number][] = [];
    for (const [sx, sy] of samples) {
      const ray = this.scene.camera.getPickRay(new Cesium.Cartesian2(sx, sy));
      if (!ray) continue;
      const hit = this.scene.globe.pick(ray, this.scene);
      if (!hit) continue;
      const c = Cesium.Cartographic.fromCartesian(hit);
      latLngs.push([Cesium.Math.toDegrees(c.latitude), Cesium.Math.toDegrees(c.longitude)]);
    }
    return latLngs;
  }
}

const hexGrid = new DynamicHexGrid(viewer.scene);

// ---------------------------------------------------------------------------
// Throttled camera update
// ---------------------------------------------------------------------------
let updateTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleGridUpdate(): void {
  if (updateTimer) return;
  updateTimer = setTimeout(() => {
    updateTimer = null;
    const res = resolutionForYear(currentYear);
    if (res === null) hexGrid.clear();
    else hexGrid.update(res);
  }, 120);
}

viewer.camera.changed.addEventListener(scheduleGridUpdate);
viewer.scene.postRender.addEventListener(() => {
  if (hexGrid['currentRes'] === -1) scheduleGridUpdate();
});

// ---------------------------------------------------------------------------
// Selected cell prism
// ---------------------------------------------------------------------------
let selectedPrism: Cesium.Entity | null = null;
let selectedCellId: string | null = null;

function selectCellById(id: string): void {
  if (selectedPrism) { viewer.entities.remove(selectedPrism); selectedPrism = null; }
  selectedCellId = id;

  const boundary = cellToBoundary(id);
  const positions = boundary.map(([lat, lng]) => Cesium.Cartesian3.fromDegrees(lng, lat));

  selectedPrism = viewer.entities.add({
    polygon: {
      hierarchy: new Cesium.PolygonHierarchy(positions),
      material: new Cesium.ColorMaterialProperty(
        Cesium.Color.RED.withAlpha(0.15)
      ) as unknown as Cesium.MaterialProperty,
      outline: true,
      outlineColor: Cesium.Color.RED.withAlpha(0.9),
      outlineWidth: 2.5,
      height: 0,
      extrudedHeight: COLUMN_TOP_M,
    } as unknown as Cesium.PolygonGraphics,
  });
}

function deselect(): void {
  if (selectedPrism) { viewer.entities.remove(selectedPrism); selectedPrism = null; }
  selectedCellId = null;
  hideInfoPanel();
}

// ---------------------------------------------------------------------------
// GeoJSON helpers — browser fetch (async, no Node.js deps)
// ---------------------------------------------------------------------------
const geoJsonCache = new Map<string, GeoJSON.FeatureCollection>();

async function loadGeoJsonCached(relPath: string): Promise<GeoJSON.FeatureCollection | null> {
  if (geoJsonCache.has(relPath)) return geoJsonCache.get(relPath)!;
  try {
    const res = await fetch('/' + relPath);
    if (!res.ok) return null;
    const data = await res.json() as GeoJSON.FeatureCollection;
    geoJsonCache.set(relPath, data);
    return data;
  } catch { return null; }
}

function pointInRing(px: number, py: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = ((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInGeometry(lng: number, lat: number, geometry: GeoJSON.Geometry): boolean {
  try {
    if (geometry.type === 'Polygon') return pointInRing(lng, lat, geometry.coordinates[0] as number[][]);
    if (geometry.type === 'MultiPolygon') return (geometry.coordinates as number[][][][]).some(poly => pointInRing(lng, lat, poly[0]));
  } catch {}
  return false;
}

function signedAreaDeg(ring: number[][]): number {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  }
  return a / 2;
}

function constituencyCompactness(f: GeoJSON.Feature): { pp: number; areaKm2: number; perimKm: number } {
  let ring: number[][];
  if (f.geometry?.type === 'Polygon') {
    ring = f.geometry.coordinates[0] as unknown as number[][];
  } else if (f.geometry?.type === 'MultiPolygon') {
    let maxArea = -Infinity;
    let biggestPoly: number[][] | undefined;
    for (const poly of f.geometry.coordinates as unknown as number[][][]) {
      const a = Math.abs(signedAreaDeg(poly));
      if (a > maxArea) { maxArea = a; biggestPoly = poly; }
    }
    if (!biggestPoly) return { pp: 0, areaKm2: 0, perimKm: 0 };
    ring = biggestPoly;
  } else {
    return { pp: 0, areaKm2: 0, perimKm: 0 };
  }
  const latMid = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos(latMid * Math.PI / 180);
  let areaM = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    areaM += (ring[j][0] * mPerDegLng) * (ring[i][1] * mPerDegLat)
           - (ring[i][0] * mPerDegLng) * (ring[j][1] * mPerDegLat);
  }
  areaM = Math.abs(areaM / 2);
  let perimM = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const dx = (ring[i][0] - ring[j][0]) * mPerDegLng;
    const dy = (ring[i][1] - ring[j][1]) * mPerDegLat;
    perimM += Math.sqrt(dx * dx + dy * dy);
  }
  const pp = perimM > 0 ? (4 * Math.PI * areaM) / (perimM * perimM) : 0;
  return { pp, areaKm2: areaM / 1e6, perimKm: perimM / 1000 };
}

// ---------------------------------------------------------------------------
// Info panel — async so it can fetch Cliopatria + constituencies
// ---------------------------------------------------------------------------
let infoPanel: HTMLDivElement | null = null;

function hideInfoPanel(): void {
  if (infoPanel) { infoPanel.remove(); infoPanel = null; }
}

async function showInfoPanel(cellId: string): Promise<void> {
  hideInfoPanel();

  const res = resolutionForYear(currentYear) ?? GRID_RESOLUTION;
  const [cellLat, cellLng] = cellToLatLng(cellId);
  const areaKm2 = hexAreaKm2(res).toFixed(2);

  let plateName = 'unknown';
  if (tectonicMesh && tectonicMesh.cells[cellId]) {
    const vid = tectonicMesh.cells[cellId][0];
    const v = tectonicMesh.vertices[vid];
    if (v) plateName = v.plate ?? plateName;
  }

  const timePos = yearToPosition(DEFAULT_CONFIG, currentYear);
  const geoEpoch = geologicalEpochAtPosition(timePos);
  const polEpoch = politicalEpochAtPosition(timePos);

  // Async load constituencies for compactness
  const constituencies = await loadGeoJsonCached('data/boundaries/constituencies-five-towns.geojson');
  let ppLine = '';
  if (constituencies) {
    const pcon = constituencies.features.find(f =>
      f.geometry && pointInGeometry(cellLng, cellLat, f.geometry as GeoJSON.Geometry)
    );
    if (pcon) {
      const { pp } = constituencyCompactness(pcon);
      const pconName = pcon.properties?.PCON22NM ?? pcon.properties?.PCON23NM ?? '';
      const rating = pp < 0.2 ? 'fragmented' : pp < 0.4 ? 'moderate' : 'compact';
      ppLine = `<div style="margin-top:0.3rem"><span style="color:#555">Constituency</span><br>${pconName}<br><span style="color:#555">PP compactness</span> ${pp.toFixed(4)} <span style="color:#444">(${rating})</span></div>`;
    }
  }

  const geoLine = geoEpoch
    ? `<div style="margin-top:0.3rem"><span style="color:#555">Geo epoch</span><br>${geoEpoch.name}${geoEpoch.description ? ' — ' + geoEpoch.description : ''}</div>`
    : '';
  const polLine = polEpoch
    ? `<div style="margin-top:0.3rem"><span style="color:#555">Political epoch</span><br>${polEpoch.name}${polEpoch.description ? ' — ' + polEpoch.description : ''}</div>`
    : '';

  infoPanel = document.createElement('div');
  infoPanel.id = 'cell-info';
  infoPanel.style.cssText = `
    position:absolute;top:3.5rem;right:1rem;width:240px;
    background:rgba(6,6,12,0.93);border:1px solid #2a2a3e;
    border-radius:6px;padding:0.75rem;font-family:system-ui,sans-serif;
    color:#ccc;font-size:0.72rem;line-height:1.5;z-index:10;
    box-shadow:0 4px 24px rgba(0,0,0,0.5);max-height:80vh;overflow-y:auto;
  `;
  infoPanel.innerHTML = `
    <div style="overflow:hidden">
      <strong style="color:#e94560;font-size:0.8rem">Cell Info</strong>
      <button id="cell-info-close" style="float:right;background:none;border:none;color:#888;font-size:1rem;cursor:pointer;padding:0;line-height:1;">x</button>
    </div>
    <hr style="border:none;border-top:1px solid #2a2a3e;margin:0.5rem 0">
    <div><span style="color:#555">H3 ID</span><br><span style="word-break:break-all;font-size:0.65rem">${cellId}</span></div>
    <div style="margin-top:0.3rem"><span style="color:#555">Centroid</span><br>${cellLat.toFixed(4)}N, ${Math.abs(cellLng).toFixed(4)}W</div>
    <div style="margin-top:0.3rem"><span style="color:#555">Era</span><br>${formatYear(currentYear)}</div>
    <div style="margin-top:0.3rem"><span style="color:#555">Plate</span><br>${plateName}</div>
    ${geoLine}
    ${polLine}
    ${ppLine}
    <div style="margin-top:0.3rem"><span style="color:#555">H3 res ${res}</span><br><span style="color:#555">~${areaKm2} km2 per cell</span></div>
    <div id="cell-info-polities" style="margin-top:0.5rem"><span style="color:#555">Cliopatria polities</span><br><em style="color:#444">loading...</em></div>
  `;
  document.getElementById('cell-info-close')?.addEventListener('click', () => { infoPanel?.remove(); infoPanel = null; });
  document.body.appendChild(infoPanel);

  // Async load Cliopatria
  const cliopatria = await loadGeoJsonCached('data/historical/cliopatria-uk.geojson');
  const polityDiv = document.getElementById('cell-info-polities');
  if (!polityDiv || !infoPanel) return;

  if (!cliopatria) {
    polityDiv.innerHTML = `<span style="color:#555">Cliopatria polities</span><br><em style="color:#444">unavailable</em>`;
    return;
  }

  const activePolities: string[] = [];
  for (const f of cliopatria.features) {
    if (!f.geometry) continue;
    const from = f.properties?.FromYear ?? f.properties?.validFrom;
    const to = f.properties?.ToYear ?? f.properties?.validTo;
    if ((from != null && from > currentYear) || (to != null && to < currentYear)) continue;
    if (pointInGeometry(cellLng, cellLat, f.geometry as GeoJSON.Geometry)) {
      const name = f.properties?.Name ?? f.properties?.name ?? '(unnamed)';
      activePolities.push(`${name} (${from ?? '?'} - ${to ?? '?'})`);
    }
  }

  if (activePolities.length > 0) {
    polityDiv.innerHTML = `<span style="color:#555">Cliopatria polities</span><br>${activePolities.map(p => '&bull; ' + p).join('<br>')}`;
  } else if (currentYear >= -3400 && currentYear <= 2024) {
    polityDiv.innerHTML = `<span style="color:#555">Cliopatria polities</span><br><em style="color:#444">none at this date</em>`;
  } else {
    polityDiv.innerHTML = `<span style="color:#555">Cliopatria polities</span><br><em style="color:#444">n/a (prehistoric)</em>`;
  }
}

// ---------------------------------------------------------------------------
// Big Bang blob
// ---------------------------------------------------------------------------
let bigBangEntity: Cesium.Entity | null = null;

function showBigBang(): void {
  if (bigBangEntity) return;
  bigBangEntity = viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(0, 0, 0),
    ellipsoid: {
      radii: new Cesium.Cartesian3(80_000, 80_000, 80_000),
      material: new Cesium.ColorMaterialProperty(
        Cesium.Color.WHITE.withAlpha(0.8)
      ) as unknown as Cesium.MaterialProperty,
      outline: false,
    },
  });
}

function hideBigBang(): void {
  if (bigBangEntity) { viewer.entities.remove(bigBangEntity); bigBangEntity = null; }
}

// ---------------------------------------------------------------------------
// Click handler
// ---------------------------------------------------------------------------
viewer.screenSpaceEventHandler.setInputAction(
  (event: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
    const pickedObj = viewer.scene.pick(event.position);
    if (Cesium.defined(pickedObj) && pickedObj.id === selectedPrism) {
      deselect(); return;
    }

    const ray = viewer.camera.getPickRay(event.position);
    if (!ray) { deselect(); return; }
    const hit = viewer.scene.globe.pick(ray, viewer.scene);
    if (!hit) { deselect(); return; }

    const carto = Cesium.Cartographic.fromCartesian(hit);
    const lat = Cesium.Math.toDegrees(carto.latitude);
    const lng = Cesium.Math.toDegrees(carto.longitude);

    const res = resolutionForYear(currentYear);
    if (res === null) { deselect(); return; }

    const cellId = latLngToCell(lat, lng, res);
    if (cellId === selectedCellId) { deselect(); return; }

    selectCellById(cellId);
    showInfoPanel(cellId);
  },
  Cesium.ScreenSpaceEventType.LEFT_CLICK
);

// ---------------------------------------------------------------------------
// Time state
// ---------------------------------------------------------------------------
let currentYear = 0;

function formatYear(y: number): string {
  if (y <= -1_000_000_000) return `${(-y / 1e9).toFixed(2)} Ga`;
  if (y <= -1_000_000) return `${(-y / 1e6).toFixed(1)} Ma`;
  if (y <= -10_000) return `${(-y / 1e3).toFixed(0)} ka`;
  if (y < 0) return `${Math.abs(y).toLocaleString()} BCE`;
  if (y === 0) return '0 CE';
  return `${y} CE`;
}

const yearDisplay = document.getElementById('year-display') as HTMLSpanElement;
const ceSlider = document.getElementById('ce-slider') as HTMLInputElement;
const ceInput = document.getElementById('ce-input') as HTMLInputElement;

function setYear(y: number): void {
  currentYear = y;
  yearDisplay.textContent = formatYear(y);
  if (y >= 0 && y <= 2024) { ceSlider.value = String(y); ceInput.value = String(y); }

  const preEarth = y < EARTH_FORMED;
  if (viewer.scene.skyBox) viewer.scene.skyBox.show = !preEarth;
  if (viewer.scene.globe) viewer.scene.globe.show = !preEarth;
  viewer.scene.backgroundColor = preEarth ? Cesium.Color.BLACK : Cesium.Color.fromCssColorString('#060608');

  if (preEarth) {
    showBigBang();
    viewer.scene.globe.translucency.enabled = false;
  } else {
    hideBigBang();
    viewer.scene.globe.translucency.enabled = true;
  }

  deselect();

  hexGrid.clear();
  if (updateTimer) { clearTimeout(updateTimer); updateTimer = null; }
  const res = resolutionForYear(y);
  if (res !== null) hexGrid.update(res);

  document.querySelectorAll<HTMLButtonElement>('.era-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.year ?? '999') === y);
  });
}

document.querySelectorAll<HTMLButtonElement>('.era-btn').forEach(btn => {
  btn.addEventListener('click', () => setYear(parseInt(btn.dataset.year!)));
});
ceSlider.addEventListener('input', () => {
  const y = parseInt(ceSlider.value);
  ceInput.value = String(y);
  setYear(y);
});
ceInput.addEventListener('change', () => {
  const y = parseInt(ceInput.value);
  if (!isNaN(y)) { if (y >= 0 && y <= 2024) ceSlider.value = String(y); setYear(y); }
});

setYear(0);

// ---------------------------------------------------------------------------
// Keyboard
// ---------------------------------------------------------------------------
window.addEventListener('keydown', e => {
  if (e.key === 'g' || e.key === 'G') {
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(-1.31, 53.4, 150_000),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-50), roll: 0 },
      duration: 2,
    });
  }
  if (e.key === 'Escape') deselect();
});