// HexGrid: H3-based hexagonal spatial indexer for Place-Time
// Assigns features to H3 cells and provides point/polygon query operations

import { cellToBoundary, cellToLatLng, latLngToCell, polygonToCells, gridDisk, cellToChildren } from 'h3-js';
import type { GeoFeature, Boundary, Layer, QueryResult, TimeQuery } from './types.js';

// Default H3 resolution for regional work (Five Towns area)
// Resolution 7: ~23km edge length, ~1,500 km² per cell
const DEFAULT_RESOLUTION = 7;
const DETAIL_RESOLUTION = 8; // For boundary-heavy analysis

/**
 * Convert lat/lng to H3 cell ID at default resolution.
 */
export function pointToH3(lat: number, lng: number, resolution = DEFAULT_RESOLUTION): string {
  return latLngToCell(lat, lng, resolution);
}

/**
 * Convert H3 cell ID to [lat, lng] centroid.
 */
export function h3ToCentroid(cellId: string): [number, number] {
  const [lat, lng] = cellToLatLng(cellId);
  return [lng, lat]; // Return as [lon, lat] for GeoJSON convention
}

/**
 * Get all H3 cells that a polygon covers (using k-ring expansion for edge cases).
 */
export function polygonToH3Cells(geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon, resolution = DEFAULT_RESOLUTION): string[] {
  if (geometry.type === 'MultiPolygon') {
    const cells: string[] = [];
    for (const poly of geometry.coordinates) {
      const ring = poly[0] as GeoJSON.Polygon['coordinates'][0];
      const result = polygonToCells(ring, resolution) as unknown as string[];
      for (const c of result) cells.push(c);
    }
    return [...new Set(cells)];
  }
  const ring = geometry.coordinates[0] as GeoJSON.Polygon['coordinates'][0];
  return polygonToCells(ring, resolution) as unknown as string[];
}

/**
 * Get neighboring H3 cells (6 direct neighbors at 60° intervals).
 */
export function h3Neighbors(cellId: string): string[] {
  return gridDisk(cellId, 1).filter(id => id !== cellId);
}

/**
 * Get H3 cell boundary as GeoJSON polygon.
 */
export function h3CellToPolygon(cellId: string): GeoJSON.Polygon {
  const boundary = cellToBoundary(cellId);
  // Close the ring: append first point to end
  const closed = [...boundary, boundary[0]];
  return {
    type: 'Polygon',
    coordinates: [closed.map(([lat, lng]) => [lng, lat])] // Convert [lat, lng] to [lng, lat]
  };
}

/**
 * Assign all features in a layer to H3 cells.
 * Returns a map of cellId -> features in that cell.
 */
export function indexLayerByH3(layer: Layer, resolution = DEFAULT_RESOLUTION): Map<string, GeoFeature[]> {
  const index = new Map<string, GeoFeature[]>();

  for (const feature of layer.features) {
    const cells = polygonToH3Cells(feature.geometry, resolution);
    for (const cell of cells) {
      if (!index.has(cell)) {
        index.set(cell, []);
      }
      index.get(cell)!.push(feature);
    }
  }

  return index;
}

/**
 * Query boundaries active at a given year within a given H3 cell.
 */
export function queryCellAtYear(
  cellId: string,
  year: number,
  boundaries: Boundary[],
  options?: { minPriority?: number }
): Boundary[] {
  return boundaries.filter(b => {
    // Check time validity
    const fromValid = b.validFrom === null || b.validFrom <= year;
    const toValid = b.validTo === null || b.validTo >= year;
    if (!fromValid || !toValid) return false;

    // Check priority threshold
    if (options?.minPriority && b.priority < options.minPriority) return false;

    // Check if this boundary covers the cell
    return b.h3Cells.includes(cellId);
  }).sort((a, b) => b.priority - a.priority); // Highest priority first
}

/**
 * Full time/space query: what was at this point in this year?
 */
export function executeTimeQuery(query: TimeQuery, layers: Layer[], boundaries: Boundary[]): QueryResult {
  const resolution = query.h3Resolution ?? DEFAULT_RESOLUTION;
  const cellId = pointToH3(query.point[1], query.point[0], resolution);

  // Find place name if available
  const placeName = findPlaceNameAtPoint(query.point, layers);

  // Get boundaries at this time
  const activeBoundaries = queryCellAtYear(cellId, query.year, boundaries);

  // Get geological context at this point
  const geological = findGeologicalAtPoint(query.point, layers);

  return {
    h3Cell: cellId,
    point: query.point,
    year: query.year,
    place: placeName,
    boundariesAtDate: activeBoundaries,
    geologicalAtPoint: geological,
  };
}

/**
 * Find place name at a lat/lng point (simplified — look for nearest named settlement).
 */
function findPlaceNameAtPoint(point: [number, number], _layers: Layer[]): string | null {
  // TODO: Implement proper nearest-settlement lookup
  // For now, just return the H3 cell as a placeholder
  const [lat, lng] = point;
  return `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
}

/**
 * Find geological features at a point.
 */
function findGeologicalAtPoint(point: [number, number], layers: Layer[]): GeoFeature[] {
  const [lng, lat] = point;
  const cellId = pointToH3(lat, lng, DEFAULT_RESOLUTION);

  return layers
    .filter(l => l.id.startsWith('geology:'))
    .flatMap(l => l.features)
    .filter(f => {
      const featureCells = polygonToH3Cells(f.geometry, DEFAULT_RESOLUTION);
      return featureCells.includes(cellId);
    });
}

/**
 * Build a hex grid covering a bounding box at a given resolution.
 */
export function buildHexGrid(
  minLon: number,
  minLat: number,
  maxLon: number,
  maxLat: number,
  resolution = DEFAULT_RESOLUTION
): string[] {
  // Get center cell
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLon + maxLon) / 2;
  const centerCell = latLngToCell(centerLat, centerLng, resolution);

  // Expand outward until we cover the bounding box
  const cells: Set<string> = new Set();
  const maxIterations = 1000;
  let iteration = 0;

  // Start with center and expand via k-rings
  let frontier = new Set([centerCell]);

  while (frontier.size > 0 && iteration < maxIterations) {
    const nextFrontier = new Set<string>();

    for (const cell of frontier) {
      if (cells.has(cell)) continue;
      cells.add(cell);

      // Check if this cell might extend our coverage
      const [lat, lng] = cellToLatLng(cell);
      if (lng >= minLon - 1 && lng <= maxLon + 1 && lat >= minLat - 1 && lat <= maxLat + 1) {
        const neighbors = gridDisk(cell, 1);
        for (const n of neighbors) {
          if (!cells.has(n)) {
            nextFrontier.add(n);
          }
        }
      }
    }

    frontier = nextFrontier;
    iteration++;
  }

  return [...cells];
}

export { DEFAULT_RESOLUTION, DETAIL_RESOLUTION };