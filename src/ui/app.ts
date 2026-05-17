import * as Cesium from 'cesium';
import { COLUMN_TOP_M } from '../core/hexalog.js';

Cesium.Ion.defaultAccessToken = '';

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
viewer.scene.globe.translucency.frontFaceAlpha = 0.85;
viewer.scene.globe.translucency.backFaceAlpha  = 0.5;
viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#060608');

viewer.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(-1.31, 53.4, 150_000),
  orientation: { heading: 0, pitch: Cesium.Math.toRadians(-38), roll: 0 },
});

// ---------------------------------------------------------------------------
// Grid config — zoom-dependent switching (only one visible at a time)
// ---------------------------------------------------------------------------
const GRIDS = [
  {
    id: 'res7', path: '/five-towns-grid-res7.geojson',
    wireColor: Cesium.Color.fromCssColorString('#252525').withAlpha(0.85),
    wireWidth: 1.0,
    showAboveAlt: 30_000,    // show this coarser grid when camera is high
  },
  {
    id: 'res8', path: '/five-towns-grid-res8.geojson',
    wireColor: Cesium.Color.fromCssColorString('#303030').withAlpha(0.75),
    wireWidth: 0.6,
    showAboveAlt: 0,         // show this finer grid when camera is low
    hideAboveAlt: 60_000,    // hide it when zoomed out too far (too dense)
  },
] as const;

// One selected prism at a time
let selectedPrism: Cesium.Entity | null = null;
const entityGridMap = new Map<Cesium.Entity, typeof GRIDS[number]>();
const gridDataSources = new Map<string, Cesium.GeoJsonDataSource>();

// ---------------------------------------------------------------------------
// Load a grid as flat wireframe
// ---------------------------------------------------------------------------
async function loadGrid(grid: typeof GRIDS[number]): Promise<void> {
  if (gridDataSources.has(grid.id)) return;
  const ds = new Cesium.GeoJsonDataSource(grid.id);
  await ds.load(grid.path);
  for (const entity of ds.entities.values) {
    if (!entity.polygon) continue;
    entity.polygon.material = new Cesium.ColorMaterialProperty(
      Cesium.Color.TRANSPARENT
    ) as unknown as Cesium.MaterialProperty;
    entity.polygon.outline      = new Cesium.ConstantProperty(true);
    entity.polygon.outlineColor = new Cesium.ConstantProperty(grid.wireColor);
    entity.polygon.outlineWidth = new Cesium.ConstantProperty(grid.wireWidth);
    entity.polygon.height       = new Cesium.ConstantProperty(0);
    entityGridMap.set(entity, grid);
  }
  gridDataSources.set(grid.id, ds);
  viewer.dataSources.add(ds);
}

// Load both; visibility managed by postRender
GRIDS.forEach(g => loadGrid(g));

// Zoom-dependent switching — only one grid visible at a time
viewer.scene.postRender.addEventListener(() => {
  const alt = viewer.camera.positionCartographic.height;
  const ds7 = gridDataSources.get('res7');
  const ds8 = gridDataSources.get('res8');
  if (ds7) ds7.show = alt >= 30_000;
  if (ds8) ds8.show = alt <  60_000;
});

// ---------------------------------------------------------------------------
// Select cell — show its prism (surface to COLUMN_TOP_M)
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
// Click handler
// ---------------------------------------------------------------------------
viewer.screenSpaceEventHandler.setInputAction(
  (event: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
    const picked = viewer.scene.pick(event.position);
    if (!Cesium.defined(picked) || !(picked.id instanceof Cesium.Entity)) { deselect(); return; }
    const entity = picked.id as Cesium.Entity;
    if (entity === selectedPrism) { deselect(); return; }
    if (!entityGridMap.has(entity)) { deselect(); return; }
    selectCell(entity);
  },
  Cesium.ScreenSpaceEventType.LEFT_CLICK
);

// ---------------------------------------------------------------------------
// Time state
// ---------------------------------------------------------------------------
let currentYear = 0;

function formatYear(y: number): string {
  if (y <= -1_000_000_000) return `${(-y / 1_000_000_000).toFixed(2)} Ga`;
  if (y <= -1_000_000)     return `${(-y / 1_000_000).toFixed(1)} Ma`;
  if (y <= -10_000)        return `${(-y / 1_000).toFixed(0)} ka`;
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
  // Keep CE slider and input in sync when year is in CE range
  if (y >= 0 && y <= 2024) {
    ceSlider.value = String(y);
    ceInput.value  = String(y);
  }
  // Update active button
  document.querySelectorAll<HTMLButtonElement>('.era-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.year ?? '999') === y);
  });
}

// Milestone buttons
document.querySelectorAll<HTMLButtonElement>('.era-btn').forEach(btn => {
  btn.addEventListener('click', () => setYear(parseInt(btn.dataset.year!)));
});

// CE slider (0 → 2024)
ceSlider.addEventListener('input', () => {
  const y = parseInt(ceSlider.value);
  ceInput.value = String(y);
  setYear(y);
});

// Year input (free entry — supports BCE as negative)
ceInput.addEventListener('change', () => {
  const y = parseInt(ceInput.value);
  if (!isNaN(y)) {
    if (y >= 0 && y <= 2024) ceSlider.value = String(y);
    setYear(y);
  }
});

setYear(0); // start at 0 CE

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
