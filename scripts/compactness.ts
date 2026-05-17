#!/usr/bin/env tsx
// scripts/compactness.ts
// Computes Polsby-Popper compactness score for each constituency in
// data/boundaries/constituencies-five-towns.geojson

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const CONSTITUENCIES_FILE = join(ROOT, 'data/boundaries/constituencies-five-towns.geojson');

// ---------------------------------------------------------------------------
// Geometry utilities
// ---------------------------------------------------------------------------

/** Signed area of a polygon ring (shoelace formula) */
function signedArea(ring: number[][]): number {
  let area = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    area += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  }
  return area / 2;
}

/** Perimeter of a polygon ring, in metres (geodesic approximation) */
function perimeterMetres(ring: number[][]): number {
  const latMid = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos(latMid * Math.PI / 180);
  let perim = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const dx = (ring[i][0] - ring[j][0]) * mPerDegLng;
    const dy = (ring[i][1] - ring[j][1]) * mPerDegLat;
    perim += Math.sqrt(dx * dx + dy * dy);
  }
  return perim;
}

/** Area of a polygon in square metres (geodesic approximation using midpoint latitude) */
function areaSqMeters(ring: number[][]): number {
  const latMid = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos(latMid * Math.PI / 180);
  let area = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    area += (ring[j][0] * mPerDegLng) * (ring[i][1] * mPerDegLat)
          - (ring[i][0] * mPerDegLng) * (ring[j][1] * mPerDegLat);
  }
  return Math.abs(area / 2);
}

// ---------------------------------------------------------------------------
// Polsby-Popper compactness score
// = 4π × area / perimeter²
// Higher = more compact. Max = 1 (perfect circle). Values < 0.2 are very fragmented.
// ---------------------------------------------------------------------------

function polsbyPopper(ring: number[][]): number {
  const areaM = areaSqMeters(ring);
  const perimM = perimeterMetres(ring);
  if (perimM === 0) return 0;
  return (4 * Math.PI * areaM) / (perimM * perimM);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const data = JSON.parse(readFileSync(CONSTITUENCIES_FILE, 'utf-8'));
const features = data.features as GeoJSON.Feature[];

console.log('\n=== Polsby-Popper Compactness Analysis ===');
console.log('Formula: 4π × area / perimeter²  (1 = perfect circle, < 0.2 = highly fragmented)\n');

const results: Array<{ name: string; pp: number; areaKm2: number; perimKm: number }> = [];

for (const f of features) {
  if (!f.geometry) continue;
  const name = f.properties?.PCON22NM ?? f.properties?.PCON23NM ?? '(unnamed)';

  let ring: number[][];
  if (f.geometry.type === 'Polygon') {
    ring = f.geometry.coordinates[0] as number[][];
  } else if (f.geometry.type === 'MultiPolygon') {
    // Use the largest polygon in the multipolygon
    let maxArea = -1;
    for (const poly of f.geometry.coordinates as number[][][]) {
      const a = Math.abs(signedArea(poly));
      if (a > maxArea) { maxArea = a; ring = poly; }
    }
  } else {
    continue;
  }

  const areaM = areaSqMeters(ring);
  const perimM = perimeterMetres(ring);
  const areaKm2 = areaM / 1e6;
  const perimKm = perimM / 1000;

  const pp = (4 * Math.PI * areaM) / (perimM * perimM);

  results.push({ name, pp, areaKm2, perimKm });

  console.log(`${name}`);
  console.log(`  Polsby-Popper:  ${pp.toFixed(4)}`);
  console.log(`  Area:           ${areaKm2.toFixed(2)} km²`);
  console.log(`  Perimeter:      ${perimKm.toFixed(2)} km`);
  console.log(`  Compactness:    ${pp < 0.2 ? '⚠ highly fragmented' : pp < 0.4 ? '~ moderately fragmented' : '✓ reasonably compact'}`);
  console.log('');
}

// Summary ranking
console.log('=== Ranking (most compact first) ===');
results
  .sort((a, b) => b.pp - a.pp)
  .forEach(({ name, pp, areaKm2 }, i) => {
    console.log(`  ${i + 1}. ${name}  PP=${pp.toFixed(4)}  ${areaKm2.toFixed(1)} km²`);
  });

console.log('');