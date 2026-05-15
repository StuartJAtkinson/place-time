// Geological Data Ingestion
// Fetches and processes tectonic plate and geological province data

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import GeoJSON from 'geojson';
import type { GeoFeature } from '../core/types.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DATA_DIR = join(__dirname, '../../data/geology');
const PUBLIC_DIR = join(__dirname, '../../public');

// Ensure directories exist
[DATA_DIR, PUBLIC_DIR].forEach(dir => {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
});

interface TectonicPlateFeature {
  type: 'Feature';
  properties: {
    PlateName: string;
    PlateCode?: string;
  };
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
}

/**
 * Fetch tectonic plate boundaries from fraxen/tectonicplates GitHub raw data.
 * The repository contains PB2002 plates as GeoJSON.
 */
async function fetchTectonicPlates(): Promise<GeoJSON.FeatureCollection> {
  console.log('Fetching tectonic plates from fraxen/tectonicplates...');

  // The repository has plates.geojson at the root
  const url = 'https://raw.githubusercontent.com/fraxen/tectonicplates/main/ plates.geojson';

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as GeoJSON.FeatureCollection;

    // Validate and normalize
    const features = data.features.map((f, i) => ({
      ...f,
      id: `tectonic:${f.properties?.PlateName?.replace(/\s+/g, '_') || `plate_${i}`}`,
      properties: {
        ...f.properties,
        layerId: 'geology:tectonic-plate',
        source: 'fraxen/tectonicplates',
        validFrom: null, // geological time, no specific year
        validTo: null,
      }
    }));

    console.log(`  Loaded ${features.length} tectonic plates`);
    return { type: 'FeatureCollection', features };
  } catch (err) {
    console.error('Failed to fetch tectonic plates:', err);
    throw err;
  }
}

/**
 * Fetch geological provinces from Zenodo (global tectonic data).
 * This is a larger dataset with more detailed province boundaries.
 */
async function fetchGeologicalProvinces(): Promise<GeoJSON.FeatureCollection> {
  console.log('Fetching geological provinces from Zenodo...');

  // The Zenodo record contains shapefiles - we need to find the direct GeoJSON URL
  // For now, we'll use the global_tectonics repository as a fallback
  const url = 'https://raw.githubusercontent.com/dhasterok/global_tectonics/main/data/plates.geojson';

  try {
    const response = await fetch(url);
    if (!response.ok) {
      // Fallback: create placeholder with bounds
      console.log('  Detailed provinces not available, using fallback');
      return createFallbackProvinces();
    }
    const data = await response.json() as GeoJSON.FeatureCollection;
    console.log(`  Loaded ${data.features.length} geological features`);
    return data;
  } catch (err) {
    console.log('  Falling back to simplified provinces');
    return createFallbackProvinces();
  }
}

function createFallbackProvinces(): GeoJSON.FeatureCollection {
  // Simplified UK-relevant geological provinces for initial development
  // In production, replace with full Zenodo dataset
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        id: 'geology:yorkshire_coal_measures',
        properties: {
          name: 'Yorkshire Coal Measures',
          type: 'Coal Measures',
          layerId: 'geology:province',
          source: 'BGS (British Geological Survey)',
          age: 'Carboniferous',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-1.5, 53.8], [-1.3, 53.85], [-1.2, 53.75], [-1.4, 53.7], [-1.5, 53.8]
          ]]
        }
      },
      {
        type: 'Feature',
        id: 'geology:permian_formation',
        properties: {
          name: 'Permian Magnesian Limestone',
          type: 'Sedimentary',
          layerId: 'geology:province',
          source: 'BGS',
          age: 'Permian',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-1.3, 53.6], [-1.1, 53.65], [-1.0, 53.55], [-1.2, 53.5], [-1.3, 53.6]
          ]]
        }
      }
    ]
  };
}

/**
 * Save GeoJSON to file with proper formatting.
 */
function saveGeoJson(data: GeoJSON.FeatureCollection, filename: string): void {
  const path = join(DATA_DIR, filename);
  const publicPath = join(PUBLIC_DIR, filename);
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
  writeFileSync(publicPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`  Saved: ${filename} (${data.features.length} features)`);
}

/**
 * Main ingestion pipeline for geological data.
 */
export async function ingestGeology(): Promise<void> {
  console.log('\n=== Geological Data Ingestion ===\n');

  // Create output directories
  [DATA_DIR, PUBLIC_DIR].forEach(dir => {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  });

  // Fetch and save tectonic plates
  const plates = await fetchTectonicPlates();
  saveGeoJson(plates, 'tectonic_plates.geojson');

  // Fetch and save geological provinces
  const provinces = await fetchGeologicalProvinces();
  saveGeoJson(provinces, 'geological_provinces.geojson');

  // Write QLR files for QGIS
  const { writeQlrFile } = await import('../core/qgis.js');

  writeQlrFile(
    {
      layer: {
        id: 'geology:tectonic-plate',
        name: 'Tectonic Plates',
        description: 'World tectonic plate boundaries',
        source: 'fraxen/tectonicplates (GitHub)',
        validFrom: null,
        validTo: null,
        features: plates.features as GeoFeature[],
        style: { fillColor: '180,100,80,255', fillOpacity: 0.3, strokeColor: '100,50,40,255', strokeWidth: 1.0 }
      },
      dataPath: 'geology/tectonic_plates.geojson'
    },
    join(DATA_DIR, 'tectonic_plates.qlr')
  );

  writeQlrFile(
    {
      layer: {
        id: 'geology:province',
        name: 'Geological Provinces',
        description: 'Global geological provinces',
        source: 'Zenodo GPlates 2.5 GeoData',
        validFrom: null,
        validTo: null,
        features: provinces.features as GeoFeature[],
        style: { fillColor: '160,120,80,255', fillOpacity: 0.25, strokeColor: '80,60,40,255', strokeWidth: 0.8 }
      },
      dataPath: 'geology/geological_provinces.geojson'
    },
    join(DATA_DIR, 'geological_provinces.qlr')
  );

  console.log('\n=== Geological Ingestion Complete ===\n');
  console.log('Data saved to:');
  console.log(`  ${DATA_DIR}`);
  console.log('\nNext steps:');
  console.log('  npm run ingest:historical  - Load Doomsday Book and Cliopatria data');
  console.log('  npm run ingest:boundaries  - Load modern administrative boundaries');
}

// Run if executed directly
if (import.meta.url === process.argv[1]) {
  ingestGeology().catch(console.error);
}

