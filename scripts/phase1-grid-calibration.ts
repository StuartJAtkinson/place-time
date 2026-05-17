/**
 * Phase 1.1: Hex Grid Generation — aligned custom grid + H3 index
 *
 * Generates hex grids at PTR-7 (display resolution, ~8.6km edge) and PTR-10
 * (leaf resolution, ~2.1km edge) using the globally-optimised alignment from
 * src/core/grid-alignment.json (rotation 21°, offset 0.0023°/0.0144°).
 *
 * Each cell:
 *   - geometry: custom aligned hex polygon (the display shape)
 *   - h3Index:  H3 cell ID at the centroid (the query/index key)
 *   - customQ/R: axial coordinates in the aligned grid
 *
 * Run: npx tsx scripts/phase1-grid-calibration.ts
 */

import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { latLngToCell } from 'h3-js';
import { COLUMN_TOP_M, COLUMN_BOTTOM_M } from '../src/core/hexalog.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT     = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'data/five-towns');
const PUBLIC_DIR = join(ROOT, 'public');

// ---------------------------------------------------------------------------
// Bounding box for Five Towns area
// ---------------------------------------------------------------------------
const BOUNDS = { minLat: 53.48, maxLat: 53.82, minLng: -1.57, maxLng: -1.23 };

// Reference latitude for longitude scaling (cos correction)
const REF_LAT = (BOUNDS.minLat + BOUNDS.maxLat) / 2;
const LAT_SCALE = Math.cos(REF_LAT * Math.PI / 180);

// Five Towns settlements for nearest-neighbour annotation
const FIVE_TOWNS = [
  { name: 'Pontefract',  lat: 53.6997, lng: -1.3577 },
  { name: 'Wakefield',   lat: 53.6831, lng: -1.4994 },
  { name: 'Castleford',  lat: 53.5125, lng: -1.3542 },
  { name: 'Normanton',   lat: 53.6982, lng: -1.4258 },
  { name: 'Knottingley', lat: 53.7059, lng: -1.2479 },
];

// ---------------------------------------------------------------------------
// Alignment — load from optimiser output, fall back to identity
// ---------------------------------------------------------------------------
interface Alignment {
  rotationDeg: number;
  offsetLng: number;
  offsetLat: number;
  edgeDeg: number;
  edgeKm: number;
}

function loadAlignment(): Alignment {
  const path = join(ROOT, 'src/core/grid-alignment.json');
  if (existsSync(path)) {
    const a = JSON.parse(readFileSync(path, 'utf-8'));
    console.log(`  Alignment loaded: rotation=${a.rotationDeg.toFixed(2)}° improvement=${a.scoreImprovement}`);
    return a as Alignment;
  }
  console.warn('  No grid-alignment.json found — using unaligned grid');
  return { rotationDeg: 0, offsetLng: 0, offsetLat: 0, edgeDeg: 2.154 / 111.32, edgeKm: 2.154 };
}

// ---------------------------------------------------------------------------
// Flat-top hexagon grid math (equirectangular with lat-scale correction)
//
// Axial coordinates (q, r) → centroid in isometric space → lng/lat
// ---------------------------------------------------------------------------
const SQRT3 = Math.sqrt(3);

interface Vec2 { x: number; y: number; }

function isoToLngLat(iso: Vec2, a: Alignment): [number, number] {
  const theta = a.rotationDeg * Math.PI / 180;
  const cos = Math.cos(theta), sin = Math.sin(theta);
  const rx = iso.x * cos - iso.y * sin;
  const ry = iso.x * sin + iso.y * cos;
  return [rx / LAT_SCALE + a.offsetLng, ry + a.offsetLat];
}

function lngLatToIso(lng: number, lat: number, a: Alignment): Vec2 {
  const theta = a.rotationDeg * Math.PI / 180;
  const cos = Math.cos(-theta), sin = Math.sin(-theta);
  const x = (lng - a.offsetLng) * LAT_SCALE;
  const y = lat - a.offsetLat;
  return { x: x * cos - y * sin, y: x * sin + y * cos };
}

