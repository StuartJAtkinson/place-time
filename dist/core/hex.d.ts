import type { GeoFeature, Boundary, Layer, QueryResult, TimeQuery } from './types.js';
declare const DEFAULT_RESOLUTION = 7;
declare const DETAIL_RESOLUTION = 8;
/**
 * Convert lat/lng to H3 cell ID at default resolution.
 */
export declare function pointToH3(lat: number, lng: number, resolution?: number): string;
/**
 * Convert H3 cell ID to [lat, lng] centroid.
 */
export declare function h3ToCentroid(cellId: string): [number, number];
/**
 * Get all H3 cells that a polygon covers (using k-ring expansion for edge cases).
 */
export declare function polygonToH3Cells(geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon, resolution?: number): string[];
/**
 * Get neighboring H3 cells (6 direct neighbors at 60° intervals).
 */
export declare function h3Neighbors(cellId: string): string[];
/**
 * Get H3 cell boundary as GeoJSON polygon.
 */
export declare function h3CellToPolygon(cellId: string): GeoJSON.Polygon;
/**
 * Assign all features in a layer to H3 cells.
 * Returns a map of cellId -> features in that cell.
 */
export declare function indexLayerByH3(layer: Layer, resolution?: number): Map<string, GeoFeature[]>;
/**
 * Query boundaries active at a given year within a given H3 cell.
 */
export declare function queryCellAtYear(cellId: string, year: number, boundaries: Boundary[], options?: {
    minPriority?: number;
}): Boundary[];
/**
 * Full time/space query: what was at this point in this year?
 */
export declare function executeTimeQuery(query: TimeQuery, layers: Layer[], boundaries: Boundary[]): QueryResult;
/**
 * Build a hex grid covering a bounding box at a given resolution.
 */
export declare function buildHexGrid(minLon: number, minLat: number, maxLon: number, maxLat: number, resolution?: number): string[];
export { DEFAULT_RESOLUTION, DETAIL_RESOLUTION };
//# sourceMappingURL=hex.d.ts.map