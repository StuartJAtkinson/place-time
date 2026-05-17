/**
 * Tectonic Plate Cell Analysis
 *
 * For each H3 res-6 cell visible in the Five Towns area, determines:
 *   1. Which tectonic plate the cell centroid sits on
 *   2. Whether any cell EDGE crosses a plate boundary (boundary cell)
 *   3. For boundary cells: which plates the cell straddles + estimated fraction
 *
 * This is the precursor to back-propagation: knowing which plate owns each cell,
 * we can query GPlates plate velocity data to reconstruct where the cell was at
 * any geological epoch.
 *
 * Output: src/core/cell-plate-map.json
 *
 * Run: npx tsx scripts/tectonic-cell-analysis.ts
 *
 * === Back-propagation method (GPlates Web Service) ===
 *
 * Once you have cell → plate mapping, reconstruct paleocoordinates with:
 *
 *   GET https://gws.gplates.org/reconstruct/reconstruct_points/
 *     ?points=<lng,lat pairs, comma-separated>
 *     &time=<Ma — millions of years ago>
 *     &model=MULLER2022
 *     &return_null_points=true
 *
 * Example for Pontefract at Pangea time (335 Ma):
 *   https://gws.gplates.org/reconstruct/reconstruct_points/
 *     ?points=-1.31,53.69&time=335&model=MULLER2022
 *
 * The Eurasian plate code in GPlates MULLER2022 is 301.
 * The GWS returns paleo lat/lng for each modern point. Apply this to each
 * cell centroid to get the cell's historical position, then recompute the
 * cell boundary using cellToBoundary() around the displaced centroid.
 *
 * === Velocity interpolation for animation ===
 *
 * For smooth animation from 0 CE → Pangea:
 *   GET https://gws.gplates.org/velocity/get_velocity_by_plateid?
 *     plateid=301&time=100&model=MULLER2022
 * Returns velocity vector (cm/yr) at each time slice. Integrate backwards
 * using the logarithmic time axis to get position at any timePos.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import {
  getRes0Cells, cellToChildren, cellToBoundary, cellToLatLng, latLngToCell,
} from 'h3-js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT      = join(__dirname, '..');
const RESOLUTION = 6;  // PTR-10 leaf resolution

// ---------------------------------------------------------------------------
// Point-in-polygon (ray casting — works for plate polygons in WGS84)
// ---------------------------------------------------------------------------
function pointInRing(lng: number, lat: number, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (((yi > lat) !== (yj > lat)) && lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

function pointInFeature(lng: number, lat: number, feature: GeoJSON.Feature): boolean {
  const g = feature.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon;
  if (g.type === 'Polygon') {
    return pointInRing(lng, lat, g.coordinates[0] as [number, number][]);
  }
  if (g.type === 'MultiPolygon') {
    return g.coordinates.some(poly =>
      pointInRing(lng, lat, poly[0] as [number, number][])
    );
  }
  return false;
}

// ---------------------------------------------------------------------------
// Segment × polygon boundary intersection check
// Returns true if the line segment (a→b) crosses any edge of the polygon ring
// ---------------------------------------------------------------------------
function segmentsCross(
  a: [number, number], b: [number, number],
  ring: [number, number][],
): boolean {
  const [ax, ay] = a, [bx, by] = b;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [cx, cy] = ring[i], [dx, dy] = ring[j];
    // Standard segment intersection test
    const d1x = bx - ax, d1y = by - ay;
    const d2x = dx - cx, d2y = dy - cy;
    const denom = d1x * d2y - d1y * d2x;
    if (Math.abs(denom) < 1e-10) continue;
    const t = ((cx - ax) * d2y - (cy - ay) * d2x) / denom;
    const u = ((cx - ax) * d1y - (cy - ay) * d1x) / denom;
    if (t > 0 && t < 1 && u > 0 && u < 1) return true;
  }
  return false;
}

function cellEdgesCrossPlate(
  boundary: [number, number][],   // [lng, lat][]
  plate: GeoJSON.Feature,
): boolean {
  const g = plate.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon;
  const rings: [number, number][][] = g.type === 'Polygon'
    ? [g.coordinates[0] as [number, number][]]
    : g.coordinates.map(p => p[0] as [number, number][]);

  for (let i = 0; i < boundary.length - 1; i++) {
    for (const ring of rings) {
      if (segmentsCross(boundary[i], boundary[i + 1], ring)) return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`\n=== Tectonic Plate Cell Analysis (H3 res ${RESOLUTION}) ===\n`);

  // Load tectonic plate data
  const platePath = join(ROOT, 'data/geology/tectonic_plates.geojson');
  if (!existsSync(platePath)) {
    console.error('ERROR: tectonic_plates.geojson not found. Run: npm run ingest:geology');
    process.exit(1);
  }
  const plates = JSON.parse(readFileSync(platePath, 'utf-8')) as GeoJSON.FeatureCollection;
  console.log(`Loaded ${plates.features.length} tectonic plates`);

  // Enumerate all res-6 cells globally (or use a representative area)
  // For now: enumerate cells over the UK Five Towns area + surrounding
  // To do full global: use getRes0Cells().flatMap(r0 => cellToChildren(r0, RESOLUTION))
  // but that's ~14M cells — use a bounding polygon instead
  console.log('Enumerating H3 cells (UK area, res 6)...');
  const { polygonToCells } = await import('h3-js');
  const ukPolygon: [number, number][] = [
    [49, -12], [49, 5], [62, 5], [62, -12], [49, -12],
  ];
  const allCells = polygonToCells(ukPolygon, RESOLUTION);
  console.log(`${allCells.length} cells to analyse`);

  // Analyse each cell
  type CellRecord = {
    h3Index: string;
    centreLatLng: [number, number];
    plateName: string | null;
    plateId: string | null;
    isBoundaryCell: boolean;
    adjacentPlates: string[];
  };

  const records: CellRecord[] = [];
  let boundaryCount = 0;

  for (const cellId of allCells) {
    const [lat, lng] = cellToLatLng(cellId);

    // Find which plate the centroid sits on
    let plateName: string | null = null;
    let plateId: string | null   = null;
    for (const plate of plates.features) {
      if (pointInFeature(lng, lat, plate)) {
        plateName = (plate.properties?.PlateName ?? plate.properties?.Name ?? 'Unknown') as string;
        plateId   = String(plate.properties?.PlateId ?? plate.properties?.plate_id ?? '');
        break;
      }
    }

    // Check if any cell edge crosses a plate boundary
    // H3 cellToBoundary returns [lat, lng][] — convert to [lng, lat][] for our math
    const h3Boundary = cellToBoundary(cellId);
    const boundary   = [
      ...h3Boundary.map(([blat, blng]) => [blng, blat] as [number, number]),
      [h3Boundary[0][1], h3Boundary[0][0]] as [number, number],
    ];

    const adjacentPlateNames: string[] = [];
    let isBoundary = false;

    for (const plate of plates.features) {
      const pName = (plate.properties?.PlateName ?? plate.properties?.Name ?? 'Unknown') as string;
      if (pName === plateName) continue;  // skip own plate
      if (cellEdgesCrossPlate(boundary, plate)) {
        isBoundary = true;
        adjacentPlateNames.push(pName);
      }
    }

    if (isBoundary) boundaryCount++;

    records.push({
      h3Index:       cellId,
      centreLatLng:  [lat, lng],
      plateName,
      plateId,
      isBoundaryCell: isBoundary,
      adjacentPlates: adjacentPlateNames,
    });
  }

  // Summary
  const plateCounts = new Map<string, number>();
  for (const r of records) {
    const key = r.plateName ?? 'Unknown';
    plateCounts.set(key, (plateCounts.get(key) ?? 0) + 1);
  }

  console.log('\n=== Results ===');
  console.log(`Total cells:       ${records.length}`);
  console.log(`Boundary cells:    ${boundaryCount} (${((boundaryCount/records.length)*100).toFixed(1)}%)`);
  console.log('\nCells per plate:');
  for (const [plate, count] of [...plateCounts.entries()].sort((a,b)=>b[1]-a[1])) {
    console.log(`  ${plate}: ${count}`);
  }

  // Write output
  const output = {
    generated: new Date().toISOString(),
    resolution: RESOLUTION,
    totalCells: records.length,
    boundaryCells: boundaryCount,
    cells: records,
    gplatesQueryTemplate: {
      description: 'Reconstruct cell centroids at any geological time using GPlates Web Service',
      url: 'https://gws.gplates.org/reconstruct/reconstruct_points/',
      params: {
        points: '<lng1,lat1,lng2,lat2,...>  (cell centroids)',
        time: '<Ma — millions of years ago, e.g. 335 for Pangea>',
        model: 'MULLER2022',
        return_null_points: 'true',
      },
      example: 'https://gws.gplates.org/reconstruct/reconstruct_points/?points=-1.31,53.69&time=335&model=MULLER2022',
      velocityUrl: 'https://gws.gplates.org/velocity/get_velocity_by_plateid?plateid=<id>&time=<Ma>&model=MULLER2022',
      notes: [
        'Eurasian plate ID in MULLER2022: 301',
        'Back-propagation: query at each time step and displace cell centroid',
        'Cell boundary at past time: recompute from displaced centroid (same H3 shape, new position)',
        'For animation: integrate velocity vectors along the logarithmic time axis',
      ],
    },
  };

  const outPath = join(ROOT, 'src/core/cell-plate-map.json');
  writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\nWritten: src/core/cell-plate-map.json`);

  console.log('\n=== GPlates Back-propagation Method ===');
  console.log('1. For each cell centroid, call GPlates Web Service with target time (Ma)');
  console.log('2. GWS returns paleo lat/lng — this is where the cell was at that time');
  console.log('3. Cell boundary at past time: use the same hex shape centred on paleo position');
  console.log('   (shape deformation from plate rotation is negligible at cell scale)');
  console.log('4. For cells on BOUNDARY: each part moves with its respective plate');
  console.log('   → boundary cells will split/merge over time (this IS the interesting data)');
  console.log('5. Animate: query GWS at each logarithmic time step, interpolate between steps');
  console.log('\nExample query (Pontefract at Pangea time):');
  console.log('  https://gws.gplates.org/reconstruct/reconstruct_points/?points=-1.31,53.69&time=335&model=MULLER2022');
}

main().catch(console.error);
