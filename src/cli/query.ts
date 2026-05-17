// Place-Time CLI Query Tool
// Usage:
//   npx tsx src/cli/query.ts --lat 53.693 --lng -1.310 --year 1086
//   npx tsx src/cli/query.ts --place pontefract --year 2024
//   npx tsx src/cli/query.ts --help

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { latLngToCell } from 'h3-js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '../../');

// Well-known Five Towns points for --place shorthand
const KNOWN_PLACES: Record<string, [number, number]> = {
  pontefract:   [53.6934, -1.3093],
  castleford:   [53.7243, -1.3545],
  featherstone: [53.6778, -1.3680],
  knottingley:  [53.7109, -1.2437],
  normanton:    [53.6987, -1.4194],
  wakefield:    [53.6832, -1.4976],
};

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

function pointInRing(px: number, py: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = ((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInGeometry(lng: number, lat: number, geometry: GeoJSON.Geometry): boolean {
  try {
    if (geometry.type === 'Polygon') {
      return pointInRing(lng, lat, geometry.coordinates[0] as number[][]);
    }
    if (geometry.type === 'MultiPolygon') {
      return (geometry.coordinates as number[][][][]).some(poly => pointInRing(lng, lat, poly[0]));
    }
  } catch { /* skip invalid geometries */ }
  return false;
}

/** Signed area of a ring in degree-units (shoelace, no projection) */
function signedAreaDeg(ring: number[][]): number {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  }
  return a / 2;
}

/**
 * Polsby-Popper compactness score for a constituency feature.
 * Formula: 4π × area / perimeter²
 * Uses geodesic approximation: converts degrees to metres using midpoint latitude.
 * Returns { pp, areaKm2, perimKm }.
 */
function constituencyCompactness(
  f: GeoJSON.Feature
): { pp: number; areaKm2: number; perimKm: number } {
  let ring: number[][];
  if (f.geometry?.type === 'Polygon') {
    ring = f.geometry.coordinates[0] as unknown as number[][];
  } else if (f.geometry?.type === 'MultiPolygon') {
    let maxArea = -Infinity;
    let biggestPoly: number[][] | undefined;
    for (const poly of f.geometry.coordinates as unknown as number[][][]) {
      const a = Math.abs(signedAreaDeg(poly));
      if (a > maxArea) { maxArea = a; biggestPoly = poly; }
    }
    if (!biggestPoly) return { pp: 0, areaKm2: 0, perimKm: 0 };
    ring = biggestPoly;
  } else {
    return { pp: 0, areaKm2: 0, perimKm: 0 };
  }

  const latMid = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos(latMid * Math.PI / 180);

  let areaM = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    areaM += (ring[j][0] * mPerDegLng) * (ring[i][1] * mPerDegLat)
           - (ring[i][0] * mPerDegLng) * (ring[j][1] * mPerDegLat);
  }
  areaM = Math.abs(areaM / 2);

  let perimM = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const dx = (ring[i][0] - ring[j][0]) * mPerDegLng;
    const dy = (ring[i][1] - ring[j][1]) * mPerDegLat;
    perimM += Math.sqrt(dx * dx + dy * dy);
  }

  const pp = perimM > 0 ? (4 * Math.PI * areaM) / (perimM * perimM) : 0;
  return { pp, areaKm2: areaM / 1e6, perimKm: perimM / 1000 };
}

// ---------------------------------------------------------------------------
// Data loader
// ---------------------------------------------------------------------------

function loadGeoJson(relPath: string): GeoJSON.FeatureCollection | null {
  const abs = join(ROOT, relPath);
  if (!existsSync(abs)) return null;
  return JSON.parse(readFileSync(abs, 'utf-8')) as GeoJSON.FeatureCollection;
}

// ---------------------------------------------------------------------------
// Query logic
// ---------------------------------------------------------------------------

