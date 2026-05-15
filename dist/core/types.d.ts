export interface GeoFeature {
    type: 'Feature';
    id?: string | number;
    geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
    properties: Record<string, unknown>;
}
export interface Place {
    id: string;
    names: Record<string, string>;
    centroid: [number, number];
    h3Index: string;
    geologicalContext: string[];
    boundaries: Boundary[];
}
export interface Boundary {
    id: string;
    layerId: string;
    feature: GeoFeature;
    h3Cells: string[];
    validFrom: number | null;
    validTo: number | null;
    priority: number;
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
    resolution: number;
    cellCount: number;
    boundary: [number, number, number, number];
}
export interface ReferenceSphere {
    name: 'outer' | 'inner' | 'surface';
    elevationMeters: number;
    description: string;
}
export declare const REFERENCE_SPHERES: ReferenceSphere[];
export interface QueryResult {
    h3Cell: string;
    point: [number, number];
    year: number;
    place: string | null;
    boundariesAtDate: Boundary[];
    geologicalAtPoint: GeoFeature[];
}
export interface TimeQuery {
    point: [number, number];
    year: number;
    h3Resolution?: number;
    layers?: string[];
}
//# sourceMappingURL=types.d.ts.map