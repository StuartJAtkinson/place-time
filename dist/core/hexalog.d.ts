import { TimescaleConfig, geologicalEpochAtPosition, politicalEpochAtPosition } from './timescale.js';
/** Earth's diameter in kilometers */
export declare const EARTH_DIAMETER_KM = 12742;
/** Earth's circumference in meters (approximate) */
export declare const EARTH_CIRCUMFERENCE_M: number;
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
export declare function resolutionFromTimePos(timePos: number): number;
/**
 * Reverse: given an H3 resolution, what timePos would produce it?
 * (useful for mapping geological epoch boundaries to time positions)
 */
export declare function timePosFromResolution(resolution: number): number;
export interface HexaLogCoord {
    timePos: number;
    spacePos: number;
    h3Resolution: number;
    year: number;
    h3Cell: string | null;
}
export interface HexaLogQuery {
    lat?: number;
    lng?: number;
    timePos?: number;
    year?: number;
    spacePos?: number;
}
/**
 * Build a HexaLogCoord from a query.
 * Requires either year or timePos. If lat/lng provided, resolves H3 cell.
 */
export declare function buildHexaLogCoord(query: HexaLogQuery, config?: TimescaleConfig): HexaLogCoord;
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
export declare function getHexaLogCell(query: HexaLogQuery): HexaLogCell;
/**
 * Get the 6 neighboring HexaLogCells (same resolution, same time, adjacent space).
 */
export declare function getHexaLogNeighbors(cellId: string, timePos: number): string[];
export interface SearchSource {
    name: string;
    type: 'geological' | 'historical' | 'political' | 'osm';
    baseUrl?: string;
    queryBuilder: (h3Cell: string, year: number) => string;
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
export interface SearchResult {
    source: string;
    feature: BoundaryFeature;
    confidence: number;
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
export declare class EmbeddingSearchPipeline {
    private sources;
    private ollamaUrl;
    constructor(ollamaUrl?: string);
    addSource(source: SearchSource): void;
    /**
     * Generate embedding for a query using local Ollama model.
     */
    embed(text: string, model?: string): Promise<number[]>;
    /**
     * Cosine similarity between two vectors.
     */
    private cosineSim;
    /**
     * Build the search query context string for a hex cell + year.
     */
    private buildSearchContext;
    private approximateHexArea;
    /**
     * Search for what existed in a hex cell at a given year.
     * Iterative approach: first try exact H3 match, then broaden.
     */
    search(h3Cell: string, year: number, options?: SearchOptions): Promise<SearchResult[]>;
    private searchSource;
}
/**
 * At a given timePos, what is the approximate edge length of an H3 hex in meters?
 */
export declare function hexEdgeLengthM(resolution: number): number;
/**
 * At a given timePos, what is the approximate area of an H3 hex in km²?
 */
export declare function hexAreaKm2(resolution: number): number;
/**
 * Describe the resolution at a given timePos in human-readable terms.
 */
export declare function describeResolution(timePos: number): string;
//# sourceMappingURL=hexalog.d.ts.map