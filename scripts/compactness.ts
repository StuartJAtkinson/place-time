#!/usr/bin/env tsx
// scripts/compactness.ts
// Computes Polsby-Popper compactness score for each constituency in
// data/boundaries/constituencies-five-towns.geojson

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { constituencyCompactness } from '../src/core/compactness.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const CONSTITUENCIES_FILE = join(ROOT, 'data/boundaries/constituencies-five-towns.geojson');

const data = JSON.parse(readFileSync(CONSTITUENCIES_FILE, 'utf-8'));
const features = data.features as GeoJSON.Feature[];

console.log('\n=== Polsby-Popper Compactness Analysis ===');
console.log('Formula: 4π × area / perimeter²  (1 = perfect circle, < 0.2 = highly fragmented)\n');

const results: Array<{ name: string; pp: number; areaKm2: number; perimKm: number }> = [];

for (const f of features) {
  if (!f.geometry) continue;
  const name = f.properties?.PCON22NM ?? f.properties?.PCON23NM ?? '(unnamed)';

  const { pp, areaKm2, perimKm } = constituencyCompactness(f);
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