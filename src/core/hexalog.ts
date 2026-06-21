// Place-Time: Unified HexaLog Space — Time × Space as a Logarithmic 2D Grid
//
// Time axis (X): log10(Big Bang → 2000) compressed to [0, 1]
// Space axis (Y): log10(Full Earth → 1m) compressed to [0, 1]
//
// Any point (timePos, spacePos) resolves to:
//   - A calendar year (via timescale log)
//   - An H3 resolution (via spatial log — planet-scale to 1m)
//
// The hex cell at (timePos, spacePos) tells you what geological/political
// entity existed at that hex at that time, queried from public data sources
// using small-model embedding search.

import { latLngToCell, cellToLatLng, cellToBoundary, gridDisk } from 'h3-js';
import { position, DEFAULT_CONFIG, TimescaleConfig, yearToPosition, positionToYear, GEOLOGICAL_EPOCHS, POLITICAL_EPOCHS, geologicalEpochAtPosition, politicalEpochAtPosition } from './timescale.js';
import type { GeoFeature, Boundary, Layer } from './types.js';

// ─── Place-Time Resolution (PTR) Scale ───────────────────────────────────────
//
// PTR maps the logarithmic time axis to spatial resolution in 11 discrete levels.
//
// PTR  0  →  H3 res 0   edge ~1,377km   planetary / tectonic plate
// PTR  1  →  H3 res 1   edge ~518km     continental
// PTR  2  →  H3 res 2   edge ~195km     sub-continental / ocean basin
// PTR  3  →  H3 res 3   edge ~73km      large region / ancient empire
// PTR  4  →  H3 res 4   edge ~27km      county / shire
// PTR  5  →  H3 res 5   edge ~10km      hundred / wapentake
// PTR  6  →  H3 res 6   edge ~3.9km     parish / township territory
// PTR  7  →  H3 res 7   edge ~1.5km     large village / small town
// PTR  8  →  H3 res 8   edge ~554m      neighbourhood / hamlet
// PTR  9  →  H3 res 9   edge ~208m      (reserved — not currently used)
// PTR 10  →  H3 res 9   edge ~2.1km     *** LEAF NODE — human knowability scale ***
//
// PTR-10 is the finest resolution in the Place-Time system. It represents the
// scale of a Dunbar-scale human community (~150–1500 people, walkable in ~30min).
// A person can "know" a PTR-10 cell — its people, its character, its history.
// Below PTR-10, data is stored as *attributes* of the cell, not as subdivisions.
// Streets, wards, buildings are properties of a PTR-10 cell, not child cells.
//
// This aligns with the logarithmic time axis: as timePos → 1.0 (present day),
// the resolution approaches PTR-10 (H3 res 9, ~2.1km edge). Deeper time uses
// coarser cells because the historical record itself is coarser.
//
// Note: PTR-10 maps to H3 res 9 (not H3 res 10) because the alignment optimiser
// targets the ~2km human-settlement scale, which sits at H3 res 9.
// PTR uses a 0–10 scale for clarity; H3 res 0–9 is the internal implementation.

export const PTR_LEAF = 10;          // finest Place-Time Resolution (the leaf)
export const H3_RES_LEAF = 9;        // H3 resolution at the leaf (do not exceed)
export const PTR_LEVELS = 11;        // 0 through 10 inclusive

// Physical column bounds — uniform across all cells globally
// Top:    10,000m above sea level — clears Mt Everest (8,849m) + tallest structure (Burj Khalifa 830m) + margin
// Bottom: 12,000m below sea level — below Challenger Deep (10,935m) + margin
// Span:   22,000m total — contains every geographically meaningful surface feature on Earth
export const COLUMN_TOP_M    =  10_000;
export const COLUMN_BOTTOM_M = -12_000;
export const COLUMN_SPAN_M   = COLUMN_TOP_M - COLUMN_BOTTOM_M;  // 22,000m

/** Convert a Place-Time Resolution (0–10) to the corresponding H3 resolution (0–9). */
export function ptrToH3Res(ptr: number): number {
  return Math.min(Math.round((ptr / PTR_LEAF) * H3_RES_LEAF), H3_RES_LEAF);
}

/** Convert an H3 resolution (0–9) to the nearest Place-Time Resolution (0–10). */
export function h3ResToPtr(h3Res: number): number {
  return Math.round((Math.min(h3Res, H3_RES_LEAF) / H3_RES_LEAF) * PTR_LEAF);
}

// ─── Spatial Scale Constants ──────────────────────────────────────────────────

