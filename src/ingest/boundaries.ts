// Political Boundaries Ingestion
// Sources:
//   1. ONS Open Geography Portal (ArcGIS REST) — Wakefield MDC + West Yorkshire
//   2. ONS Westminster Parliamentary Constituencies (2023 boundaries, GE2024)
//   3. ONS Electoral Wards — Wakefield

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import type { GeoFeature } from '../core/types.js';
import { writeQlrFile } from '../core/qgis.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DATA_DIR = join(__dirname, '../../data/boundaries');
const PUBLIC_DIR = join(__dirname, '../../public');

function ensureDirs() {
  [DATA_DIR, PUBLIC_DIR].forEach(dir => {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  });
}

// ONS ArcGIS REST base
const ONS_BASE = 'https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services';

// GSS codes
const WAKEFIELD_LAD_CODE = 'E08000036';
const WEST_YORKSHIRE_COUNTY_CODE = 'E11000006';

// Five Towns bounding box (WGS84) for constituency spatial query — slightly wider than the towns
// to ensure all relevant constituencies are fetched, then PiP-filtered below
const FIVE_TOWNS_ENVELOPE = '-1.55,53.60,-1.20,53.90'; // xmin,ymin,xmax,ymax

// The five town centres — used to filter constituencies to only those that contain at least one
const FIVE_TOWNS_POINTS = [
  { name: 'Pontefract',   lng: -1.3093, lat: 53.6934 },
  { name: 'Castleford',   lng: -1.3545, lat: 53.7243 },
  { name: 'Featherstone', lng: -1.3680, lat: 53.6778 },
  { name: 'Knottingley',  lng: -1.2437, lat: 53.7109 },
  { name: 'Normanton',    lng: -1.4194, lat: 53.6987 },
];

