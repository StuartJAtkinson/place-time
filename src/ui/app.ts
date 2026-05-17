import * as Cesium from 'cesium';
import { COLUMN_TOP_M } from '../core/hexalog.js';

Cesium.Ion.defaultAccessToken = '';

// ---------------------------------------------------------------------------
// Time threshold
// ---------------------------------------------------------------------------
const HUMAN_ERA_THRESHOLD = -10_000;

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
// Camera controls
// ---------------------------------------------------------------------------

// Constrain rotation axis so the globe stays centred when fully zoomed out
viewer.camera.constrainedAxis = Cesium.Cartesian3.UNIT_Z;

// Unlimited zoom — user should be able to pull back to see the full sphere
viewer.scene.screenSpaceCameraController.maximumZoomDistance = 1e9;
viewer.scene.screenSpaceCameraController.minimumZoomDistance = 100;

// Clamp pitch: -90° (straight down) to -45° (no looking at horizon)
const PITCH_MIN = -Math.PI / 2;   // straight down
const PITCH_MAX = -Math.PI / 4;   // 45° from horizontal

viewer.scene.preRender.addEventListener(() => {
  const pitch = viewer.camera.pitch;
  if (pitch > PITCH_MAX) {
    viewer.camera.setView({
      orientation: {
        heading: viewer.camera.heading,
        pitch: PITCH_MAX,
        roll: 0,
      },
    });
  }
});

viewer.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(-1.31, 53.4, 150_000),
  orientation: { heading: 0, pitch: Cesium.Math.toRadians(-50), roll: 0 },
});

// ---------------------------------------------------------------------------
// Grid definitions — only ONE shows at a time based on currentYear
// ---------------------------------------------------------------------------
const GRIDS = {
  // Deep-time coarse background (~200km edge, 6.9k cells, covers whole Earth)
  global: {
    id: 'global', path: '/grid-global.geojson',
    wireColor: Cesium.Color.WHITE.withAlpha(0.3),
    wireWidth: 1.2,
  },
  // Human-era fine leaf (~3.3km edge, UK area, 54k cells)
  uk: {
    id: 'uk', path: '/grid-uk.geojson',
    wireColor: Cesium.Color.WHITE.withAlpha(0.4),
    wireWidth: 1.8,
  },
} as const;

type GridId = keyof typeof GRIDS;

// Tiny non-zero fill so interior of cell is pickable
const PICK_ALPHA = 0.01;

let selectedPrism: Cesium.Entity | null = null;
let activeGridId: GridId = 'uk';
const gridDataSources = new Map<GridId, Cesium.GeoJsonDataSource>();
const entityToGrid    = new Map<Cesium.Entity, GridId>();

// ---------------------------------------------------------------------------
// Load a grid as flat wireframe at the surface (height = 0)
// The prism selected by the user then extends UP to COLUMN_TOP_M.
// Below-surface cross sections are just cuts through the same cone — no need
// for a separate lower sphere. The single upper sphere at COLUMN_TOP_M is the
// reference, and any depth below is simply a cross-section of that same cone.
// ---------------------------------------------------------------------------
async function loadGrid(id: GridId): Promise<void> {
  if (gridDataSources.has(id)) return;
  const def = GRIDS[id];
  const ds  = new Cesium.GeoJsonDataSource(id);
  await ds.load(def.path);

  for (const entity of ds.entities.values) {
    if (!entity.polygon) continue;
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

function applyGridVisibility(): void {
  const inHumanEra = currentYear >= HUMAN_ERA_THRESHOLD;
  activeGridId = inHumanEra ? 'uk' : 'global';

  for (const [id, ds] of gridDataSources) {
    if (!viewer.dataSources.contains(ds)) viewer.dataSources.add(ds);
    // Exactly one grid visible — whichever matches the current era
    ds.show = (id === activeGridId);
  }
}

// Load global first (small, fast), then UK asynchronously
async function preloadGrids(): Promise<void> {
  await loadGrid('global');
  applyGridVisibility();
  loadGrid('uk').then(() => applyGridVisibility());
}
preloadGrids();

// ---------------------------------------------------------------------------
// Select / deselect — show prism only upward (COLUMN_TOP_M)
// The "below" portion is implied: drilling down is a cross-section of the cone
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
      extrudedHeight: COLUMN_TOP_M,  // 10km above surface — top of the cone
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

  applyGridVisibility();
  deselect();

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
