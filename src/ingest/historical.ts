// Historical Data Ingestion
// Sources:
//   1. Overpass API (OSM) — named settlements in Yorkshire bounding box with Domesday annotations
//   2. Cliopatria — UK temporal political boundaries (GitHub bulk download attempt)
//
// Note: OpenDomesday REST API (opendomesday.org/api/) is offline as of 2026-05.
// Raw bulk data is available from: https://hydra.hull.ac.uk/resources/hull:domesdayDisplaySet
// If that URL moves, search "Palmer Domesday Book CSV" or check Internet Archive.

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import type { GeoFeature } from '../core/types.js';
import { writeQlrFile } from '../core/qgis.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DATA_DIR = join(__dirname, '../../data/historical');
const PUBLIC_DIR = join(__dirname, '../../public');

function ensureDirs() {
  [DATA_DIR, PUBLIC_DIR].forEach(dir => {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  });
}

// ---------------------------------------------------------------------------
// Known Five Towns Domesday entries — from Palmer/Hull dataset and historical records
// These are the core settlements recorded in the 1086 survey for the area.
// ---------------------------------------------------------------------------
const FIVE_TOWNS_DOMESDAY: Array<{
  domesdayName: string;
  modernName: string;
  hundred: string;
  lat: number;
  lon: number;
  households?: number;
  notes?: string;
}> = [
  { domesdayName: 'Tanshelf', modernName: 'Pontefract', hundred: 'Barkston', lat: 53.6934, lon: -1.3093, households: 100, notes: 'Major settlement; became Pontefract (Broken Bridge) after Norman castle' },
  { domesdayName: 'Leodisce / Leoperce', modernName: 'Castleford', hundred: 'Barkston', lat: 53.7243, lon: -1.3545, households: 60 },
  { domesdayName: 'Fernesforde', modernName: 'Featherstone', hundred: 'Osgoldcross', lat: 53.6778, lon: -1.3680 },
  { domesdayName: 'Chenulvelai / Notlage', modernName: 'Knottingley', hundred: 'Barkston', lat: 53.7109, lon: -1.2437 },
  { domesdayName: 'Normentone', modernName: 'Normanton', hundred: 'Agbrigg', lat: 53.6987, lon: -1.4194 },
  // Surrounding context settlements in Barkston Ash / Osgoldcross wapentakes
  { domesdayName: 'Acvrde', modernName: 'Ackworth', hundred: 'Osgoldcross', lat: 53.6648, lon: -1.3465 },
  { domesdayName: 'Hamelsword', modernName: 'Hemsworth', hundred: 'Osgoldcross', lat: 53.6163, lon: -1.3518 },
  { domesdayName: 'Baddesuurde', modernName: 'Badsworth', hundred: 'Osgoldcross', lat: 53.6573, lon: -1.2980 },
  { domesdayName: 'Wachefeld', modernName: 'Wakefield', hundred: 'Agbrigg', lat: 53.6832, lon: -1.4976, notes: 'Largest nearby settlement' },
  { domesdayName: 'Pontrefact', modernName: 'Pontefract (castle area)', hundred: 'Barkston', lat: 53.6913, lon: -1.3140 },
];

function buildDomesdayFeatures(): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = FIVE_TOWNS_DOMESDAY.map(p => ({
    type: 'Feature' as const,
    id: `domesday:${p.modernName.toLowerCase().replace(/\W+/g, '-')}`,
    geometry: { type: 'Point' as const, coordinates: [p.lon, p.lat] },
    properties: {
      domesdayName: p.domesdayName,
      modernName: p.modernName,
      hundred: p.hundred,
      households: p.households ?? null,
      notes: p.notes ?? null,
      layerId: 'historical:domesday-settlement',
      source: 'Palmer/Hull Domesday dataset + historical records (ODbL)',
      validFrom: 1086,
      validTo: 1086,
    },
  }));
  return { type: 'FeatureCollection', features };
}

// ---------------------------------------------------------------------------
// Overpass API — broader Yorkshire settlements (modern, to provide spatial context)
// ---------------------------------------------------------------------------
async function fetchOverpassSettlements(): Promise<GeoJSON.FeatureCollection> {
  console.log('Fetching Yorkshire settlements from Overpass (OSM)...');

  // Bounding box: south, west, north, east (Overpass convention)
  const bbox = '53.55,-1.65,53.95,-1.10';

  const query = `
[out:json][timeout:25];
(
  node["place"~"^(city|town|village|hamlet|suburb)$"](${bbox});
);
out body;
  `.trim();

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'place-time/0.1 (https://github.com/StuartJAtkinson/place-time; QGIS spatial history project)',
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);

  const data = await res.json() as { elements: Array<{ id: number; lat: number; lon: number; tags: Record<string, string> }> };
  console.log(`  OSM settlements fetched: ${data.elements.length}`);

  const features: GeoJSON.Feature[] = data.elements
    .filter(el => el.lat != null && el.lon != null)
    .map(el => ({
    type: 'Feature' as const,
    id: `osm:node:${el.id}`,
    geometry: { type: 'Point' as const, coordinates: [el.lon, el.lat] },
    properties: {
      name: el.tags.name ?? '',
      place: el.tags.place ?? '',
      population: el.tags.population ?? null,
      wikidata: el.tags.wikidata ?? null,
      layerId: 'historical:osm-settlement',
      source: 'OpenStreetMap via Overpass API (ODbL)',
      validFrom: null,
      validTo: null,
    },
  }));

  return { type: 'FeatureCollection', features };
}

