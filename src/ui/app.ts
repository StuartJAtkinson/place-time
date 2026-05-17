import * as Cesium from 'cesium';
import {
  polygonToCells, cellToBoundary, cellToLatLng,
  latLngToCell, getRes0Cells, cellToChildren,
} from 'h3-js';
import { COLUMN_TOP_M } from '../core/hexalog.js';

Cesium.Ion.defaultAccessToken = '';

// ---------------------------------------------------------------------------
// Single resolution — H3 res 6 (~3.9km edge) for all time
// This is the Place-Time leaf node (PTR-10). The grid is fixed in modern
// WGS84 coordinates and will be back-propagated through tectonic plate
// velocity data to reconstruct its position at any geological epoch.
// ---------------------------------------------------------------------------
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
  baseLayerPicker: false, geocoder: false, homeButton: false,
  sceneModePicker: false, navigationHelpButton: false,
  animation: false, timeline: false, fullscreenButton: false,
  selectionIndicator: false, infoBox: false,
});

viewer.imageryLayers.addImageryProvider(
  new Cesium.UrlTemplateImageryProvider({
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    credit: '© OpenStreetMap contributors',
    maximumLevel: 19,
  })
);

viewer.scene.globe.translucency.enabled = true;
viewer.scene.globe.translucency.frontFaceAlpha = 1.0;
viewer.scene.globe.translucency.backFaceAlpha  = 1.0;
viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#060608');

// Camera constraints
viewer.camera.constrainedAxis = Cesium.Cartesian3.UNIT_Z;
viewer.scene.screenSpaceCameraController.maximumZoomDistance = 1e9;
viewer.scene.screenSpaceCameraController.minimumZoomDistance = 100;

// Pitch clamp: postRender fires AFTER the camera controller finishes its
// update for the frame, so there's no fight. Anchoring destination to the
// current position means only orientation changes — no globe translation.
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
// Dynamic H3 grid renderer
//
// Uses PolylineCollection — the fastest Cesium primitive for many short lines.
// Cell outlines are added/removed incrementally as the camera moves, so the
// per-frame cost is only the diff between old and new visible sets.
//
// Picking is done via globe.pick() → latLngToCell() — no geometry needed.
// ---------------------------------------------------------------------------
const WIRE_COLOR = Cesium.Color.WHITE.withAlpha(0.45);
const WIRE_WIDTH = 1.6;
const WIRE_HEIGHT = 100;  // metres above ellipsoid — avoids z-fighting with terrain

// Maximum cells to render at once — above this the diff/draw cost is too high
const MAX_CELLS = 3_000;

// H3 average cell area (km²) — used to estimate visible count from altitude
// without calling polygonToCells first
const H3_CELL_AREA_KM2: Partial<Record<number, number>> = {
  0: 4_310_000, 1: 609_882, 2: 86_745, 3: 12_392,
  4: 1_770, 5: 253, 6: 36, 7: 5.16, 8: 0.74,
};

/**
 * Estimate how many H3 cells would be visible from a given altitude.
 * Uses the spherical cap formula: visible area = 2πR²h/(R+h)
 */
function estimateCellCount(resolution: number, altitudeM: number): number {
  const R  = 6_371;                               // km
  const h  = altitudeM / 1_000;                   // km
  const visibleKm2 = 2 * Math.PI * R * R * h / (R + h);
  const cellKm2    = H3_CELL_AREA_KM2[resolution] ?? 36;
  return visibleKm2 / cellKm2;
}

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

    // Remove cells that left the viewport
    for (const [id, line] of this.displayed) {
      if (!visSet.has(id)) {
        this.lines.remove(line);
        this.displayed.delete(id);
      }
    }

    // Add newly visible cells
    for (const id of visible) {
      if (!this.displayed.has(id)) {
        const positions = this.cellPositions(id);
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

  private cellPositions(id: string): Cesium.Cartesian3[] {
    const boundary = cellToBoundary(id);  // [lat, lng][]
    const pts = boundary.map(([lat, lng]) =>
      Cesium.Cartesian3.fromDegrees(lng, lat, WIRE_HEIGHT)
    );
    pts.push(pts[0]);  // close the ring
    return pts;
  }

  private computeVisible(resolution: number): string[] {
    const alt = this.scene.camera.positionCartographic.height;

    // Guard: estimate visible cell count — if it would exceed the limit,
    // bail out immediately without calling polygonToCells at all.
    // The user zooms in until the grid appears.
    if (estimateCellCount(resolution, alt) > MAX_CELLS) return [];

    // Low resolutions: always show all cells (tiny count, instant)
    if (resolution <= 2) {
      const res0 = getRes0Cells();
      return resolution === 0
        ? [...res0]
        : res0.flatMap(r0 => cellToChildren(r0, resolution));
    }

    // Higher resolutions: compute only viewport-visible cells
    const polygon = this.viewportPolygon();

    // Camera in space — frustum doesn't intersect globe at all corners
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

    // 16 sample points around the viewport edge — enough for any convex viewport
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
      latLngs.push([
        Cesium.Math.toDegrees(c.latitude),
        Cesium.Math.toDegrees(c.longitude),
      ]);
    }
    return latLngs;
  }
}

