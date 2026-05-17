/**
 * Place-Time Hex Grid Alignment Optimiser
 *
 * Finds the optimal rotation and offset for a custom hexagonal grid such that
 * the maximum number of globally significant human settlements fall near the
 * centre of their enclosing hex cell.
 *
 * Rationale:
 *   The hex grid leaf resolution (PTR-10, H3 ~res 9, edge ~2.1km) represents
 *   the scale of human "knowability" — a Dunbar-scale community (~150–1500 people)
 *   whose members can know the place and each other. Below this, data is stored
 *   as attributes of the cell, not as finer subdivisions.
 *
 * Data source:
 *   GeoNames cities1000.txt — ~100k settlements globally, population ≥ 1000.
 *   https://download.geonames.org/export/dump/cities1000.zip
 *
 * Output:
 *   src/core/grid-alignment.json — alignment signature for use by grid generators
 *
 * Run: npx tsx scripts/optimise-grid-alignment.ts
 */

import { createReadStream, writeFileSync, existsSync, mkdirSync } from 'fs';
import { createInterface } from 'readline';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { createWriteStream } from 'fs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const CACHE_DIR = join(ROOT, '.cache');
const GEONAMES_URL = 'https://download.geonames.org/export/dump/cities1000.zip';
const GEONAMES_ZIP  = join(CACHE_DIR, 'cities1000.zip');
const GEONAMES_TSV  = join(CACHE_DIR, 'cities1000.txt');
const OUTPUT_PATH   = join(ROOT, 'src', 'core', 'grid-alignment.json');

// ---------------------------------------------------------------------------
// Place-Time Resolution (PTR) scale
// PTR 0  = H3 res 0  (~5,000km edge, planetary)
// PTR 10 = H3 res 9  (~2.1km edge, human settlement scale — leaf node)
// Below PTR-10: data is cell attributes, not subdivisions
// ---------------------------------------------------------------------------
export const PTR_LEAF = 10;         // finest Place-Time Resolution
export const H3_RES_LEAF = 9;       // corresponding H3 resolution

// Edge length of PTR-10 cell in km (H3 res 9 average)
export const LEAF_EDGE_KM = 2.154;

// In degrees at equator (1° ≈ 111.32km)
const LEAF_EDGE_DEG = LEAF_EDGE_KM / 111.32;

// ---------------------------------------------------------------------------
// Settlement filter
// We care about towns and villages — the scale that fits in a cell.
// Megacities will always straddle cells; ignore them for alignment purposes.
// ---------------------------------------------------------------------------
const MIN_POP = 1_000;
const MAX_POP = 300_000;

// GeoNames feature codes to include (populated places, not just admin seats)
const INCLUDE_CODES = new Set([
  'PPL',   // populated place
  'PPLA',  // seat of first-order admin division (state capital) — include, weighted lower
  'PPLA2', // seat of second-order admin division
  'PPLA3', // seat of third-order admin division
  'PPLCH', // historical capital
  'PPLF',  // farm village
  'PPLG',  // seat of government
  'PPLL',  // locality
  'PPLR',  // religious populated place
  'PPLS',  // populated places
]);

interface Settlement {
  lat: number;
  lng: number;
  weight: number;  // log10(population), capped
  name: string;
  country: string;
}

// ---------------------------------------------------------------------------
// Download GeoNames data
// ---------------------------------------------------------------------------
async function downloadGeoNames(): Promise<void> {
  if (existsSync(GEONAMES_TSV)) {
    console.log('  GeoNames cache found — skipping download.');
    return;
  }

  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });

  if (!existsSync(GEONAMES_ZIP)) {
    console.log(`  Downloading ${GEONAMES_URL} ...`);
    const res = await fetch(GEONAMES_URL, {
      headers: { 'User-Agent': 'place-time/0.1 (spatial history project)' },
    });
    if (!res.ok) throw new Error(`GeoNames HTTP ${res.status}`);
    const writer = createWriteStream(GEONAMES_ZIP);
    const reader = res.body!.getReader();
    let bytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      writer.write(value);
      bytes += value.length;
      if (bytes % (1024 * 1024) < 65536) process.stdout.write(`\r  ${(bytes / 1048576).toFixed(1)} MB`);
    }
    writer.end();
    await new Promise(r => writer.on('finish', r));
    console.log('\n  Download complete.');
  }

  // Unzip — use PowerShell on Windows, unzip elsewhere
  console.log('  Extracting zip...');
  const { execSync } = await import('child_process');
  try {
    execSync(`powershell -Command "Expand-Archive -Path '${GEONAMES_ZIP}' -DestinationPath '${CACHE_DIR}' -Force"`, { stdio: 'pipe' });
  } catch {
    execSync(`unzip -o "${GEONAMES_ZIP}" -d "${CACHE_DIR}"`, { stdio: 'pipe' });
  }
  console.log('  Extracted.');
}

