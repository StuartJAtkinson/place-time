import * as Cesium from 'cesium';
import { COLUMN_TOP_M } from '../core/hexalog.js';

Cesium.Ion.defaultAccessToken = '';

// ---------------------------------------------------------------------------
// Resolution thresholds — which grid to show based on time, not zoom
// PTR-10 (res8, fine 0.554km) for human-scale time (Holocene onwards)
// PTR-7  (res7, coarse 1.47km) for geological deep time
// ---------------------------------------------------------------------------
const HUMAN_ERA_THRESHOLD = -10_000;   // 10,000 BCE — end of last Ice Age

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

// Globe fully opaque by default — translucency only enabled when a cell is
// selected so the prism appears to continue below the surface
viewer.scene.globe.translucency.enabled = true;
viewer.scene.globe.translucency.frontFaceAlpha = 1.0;
viewer.scene.globe.translucency.backFaceAlpha  = 1.0;

viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#060608');

viewer.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(-1.31, 53.4, 150_000),
  orientation: { heading: 0, pitch: Cesium.Math.toRadians(-38), roll: 0 },
});

// ---------------------------------------------------------------------------
// Grid definitions
// ---------------------------------------------------------------------------
const GRIDS = {
  // Always visible — coarse global wireframe (~200km edge, 6.9k cells)
  global: {
    id: 'global', path: '/grid-global.geojson',
    wireColor: Cesium.Color.WHITE.withAlpha(0.35),
    wireWidth: 1.2,
    alwaysShow: true,
  },
  // UK fine leaf grid (~3.3km edge, 54k cells) — shown in human era
  uk: {
    id: 'uk', path: '/grid-uk.geojson',
    wireColor: Cesium.Color.WHITE.withAlpha(0.45),
    wireWidth: 1.8,
    alwaysShow: false,
  },
} as const;

type GridId = keyof typeof GRIDS;

// Pickable-but-invisible fill alpha — enough for Cesium to register interior clicks
const PICK_ALPHA = 0.01;

let selectedPrism: Cesium.Entity | null = null;
let activeGridId: GridId = 'res8';
const gridDataSources = new Map<GridId, Cesium.GeoJsonDataSource>();
const entityToGrid     = new Map<Cesium.Entity, GridId>();

// ---------------------------------------------------------------------------
// Load a grid as flat wireframe — interior is nearly transparent but pickable
// ---------------------------------------------------------------------------
async function loadGrid(id: GridId): Promise<void> {
  if (gridDataSources.has(id)) return;
  const def = GRIDS[id];
  const ds  = new Cesium.GeoJsonDataSource(id);
  await ds.load(def.path);

  for (const entity of ds.entities.values) {
    if (!entity.polygon) continue;
    // Tiny non-zero alpha makes the entire polygon interior pickable
    entity.polygon.material = new Cesium.ColorMaterialProperty(
      def.wireColor.withAlpha(PICK_ALPHA)
    ) as unknown as Cesium.MaterialProperty;
    entity.polygon.outline      = new Cesium.ConstantProperty(true);
    entity.polygon.outlineColor = new Cesium.ConstantProperty(def.wireColor);
    entity.polygon.outlineWidth = new Cesium.ConstantProperty(def.wireWidth);
    entity.polygon.height       = new Cesium.ConstantProperty(0);
    entityToGrid.set(entity, id);
  }

  gridDataSources.set(id, ds);
}

// Preload both grids; visibility toggled by time
async function preloadGrids(): Promise<void> {
  // Load global coarse immediately; start UK fine in parallel
  await loadGrid('global');
  applyGridVisibility();
  loadGrid('uk').then(() => applyGridVisibility()); // UK loads async, applies when ready
}

function applyGridVisibility(): void {
  for (const [id, ds] of gridDataSources) {
    if (!viewer.dataSources.contains(ds)) viewer.dataSources.add(ds);
    const def = GRIDS[id as GridId];
    ds.show = def.alwaysShow || currentYear >= HUMAN_ERA_THRESHOLD;
  }
  activeGridId = currentYear >= HUMAN_ERA_THRESHOLD ? 'uk' : 'global';
}

preloadGrids();

// ---------------------------------------------------------------------------
// Select / deselect
// ---------------------------------------------------------------------------
function selectCell(entity: Cesium.Entity): void {
  if (selectedPrism) {
    viewer.entities.remove(selectedPrism);
    selectedPrism = null;
  }

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
  if (selectedPrism) {
    viewer.entities.remove(selectedPrism);
    selectedPrism = null;
  }
}

// ---------------------------------------------------------------------------
// Click handler
// ---------------------------------------------------------------------------
viewer.screenSpaceEventHandler.setInputAction(
  (event: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
    const picked = viewer.scene.pick(event.position);

    if (!Cesium.defined(picked) || !(picked.id instanceof Cesium.Entity)) {
      deselect();
      return;
    }

    const entity = picked.id as Cesium.Entity;
    if (entity === selectedPrism) { deselect(); return; }
    if (!entityToGrid.has(entity)) { deselect(); return; }

    selectCell(entity);
  },
  Cesium.ScreenSpaceEventType.LEFT_CLICK
);

// ---------------------------------------------------------------------------
// Time state
// ---------------------------------------------------------------------------
let currentYear = 0;

const BIG_BANG_YEAR = -13_800_000_000;
const EARTH_FORMED  =  -4_540_000_000;

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

  if (y >= 0 && y <= 2024) {
    ceSlider.value = String(y);
    ceInput.value  = String(y);
  }

  // Skybox and globe presence — no stars or Earth before Earth formed
  const preEarth = y < EARTH_FORMED;
  viewer.scene.skyBox.show  = !preEarth;
  viewer.scene.globe.show   = !preEarth;
  viewer.scene.backgroundColor = preEarth
    ? Cesium.Color.BLACK
    : Cesium.Color.fromCssColorString('#060608');

  // Switch grid resolution based on time
  applyGridVisibility();

  // If a cell was selected, deselect — grid just switched
  deselect();

  // Update active button highlight
  document.querySelectorAll<HTMLButtonElement>('.era-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.year ?? '999') === y);
  });
}

// Milestone buttons
document.querySelectorAll<HTMLButtonElement>('.era-btn').forEach(btn => {
  btn.addEventListener('click', () => setYear(parseInt(btn.dataset.year!)));
});

// CE slider
ceSlider.addEventListener('input', () => {
  const y = parseInt(ceSlider.value);
  ceInput.value = String(y);
  setYear(y);
});

// Year input
ceInput.addEventListener('change', () => {
  const y = parseInt(ceInput.value);
  if (!isNaN(y)) {
    if (y >= 0 && y <= 2024) ceSlider.value = String(y);
    setYear(y);
  }
});

setYear(0);

// ---------------------------------------------------------------------------
// Keyboard
// ---------------------------------------------------------------------------
window.addEventListener('keydown', e => {
  if (e.key === 'g' || e.key === 'G') {
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(-1.31, 53.4, 150_000),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-38), roll: 0 },
      duration: 2,
    });
  }
  if (e.key === 'Escape') deselect();
});