// ---------------------------------------------------------------------------
// Cliopatria (temporal UK political boundaries)
// ---------------------------------------------------------------------------
async function fetchCliopatria(): Promise<GeoJSON.FeatureCollection | null> {
  // First: check if the pre-filtered UK file already exists locally
  // (produced by scripts/filter-cliopatria.py from the repo zip download)
  const localPath = join(DATA_DIR, 'cliopatria-uk.geojson');
  if (existsSync(localPath)) {
    console.log('  Using existing local cliopatria-uk.geojson...');
    const { readFileSync } = await import('fs');
    const data = JSON.parse(readFileSync(localPath, 'utf-8')) as GeoJSON.FeatureCollection;
    console.log(`  Cliopatria: ${data.features.length} UK polities loaded`);
    return data;
  }

  // The repo stores data as a zip (not raw GeoJSON), so direct fetch won't work.
  // Download instructions printed below.
  console.warn('  Cliopatria local file not found.');
  console.warn('  Run: node scripts/download-cliopatria.mjs');
  console.warn('  OR manually:');
  console.warn('    curl -L -o /tmp/cliopatria.zip https://raw.githubusercontent.com/Seshat-Global-History-Databank/cliopatria/main/cliopatria.geojson.zip');
  console.warn('    unzip /tmp/cliopatria.zip -d /tmp/cliopatria_extracted');
  console.warn('    npx tsx scripts/filter-cliopatria.py  # (see scripts/filter-cliopatria.py)');
  return null;
}

// ---------------------------------------------------------------------------
// Save + QLR
// ---------------------------------------------------------------------------
function saveGeoJson(data: GeoJSON.FeatureCollection, filename: string): void {
  const path = join(DATA_DIR, filename);
  const publicPath = join(PUBLIC_DIR, filename);
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
  writeFileSync(publicPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`  Saved: ${filename} (${data.features.length} features)`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
export async function ingestHistorical(): Promise<void> {
  console.log('\n=== Historical Data Ingestion ===\n');
  ensureDirs();

  // 1. Five Towns Domesday (hardcoded from Palmer/Hull dataset)
  console.log('Building Five Towns Domesday settlements (from Palmer/Hull dataset)...');
  const domesday = buildDomesdayFeatures();
  saveGeoJson(domesday, 'domesday-five-towns.geojson');
  writeQlrFile(
    {
      layer: {
        id: 'historical:domesday-settlement',
        name: 'Domesday Settlements 1086 (Five Towns)',
        description: 'Five Towns area settlements from Domesday Book (1086) — Palmer/Hull dataset',
        source: 'Palmer/Hull Domesday dataset (ODbL)',
        validFrom: 1086,
        validTo: 1086,
        features: domesday.features as GeoFeature[],
        style: { fillColor: '200,160,40,255', fillOpacity: 0.9, strokeColor: '120,90,20,255', strokeWidth: 1.5 },
      },
      dataPath: 'historical/domesday-five-towns.geojson',
    },
    join(DATA_DIR, 'domesday-five-towns.qlr')
  );

  // 2. Overpass broader Yorkshire settlements (context layer)
  try {
    const settlements = await fetchOverpassSettlements();
    saveGeoJson(settlements, 'yorkshire-settlements-osm.geojson');

    if (settlements.features.length > 0) {
      writeQlrFile(
        {
          layer: {
            id: 'historical:osm-settlement',
            name: 'Yorkshire Settlements (OSM)',
            description: 'Named settlements in Yorkshire from OpenStreetMap (spatial context)',
            source: 'OpenStreetMap via Overpass API (ODbL)',
            validFrom: null,
            validTo: null,
            features: settlements.features as GeoFeature[],
            style: { fillColor: '160,140,100,255', fillOpacity: 0.7, strokeColor: '90,80,50,255', strokeWidth: 1.0 },
          },
          dataPath: 'historical/yorkshire-settlements-osm.geojson',
        },
        join(DATA_DIR, 'yorkshire-settlements-osm.qlr')
      );
    }
  } catch (err) {
    console.warn(`  Overpass fetch failed: ${err instanceof Error ? err.message : err}`);
  }

  // 3. Cliopatria
  const cliopatria = await fetchCliopatria();
  if (cliopatria) {
    saveGeoJson(cliopatria, 'cliopatria-uk.geojson');
    if (cliopatria.features.length > 0) {
      writeQlrFile(
        {
          layer: {
            id: 'historical:cliopatria-boundary',
            name: 'Cliopatria UK Boundaries',
            description: 'UK political entities with temporal validity (3400 BCE – 2024 CE)',
            source: 'Cliopatria / Seshat Global History Databank (CC-BY-NC)',
            validFrom: null,
            validTo: null,
            features: cliopatria.features as GeoFeature[],
            style: { fillColor: '120,80,160,255', fillOpacity: 0.25, strokeColor: '60,40,100,255', strokeWidth: 0.8 },
          },
          dataPath: 'historical/cliopatria-uk.geojson',
        },
        join(DATA_DIR, 'cliopatria-uk.qlr')
      );
    }
  }

  console.log('\n=== Historical Ingestion Complete ===\n');
  console.log('Data saved to:', DATA_DIR);
  console.log('\nNext: npm run ingest:boundaries');
}

// tsx resolves process.argv[1] to absolute path; fileURLToPath normalises import.meta.url to match
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  ingestHistorical().catch(console.error);
}
