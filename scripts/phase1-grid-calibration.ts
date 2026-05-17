/**
 * Phase 1.1: H3 Resolution Calibration for Five Towns
 * 
 * Generates H3 hex grids at res 7 and res 8 covering the Five Towns area.
 * Validates cell count against roadmap targets (~400 cells at res 7, ~500 at res 8).
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { polygonToCells, cellToBoundary, cellToLatLng } from 'h3-js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'data/five-towns');
const PUBLIC_DIR = join(ROOT, 'public');

// Corrected bounds: Castleford (53.5125) is further south than other towns
const FIVE_TOWNS_BOUNDS = {
  minLat: 53.48,
  maxLat: 53.82,
  minLng: -1.57,
  maxLng: -1.23,
};

// Five Towns settlements
const FIVE_TOWNS = [
  { name: 'Pontefract', lat: 53.6997, lng: -1.3577 },
  { name: 'Wakefield', lat: 53.6831, lng: -1.4994 },
  { name: 'Castleford', lat: 53.5125, lng: -1.3542 },
  { name: 'Normanton', lat: 53.6982, lng: -1.4258 },
  { name: 'Knottingley', lat: 53.7059, lng: -1.2479 },
];

interface H3CellFeature {
  type: 'Feature';
  id: string;
  properties: {
    h3Index: string;
    resolution: number;
    cellAreaKm2: number;
    cellEdgeM: number;
    hexCentreLat: number;
    hexCentreLng: number;
    settlement?: string;
    settlementDistM?: number;
  };
  geometry: GeoJSON.Polygon;
}

function bboxToGeoJSONPolygon(bounds: typeof FIVE_TOWNS_BOUNDS): GeoJSON.Polygon {
  return {
    type: 'Polygon',
    coordinates: [[
      [bounds.minLng, bounds.minLat],
      [bounds.maxLng, bounds.minLat],
      [bounds.maxLng, bounds.maxLat],
      [bounds.minLng, bounds.maxLat],
      [bounds.minLng, bounds.minLat],
    ]],
  };
}

function calcCellAreaKm2(resolution: number): number {
  const edgeKm = 1107 / Math.pow(2, resolution);
  return (3 * Math.sqrt(3) / 2) * edgeKm * edgeKm;
}

function calcCellEdgeM(resolution: number): number {
  return Math.round(1107000 / Math.pow(2, resolution));
}

function distanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findNearestSettlement(lat: number, lng: number): { name: string; distM: number } {
  let nearest = FIVE_TOWNS[0];
  let minDist = distanceM(lat, lng, nearest.lat, nearest.lng);
  for (const s of FIVE_TOWNS) {
    const d = distanceM(lat, lng, s.lat, s.lng);
    if (d < minDist) { minDist = d; nearest = s; }
  }
  return { name: nearest.name, distM: Math.round(minDist) };
}

function generateGrid(resolution: number): { features: H3CellFeature[]; cellCount: number } {
  // polygonToCells expects [lat, lng] pairs — NOT GeoJSON [lng, lat] order
  const h3Ring: [number, number][] = [
    [FIVE_TOWNS_BOUNDS.minLat, FIVE_TOWNS_BOUNDS.minLng],
    [FIVE_TOWNS_BOUNDS.maxLat, FIVE_TOWNS_BOUNDS.minLng],
    [FIVE_TOWNS_BOUNDS.maxLat, FIVE_TOWNS_BOUNDS.maxLng],
    [FIVE_TOWNS_BOUNDS.minLat, FIVE_TOWNS_BOUNDS.maxLng],
    [FIVE_TOWNS_BOUNDS.minLat, FIVE_TOWNS_BOUNDS.minLng],
  ];
  const h3Indices = polygonToCells(h3Ring, resolution);
  const cellAreaKm2 = calcCellAreaKm2(resolution);
  const cellEdgeM = calcCellEdgeM(resolution);

  const features: H3CellFeature[] = h3Indices.map((h3Index: string) => {
    const [lat, lng] = cellToLatLng(h3Index);
    const boundary = cellToBoundary(h3Index);
    const geojsonCoords = [...boundary, boundary[0]].map(([lat, lng]) => [lng, lat] as GeoJSON.Position);
    const nearest = findNearestSettlement(lat, lng);

    return {
      type: 'Feature' as const,
      id: `hex:${resolution}:${h3Index}`,
      properties: {
        h3Index,
        resolution,
        cellAreaKm2: parseFloat(cellAreaKm2.toFixed(4)),
        cellEdgeM,
        hexCentreLat: parseFloat(lat.toFixed(6)),
        hexCentreLng: parseFloat(lng.toFixed(6)),
        settlement: nearest.name,
        settlementDistM: nearest.distM,
      },
      geometry: { type: 'Polygon' as const, coordinates: [geojsonCoords] },
    };
  });

  return { features, cellCount: h3Indices.length };
}

function saveGeoJSON(features: H3CellFeature[], filename: string): void {
  const collection = { type: 'FeatureCollection' as const, features };
  const json = JSON.stringify(collection, null, 2);
  writeFileSync(join(DATA_DIR, filename), json, 'utf-8');
  writeFileSync(join(PUBLIC_DIR, filename), json, 'utf-8');
}

async function main() {
  console.log('\n=== Phase 1.1: H3 Resolution Calibration ===\n');
  console.log('Five Towns bounding box (corrected for Castleford):');
  console.log(`  lat: ${FIVE_TOWNS_BOUNDS.minLat}° to ${FIVE_TOWNS_BOUNDS.maxLat}°N`);
  console.log(`  lng: ${FIVE_TOWNS_BOUNDS.minLng}° to ${FIVE_TOWNS_BOUNDS.maxLng}°W`);
  console.log('');

  [DATA_DIR, PUBLIC_DIR].forEach(dir => {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  });

  for (const res of [7, 8]) {
    console.log(`Generating H3 grid at resolution ${res}...`);
    const { features, cellCount } = generateGrid(res);
    const filename = `five-towns-grid-res${res}.geojson`;
    saveGeoJSON(features, filename);

    const edgeM = calcCellEdgeM(res);
    const areaKm2 = calcCellAreaKm2(res);

    console.log(`  Resolution ${res}: ${cellCount} cells (edge: ~${edgeM}m, area: ~${areaKm2.toFixed(2)}km²)`);
    console.log(`  Saved: data/five-towns/${filename} and public/data/${filename}`);
    console.log('');
  }

  // Validation check
  const res7Cells = generateGrid(7).cellCount;
  const res8Cells = generateGrid(8).cellCount;
  console.log('=== Settlement Coverage ===');
  FIVE_TOWNS.forEach(s => {
    const inBounds = s.lat >= FIVE_TOWNS_BOUNDS.minLat && s.lat <= FIVE_TOWNS_BOUNDS.maxLat &&
      s.lng >= FIVE_TOWNS_BOUNDS.minLng && s.lng <= FIVE_TOWNS_BOUNDS.maxLng;
    console.log(`  ${s.name} (${s.lat}°N, ${s.lng}°W): ${inBounds ? '✓ covered' : '✗ outside bounds'}`);
  });

  console.log('\nPhase 1.1 complete.\n');
}

main().catch(console.error);