function axialToCentroidIso(q: number, r: number, edgeDeg: number): Vec2 {
  return {
    x: edgeDeg * (3 / 2) * q,
    y: edgeDeg * SQRT3 * (r + q / 2),
  };
}

function isoToAxial(iso: Vec2, edgeDeg: number): { q: number; r: number } {
  return {
    q: (2 / 3) * iso.x / edgeDeg,
    r: (-iso.x / 3 + SQRT3 / 3 * iso.y) / edgeDeg,
  };
}

function hexRound(q: number, r: number): [number, number] {
  const s = -q - r;
  let qi = Math.round(q), ri = Math.round(r), si = Math.round(s);
  const dq = Math.abs(qi - q), dr = Math.abs(ri - r), ds = Math.abs(si - s);
  if (dq > dr && dq > ds) qi = -ri - si;
  else if (dr > ds) ri = -qi - si;
  return [qi, ri];
}

// Generate the 6 vertices of a flat-top hex given its centroid in iso space
function hexVerticesLngLat(cx: number, cy: number, edgeDeg: number, a: Alignment): [number, number][] {
  const verts: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i * 60) * Math.PI / 180;   // flat-top: 0°, 60°, 120°, ...
    const vx = cx + edgeDeg * Math.cos(angle);
    const vy = cy + edgeDeg * Math.sin(angle);
    verts.push(isoToLngLat({ x: vx, y: vy }, a));
  }
  verts.push(verts[0]); // close the ring
  return verts;
}

// ---------------------------------------------------------------------------
// Haversine distance in metres
// ---------------------------------------------------------------------------
function distM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestSettlement(lat: number, lng: number): { name: string; distM: number } {
  let best = FIVE_TOWNS[0];
  let bestD = distM(lat, lng, best.lat, best.lng);
  for (const s of FIVE_TOWNS) {
    const d = distM(lat, lng, s.lat, s.lng);
    if (d < bestD) { best = s; bestD = d; }
  }
  return { name: best.name, distM: Math.round(bestD) };
}

