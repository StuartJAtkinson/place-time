/**
 * Generate globally-correct H3 hex grids for geological/historical eras.
 *
 * H3 uses an icosahedron (Dymaxion) projection — cells are uniformly distributed
 * across the sphere with no equirectangular distortion at poles. The 12 pentagonal
 * cells at icosahedron vertices are the only topological adjustment needed for
 * spherical tiling.
 *
 * Grids generated:
 *   grid-h3-r1.geojson  —  842 cells, ~1800km edge  (Earth forms → Cambrian)
 *   grid-h3-r2.geojson  — 5,882 cells, ~650km edge  (Cambrian → Ice Age end)
 *   grid-h3-r3.geojson  — 41,162 cells, ~73km edge  (Ice Age end → 0 CE)
 *
 * The custom aligned 3.3km UK grid (grid-uk.geojson) covers 0 CE → present
 * and is generated separately by phase1-grid-calibration.ts.
 *
 * Run: npx tsx scripts/generate-h3-global-grids.ts
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { getRes0Cells, cellToChildren, cellToBoundary, cellToLatLng } from 'h3-js';

const __dirname  = fileURLToPath(new URL('.', import.meta.url));
const ROOT       = join(__dirname, '..');
const PUBLIC_DIR = join(ROOT, 'public');

// ---------------------------------------------------------------------------
// Build a global H3 GeoJSON at a given resolution.
// cellToBoundary returns [lat, lng][] — convert to GeoJSON [lng, lat][].
// ---------------------------------------------------------------------------
function generateH3Global(targetRes: number): GeoJSON.FeatureCollection {
  const res0    = getRes0Cells();
  const allCells: string[] = targetRes === 0
    ? [...res0]
    : res0.flatMap(r0 => cellToChildren(r0, targetRes));

  const features: GeoJSON.Feature[] = allCells.map(cell => {
    const [lat, lng] = cellToLatLng(cell);
    const boundary   = cellToBoundary(cell);

    // Convert [lat,lng] H3 pairs → GeoJSON [lng,lat] and close the ring
    const ring: [number, number][] = [
      ...boundary.map(([blat, blng]) => [blng, blat] as [number, number]),
      [boundary[0][1], boundary[0][0]],
    ];

    return {
      type: 'Feature' as const,
      id: cell,
      geometry: { type: 'Polygon' as const, coordinates: [ring] },
      properties: {
        h3Index: cell,
        resolution: targetRes,
        hexCentreLat: parseFloat(lat.toFixed(5)),
        hexCentreLng: parseFloat(lng.toFixed(5)),
      },
    };
  });

  return { type: 'FeatureCollection', features };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('\n=== H3 Global Grid Generation ===');
  console.log('Uses icosahedron (Dymaxion) projection — no polar distortion\n');

  if (!existsSync(PUBLIC_DIR)) mkdirSync(PUBLIC_DIR, { recursive: true });

  const targets = [
    { res: 1, label: 'Earth → Cambrian',      era: '4.54 Ga – 540 Ma' },
    { res: 2, label: 'Cambrian → Ice Age end', era: '540 Ma – 10 ka'  },
    { res: 3, label: 'Ice Age end → 0 CE',     era: '10 ka – 0 CE'    },
  ];

  for (const t of targets) {
    process.stdout.write(`Generating H3 res ${t.res} (${t.era})... `);
    const fc   = generateH3Global(t.res);
    const json = JSON.stringify(fc);
    const file = `grid-h3-r${t.res}.geojson`;
    writeFileSync(join(PUBLIC_DIR, file), json, 'utf-8');
    console.log(`${fc.features.length} cells → ${(Buffer.byteLength(json) / 1024).toFixed(0)} KB  [${file}]`);
  }

  console.log('\nDone. Era mapping:');
  console.log('  pre-Earth            → no globe');
  console.log('  -4.54 Ga → -540 Ma  → grid-h3-r1.geojson  (842 cells)');
  console.log('  -540 Ma  → -10 ka   → grid-h3-r2.geojson  (5,882 cells)');
  console.log('  -10 ka   → 0 CE     → grid-h3-r3.geojson  (41,162 cells)');
  console.log('  0 CE     → present  → grid-uk.geojson      (custom aligned 3.3km)');
}

main().catch(console.error);
