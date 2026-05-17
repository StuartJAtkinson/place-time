import * as Cesium from 'cesium';
import { COLUMN_TOP_M } from '../core/hexalog.js';

Cesium.Ion.defaultAccessToken = '';

// ---------------------------------------------------------------------------
// Era → Grid mapping
// Each era shows exactly ONE grid. H3 grids cover the whole globe with correct
// spherical tessellation (no polar distortion). The custom aligned grid covers
// the UK area for the modern human era.
//
// Grid resolution increases as time approaches the present:
//   pre-Earth:          no globe
//   -4.54 Ga → -540 Ma: H3 res 1  ( 842 cells, ~1800km edge) — continental drift
//   -540 Ma  → -10 ka:  H3 res 2  (5882 cells,  ~650km edge) — species ranges
//   -10 ka   → 0 CE:    H3 res 3  (41k  cells,   ~73km edge) — human migration
//   0 CE     → present: aligned   (54k  cells,   ~3.3km edge) — settlement scale
// ---------------------------------------------------------------------------
interface EraGrid {
  readonly id:       string;
  readonly file:     string;
  readonly minYear:  number;
  readonly maxYear:  number;
  readonly color:    Cesium.Color;
  readonly width:    number;
}

const ERA_GRIDS: readonly EraGrid[] = [
  {
    id: 'h3r1', file: '/grid-h3-r1.geojson',
    minYear: -4_540_000_000, maxYear: -540_000_000,
    color: Cesium.Color.WHITE.withAlpha(0.28), width: 1.2,
  },
  {
    id: 'h3r2', file: '/grid-h3-r2.geojson',
    minYear: -540_000_000, maxYear: -10_000,
    color: Cesium.Color.WHITE.withAlpha(0.32), width: 1.3,
  },
  {
    id: 'h3r3', file: '/grid-h3-r3.geojson',
    minYear: -10_000, maxYear: 0,
    color: Cesium.Color.WHITE.withAlpha(0.38), width: 1.5,
  },
  {
    id: 'uk33', file: '/grid-uk.geojson',
    minYear: 0, maxYear: Infinity,
    color: Cesium.Color.WHITE.withAlpha(0.42), width: 1.8,
  },
] as const;

/** Return the grid ID for a given year, or null if pre-Earth. */
function gridIdForYear(year: number): string | null {
  if (year < -4_540_000_000) return null;         // pre-Earth
  for (const g of ERA_GRIDS) {
    if (year >= g.minYear && year < g.maxYear) return g.id;
  }
  return ERA_GRIDS[ERA_GRIDS.length - 1].id;      // present / future
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

// ---------------------------------------------------------------------------
// Camera constraints
// ---------------------------------------------------------------------------
viewer.camera.constrainedAxis = Cesium.Cartesian3.UNIT_Z;
viewer.scene.screenSpaceCameraController.maximumZoomDistance = 1e9;
viewer.scene.screenSpaceCameraController.minimumZoomDistance = 100;

// Pitch clamp: -90° (straight down) → -45° (no horizon view)
viewer.scene.preRender.addEventListener(() => {
  if (viewer.camera.pitch > -Math.PI / 4) {
    viewer.camera.setView({
      orientation: {
        heading: viewer.camera.heading,
        pitch:   -Math.PI / 4,
        roll:    0,
      },
    });
  }
});

viewer.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(-1.31, 53.4, 150_000),
  orientation: { heading: 0, pitch: Cesium.Math.toRadians(-50), roll: 0 },
});

// ---------------------------------------------------------------------------
// Grid state — lazy loading, exactly one visible at a time
// ---------------------------------------------------------------------------
const PICK_ALPHA = 0.01;
const loadedSources  = new Map<string, Cesium.GeoJsonDataSource>();
const entityToGridId = new Map<Cesium.Entity, string>();

let activeGridId: string | null = null;
let selectedPrism: Cesium.Entity | null = null;
let loadingGridId: string | null = null;   // prevent duplicate loads