// ---------------------------------------------------------------------------
// Parse GeoNames TSV
// ---------------------------------------------------------------------------
async function loadSettlements(): Promise<Settlement[]> {
  const settlements: Settlement[] = [];

  const rl = createInterface({
    input: createReadStream(GEONAMES_TSV, 'utf-8'),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line || line.startsWith('#')) continue;
    const cols = line.split('\t');
    // Columns: 0=id 1=name 2=asciiname 3=altnames 4=lat 5=lng 6=featureClass 7=featureCode
    //          8=country 9=cc2 10=admin1 11=admin2 12=admin3 13=admin4 14=population ...
    if (cols.length < 15) continue;
    if (cols[6] !== 'P') continue;               // only populated places
    if (!INCLUDE_CODES.has(cols[7])) continue;

    const pop = parseInt(cols[14], 10);
    if (isNaN(pop) || pop < MIN_POP || pop > MAX_POP) continue;

    const lat = parseFloat(cols[4]);
    const lng = parseFloat(cols[5]);
    if (isNaN(lat) || isNaN(lng)) continue;

    // Weight: log10 of population, capped at 5 (100k)
    const weight = Math.log10(Math.min(pop, 100_000));

    settlements.push({ lat, lng, weight, name: cols[1], country: cols[8] });
  }

  return settlements;
}

