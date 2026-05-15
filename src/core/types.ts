// Place-Time Core Types
// Hexagonal geological to political spatial index

export interface GeoFeature {
  type: 'Feature';
  id?: string | number;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  properties: Record<string, unknown>;
}

export interface Place {
  id: string;
  names: Record<string, string>; // e.g., { modern: 'Pontefract', doomsday: 'Tanshelf', medieval: 'Pomfret' }
  centroid: [number, number]; // [lon, lat]
  h3Index: string; // H3 cell ID at primary resolution
  geologicalContext: string[]; // plate IDs, province IDs
  boundaries: Boundary[];
}

export interface Boundary {
  id: string;
  layerId: string; // e.g., 'geology:tectonic-plate', 'admin:county', 'political:constituency'
  feature: GeoFeature;
  h3Cells: string[]; // H3 cell IDs covered by this boundary
  validFrom: number | null; // year, null = ancient/estimated
  validTo: number | null; // year, null = present
  priority: number; // higher = more authoritative when boundaries conflict
  metadata: Record<string, unknown>;
}

export interface Layer {
  id: string;
  name: string;
  description: string;
  source: string;
  validFrom: number | null;
  validTo: number | null;
  features: GeoFeature[];
  style?: LayerStyle;
}

export interface LayerStyle {
  fillColor?: string;
  fillOpacity?: number;
  strokeColor?: string;
  strokeWidth?: number;
  labelField?: string;
}

export interface HexGrid {
  resolution: number; // H3 resolution (0-15)
  cellCount: number;
  boundary: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
}

export interface ReferenceSphere {
  name: 'outer' | 'inner' | 'surface';
  elevationMeters: number; // positive = above sea level, negative = below
  description: string;
}

// Reference sphere constants
export const REFERENCE_SPHERES: ReferenceSphere[] = [
  { name: 'outer', elevationMeters: 9000, description: '1km above highest peaks (Everest + 1km) — ceiling of all terrestrial history' },
  { name: 'surface', elevationMeters: 0, description: 'Modern sea level — primary query surface' },
  { name: 'inner', elevationMeters: -11000, description: '1km below Mariana Trench — floor of all marine history' },
];

export interface QueryResult {
  h3Cell: string;
  point: [number, number];
  year: number;
  place: string | null;
  boundariesAtDate: Boundary[];
  geologicalAtPoint: GeoFeature[];
}

export interface TimeQuery {
  point: [number, number]; // [lon, lat]
  year: number;
  h3Resolution?: number; // defaults to primary resolution
  layers?: string[]; // filter to specific layer IDs
}