const hexGrid = new DynamicHexGrid(viewer.scene);

// ---------------------------------------------------------------------------
// Throttled camera update — recompute on movement, max once per 120ms
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
  // Also update on first render
  if (hexGrid['currentRes'] === -1) scheduleGridUpdate();
});

// ---------------------------------------------------------------------------
// Selected cell prism — computed from the clicked cell's H3 boundary
// ---------------------------------------------------------------------------
let selectedPrism: Cesium.Entity | null = null;
let selectedCellId: string | null = null;

function selectCellById(id: string): void {
  if (selectedPrism) { viewer.entities.remove(selectedPrism); selectedPrism = null; }
  selectedCellId = id;

  const boundary = cellToBoundary(id);  // [lat, lng][]
  const positions = boundary.map(([lat, lng]) =>
    Cesium.Cartesian3.fromDegrees(lng, lat)
  );

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
}

// ---------------------------------------------------------------------------
// Click — find H3 cell via globe.pick() + latLngToCell() — no geometry picking
// ---------------------------------------------------------------------------
viewer.screenSpaceEventHandler.setInputAction(
  (event: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
    // Deselect if clicked prism
    const pickedObj = viewer.scene.pick(event.position);
    if (Cesium.defined(pickedObj) && pickedObj.id === selectedPrism) {
      deselect(); return;
    }

    // Get globe intersection
    const ray = viewer.camera.getPickRay(event.position);
    if (!ray) { deselect(); return; }
    const hit = viewer.scene.globe.pick(ray, viewer.scene);
    if (!hit) { deselect(); return; }

    const carto = Cesium.Cartographic.fromCartesian(hit);
    const lat   = Cesium.Math.toDegrees(carto.latitude);
    const lng   = Cesium.Math.toDegrees(carto.longitude);

    const res = resolutionForYear(currentYear);
    if (res === null) { deselect(); return; }

    // Find which H3 cell contains this point — instant, pure math
    const cellId = latLngToCell(lat, lng, res);
    if (cellId === selectedCellId) { deselect(); return; }

    selectCellById(cellId);
  },
  Cesium.ScreenSpaceEventType.LEFT_CLICK
);

// ---------------------------------------------------------------------------
// Time state
// ---------------------------------------------------------------------------
let currentYear = 0;
const EARTH_FORMED = -4_540_000_000;

function formatYear(y: number): string {
  if (y <= -1_000_000_000) return `${(-y / 1e9).toFixed(2)} Ga`;
  if (y <= -1_000_000)     return `${(-y / 1e6).toFixed(1)} Ma`;
  if (y <= -10_000)        return `${(-y / 1000).toFixed(0)} ka`;
  if (y < 0)               return `${Math.abs(y).toLocaleString()} BCE`;
  if (y === 0)             return '0 CE';
  return `${y} CE`;
}

const yearDisplay = document.getElementById('year-display') as HTMLSpanElement;
const ceSlider    = document.getElementById('ce-slider')   as HTMLInputElement;
const ceInput     = document.getElementById('ce-input')    as HTMLInputElement;

function setYear(y: number): void {
  currentYear = y;
  yearDisplay.textContent = formatYear(y);
  if (y >= 0 && y <= 2024) { ceSlider.value = String(y); ceInput.value = String(y); }

  const preEarth = y < EARTH_FORMED;
  viewer.scene.skyBox.show = !preEarth;
  viewer.scene.globe.show  = !preEarth;
  viewer.scene.backgroundColor = preEarth
    ? Cesium.Color.BLACK
    : Cesium.Color.fromCssColorString('#060608');

  deselect();

  // Force immediate grid recompute for the new era
  if (updateTimer) { clearTimeout(updateTimer); updateTimer = null; }
  const res = resolutionForYear(y);
  if (res === null) hexGrid.clear();
  else hexGrid.update(res);

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