/** Earth's diameter in kilometers */
export const EARTH_DIAMETER_KM = 12_742;
/** Earth's circumference in meters (approximate) */
export const EARTH_CIRCUMFERENCE_M = EARTH_DIAMETER_KM * 1_000;

/**
 * Logarithmic H3 resolution scale.
 *
 * At timePos = 0 (Big Bang):    Earth is resolved at H3 res 0 (~5M km² hexes)
 * At timePos = 1 (year 2000):   Earth is resolved at H3 res 15 (~1m hexes)
 * At timePos < 0 (future):       H3 res stays at maximum (1m resolution)
 *
 * The scale is logarithmic in cell area: each step halves the cell area.
 * H3 res 0 area / res 1 area ≈ 7.56 (not exactly 2 due to H3 geometry)
 *
 * Formula: resolution(timePos) = clamp(
 *   floor(log10(earth_km / (1m * 10^(3*(1-timePos)))) / log10(7.56),
 *   0, 15
 * )
 *
 * Simplified: log10(earth_km * 1000) = log10(12_742_000) ≈ 7.1
 * For timePos=0 → res≈0, timePos=1 → res≈15
 */
/**
 * Map a time position (0=Big Bang, 1=present) to a Place-Time Resolution (0–10),
 * then convert to the corresponding H3 resolution (0–9).
 *
 * Resolution increases as timePos approaches 1 (present day), because recent
 * history has finer-grained data. PTR-10 (H3 res 9, ~2.1km) is the leaf —
 * the human-knowability scale. It is never exceeded.
 */
export function resolutionFromTimePos(timePos: number): number {
  if (timePos >= 1) return H3_RES_LEAF;   // present or future → leaf resolution
  if (timePos <= 0) return 0;              // Big Bang → planetary resolution

  // Logarithmic interpolation from PTR-0 to PTR-10
  const logEarthM = Math.log10(EARTH_CIRCUMFERENCE_M);
  const logCellSize = logEarthM * (1 - timePos);
  const h3Res = Math.floor(logCellSize / (logEarthM / H3_RES_LEAF));
  return Math.max(0, Math.min(H3_RES_LEAF, h3Res));
}

/**
 * Reverse: given an H3 resolution, what timePos would produce it?
 * (useful for mapping geological epoch boundaries to time positions)
 */
export function timePosFromResolution(resolution: number): number {
  const maxRes = 15;
  const logEarthM = Math.log10(EARTH_CIRCUMFERENCE_M);
  const logCellSize = (logEarthM / maxRes) * resolution;
  return 1 - (logCellSize / logEarthM);
}

// ─── HexaLog Coordinate ───────────────────────────────────────────────────────

export interface HexaLogCoord {
  timePos: number;      // 0.0 (Big Bang) → 1.0 (2000) → >1.0 (future, linear)
  spacePos: number;     // 0.0 (full Earth) → 1.0 (1m resolution)
  h3Resolution: number;  // Derived H3 resolution for this spacePos
  year: number;         // Calendar year at this timePos
  h3Cell: string | null; // H3 cell ID (if lat/lng provided)
}

export interface HexaLogQuery {
  lat?: number;
  lng?: number;
  timePos?: number;
  year?: number;         // Alternative to timePos
  spacePos?: number;      // Defaults to 0.5 (medium resolution)
}

/**
 * Build a HexaLogCoord from a query.
 * Requires either year or timePos. If lat/lng provided, resolves H3 cell.
 */
export function buildHexaLogCoord(query: HexaLogQuery, config: TimescaleConfig = DEFAULT_CONFIG): HexaLogCoord {
  // Resolve time
  let timePos: number;
  if (query.year !== undefined) {
    timePos = yearToPosition(config, query.year);
  } else if (query.timePos !== undefined) {
    timePos = query.timePos;
  } else {
    timePos = 0.5; // Default: mid-scale (Pleistocene)
  }

  // Resolve space
  const spacePos = query.spacePos ?? 0.5;

  // Resolve H3 resolution from time position (spatial scale is time-dependent)
  const h3Res = resolutionFromTimePos(timePos);

  // Resolve H3 cell if lat/lng provided
  let h3Cell: string | null = null;
  if (query.lat !== undefined && query.lng !== undefined) {
    h3Cell = latLngToCell(query.lat, query.lng, h3Res);
  }

  return {
    timePos,
    spacePos,
    h3Resolution: h3Res,
    year: positionToYear(config, timePos),
    h3Cell,
  };
}

// ─── HexaLog Grid ─────────────────────────────────────────────────────────────

/**
 * A hexagonal grid cell in the HexaLog space.
 * Represents a spatial region (H3 cell) at a specific time.
 */
