/**
 * Phase 1.1: H3 Resolution Calibration for Five Towns (ESM)
 */
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { polygonToCells, cellToBoundary, cellToLatLng } from 'h3-js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DATA_DIR = join(__dirname, '../../data/five-towns');
const PUBLIC_DIR = join(__dirname, '../../public');

const FIVE_TOWNS_BOUNDS = { minLat: 53.48, maxLat: 53.82, minLng: -1.57, maxLng: -1.23 };

const FIVE_TOWNS = [
  { name: 'Pontefract', lat: 53.6997, lng: -1.3577 },
  { name: 'Wakefield', lat: 53.6831, lng: -1.4994 },
  { name: 'Castleford', lat: 53.5125, lng: -1.3542 },
  { name: 'Normanton', lat: 53.6982, lng: -1.4258 },
  { name: 'Knottingley', lat: 53.7059, lng: -1.2479 },
];

function bboxToGeoJSONPolygon(bounds) {
  return { type: 'Polygon', coordinates: [[
    [bounds.minLng, bounds.minLat], [bounds.maxLng, bounds.minLat],
    [bounds.maxLng, bounds.maxLat], [bounds.minLng, bounds.maxLat],
    [bounds.minLng, bounds.minLat],
  ]]};
}

function calcCellAreaKm2(resolution) {
  const edgeKm = 1107 / Math.pow(2, resolution);
  return (3 * Math.sqrt(3) / 2) * edgeKm * edgeKm;
}

function calcCellEdgeM(resolution) {
  return Math.round(1107000 / Math.pow(2, resolution));
}

function distanceM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function findNearestSettlement(lat, lng) {
  let nearest = FIVE_TOWNS[0];
  let minDist = distanceM(lat, lng, nearest.lat, nearest.lng);
  for (const s of FIVE_TOWNS) {
    const d = distanceM(lat, lng, s.lat, s.lng);
    if (d < minDist) { minDist = d; nearest = s; }
  }
  return { name: nearest.name, distM: Math.round(minDist) };
}

function generateGrid(resolution) {
  const bboxCoords = bboxToGeoJSONPolygon(FIVE_TOWNS_BOUNDS).coordinates[0];
  const h3Indices = polygonToCells(bboxCoords, resolution);
  const cellAreaKm2 = calcCellAreaKm2(resolution);
  const cellEdgeM = calcCellEdgeM(resolution);

  const features = h3Indices.map((h3Index) => {
    const [lat, lng] = cellToLatLng(h3Index);
    const boundary = cellToBoundary(h3Index);
    const geojsonCoords = [...boundary, boundary[0]].map(([lat, lng]) => [lng, lat]);
    const nearest = findNearestSettlement(lat, lng);
    return {
      type: 'Feature', id: `hex:${resolution}:${h3Index}`,
      properties: { h3Index, resolution, cellAreaKm2: parseFloat(cellAreaKm2.toFixed(4)), cellEdgeM,
        hexCentreLat: parseFloat(lat.toFixed(6)), hexCentreLng: parseFloat(lng.toFixed(6)),
        settlement: nearest.name, settlementDistM: nearest.distM },
      geometry: { type: 'Polygon', coordinates: [geojsonCoords] },
    };
  });
  return { features, cellCount: h3Indices.length };
}

function saveGeoJSON(features, filename) {
  const json = JSON.stringify({ type: 'FeatureCollection', features }, null, 2);
  [DATA_DIR, PUBLIC_DIR].forEach(dir => { if (!existsSync(dir)) mkdirSync(dir, { recursive: true }); });
  writeFileSync(join(DATA_DIR, filename), json, 'utf-8');
  writeFileSync(join(PUBLIC_DIR, filename), json, 'utf-8');
}

console.log('\n=== Phase 1.1: H3 Resolution Calibration ===\n');
console.log(`Bounds: lat ${FIVE_TOWNS_BOUNDS.minLat}° to ${FIVE_TOWNS_BOUNDS.maxLat}°N, lng ${FIVE_TOWNS_BOUNDS.minLng}° to ${FIVE_TOWNS_BOUNDS.maxLng}°W\n`);

for (const res of [7, 8]) {
  const { features, cellCount } = generateGrid(res);
  const edgeM = calcCellEdgeM(res);
  const areaKm2 = calcCellAreaKm2(res);
  console.log(`Resolution ${res}: ${cellCount} cells (edge ~${edgeM}m, area ~${areaKm2.toFixed(2)}km²)`);
  saveGeoJSON(features, `five-towns-grid-res${res}.geojson`);
  console.log(`  -> data/five-towns/five-towns-grid-res${res}.geojson`);
}

console.log('\n=== Settlement Coverage ===');
FIVE_TOWNS.forEach(s => {
  const inBounds = s.lat >= FIVE_TOWNS_BOUNDS.minLat && s.lat <= FIVE_TOWNS_BOUNDS.maxLat &&
    s.lng >= FIVE_TOWNS_BOUNDS.minLng && s.lng <= FIVE_TOWNS_BOUNDS.maxLng;
  console.log(`  ${s.name} (${s.lat}°N, ${s.lng}°W): ${inBounds ? '✓ covered' : '✗ outside bounds'}`);
});

console.log('\nPhase 1.1 complete.\n');