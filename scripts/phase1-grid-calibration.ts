/**
 * Place-Time Hex Grid Generation — aligned custom grid + H3 index
 *
 * Generates two grids:
 *   grid-global.geojson — coarse background wireframe, whole Earth, ~200km edge
 *   grid-uk.geojson     — fine leaf grid, UK area, 3.3km edge (PTR-10)
 *
 * Both use the alignment from src/core/grid-alignment.json (rotation 21°).
 *
 * Run: npx tsx scripts/phase1-grid-calibration.ts
 */

import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { latLngToCell } from 'h3-js';
import { COLUMN_TOP_M, COLUMN_BOTTOM_M } from '../src/core/hexalog.js';

const __dirname  = fileURLToPath(new URL('.', import.meta.url));
const ROOT       = join(__dirname, '..');
const PUBLIC_DIR = join(ROOT, 'public');

const SQRT3 = Math.sqrt(3);

// ---------------------------------------------------------------------------
// Alignment
// ---------------------------------------------------------------------------
interface Alignment {
  rotationDeg: number; offsetLng: number; offsetLat: number;
  edgeDeg: number; edgeKm: number;
}

function loadAlignment(): Alignment {
  const path = join(ROOT, 'src/core/grid-alignment.json');
  if (existsSync(path)) {
    const a = JSON.parse(readFileSync(path, 'utf-8'));
    console.log(`  Alignment: rotation=${a.rotationDeg.toFixed(2)}° offset=(${a.offsetLng.toFixed(4)}°, ${a.offsetLat.toFixed(4)}°) improvement=${a.scoreImprovement}`);
    return a as Alignment;
  }
  console.warn('  No grid-alignment.json — using identity');
  return { rotationDeg: 0, offsetLng: 0, offsetLat: 0, edgeDeg: 3.3 / 111.32, edgeKm: 3.3 };
}

// ---------------------------------------------------------------------------
// Custom flat-top hex grid math
// ---------------------------------------------------------------------------
interface Vec2 { x: number; y: number }

function isoToLngLat(iso: Vec2, a: Alignment, latScale: number): [number, number] {
  const θ = a.rotationDeg * Math.PI / 180;
  const cos = Math.cos(θ), sin = Math.sin(θ);
  return [
    (iso.x * cos - iso.y * sin) / latScale + a.offsetLng,
     iso.x * sin + iso.y * cos  + a.offsetLat,
  ];
}

function lngLatToIso(lng: number, lat: number, a: Alignment, latScale: number): Vec2 {
  const θ = a.rotationDeg * Math.PI / 180;
  const cos = Math.cos(-θ), sin = Math.sin(-θ);
  const x = (lng - a.offsetLng) * latScale;
  const y =  lat - a.offsetLat;
  return { x: x * cos - y * sin, y: x * sin + y * cos };
}

function axialToCentroidIso(q: number, r: number, edge: number): Vec2 {
  return { x: edge * 1.5 * q, y: edge * SQRT3 * (r + q / 2) };
}

function hexRound(q: number, r: number): [number, number] {
  const s = -q - r;
  let qi = Math.round(q), ri = Math.round(r), si = Math.round(s);
  const dq = Math.abs(qi - q), dr = Math.abs(ri - r), ds = Math.abs(si - s);
  if (dq > dr && dq > ds) qi = -ri - si;
  else if (dr > ds) ri = -qi - si;
  return [qi, ri];
}

function hexVertices(iso: Vec2, edge: number, a: Alignment, latScale: number): [number, number][] {
  const verts: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const ang = i * 60 * Math.PI / 180;
    verts.push(isoToLngLat({ x: iso.x + edge * Math.cos(ang), y: iso.y + edge * Math.sin(ang) }, a, latScale));
  }
  verts.push(verts[0]);
  return verts;
}

function distM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000, dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const FIVE_TOWNS = [
  { name: 'Pontefract', lat: 53.6997, lng: -1.3577 },
  { name: 'Wakefield',  lat: 53.6831, lng: -1.4994 },
  { name: 'Castleford', lat: 53.5125, lng: -1.3542 },
  { name: 'Normanton',  lat: 53.6982, lng: -1.4258 },
  { name: 'Knottingley',lat: 53.7059, lng: -1.2479 },
];

function nearestTown(lat: number, lng: number) {
  let best = FIVE_TOWNS[0], bestD = Infinity;
  for (const s of FIVE_TOWNS) { const d = distM(lat, lng, s.lat, s.lng); if (d < bestD) { best = s; bestD = d; } }
  return { name: best.name, distM: Math.round(bestD) };
}

// ---------------------------------------------------------------------------
// Generate aligned hex grid for a bounding box
// ---------------------------------------------------------------------------
interface Bounds { minLat: number; maxLat: number; minLng: number; maxLng: number }