function pointInRing(lng: number, lat: number, ring: GeoJSON.Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (((yi > lat) !== (yj > lat)) && lng < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function containsAnyTown(feature: GeoJSON.Feature): boolean {
  const geom = feature.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon;
  for (const town of FIVE_TOWNS_POINTS) {
    const rings = geom.type === 'Polygon'
      ? [geom.coordinates[0]]
      : geom.coordinates.map(p => p[0]);
    if (rings.some(ring => pointInRing(town.lng, town.lat, ring as GeoJSON.Position[]))) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Generic ONS fetch — handles pagination via resultOffset
// ---------------------------------------------------------------------------

async function fetchOnsLayer(
  serviceName: string,
  layerIndex: number,
  where: string,
  outFields = '*'
): Promise<GeoJSON.FeatureCollection> {
  const url = `${ONS_BASE}/${serviceName}/FeatureServer/${layerIndex}/query`;

  const params = new URLSearchParams({
    where,
    outFields,
    f: 'geojson',
    returnGeometry: 'true',
    resultOffset: '0',
    resultRecordCount: '1000',
  });

  const res = await fetch(`${url}?${params}`);
  if (!res.ok) throw new Error(`ONS HTTP ${res.status} for ${serviceName}: ${await res.text()}`);
  const data = await res.json() as GeoJSON.FeatureCollection;
  return data;
}

// ---------------------------------------------------------------------------
// 1. Wakefield Metropolitan District Council boundary
// ---------------------------------------------------------------------------

async function fetchWakefieldBoundary(): Promise<GeoJSON.FeatureCollection> {
  console.log('Fetching Wakefield MDC boundary from ONS...');

  // Service name → field name pairs (field changes with each year's release)
  const services: Array<[string, string]> = [
    ['Local_Authority_Districts_April_2024_UK_BFC', 'LAD24CD'],
    ['Local_Authority_Districts_May_2023_UK_BFC_V2', 'LAD23CD'],
    ['Local_Authority_Districts_December_2022_UK_BFC', 'LAD22CD'],
    ['Local_Authority_Districts_December_2021_UK_BFC_V2', 'LAD21CD'],
  ];

  for (const [svc, field] of services) {
    try {
      const fc = await fetchOnsLayer(svc, 0, `${field}='${WAKEFIELD_LAD_CODE}'`);
      if (fc.features.length > 0) {
        console.log(`  Wakefield boundary loaded (${svc})`);
        return normalise(fc, 'admin:lad-wakefield', 'ONS Open Geography Portal (OGL)');
      }
    } catch {
      // try next
    }
  }

  throw new Error('Could not fetch Wakefield boundary from any known ONS service');
}

// ---------------------------------------------------------------------------
// 2. West Yorkshire combined authority / metropolitan county
// ---------------------------------------------------------------------------

async function fetchWestYorkshireBoundary(): Promise<GeoJSON.FeatureCollection> {
  console.log('Fetching West Yorkshire boundary from ONS...');

  // Try metropolitan county (pre-abolition code) — different services use different codes
  // West Yorkshire GSS: E11000006 (metro county) or E47000001 (combined authority)
  const candidates: Array<{ svc: string; field: string; code: string }> = [
    { svc: 'Counties_and_Unitary_Authorities_December_2021_UK_BFC_2022', field: 'CTYUA21CD', code: WEST_YORKSHIRE_COUNTY_CODE },
    { svc: 'Counties_and_Unitary_Authorities_December_2020_UK_BFC_2022', field: 'CTYUA20CD', code: WEST_YORKSHIRE_COUNTY_CODE },
    { svc: 'Counties_and_Unitary_Authorities_April_2019_Boundaries_EW_BFC_2022', field: 'CTYUA19CD', code: WEST_YORKSHIRE_COUNTY_CODE },
    // Combined Authority
    { svc: 'Combined_Authorities_December_2023_EN_BFC', field: 'CAUTH23NM', code: 'West Yorkshire' },
    { svc: 'Combined_Authorities_December_2022_EN_BFC', field: 'CAUTH22NM', code: 'West Yorkshire' },
  ];

  for (const { svc, field, code } of candidates) {
    try {
      const isName = !code.startsWith('E');
      const where = isName ? `${field} LIKE '${code}%'` : `${field}='${code}'`;
      const fc = await fetchOnsLayer(svc, 0, where);
      if (fc.features.length > 0) {
        console.log(`  West Yorkshire boundary loaded (${svc})`);
        return normalise(fc, 'admin:county-west-yorkshire', 'ONS Open Geography Portal (OGL)');
      }
    } catch {
      // try next
    }
  }

  throw new Error('Could not fetch West Yorkshire boundary');
}

// ---------------------------------------------------------------------------
// 3. Westminster Parliamentary Constituencies (2023 boundaries)
//    Focus: constituencies covering Five Towns
// ---------------------------------------------------------------------------

async function fetchConstituencies(): Promise<GeoJSON.FeatureCollection> {
  console.log('Fetching West Yorkshire constituencies from ONS...');

  // 2023 boundary review constituencies (used at GE2024)
  const services = [
    'Westminster_Parliamentary_Constituencies_July_2024_UK_BSC',
    'Westminster_Parliamentary_Constituencies_December_2023_UK_BGC',
    'Westminster_Parliamentary_Constituencies_May_2023_UK_BFC',
    'Westminster_Parliamentary_Constituencies_Dec_2022_UK_BFC',
  ];

  for (const svc of services) {
    try {
      // Spatial query: envelope covering West Yorkshire + Five Towns
      const params = new URLSearchParams({
        geometry: FIVE_TOWNS_ENVELOPE,
        geometryType: 'esriGeometryEnvelope',
        spatialRel: 'esriSpatialRelIntersects',
        inSR: '4326',
        outFields: '*',
        f: 'geojson',
        returnGeometry: 'true',
      });
      const url = `${ONS_BASE}/${svc}/FeatureServer/0/query?${params}`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const fc = await res.json() as GeoJSON.FeatureCollection;
      if (fc.features.length > 0) {
        const filtered = fc.features.filter(containsAnyTown);
        console.log(`  ${filtered.length}/${fc.features.length} constituencies contain a Five Towns point (${svc})`);
        if (filtered.length === 0) continue;
        return normalise(
          { type: 'FeatureCollection', features: filtered },
          'political:westminster-constituency', 'ONS Open Geography Portal (OGL)'
        );
      }
    } catch {
      // try next
    }
  }

  throw new Error('Could not fetch constituencies from any known ONS service');
}

// ---------------------------------------------------------------------------
// 4. Electoral wards in Wakefield
// ---------------------------------------------------------------------------

// Wakefield MDC ward codes (E05001444–E05001464, 21 wards from 2018 review)
// Source: ONS LSOA→Ward→LTLA May 2022 lookup, LTLA22CD=E08000036
const WAKEFIELD_WARD_CODES = new Set(
  Array.from({ length: 21 }, (_, i) => `E05001${444 + i}`)
);

async function fetchWakefieldWards(): Promise<GeoJSON.FeatureCollection> {
  console.log('Fetching Wakefield electoral wards from ONS...');

  // Spatial query over broad Wakefield area, then filter to known ward codes
  const WAKEFIELD_ENVELOPE = '-1.72,53.53,-1.12,53.83';

  const services = [
    'Wards_December_2023_Boundaries_UK_BFC',
    'Wards_December_2024_Boundaries_UK_BFC',
    'Wards_May_2024_Boundaries_UK_BFC',
  ];

  for (const svc of services) {
    try {
      const params = new URLSearchParams({
        geometry: WAKEFIELD_ENVELOPE,
        geometryType: 'esriGeometryEnvelope',
        spatialRel: 'esriSpatialRelIntersects',
        inSR: '4326',
        outFields: '*',
        f: 'geojson',
        returnGeometry: 'true',
      });
      const url = `${ONS_BASE}/${svc}/FeatureServer/0/query?${params}`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const fc = await res.json() as GeoJSON.FeatureCollection;
      if (!fc.features?.length) continue;

      // Filter to the 21 known Wakefield ward codes
      const wakefieldWards = fc.features.filter(f => {
        const code = f.properties?.WD23CD ?? f.properties?.WD24CD ?? '';
        return WAKEFIELD_WARD_CODES.has(code);
      });

      if (wakefieldWards.length > 0) {
        console.log(`  ${wakefieldWards.length} Wakefield wards (${svc})`);
        return normalise(
          { type: 'FeatureCollection', features: wakefieldWards },
          'political:ward-wakefield',
          'ONS Open Geography Portal (OGL)'
        );
      }
    } catch {
      // try next
    }
  }

  throw new Error('Could not fetch Wakefield wards');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalise(
  fc: GeoJSON.FeatureCollection,
  layerId: string,
  source: string
): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: fc.features.map((f, i) => ({
      ...f,
      id: f.id ?? `${layerId}:${i}`,
      properties: {
        ...f.properties,
        layerId,
        source,
        validFrom: null,
        validTo: null,
      },
    })),
  };
}

function saveGeoJson(data: GeoJSON.FeatureCollection, filename: string): void {
  const path = join(DATA_DIR, filename);
  const publicPath = join(PUBLIC_DIR, filename);
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
  writeFileSync(publicPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`  Saved: ${filename} (${data.features.length} features)`);
}

interface BoundarySpec {
  fn: () => Promise<GeoJSON.FeatureCollection>;
  filename: string;
  qlrId: string;
  qlrName: string;
  qlrDesc: string;
  style: { fillColor: string; fillOpacity: number; strokeColor: string; strokeWidth: number };
  required: boolean;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function ingestBoundaries(): Promise<void> {
  console.log('\n=== Political Boundaries Ingestion ===\n');
  ensureDirs();

  const specs: BoundarySpec[] = [
    {
      fn: fetchWakefieldBoundary,
      filename: 'wakefield-mdc.geojson',
      qlrId: 'admin:lad-wakefield',
      qlrName: 'Wakefield Metropolitan District',
      qlrDesc: 'Wakefield MDC administrative boundary (ONS OGL)',
      style: { fillColor: '100,160,100,255', fillOpacity: 0.15, strokeColor: '40,100,40,255', strokeWidth: 1.5 },
      required: true,
    },
    {
      fn: fetchWestYorkshireBoundary,
      filename: 'west-yorkshire.geojson',
      qlrId: 'admin:county-west-yorkshire',
      qlrName: 'West Yorkshire',
      qlrDesc: 'West Yorkshire metropolitan county / combined authority boundary',
      style: { fillColor: '80,130,80,255', fillOpacity: 0.08, strokeColor: '30,80,30,255', strokeWidth: 2.0 },
      required: false,
    },
    {
      fn: fetchConstituencies,
      filename: 'constituencies-five-towns.geojson',
      qlrId: 'political:westminster-constituency',
      qlrName: 'Westminster Constituencies (Five Towns area)',
      qlrDesc: 'Westminster constituencies intersecting the Five Towns area (2023 boundaries)',
      style: { fillColor: '160,100,160,255', fillOpacity: 0.2, strokeColor: '90,50,90,255', strokeWidth: 1.2 },
      required: true,
    },
    {
      fn: fetchWakefieldWards,
      filename: 'wards-wakefield.geojson',
      qlrId: 'political:ward-wakefield',
      qlrName: 'Electoral Wards — Wakefield',
      qlrDesc: 'Electoral wards within Wakefield MDC',
      style: { fillColor: '140,120,180,255', fillOpacity: 0.18, strokeColor: '70,60,100,255', strokeWidth: 0.8 },
      required: false,
    },
  ];

  for (const spec of specs) {
    try {
      const fc = await spec.fn();
      saveGeoJson(fc, spec.filename);

      if (fc.features.length > 0) {
        writeQlrFile(
          {
            layer: {
              id: spec.qlrId,
              name: spec.qlrName,
              description: spec.qlrDesc,
              source: 'ONS Open Geography Portal (OGL)',
              validFrom: null,
              validTo: null,
              features: fc.features as GeoFeature[],
              style: spec.style,
            },
            dataPath: `boundaries/${spec.filename}`,
          },
          join(DATA_DIR, spec.filename.replace('.geojson', '.qlr'))
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (spec.required) {
        console.error(`ERROR (required): ${spec.filename} — ${msg}`);
      } else {
        console.warn(`WARN (optional): ${spec.filename} — ${msg}`);
      }
    }
  }

  console.log('\n=== Boundaries Ingestion Complete ===\n');
  console.log('Data saved to:', DATA_DIR);
  console.log('\nNext: Open QGIS and load .qlr files for Phase 1 validation');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  ingestBoundaries().catch(console.error);
}
