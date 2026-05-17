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

// ─── Embedding Search Interface ───────────────────────────────────────────────
// For iterative search of public resources to find what existed in a hex cell at a time

export interface SearchSource {
  name: string;
  type: 'geological' | 'historical' | 'political' | 'osm';
  baseUrl?: string;
  queryBuilder: (h3Cell: string, year: number) => string; // returns search query
  parser: (raw: unknown) => BoundaryFeature | null;
}

export interface BoundaryFeature {
  source: string;
  h3Cells: string[];
  validFrom: number | null;
  validTo: number | null;
  name: string;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  metadata: Record<string, unknown>;
}

// ─── Embedding Search Pipeline ────────────────────────────────────────────────
// Iterative search: start broad, refine based on confidence

export interface SearchResult {
  source: string;
  feature: BoundaryFeature;
  confidence: number; // 0-1
  method: 'exact' | 'approximate' | 'inferred';
}

export interface SearchOptions {
  /** Maximum iterations before giving up */
  maxIterations?: number;
  /** Confidence threshold to accept a result */
  confidenceThreshold?: number;
  /** Expand search to neighbor hexes if no direct hit */
  expandToNeighbors?: boolean;
  /** Sources to search (defaults to all) */
  sources?: string[];
}

/**
 * Embedding search using local small model (Ollama).
 * Iteratively searches public resources for what existed in a hex cell at a given year.
 *
 * Pipeline:
 * 1. Generate embedding for the query (hex cell context + year)
 * 2. Search vector index for each source
 * 3. If low confidence, expand to neighboring hexes
 * 4. If still low, try approximate matching (time window)
 * 5. Return best result with confidence score
 */
export class EmbeddingSearchPipeline {
  private sources: SearchSource[] = [];
  private ollamaUrl: string;

  constructor(ollamaUrl = 'http://localhost:11434') {
    this.ollamaUrl = ollamaUrl;
  }

  addSource(source: SearchSource): void {
    this.sources.push(source);
  }

  /**
   * Generate embedding for a query using local Ollama model.
   */
  async embed(text: string, model = 'nomic-embed-text'): Promise<number[]> {
    const response = await fetch(`${this.ollamaUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt: text }),
    });
    if (!response.ok) {
      throw new Error(`Ollama embedding failed: ${response.status}`);
    }
    const data = await response.json() as { embedding: number[] };
    return data.embedding;
  }

  /**
   * Cosine similarity between two vectors.
   */
  private cosineSim(a: number[], b: number[]): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Build the search query context string for a hex cell + year.
   */
  private buildSearchContext(h3Cell: string, year: number, h3Res: number): string {
    const [lat, lng] = cellToLatLng(h3Cell);
    const geoEpoch = geologicalEpochAtPosition(yearToPosition(DEFAULT_CONFIG, year));
    const polEpoch = politicalEpochAtPosition(yearToPosition(DEFAULT_CONFIG, year));

    return [
      `Location: ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°W`,
      `H3 resolution ${h3Res} (~${this.approximateHexArea(h3Res)} km²)`,
      `Year: ${year} (${year >= 0 ? 'AD' : `${Math.abs(year)} BC`})`,
      geoEpoch ? `Geological epoch: ${geoEpoch.name} (${geoEpoch.description})` : 'Geological epoch: unknown',
      polEpoch ? `Political epoch: ${polEpoch.name} (${polEpoch.description})` : 'Political epoch: unknown',
    ].join('\n');
  }

  private approximateHexArea(res: number): string {
    const areas: Record<number, string> = {
      0: '5,000,000', 1: '700,000', 2: '100,000', 3: '38,000',
      4: '10,000', 5: '1,500', 6: '250', 7: '38', 8: '5.4',
      9: '0.77', 10: '0.11', 11: '0.016', 12: '0.0022', 13: '0.00032', 14: '0.000046', 15: '0.0000066',
    };
    return areas[res] ?? 'unknown';
  }

  /**
   * Search for what existed in a hex cell at a given year.
   * Iterative approach: first try exact H3 match, then broaden.
   */
  async search(
    h3Cell: string,
    year: number,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const {
      maxIterations = 3,
      confidenceThreshold = 0.75,
      expandToNeighbors = true,
    } = options;

    const h3Res = resolutionFromTimePos(yearToPosition(DEFAULT_CONFIG, year));
    const context = this.buildSearchContext(h3Cell, year, h3Res);
    const queryEmbedding = await this.embed(context);

    const results: SearchResult[] = [];
    let currentCells = [h3Cell];
    let iteration = 0;

    while (iteration < maxIterations && results.length === 0) {
      for (const cell of currentCells) {
        for (const source of this.sources) {
          const sourceResults = await this.searchSource(source, cell, year, queryEmbedding, h3Res);
          results.push(...sourceResults);
        }
      }

      if (results.length > 0) break;

      // Expand search space
      iteration++;
      if (expandToNeighbors && iteration < maxIterations) {
        const expanded = new Set<string>();
        for (const cell of currentCells) {
          gridDisk(cell, iteration).forEach(n => expanded.add(n));
        }
        currentCells = [...expanded];
      }
    }

    // Sort by confidence and return
    return results.sort((a, b) => b.confidence - a.confidence);
  }

  private async searchSource(
    source: SearchSource,
    h3Cell: string,
    year: number,
    queryEmbedding: number[],
    h3Res: number,
  ): Promise<SearchResult[]> {
    const searchQuery = source.queryBuilder(h3Cell, year);

    try {
      // Generate embedding for the search query
      const queryEmb = await this.embed(searchQuery);
      const similarity = this.cosineSim(queryEmbedding, queryEmb);

      // In a real implementation, we would:
      // 1. Check if source has a vector index (loaded from GeoJSON bundles)
      // 2. Query the index with the embedding
      // 3. Parse and return results
      //
      // For now, return a placeholder result structure
      // The actual implementation would call source.parser() on matched features

      if (similarity > 0.5) {
        return [{
          source: source.name,
          feature: {
            source: source.name,
            h3Cells: [h3Cell],
            validFrom: year,
            validTo: year,
            name: searchQuery,
            geometry: { type: 'Polygon', coordinates: [[[0, 0], [0, 0], [0, 0], [0, 0]]] },
            metadata: { similarity },
          },
          confidence: similarity,
          method: similarity > 0.8 ? 'exact' : 'approximate',
        }];
      }
    } catch {
      // Source unavailable or error — skip
    }

    return [];
  }
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