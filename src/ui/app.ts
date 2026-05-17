import * as Cesium from 'cesium';

Cesium.Ion.defaultAccessToken = '';

// ---------------------------------------------------------------------------
// Viewer — bare globe, OSM base only
// ---------------------------------------------------------------------------
const viewer = new Cesium.Viewer('cesiumContainer', {
  imageryProvider: false as unknown as Cesium.ImageryProvider,
  terrainProvider: new Cesium.EllipsoidTerrainProvider(),
  baseLayerPicker: false,
  geocoder: false,
  homeButton: false,
  sceneModePicker: false,
  navigationHelpButton: false,
  animation: false,
  timeline: false,
  fullscreenButton: false,
  selectionIndicator: false,
  infoBox: false,
});

// OSM base — plain reference map
viewer.imageryLayers.addImageryProvider(
  new Cesium.UrlTemplateImageryProvider({
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    credit: '© OpenStreetMap contributors',
    maximumLevel: 19,
  })
);

// Globe translucency — lets the selected cell's prism appear to pass through the Earth
viewer.scene.globe.translucency.enabled = true;
viewer.scene.globe.translucency.frontFaceAlpha = 0.85;  // mostly opaque but see-through when needed
viewer.scene.globe.translucency.backFaceAlpha = 0.5;

viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#060608');

// Start above Five Towns, angled to show prism height
viewer.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(-1.31, 53.4, 150_000),
  orientation: {
    heading: 0,
    pitch: Cesium.Math.toRadians(-38),
    roll: 0,
  },
});

// ---------------------------------------------------------------------------
// Grid config
// The wireframe mesh covers the entire visible globe — only the selected
// cell shows its full cylindrical prism (surface → 300km altitude).
// The globe translucency makes the prism appear to continue below the surface.
// ---------------------------------------------------------------------------
const GRIDS = [
  {
    id: 'res7',
    path: '/five-towns-grid-res7.geojson',
    wireColor: Cesium.Color.fromCssColorString('#2a2a2a').withAlpha(0.8),
    wireWidth: 0.8,
    prismHeight: 10_000,    // 10km — top of physical column (above Everest + tallest structure)
    prismColor: Cesium.Color.RED.withAlpha(0.18),
    prismOutline: Cesium.Color.RED.withAlpha(0.9),
    prismWidth: 2.5,
  },
  {
    id: 'res8',
    path: '/five-towns-grid-res8.geojson',
    wireColor: Cesium.Color.fromCssColorString('#333333').withAlpha(0.7),
    wireWidth: 0.5,
    prismHeight: 300_000,
    prismColor: Cesium.Color.RED.withAlpha(0.18),
    prismOutline: Cesium.Color.RED.withAlpha(0.9),
    prismWidth: 2.5,
  },
];

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
// Map from entity → grid config (for picking)
const entityGridMap = new Map<Cesium.Entity, typeof GRIDS[0]>();

// The single selected prism entity (reused across selections)
let selectedPrism: Cesium.Entity | null = null;

// ---------------------------------------------------------------------------
// Load a grid as a flat wireframe surface mesh
// ---------------------------------------------------------------------------
async function loadGrid(grid: typeof GRIDS[0]): Promise<void> {
  const ds = new Cesium.GeoJsonDataSource(grid.id);
  await ds.load(grid.path);

  for (const entity of ds.entities.values) {
    if (!entity.polygon) continue;

    // Flat wireframe: no fill, thin outline, clamped to surface (height:0)
    entity.polygon.material = new Cesium.ColorMaterialProperty(
      Cesium.Color.TRANSPARENT
    ) as unknown as Cesium.MaterialProperty;
    entity.polygon.outline = new Cesium.ConstantProperty(true);
    entity.polygon.outlineColor = new Cesium.ConstantProperty(grid.wireColor);
    entity.polygon.outlineWidth = new Cesium.ConstantProperty(grid.wireWidth);
    entity.polygon.height = new Cesium.ConstantProperty(0);

    entityGridMap.set(entity, grid);
  }

  viewer.dataSources.add(ds);
}

GRIDS.forEach(g => loadGrid(g));

// ---------------------------------------------------------------------------
// Select a cell — show its prism
// ---------------------------------------------------------------------------
function selectCell(entity: Cesium.Entity, grid: typeof GRIDS[0]): void {
  // Get the polygon hierarchy (the hex cell coordinates)
  const hierarchy = entity.polygon!.hierarchy!.getValue(Cesium.JulianDate.now());
  if (!hierarchy) return;

  // Remove old prism
  if (selectedPrism) {
    viewer.entities.remove(selectedPrism);
    selectedPrism = null;
  }

  // Create the prism for this cell — extends from surface (0m) to prismHeight
  // Globe translucency makes it appear to continue below the surface
  selectedPrism = viewer.entities.add({
    polygon: {
      hierarchy,
      material: new Cesium.ColorMaterialProperty(grid.prismColor) as unknown as Cesium.MaterialProperty,
      outline: true,
      outlineColor: grid.prismOutline,
      outlineWidth: grid.prismWidth,
      height: 0,
      extrudedHeight: grid.prismHeight,
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

    // Clicking the selected prism itself → deselect
    if (entity === selectedPrism) {
      deselect();
      return;
    }

    const grid = entityGridMap.get(entity);
    if (!grid) {
      deselect();
      return;
    }

    selectCell(entity, grid);
  },
  Cesium.ScreenSpaceEventType.LEFT_CLICK
);

// ---------------------------------------------------------------------------
// Keyboard
// ---------------------------------------------------------------------------
window.addEventListener('keydown', (e) => {
  if (e.key === 'g' || e.key === 'G') {
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(-1.31, 53.4, 150_000),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-38), roll: 0 },
      duration: 2,
    });
  }
  if (e.key === 'Escape') deselect();
});
