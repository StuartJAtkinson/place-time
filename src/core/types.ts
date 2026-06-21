// Place-Time Core Types
// Hexagonal geological to political spatial index

export interface GeoFeature {
  type: 'Feature';
  id?: string | number;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  properties: Record<string, unknown>;
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