async function ensureGridLoaded(id: string): Promise<void> {
  if (loadedSources.has(id) || loadingGridId === id) return;
  loadingGridId = id;

  const def = ERA_GRIDS.find(g => g.id === id);
  if (!def) return;

  const ds = new Cesium.GeoJsonDataSource(id);
  await ds.load(def.file);

  for (const entity of ds.entities.values) {
    if (!entity.polygon) continue;
    entity.polygon.material = new Cesium.ColorMaterialProperty(
      def.color.withAlpha(PICK_ALPHA)
    ) as unknown as Cesium.MaterialProperty;
    entity.polygon.outline      = new Cesium.ConstantProperty(true);
    entity.polygon.outlineColor = new Cesium.ConstantProperty(def.color);
    entity.polygon.outlineWidth = new Cesium.ConstantProperty(def.width);
    entity.polygon.height       = new Cesium.ConstantProperty(0);
    entityToGridId.set(entity, id);
  }

  loadedSources.set(id, ds);
  loadingGridId = null;
}

function applyGridVisibility(targetId: string | null): void {
  for (const [id, ds] of loadedSources) {
    if (!viewer.dataSources.contains(ds)) viewer.dataSources.add(ds);
    ds.show = (id === targetId);
  }
  activeGridId = targetId;
}

// ---------------------------------------------------------------------------
// Select / deselect — prism extends UP to COLUMN_TOP_M above surface
// (below-surface cross-sections are implicit cuts through the same cone)
// ---------------------------------------------------------------------------
function selectCell(entity: Cesium.Entity): void {
  if (selectedPrism) { viewer.entities.remove(selectedPrism); selectedPrism = null; }
  const hierarchy = entity.polygon!.hierarchy!.getValue(Cesium.JulianDate.now());
  if (!hierarchy) return;
  selectedPrism = viewer.entities.add({
    polygon: {
      hierarchy,
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
}

// ---------------------------------------------------------------------------
// Click
// ---------------------------------------------------------------------------
viewer.screenSpaceEventHandler.setInputAction(
  (event: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
    const picked = viewer.scene.pick(event.position);
    if (!Cesium.defined(picked) || !(picked.id instanceof Cesium.Entity)) { deselect(); return; }
    const entity = picked.id as Cesium.Entity;
    if (entity === selectedPrism)         { deselect(); return; }
    if (!entityToGridId.has(entity))      { deselect(); return; }
    selectCell(entity);
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

async function setYear(y: number): Promise<void> {
  currentYear = y;
  yearDisplay.textContent = formatYear(y);
  if (y >= 0 && y <= 2024) { ceSlider.value = String(y); ceInput.value = String(y); }

  // Globe and skybox visibility
  const preEarth = y < EARTH_FORMED;
  viewer.scene.skyBox.show = !preEarth;
  viewer.scene.globe.show  = !preEarth;
  viewer.scene.backgroundColor = preEarth
    ? Cesium.Color.BLACK
    : Cesium.Color.fromCssColorString('#060608');

  // Deselect when era changes
  deselect();

  // Determine the correct grid for this year
  const targetId = gridIdForYear(y);

  // Load on demand then show — never interrupts ongoing interaction
  if (targetId && !loadedSources.has(targetId)) {
    applyGridVisibility(activeGridId); // keep current while loading
    await ensureGridLoaded(targetId);
  }

  applyGridVisibility(targetId);

  // Update era button highlights
  document.querySelectorAll<HTMLButtonElement>('.era-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.year ?? '999') === y);
  });
}

// Warm up the first two grids on startup so switching feels instant
async function warmup(): Promise<void> {
  await ensureGridLoaded('h3r1');    // 404 KB — fast
  await ensureGridLoaded('h3r2');    // 2.7 MB — quick
  await setYear(0);                  // set initial year (loads h3r3 if needed, else uk33)
  // Load the rest in background so they're ready when the user navigates
  ensureGridLoaded('h3r3');
  ensureGridLoaded('uk33');
}
warmup();

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------
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