// ---------------------------------------------------------------------------
// Generate aligned hex grid covering the bounding box
// ---------------------------------------------------------------------------
function generateAlignedGrid(
  edgeKm: number,
  a: Alignment,
  h3Res: number,
): { features: GeoJSON.Feature[]; cellCount: number } {
  const edgeDeg = edgeKm / 111.32;  // degrees (equatorial approximation)

  // Transform bbox corners to axial coordinates to find enumeration range
  const corners = [
    { lat: BOUNDS.minLat, lng: BOUNDS.minLng },
    { lat: BOUNDS.minLat, lng: BOUNDS.maxLng },
    { lat: BOUNDS.maxLat, lng: BOUNDS.minLng },
    { lat: BOUNDS.maxLat, lng: BOUNDS.maxLng },
  ];

  let qMin = Infinity, qMax = -Infinity, rMin = Infinity, rMax = -Infinity;
  for (const c of corners) {
    const iso = lngLatToIso(c.lng, c.lat, a);
    const { q, r } = isoToAxial(iso, edgeDeg);
    qMin = Math.min(qMin, q); qMax = Math.max(qMax, q);
    rMin = Math.min(rMin, r); rMax = Math.max(rMax, r);
  }
  // Pad by 2 cells on each side
  const pad = 2;
  qMin = Math.floor(qMin) - pad; qMax = Math.ceil(qMax) + pad;
  rMin = Math.floor(rMin) - pad; rMax = Math.ceil(rMax) + pad;

  const features: GeoJSON.Feature[] = [];

  for (let q = qMin; q <= qMax; q++) {
    for (let r = rMin; r <= rMax; r++) {
      const iso = axialToCentroidIso(q, r, edgeDeg);
      const [cLng, cLat] = isoToLngLat(iso, a);

      // Keep cells whose centroid falls within the bounding box
      if (cLat < BOUNDS.minLat || cLat > BOUNDS.maxLat ||
          cLng < BOUNDS.minLng || cLng > BOUNDS.maxLng) continue;

      // Custom hex boundary
      const ring = hexVerticesLngLat(iso.x, iso.y, edgeDeg, a);

      // H3 index at centroid — used as the query/lookup key
      const h3Index = latLngToCell(cLat, cLng, h3Res);

      const nearest = nearestSettlement(cLat, cLng);

      features.push({
        type: 'Feature',
        id: `hex:${h3Res}:${h3Index}`,
        geometry: {
          type: 'Polygon',
          coordinates: [ring],
        },
        properties: {
          h3Index,
          resolution: h3Res,
          customQ: q,
          customR: r,
          cellEdgeM: Math.round(edgeKm * 1000),
          cellAreaKm2: parseFloat((3 * SQRT3 / 2 * edgeKm ** 2).toFixed(4)),
          columnTopM: COLUMN_TOP_M,
          columnBottomM: COLUMN_BOTTOM_M,
          hexCentreLat: parseFloat(cLat.toFixed(6)),
          hexCentreLng: parseFloat(cLng.toFixed(6)),
          settlement: nearest.name,
          settlementDistM: nearest.distM,
          alignmentRotDeg: a.rotationDeg,
        },
      });
    }
  }

  return { features, cellCount: features.length };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('\n=== Place-Time Hex Grid Generation (aligned) ===\n');

  [DATA_DIR, PUBLIC_DIR].forEach(d => { if (!existsSync(d)) mkdirSync(d, { recursive: true }); });

  const alignment = loadAlignment();

  // PTR-7 display grid (~8.6km edge — regional context, county scale)
  // PTR-10 leaf grid (~2.1km edge — human settlement / Dunbar scale)
  const grids = [
    // H3 res 7 scale: ~1.47km edge, ~5.16km² area — regional/county context
    { label: 'PTR-7 (regional)',  edgeKm: 1.47,   h3Res: 7, filename: 'five-towns-grid-res7.geojson' },
    // H3 res 8 scale: ~0.554km edge, ~0.74km² area — settlement/neighbourhood
    { label: 'PTR-10 (leaf)',     edgeKm: 0.554,  h3Res: 8, filename: 'five-towns-grid-res8.geojson' },
  ];

  for (const g of grids as Array<{label:string;edgeKm:number;h3Res:number;filename:string}>) {
    console.log(`\nGenerating ${g.label} at ${g.edgeKm}km edge...`);
    const { features, cellCount } = generateAlignedGrid(g.edgeKm, alignment, g.h3Res);
    console.log(`  ${cellCount} cells`);

    // Validate coverage
    FIVE_TOWNS.forEach(s => {
      const iso = lngLatToIso(s.lng, s.lat, alignment);
      const inBounds = s.lat >= BOUNDS.minLat && s.lat <= BOUNDS.maxLat &&
                       s.lng >= BOUNDS.minLng && s.lng <= BOUNDS.maxLng;
      console.log(`  ${s.name}: ${inBounds ? '✓' : '✗ outside bounds'}`);
    });

    const filename = g.filename;
    const fc: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features };
    const json = JSON.stringify(fc, null, 2);
    writeFileSync(join(DATA_DIR, filename), json, 'utf-8');
    writeFileSync(join(PUBLIC_DIR, filename), json, 'utf-8');
    console.log(`  Saved: ${filename}`);
  }

  console.log('\nGrid generation complete.\n');
  console.log(`Column bounds: ${COLUMN_BOTTOM_M}m to +${COLUMN_TOP_M}m (${(COLUMN_TOP_M - COLUMN_BOTTOM_M) / 1000}km total)`);
}

main().catch(console.error);