function generateGrid(
  edgeKm: number,
  h3Res: number,
  bounds: Bounds,
  a: Alignment,
  label: string,
): GeoJSON.Feature[] {
  const edgeDeg = edgeKm / 111.32;
  const refLat  = (bounds.minLat + bounds.maxLat) / 2;
  const latScale = Math.cos(refLat * Math.PI / 180);

  // Transform corners to find axial enumeration range
  const corners = [
    { lat: bounds.minLat, lng: bounds.minLng },
    { lat: bounds.minLat, lng: bounds.maxLng },
    { lat: bounds.maxLat, lng: bounds.minLng },
    { lat: bounds.maxLat, lng: bounds.maxLng },
  ];
  let qMin = Infinity, qMax = -Infinity, rMin = Infinity, rMax = -Infinity;
  for (const c of corners) {
    const iso = lngLatToIso(c.lng, c.lat, a, latScale);
    const q = (2 / 3) * iso.x / edgeDeg;
    const r = (-iso.x / 3 + SQRT3 / 3 * iso.y) / edgeDeg;
    qMin = Math.min(qMin, q); qMax = Math.max(qMax, q);
    rMin = Math.min(rMin, r); rMax = Math.max(rMax, r);
  }
  const pad = 2;
  qMin = Math.floor(qMin) - pad; qMax = Math.ceil(qMax) + pad;
  rMin = Math.floor(rMin) - pad; rMax = Math.ceil(rMax) + pad;

  const features: GeoJSON.Feature[] = [];
  for (let q = qMin; q <= qMax; q++) {
    for (let r = rMin; r <= rMax; r++) {
      const iso = axialToCentroidIso(q, r, edgeDeg);
      const [cLng, cLat] = isoToLngLat(iso, a, latScale);
      if (cLat < bounds.minLat || cLat > bounds.maxLat ||
          cLng < bounds.minLng || cLng > bounds.maxLng) continue;

      const ring    = hexVertices(iso, edgeDeg, a, latScale);
      const h3Index = latLngToCell(cLat, cLng, h3Res);
      const nearest = nearestTown(cLat, cLng);

      features.push({
        type: 'Feature',
        id: `${label}:${q}:${r}`,
        geometry: { type: 'Polygon', coordinates: [ring] },
        properties: {
          h3Index, customQ: q, customR: r,
          cellEdgeKm: edgeKm,
          cellEdgeM: Math.round(edgeKm * 1000),
          cellAreaKm2: parseFloat((3 * SQRT3 / 2 * edgeKm ** 2).toFixed(4)),
          columnTopM: COLUMN_TOP_M, columnBottomM: COLUMN_BOTTOM_M,
          hexCentreLat: parseFloat(cLat.toFixed(6)),
          hexCentreLng: parseFloat(cLng.toFixed(6)),
          nearestFiveTown: nearest.name,
          nearestFiveTownM: nearest.distM,
          alignmentRotDeg: a.rotationDeg,
        },
      });
    }
  }
  return features;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('\n=== Place-Time Hex Grid Generation ===\n');
  if (!existsSync(PUBLIC_DIR)) mkdirSync(PUBLIC_DIR, { recursive: true });

  const alignment = loadAlignment();

  const grids = [
    {
      label:    'Global coarse wireframe',
      filename: 'grid-global.geojson',
      edgeKm:   200,           // ~200km — visible global wireframe from space
      h3Res:    2,             // H3 res 2 (~195km edge) for index
      bounds:   { minLat: -80, maxLat: 80, minLng: -180, maxLng: 180 },
    },
    {
      label:    'UK fine grid (PTR-10 leaf, 3.3km)',
      filename: 'grid-uk.geojson',
      edgeKm:   3.3,           // human knowability / market-town scale
      h3Res:    6,             // H3 res 6 (~3.91km edge) for index
      bounds:   { minLat: 49, maxLat: 62, minLng: -12, maxLng: 5 },
    },
  ];

  for (const g of grids) {
    console.log(`\nGenerating: ${g.label}`);
    console.log(`  Edge: ${g.edgeKm}km | Bounds: lat ${g.bounds.minLat}–${g.bounds.maxLat}, lng ${g.bounds.minLng}–${g.bounds.maxLng}`);

    const features = generateGrid(g.edgeKm, g.h3Res, g.bounds, alignment, g.label);
    console.log(`  ${features.length} cells generated`);

    const fc: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features };
    const json = JSON.stringify(fc);   // compact — these files are large enough already
    writeFileSync(join(PUBLIC_DIR, g.filename), json, 'utf-8');
    console.log(`  → public/${g.filename} (${(Buffer.byteLength(json) / 1024).toFixed(0)} KB)`);
  }

  console.log(`\nColumn bounds: ${COLUMN_BOTTOM_M}m to +${COLUMN_TOP_M}m (${(COLUMN_TOP_M - COLUMN_BOTTOM_M) / 1000}km total)\n`);
}

main().catch(console.error);