function queryPoint(lat: number, lng: number, year: number) {
  const res8 = latLngToCell(lat, lng, 8);
  const res7 = latLngToCell(lat, lng, 7);

  console.log(`\n=== Place-Time Query ===`);
  console.log(`Point:    ${lat.toFixed(5)}N, ${Math.abs(lng).toFixed(5)}W`);
  console.log(`Year:     ${year > 0 ? year + ' CE' : Math.abs(year) + ' BCE'}`);
  console.log(`H3 res 8: ${res8}`);
  console.log(`H3 res 7: ${res7}`);

  // 1. Domesday settlements (~1086)
  const domesday = loadGeoJson('data/historical/domesday-five-towns.geojson');
  if (domesday && Math.abs(year - 1086) < 50) {
    console.log(`\n--- Domesday Settlements (1086) ---`);
    const nearby = domesday.features
      .filter(f => f.geometry.type === 'Point')
      .map(f => {
        const [fLng, fLat] = (f.geometry as GeoJSON.Point).coordinates;
        const dist = Math.sqrt((fLat - lat) ** 2 + (fLng - lng) ** 2);
        return { name: f.properties?.domesdayName, modern: f.properties?.modernName, hundred: f.properties?.hundred, dist };
      })
      .filter(p => p.dist < 0.2)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 5);

    if (nearby.length === 0) {
      console.log('  No Domesday settlements found within ~22km');
    } else {
      for (const p of nearby) {
        console.log(`  ${p.name} (modern: ${p.modern}) -- ${p.hundred} hundred`);
      }
    }
  }

  // 2. Cliopatria polities active at this year covering this point
  const cliopatria = loadGeoJson('data/historical/cliopatria-uk.geojson');
  if (cliopatria) {
    const active = cliopatria.features.filter(f => {
      if (!f.geometry) return false;
      const from = f.properties?.FromYear ?? f.properties?.validFrom;
      const to   = f.properties?.ToYear   ?? f.properties?.validTo;
      const timeOk = (from == null || from <= year) && (to == null || to >= year);
      if (!timeOk) return false;
      return pointInGeometry(lng, lat, f.geometry as GeoJSON.Geometry);
    });

    console.log(`\n--- Cliopatria Polities at ${year} (covering this location) ---`);
    if (active.length === 0) {
      console.log('  None found -- location may not be covered by Cliopatria data at this date');
    } else {
      for (const f of active) {
        const name = f.properties?.Name ?? f.properties?.name ?? '(unnamed)';
        const from = f.properties?.FromYear ?? f.properties?.validFrom ?? '?';
        const to   = f.properties?.ToYear   ?? f.properties?.validTo   ?? '?';
        console.log(`  ${name} (${from}--${to})`);
      }
    }
  }

  // 3. Modern administrative context
  const wakefield      = loadGeoJson('data/boundaries/wakefield-mdc.geojson');
  const constituencies = loadGeoJson('data/boundaries/constituencies-five-towns.geojson');
  const wards          = loadGeoJson('data/boundaries/wards-wakefield.geojson');

  console.log(`\n--- Modern Administrative Context ---`);
  console.log(`  District: Wakefield MDC (${wakefield?.features.length ? 'OK' : '?'})`);

  if (constituencies) {
    const pcon = constituencies.features.find(f =>
      f.geometry && pointInGeometry(lng, lat, f.geometry as GeoJSON.Geometry)
    );
    const pconName = pcon?.properties?.PCON22NM ?? pcon?.properties?.PCON23NM ?? null;
    console.log(`  Constituency: ${pconName ?? 'Not within loaded constituencies'}`);

    if (pcon) {
      const { pp, areaKm2, perimKm } = constituencyCompactness(pcon);
      const rating = pp < 0.2 ? 'WARN highly fragmented' : pp < 0.4 ? '~ moderately fragmented' : 'OK reasonably compact';
      console.log(`  Polsby-Popper: ${pp.toFixed(4)}  (${rating})`);
      console.log(`  Area: ${areaKm2.toFixed(2)} km2  |  Perimeter: ${perimKm.toFixed(2)} km`);
    }
  }

  if (wards) {
    const ward = wards.features.find(f =>
      f.geometry && pointInGeometry(lng, lat, f.geometry as GeoJSON.Geometry)
    );
    const wardName = ward?.properties?.WD23NM ?? null;
    console.log(`  Ward: ${wardName ?? 'Not within loaded wards'}`);
  }

  // 4. Geological context
  const geology = loadGeoJson('data/geology/geological_provinces.geojson');
  if (geology) {
    console.log(`\n--- Geological Context (${geology.features.length} BGS features in area) ---`);
    const seen = new Set<string>();
    for (const f of geology.features) {
      const name = f.properties?.name ?? f.properties?.PROV ?? '(unnamed)';
      const lex  = f.properties?.lex ?? '';
      const rock = f.properties?.rockDescription ?? f.properties?.age ?? '';
      const key  = `${lex}|${name}`;
      if (!seen.has(key)) {
        seen.add(key);
        console.log(`  ${name}${rock ? ' -- ' + rock : ''}`);
        if (seen.size >= 5) break;
      }
    }
    if (geology.features.length <= 2) {
      console.log(`  Note: only placeholder data. Run: npm run ingest:geology`);
    }
  }

  console.log('');
}

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

function help() {
  console.log(`
place-time query tool

Usage:
  npx tsx src/cli/query.ts --lat <lat> --lng <lng> --year <year>
  npx tsx src/cli/query.ts --place <name> --year <year>

Options:
  --lat    Latitude (decimal degrees, e.g. 53.693)
  --lng    Longitude (decimal degrees, e.g. -1.310)
  --year   Year (CE positive, BCE negative; e.g. 1086, 2024, -100)
  --place  Well-known place shorthand: ${Object.keys(KNOWN_PLACES).join(', ')}
  --help   Show this help

Examples:
  npx tsx src/cli/query.ts --place pontefract --year 1086
  npx tsx src/cli/query.ts --lat 53.693 --lng -1.310 --year 2024
  `);
}

const args = process.argv.slice(2);
if (args.includes('--help') || args.length === 0) {
  help();
  process.exit(0);
}

function getArg(name: string): string | null {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : null;
}

const placeArg = getArg('--place');
const latArg   = getArg('--lat');
const lngArg   = getArg('--lng');
const yearArg  = getArg('--year');

let lat: number, lng: number;

if (placeArg) {
  const coords = KNOWN_PLACES[placeArg.toLowerCase()];
  if (!coords) {
    console.error(`Unknown place: ${placeArg}. Known places: ${Object.keys(KNOWN_PLACES).join(', ')}`);
    process.exit(1);
  }
  [lat, lng] = coords;
} else if (latArg && lngArg) {
  lat = parseFloat(latArg);
  lng = parseFloat(lngArg);
} else {
  console.error('Provide --place or --lat + --lng');
  help();
  process.exit(1);
}

const year = yearArg ? parseInt(yearArg) : 2024;

queryPoint(lat, lng, year);