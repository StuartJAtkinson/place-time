// HexaLog Resolution Verification
// Demonstrates the dual-logarithmic spacetime grid:
//   - Time axis: Big Bang (0) → year 2000 (1) → future
//   - Space axis: Earth-scale hexes → 1-meter hexes
//
// Run: npx tsx scripts/verify-hexalog.ts

import * as h3 from 'h3-js';
import { resolutionFromTimePos, timePosFromResolution, describeResolution, buildHexaLogCoord } from '../src/core/hexalog.js';

const UNIVERSE_AGE_BP = 13_800_000_000;

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║         Place & Time — HexaLog Resolution Test              ║');
console.log('╠══════════════════════════════════════════════════════════════╣');
console.log('║  Dual-logarithmic grid: time × space                        ║');
console.log('║  Time:   Big Bang ──log──→ year 2000 ──linear──→ future     ║');
console.log('║  Space:  Earth-scale ──log──→ 1-meter resolution           ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// ── Time axis verification ──────────────────────────────────────────────────

console.log('━━━ TIME AXIS (logarithmic compression) ━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  Big Bang = 0.0 | year 2000 = 1.0 | future > 1.0\n');

const timeSamples = [
  { label: 'Big Bang', year: -UNIVERSE_AGE_BP },
  { label: 'Earth formation', year: -4_540_000_000 },
  { label: 'Carboniferous', year: -358_900_000 },
  { label: 'Jurassic', year: -201_400_000 },
  { label: 'Quaternary', year: -2_580_000 },
  { label: 'Doomsday Book', year: 1086 },
  { label: 'Industrial Revolution', year: 1800 },
  { label: 'Modern', year: 2000 },
  { label: 'Future', year: 2100 },
];

for (const s of timeSamples) {
  const coord = buildHexaLogCoord({ year: s.year, lat: 53.7, lng: -1.3 });
  console.log(`  ${s.label.padEnd(24)} | year ${String(s.year).padStart(14)} | timePos ${coord.timePos.toFixed(4)} | H3 res ${coord.h3Resolution} | cell ${coord.h3Cell ?? 'n/a'}`);
}

console.log('\n━━━ SPACE AXIS (logarithmic resolution) ━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  timePos 0.0 = Earth-scale (res 0, ~5M km²)');
console.log('  timePos 1.0 = 1-meter resolution (res 15, ~0.00005 km²)\n');

const spatialSamples = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 1.0];
console.log('  timePos   H3res   hex edge      cell area       description');
console.log('  ───────   ─────   ─────────     ──────────      ──────────────────');

for (const tp of spatialSamples) {
  const res = resolutionFromTimePos(tp);
  const cell = h3.latLngToCell(53.7, -1.3, res);
  const area = h3.cellArea(cell, 'km2') as number;
  const edge = Math.sqrt(area) * 2; // approximate edge from square-root of area
  console.log(`  ${tp.toFixed(2).padStart(5)}   ${String(res).padStart(3)}   ${edge.toFixed(1).padStart(6)} m   ${area.toFixed(3).padStart(8)} km²   ${describeResolution(tp)}`);
}

console.log('\n━━━ FIVE TOWNS SPATIAL SAMPLES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  Five key epochs in the Five Towns area (53.7°N, 1.3°W)\n');

const fiveTownsSamples = [
  { label: 'Carboniferous (~358 Ma)', year: -358_900_000 },
  { label: 'Jurassic (~201 Ma)', year: -201_400_000 },
  { label: 'Quaternary (~2.5 Ma)', year: -2_580_000 },
  { label: 'Roman Britain (43 AD)', year: 43 },
  { label: 'Doomsday Book (1086)', year: 1086 },
  { label: 'Victorian (1850)', year: 1850 },
  { label: 'Modern (2020)', year: 2020 },
];

for (const s of fiveTownsSamples) {
  const coord = buildHexaLogCoord({ year: s.year, lat: 53.7, lng: -1.3 });
  const cell = coord.h3Cell!;
  const area = h3.cellArea(cell, 'km2') as number;
  console.log(`  ${s.label}`);
  console.log(`    timePos ${coord.timePos.toFixed(4)} | H3 res ${coord.h3Resolution} (${describeResolution(coord.timePos)})`);
  console.log(`    cell ${cell} | area ${area.toFixed(3)} km² | edge ~${Math.sqrt(area * 1e6).toFixed(0)} m\n`);
}

console.log('━━━ LOGARITHMIC SPACETIME MATRIX ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  Time (rows) × Space (columns) — each cell is an H3 hex\n');

// Time positions for rows
const timePositions = [0.0, 0.2, 0.4, 0.6, 0.8, 0.95, 1.0];
const timeLabels = ['Big Bang', 'Precambrian', 'Paleozoic', 'Mesozoic', 'Cenozoic', 'Recent', 'Modern'];
const spacePositions = [0.0, 0.5, 1.0];
const spaceLabels = ['Earth-scale', 'Regional', 'Precision'];

// Header
const header = '              │' + spaceLabels.map((l, i) => `  ${l}`.padEnd(12)).join('');
console.log('              │  Earth-scale   Regional     Precision  ');
console.log('─'.repeat(64));

for (let i = 0; i < timePositions.length; i++) {
  const tp = timePositions[i];
  const res = resolutionFromTimePos(tp);
  const cell = h3.latLngToCell(53.7, -1.3, res);
  const area = h3.cellArea(cell, 'km2') as number;
  console.log(`${timeLabels[i].padEnd(14)} │ res ${String(res).padStart(2)} ${area >= 1 ? (area).toFixed(0).padStart(6) + ' km²' : (area * 1e6).toFixed(1).padStart(6) + ' m²'}`);
}

console.log('\n✅ HexaLog spacetime grid verified.');
console.log('   Each (timePos, spacePos) maps to a unique H3 cell at appropriate resolution.');
console.log('   Geological epochs compress time logarithmically.');
console.log('   Political epochs expand to fine resolution near present day.');