/**
 * Tectonic Mesh Builder
 *
 * Pipeline:
 *   1. Enumerate all H3 res-6 cells globally (or for a target area)
 *   2. Extract unique vertices (each shared by exactly 3 cells in H3)
 *   3. Assign each vertex to a tectonic plate (majority vote of its 3 surrounding cells)
 *   4. Batch-query GPlates Web Service for vertex positions at each time step
 *   5. Write displacement table: vertex_id → positions at each time step
 *
 * The vertex-based approach keeps the mesh topologically connected:
 *   - Vertices within a plate move together (rigid body)
 *   - Vertices at plate boundaries move with their assigned plate
 *   - Adjacent cells on different plates naturally squash/stretch/shear
 *
 * Output: public/tectonic-mesh.json
 *
 * Run: npx tsx scripts/build-tectonic-mesh.ts [--area uk|global]
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import {
  getRes0Cells, cellToChildren, cellToBoundary, cellToLatLng,
  polygonToCells,
} from 'h3-js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT       = join(__dirname, '..');
const RESOLUTION = 6;

// ---------------------------------------------------------------------------
// Key time steps — major continental drift events (Ma = millions of years ago)
// ---------------------------------------------------------------------------
const TIME_STEPS_MA = [0, 20, 50, 90, 130, 170, 200, 250, 335] as const;
type TimeMa = typeof TIME_STEPS_MA[number];

const TIME_LABELS: Record<TimeMa, string> = {
  0:   'Present',
  20:  'Red Sea opens',
  50:  'India approaches Asia',
  90:  'Atlantic broadening',
  130: 'S. Atlantic opening',
  170: 'Gondwana fragmenting',
  200: 'Pangea first rifts',
  250: 'Pangea maximum',
  335: 'Pangea assembling',
};

// ---------------------------------------------------------------------------
// Vertex ID — round to 4dp (~11m precision, well within a 3.9km hex edge)
// ---------------------------------------------------------------------------
function vertexId(lat: number, lng: number): string {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

// ---------------------------------------------------------------------------
// Point-in-polygon (ray casting)
// ---------------------------------------------------------------------------
function pointInRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (((yi > lat) !== (yj > lat)) && lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

function pointOnPlate(lng: number, lat: number, feature: GeoJSON.Feature): boolean {
  const g = feature.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon;
  if (g.type === 'Polygon')
    return pointInRing(lng, lat, g.coordinates[0] as number[][]);
  if (g.type === 'MultiPolygon')
    return g.coordinates.some(p => pointInRing(lng, lat, p[0] as number[][]));
  return false;
}

// ---------------------------------------------------------------------------
// GPlates Web Service — reconstruct points at a given time
// Accepts batches of up to 500 points per request
// ---------------------------------------------------------------------------
const GPLATES_URL = 'https://gws.gplates.org/reconstruct/reconstruct_points/';
const GPLATES_MODEL = 'MULLER2022';
const BATCH_SIZE = 200;  // POST body is fine with 200 points

interface GPlatesResult {
  lat: number | null;
  lng: number | null;
}

async function reconstructBatch(
  lats: number[], lngs: number[], timeMa: number
): Promise<GPlatesResult[]> {
  // Use POST — GET with 200+ points exceeds URL length limits (HTTP 414)
  const points = lats.map((lat, i) => `${lngs[i]},${lat}`).join(',');
  const body = new URLSearchParams({
    points,
    time: String(timeMa),
    model: GPLATES_MODEL,
    return_null_points: 'true',
  });

  const res = await fetch(GPLATES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'place-time/0.1 spatial history project',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GPlates HTTP ${res.status} at time ${timeMa}Ma: ${text.slice(0, 200)}`);
  }

  const data = await res.json() as {
    coordinates?: [number, number][];
    features?: Array<{ geometry: { coordinates: [number, number] } | null }>;
  };

  // GWS returns either a coordinates array or a GeoJSON FeatureCollection
  if (Array.isArray(data.coordinates)) {
    return data.coordinates.map(([lng, lat]) => ({ lat, lng }));
  }
  if (Array.isArray(data.features)) {
    return data.features.map(f => f.geometry
      ? { lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] }
      : { lat: null, lng: null }
    );
  }
  // Fallback: try to parse as raw coordinate pairs
  const raw = data as unknown as [number, number][];
  if (Array.isArray(raw)) {
    return raw.map(([lng, lat]) => ({ lat, lng }));
  }
  throw new Error(`Unexpected GPlates response: ${JSON.stringify(data).slice(0, 300)}`);
}

async function reconstructAll(
  vertices: { id: string; lat: number; lng: number }[],
  timeMa: number,
): Promise<Map<string, GPlatesResult>> {
  const results = new Map<string, GPlatesResult>();
  const total = vertices.length;

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = vertices.slice(i, i + BATCH_SIZE);
    const batchResults = await reconstructBatch(
      batch.map(v => v.lat),
      batch.map(v => v.lng),
      timeMa,
    );
    for (let j = 0; j < batch.length; j++) {
      results.set(batch[j].id, batchResults[j]);
    }
    process.stdout.write(`\r  ${timeMa}Ma: ${Math.min(i + BATCH_SIZE, total)}/${total} vertices`);
    // Small delay to avoid rate limiting
    if (i + BATCH_SIZE < total) await new Promise(r => setTimeout(r, 100));
  }
  process.stdout.write('\n');
  return results;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const area = process.argv.includes('--area=global') ? 'global' : 'uk';
  console.log(`\n=== Tectonic Mesh Builder — ${area} area, H3 res ${RESOLUTION} ===\n`);

  // ---------------------------------------------------------------------------
  // Step 1: Enumerate cells
  // ---------------------------------------------------------------------------
  console.log('Step 1: Enumerating H3 cells...');
  let cells: string[];

  if (area === 'global') {
    const res0 = getRes0Cells();
    cells = res0.flatMap(r0 => cellToChildren(r0, RESOLUTION));
  } else {
    // UK area for development
    const ukPolygon: [number, number][] = [
      [49, -12], [49, 5], [62, 5], [62, -12], [49, -12],
    ];
    cells = polygonToCells(ukPolygon, RESOLUTION);
  }
  console.log(`  ${cells.length} cells`);

  // ---------------------------------------------------------------------------
  // Step 2: Extract unique vertices
  // Each H3 vertex is shared by exactly 3 cells.
  // Track which 3 cells surround each vertex for plate assignment.
  // ---------------------------------------------------------------------------
  console.log('Step 2: Extracting unique vertices...');

  const vertexMap = new Map<string, {
    lat: number; lng: number;
    cellIds: string[];
  }>();

  for (const cellId of cells) {
    const boundary = cellToBoundary(cellId); // [lat, lng][]
    for (const [lat, lng] of boundary) {
      const id = vertexId(lat, lng);
      if (!vertexMap.has(id)) {
        vertexMap.set(id, { lat, lng, cellIds: [] });
      }
      vertexMap.get(id)!.cellIds.push(cellId);
    }
  }

  const vertices = [...vertexMap.entries()].map(([id, v]) => ({ id, ...v }));
  console.log(`  ${vertices.length} unique vertices`);

  // ---------------------------------------------------------------------------
  // Step 3: Assign vertices to tectonic plates (majority vote of surrounding cells)
  // ---------------------------------------------------------------------------
  console.log('Step 3: Assigning vertices to tectonic plates...');

  const platePath = join(ROOT, 'data/geology/tectonic_plates.geojson');
  if (!existsSync(platePath)) {
    console.error('ERROR: tectonic_plates.geojson not found. Run: npm run ingest:geology');
    process.exit(1);
  }
  const plates = JSON.parse(readFileSync(platePath, 'utf-8')) as GeoJSON.FeatureCollection;

  // Find plate for a centroid lat/lng
  function findPlate(lng: number, lat: number): string {
    for (const plate of plates.features) {
      if (pointOnPlate(lng, lat, plate)) {
        return (plate.properties?.PlateName ?? plate.properties?.Name ?? 'Unknown') as string;
      }
    }
    return 'Unknown';
  }

  // For each vertex: find plate of each surrounding cell centroid, take majority
  const vertexPlates = new Map<string, string>();
  let assigned = 0;
  for (const v of vertices) {
    const cellPlates = v.cellIds.map(cid => {
      const [clat, clng] = cellToLatLng(cid);
      return findPlate(clng, clat);
    });
    // Majority vote
    const counts = new Map<string, number>();
    for (const p of cellPlates) counts.set(p, (counts.get(p) ?? 0) + 1);
    const majority = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    vertexPlates.set(v.id, majority);
    assigned++;
    if (assigned % 10000 === 0) process.stdout.write(`\r  ${assigned}/${vertices.length}`);
  }
  console.log(`\n  Done`);

  // Summary of plate distribution
  const plateCounts = new Map<string, number>();
  for (const p of vertexPlates.values()) plateCounts.set(p, (plateCounts.get(p) ?? 0) + 1);
  console.log('  Plate distribution:');
  for (const [p, n] of [...plateCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)) {
    console.log(`    ${p}: ${n}`);
  }

  // ---------------------------------------------------------------------------
  // Step 4: Query GPlates for each time step
  // ---------------------------------------------------------------------------
  console.log('\nStep 4: Fetching GPlates reconstructions...');
  console.log(`  ${TIME_STEPS_MA.length} time steps × ${vertices.length} vertices`);
  console.log(`  Model: ${GPLATES_MODEL}`);

  const displacements = new Map<string, Record<number, [number, number] | null>>();
  for (const v of vertices) displacements.set(v.id, {});

  for (const timeMa of TIME_STEPS_MA) {
    process.stdout.write(`  ${timeMa}Ma (${TIME_LABELS[timeMa as TimeMa]}): `);
    const results = await reconstructAll(vertices, timeMa);
    for (const [vId, result] of results) {
      const entry = displacements.get(vId)!;
      entry[timeMa] = result.lat !== null && result.lng !== null
        ? [result.lat, result.lng]
        : null;  // null = point was subducted / didn't exist at this time
    }
  }

  // ---------------------------------------------------------------------------
  // Step 5: Write output
  // ---------------------------------------------------------------------------
  console.log('\nStep 5: Writing tectonic-mesh.json...');

  const output = {
    generated: new Date().toISOString(),
    area,
    resolution: RESOLUTION,
    model: GPLATES_MODEL,
    timeStepsMa: TIME_STEPS_MA,
    timeLabels: TIME_LABELS,
    vertexCount: vertices.length,
    cellCount: cells.length,
    // Compact format: vertex_id → [lat0, lng0, plate, [lat@t0,lng@t0], [lat@t1,lng@t1], ...]
    // null position = didn't exist at that time (gap)
    vertices: Object.fromEntries(
      vertices.map(v => [
        v.id,
        {
          lat: v.lat,
          lng: v.lng,
          plate: vertexPlates.get(v.id) ?? 'Unknown',
          positions: displacements.get(v.id) ?? {},
        },
      ])
    ),
    // Which cells share which vertices (for mesh reconstruction)
    // Compact: cellId → [vertexId, vertexId, ...]
    cells: Object.fromEntries(
      cells.map(cellId => {
        const boundary = cellToBoundary(cellId);
        return [cellId, boundary.map(([lat, lng]) => vertexId(lat, lng))];
      })
    ),
  };

  const outPath = join(ROOT, 'public/tectonic-mesh.json');
  writeFileSync(outPath, JSON.stringify(output), 'utf-8');
  const sizeKB = Buffer.byteLength(JSON.stringify(output)) / 1024;
  console.log(`  Written: public/tectonic-mesh.json (${sizeKB.toFixed(0)} KB)`);

  console.log('\n=== Done ===');
  console.log('Next: update Cesium to load tectonic-mesh.json and deform vertices by time');
  console.log('Usage: npm run build:tectonic -- --area=uk (then --area=global when ready)');
}

main().catch(console.error);