export interface HexaLogCell {
  coord: HexaLogCoord;
  /** H3 cell boundary as GeoJSON polygon */
  geometry: GeoJSON.Polygon;
  /** Centroid [lon, lat] */
  centroid: [number, number];
  /** What geological epoch is active here at this time */
  geologicalEpoch: ReturnType<typeof geologicalEpochAtPosition>;
  /** What political epoch is active here at this time */
  politicalEpoch: ReturnType<typeof politicalEpochAtPosition>;
  /** Child hex cells at higher resolution (for zooming in) */
  children?: string[];
}

/**
 * Generate a HexaLogCell for a given query.
 */
export function getHexaLogCell(query: HexaLogQuery): HexaLogCell {
  const coord = buildHexaLogCoord(query);

  let geometry: GeoJSON.Polygon;
  let centroid: [number, number];
  let children: string[] | undefined;

  if (coord.h3Cell) {
    const boundary = cellToBoundary(coord.h3Cell);
    geometry = {
      type: 'Polygon',
      coordinates: [[...boundary.map(([lat, lng]) => [lng, lat]), [boundary[0][1], boundary[0][0]]]],
    };
    const [clat, clng] = cellToLatLng(coord.h3Cell);
    centroid = [clng, clat];
    // Get child cells for one level finer resolution
    if (coord.h3Resolution < 15) {
      children = gridDisk(coord.h3Cell, 1).filter(id => id !== coord.h3Cell);
    }
  } else {
    // No location provided — return a placeholder
    geometry = { type: 'Polygon', coordinates: [[[0, 0], [0, 0], [0, 0], [0, 0]]] };
    centroid = [0, 0];
  }

  return {
    coord,
    geometry,
    centroid,
    geologicalEpoch: geologicalEpochAtPosition(coord.timePos),
    politicalEpoch: politicalEpochAtPosition(coord.timePos),
    children,
  };
}

/**
 * Get the 6 neighboring HexaLogCells (same resolution, same time, adjacent space).
 */
export function getHexaLogNeighbors(cellId: string, timePos: number): string[] {
  return gridDisk(cellId, 1).filter(id => id !== cellId);
}

// ─── H3 Resolution to Position Utilities ──────────────────────────────────────

/**
 * At a given timePos, what is the approximate edge length of an H3 hex in meters?
 */
export function hexEdgeLengthM(resolution: number): number {
  // H3 cell edge lengths by resolution (approximate, in meters)
  const edges: Record<number, number> = {
    0: 1_377_000, 1: 518_000, 2: 195_000, 3: 73_200,
    4: 27_500, 5: 10_400, 6: 3_910, 7: 1_470,
    8: 554, 9: 208, 10: 78.3, 11: 29.5,
    12: 11.1, 13: 4.17, 14: 1.57, 15: 0.59,
  };
  return edges[resolution] ?? 0.59;
}

/**
 * At a given timePos, what is the approximate area of an H3 hex in km²?
 */
export function hexAreaKm2(resolution: number): number {
  // Approximate hex area by resolution (km²)
  const areas: Record<number, number> = {
    0: 4_280_000, 1: 611_000, 2: 87_100, 3: 12_400,
    4: 1_780, 5: 253, 6: 36.1, 7: 5.15,
    8: 0.735, 9: 0.105, 10: 0.0149, 11: 0.00213,
    12: 0.000304, 13: 0.0000435, 14: 0.00000621, 15: 0.000000887,
  };
  return areas[resolution] ?? 0.59;
}

/**
 * Describe the resolution at a given timePos in human-readable terms.
 */
export function describeResolution(timePos: number): string {
  const res = resolutionFromTimePos(timePos);
  const edgeM = hexEdgeLengthM(res);
  const areaKm2 = hexAreaKm2(res);
  const year = positionToYear(DEFAULT_CONFIG, timePos);

  if (res <= 2) return `Continental scale (~${areaKm2.toExponential(1)} km² per hex)`;
  if (res <= 4) return `Regional scale (~${areaKm2.toFixed(0)} km² per hex, ~${(edgeM/1000).toFixed(0)} km edge)`;
  if (res <= 6) return `County-scale (~${areaKm2.toFixed(1)} km² per hex, ~${edgeM.toFixed(0)} m edge)`;
  if (res <= 8) return `Town-scale (~${areaKm2.toFixed(2)} km² per hex, ~${edgeM.toFixed(0)} m edge)`;
  if (res <= 11) return `Building-scale (~${edgeM.toFixed(1)} m edge, ~${(areaKm2*1e6).toFixed(0)} m² per hex)`;
  return `Precision (~${edgeM.toFixed(2)} m edge)`;
}