// ---------------------------------------------------------------------------
// Stratified global sample — avoid over-representing Europe
// Divide the globe into a grid of cells, sample proportionally
// ---------------------------------------------------------------------------
function stratifiedSample(settlements: Settlement[], targetN: number): Settlement[] {
  const GRID_W = 36, GRID_H = 18;  // 10° × 10° cells
  const buckets = new Map<string, Settlement[]>();

  for (const s of settlements) {
    const gx = Math.floor((s.lng + 180) / (360 / GRID_W));
    const gy = Math.floor((s.lat + 90)  / (180 / GRID_H));
    const key = `${gx},${gy}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(s);
  }

  const perBucket = Math.ceil(targetN / buckets.size);
  const result: Settlement[] = [];

  for (const bucket of buckets.values()) {
    // Sort by weight descending, take the most significant in each cell
    bucket.sort((a, b) => b.weight - a.weight);
    result.push(...bucket.slice(0, perBucket));
  }

  return result;
}

// ---------------------------------------------------------------------------
// Flat-top hex grid math (equirectangular, with latitude correction)
//
// A flat-top hex with edge length `a` (in degrees):
//   width  w = 2a
//   height h = √3 × a
//
// Column centres at x = i × 1.5a,  row centres at y = j × √3a  (+ offset for odd cols)
//
// The optimiser searches over:
//   ox ∈ [0, 1.5a)   — horizontal offset (periodic)
//   oy ∈ [0, √3a/2)  — vertical offset   (periodic, half for symmetry)
//   θ  ∈ [0, π/3)    — rotation          (60° symmetry)
// ---------------------------------------------------------------------------
const SQRT3 = Math.sqrt(3);

function nearestHexCentre(
  lngIn: number,
  latIn: number,
  edgeDeg: number,
  ox: number,
  oy: number,
  cosTheta: number,
  sinTheta: number,
  latScale: number,  // cos(lat) correction to make lng isometric
): [number, number] {
  // Apply latitude scaling to longitude component
  const x = (lngIn - ox) * latScale;
  const y = latIn - oy;

  // Rotate by -θ
  const rx = x * cosTheta + y * sinTheta;
  const ry = -x * sinTheta + y * cosTheta;

  // Convert to axial hex coordinates (flat-top)
  const q = (2 / 3) * rx / edgeDeg;
  const r = (-rx / 3 + SQRT3 / 3 * ry) / edgeDeg;

  // Round to nearest hex in cube coordinates
  const s = -q - r;
  let qi = Math.round(q), ri = Math.round(r), si = Math.round(s);
  const dq = Math.abs(qi - q), dr = Math.abs(ri - r), ds = Math.abs(si - s);
  if (dq > dr && dq > ds) qi = -ri - si;
  else if (dr > ds) ri = -qi - si;

  // Hex centre in rotated isometric space
  const cx = edgeDeg * (3 / 2) * qi;
  const cy = edgeDeg * SQRT3 * (ri + qi / 2);

  // Rotate back by +θ
  const bx = cx * cosTheta - cy * sinTheta;
  const by = cx * sinTheta + cy * cosTheta;

  return [ox + bx / latScale, oy + by];
}

function hexCentreDistFraction(
  lng: number, lat: number,
  edgeDeg: number,
  ox: number, oy: number,
  cosTheta: number, sinTheta: number,
  latScale: number,
): number {
  const [cx, cy] = nearestHexCentre(lng, lat, edgeDeg, ox, oy, cosTheta, sinTheta, latScale);
  // Inscribed circle radius = (√3/2) × edge
  const inscribedDeg = (SQRT3 / 2) * edgeDeg;
  const dx = (lng - cx) * latScale;
  const dy = lat - cy;
  return Math.sqrt(dx * dx + dy * dy) / inscribedDeg;  // 0 = perfect centre, 1 = edge
}

// ---------------------------------------------------------------------------
// Score a set of (ox, oy, theta) against all settlements
// Score = sum of weight × gaussian(distFraction)  — peaks when settlement is centred
// ---------------------------------------------------------------------------
function scoreAlignment(
  settlements: Settlement[],
  edgeDeg: number,
  ox: number, oy: number,
  theta: number,
): number {
  const cosT = Math.cos(-theta);
  const sinT = Math.sin(-theta);
  let total = 0;

  for (const s of settlements) {
    const latScale = Math.cos(s.lat * Math.PI / 180);
    if (latScale < 0.1) continue;  // skip near-polar settlements
    const frac = hexCentreDistFraction(s.lng, s.lat, edgeDeg, ox, oy, cosT, sinT, latScale);
    // Gaussian reward: peaks at 0 (centred), drops to ~0.1 at frac=1 (edge)
    total += s.weight * Math.exp(-3 * frac * frac);
  }

  return total;
}

// ---------------------------------------------------------------------------
// Coarse-to-fine grid search
// ---------------------------------------------------------------------------
function optimiseAlignment(settlements: Settlement[], edgeDeg: number): {
  ox: number; oy: number; thetaDeg: number; score: number; normalised: number;
} {
  const w = 1.5 * edgeDeg;          // horizontal period
  const h = SQRT3 * edgeDeg / 2;    // vertical period (half due to symmetry)
  const rotPeriod = Math.PI / 3;    // 60° period

  // --- Stage 1: coarse search ---
  const COARSE = 20;
  let best = { ox: 0, oy: 0, theta: 0, score: -Infinity };

  console.log(`\n  Stage 1: coarse grid search (${COARSE}³ = ${COARSE ** 3} evaluations)...`);
  let evaluated = 0;

  for (let i = 0; i < COARSE; i++) {
    for (let j = 0; j < COARSE; j++) {
      for (let k = 0; k < COARSE; k++) {
        const ox    = (i / COARSE) * w;
        const oy    = (j / COARSE) * h;
        const theta = (k / COARSE) * rotPeriod;
        const score = scoreAlignment(settlements, edgeDeg, ox, oy, theta);
        if (score > best.score) best = { ox, oy, theta, score };
        evaluated++;
      }
    }
    if (i % 5 === 0) process.stdout.write(`\r  ${evaluated}/${COARSE ** 3}  best=${best.score.toFixed(1)}`);
  }
  console.log(`\n  Coarse best: ox=${best.ox.toFixed(4)}° oy=${best.oy.toFixed(4)}° θ=${(best.theta * 180 / Math.PI).toFixed(1)}° score=${best.score.toFixed(1)}`);

  // --- Stage 2: fine search around best ---
  console.log('  Stage 2: fine search (30³ around best candidate)...');
  const FINE = 30;
  const wxFine = w / COARSE;
  const wyFine = h / COARSE;
  const wtFine = rotPeriod / COARSE;

  for (let i = -FINE / 2; i < FINE / 2; i++) {
    for (let j = -FINE / 2; j < FINE / 2; j++) {
      for (let k = -FINE / 2; k < FINE / 2; k++) {
        const ox    = best.ox    + (i / FINE) * wxFine;
        const oy    = best.oy    + (j / FINE) * wyFine;
        const theta = best.theta + (k / FINE) * wtFine;
        const score = scoreAlignment(settlements, edgeDeg, ox, oy, theta);
        if (score > best.score) best = { ox, oy, theta, score };
      }
    }
  }

  // Baseline score (random grid, for normalisation)
  const baseline = scoreAlignment(settlements, edgeDeg, 0, 0, 0);

  return {
    ox: best.ox,
    oy: best.oy,
    thetaDeg: best.theta * 180 / Math.PI,
    score: best.score,
    normalised: best.score / baseline,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('\n=== Place-Time Hex Grid Alignment Optimiser ===');
  console.log(`\nTarget resolution: PTR-10 (H3 res ${H3_RES_LEAF}, edge ~${LEAF_EDGE_KM}km)`);
  console.log('Concept: the hex leaf — human knowability scale, walkable in 30min, Dunbar-scale community\n');

  await downloadGeoNames();

  console.log('\nLoading settlements...');
  const all = await loadSettlements();
  console.log(`  Loaded: ${all.length} settlements (pop ${MIN_POP.toLocaleString()}–${MAX_POP.toLocaleString()})`);

  // Stratified sample — ~8000 settlements, globally representative
  const settlements = stratifiedSample(all, 8000);
  console.log(`  Stratified sample: ${settlements.length} settlements`);

  // Country breakdown (top 10)
  const byCc = new Map<string, number>();
  for (const s of settlements) byCc.set(s.country, (byCc.get(s.country) ?? 0) + 1);
  const top10 = [...byCc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  console.log('  Top countries in sample:', top10.map(([cc, n]) => `${cc}:${n}`).join(' '));

  const result = optimiseAlignment(settlements, LEAF_EDGE_DEG);

  console.log(`\n=== Optimal Alignment Found ===`);
  console.log(`  Rotation:    ${result.thetaDeg.toFixed(3)}°`);
  console.log(`  Offset lng:  ${result.ox.toFixed(6)}°`);
  console.log(`  Offset lat:  ${result.oy.toFixed(6)}°`);
  console.log(`  Score:       ${result.score.toFixed(2)} (${((result.normalised - 1) * 100).toFixed(1)}% better than unaligned)`);

  const output = {
    description: 'Optimal hex grid alignment for PTR-10 (human settlement scale)',
    generated: new Date().toISOString(),
    ptrLeaf: PTR_LEAF,
    h3ResLeaf: H3_RES_LEAF,
    edgeKm: LEAF_EDGE_KM,
    edgeDeg: LEAF_EDGE_DEG,
    rotationDeg: result.thetaDeg,
    offsetLng: result.ox,
    offsetLat: result.oy,
    score: result.score,
    scoreImprovement: `${((result.normalised - 1) * 100).toFixed(1)}%`,
    sampleSize: settlements.length,
    popFilter: { min: MIN_POP, max: MAX_POP },
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\n  Written: src/core/grid-alignment.json`);
  console.log('\nNext: npx tsx scripts/phase1-grid-calibration.ts (will use this alignment)');
}

main().catch(console.error);
