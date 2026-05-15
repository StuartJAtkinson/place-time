import type { HexaLogCoord } from './hexalog.js';
export interface SearchSource {
    id: string;
    name: string;
    endpoint?: string;
    description: string;
    timeRange: {
        minYear: number;
        maxYear: number;
    };
    search: (query: string, year?: number) => Promise<SearchHit[]>;
}
export interface SearchHit {
    id: string;
    label: string;
    description: string;
    year?: number;
    geometry?: GeoJSON.Polygon | GeoJSON.MultiPolygon;
    properties: Record<string, unknown>;
    score?: number;
}
export interface BoundarySearchResult {
    entityId: string;
    entityName: string;
    layerId: string;
    year: number;
    geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
    confidence: number;
    source: string;
    metadata: Record<string, unknown>;
}
interface EmbeddingEntry {
    id: string;
    label: string;
    description: string;
    layerId: string;
    yearRange: [number, number] | null;
    centroid: [number, number] | null;
    h3Cell: string | null;
    embedding: number[];
    properties: Record<string, unknown>;
}
/** Cosine similarity between two vectors (0=orthogonal, 1=identical) */
export declare function cosineSimilarity(a: number[], b: number[]): number;
/**
 * Generate an embedding for a text string using Ollama.
 * Uses the configured embedding model (default: 'nomic-embed-text').
 */
export declare function embedText(text: string, model?: string): Promise<number[]>;
/**
 * Generate embeddings for multiple texts in one batch call.
 * Concurrency-limited to avoid overwhelming the Ollama instance.
 */
export declare function embedBatch(texts: string[], model?: string, concurrency?: number): Promise<number[][]>;
/**
 * Check if Ollama is available and responsive.
 */
export declare function ollamaPing(): Promise<boolean>;
/**
 * Search pipeline that uses embedding similarity to find boundary entities
 * for a given HexaLog cell and year.
 *
 * Process:
 *  1. Build query embedding from cell coordinates + year + epoch context
 *  2. Search registered sources for candidate entities
 *  3. Rank candidates by cosine similarity to query
 *  4. Return top matches with confidence scores
 */
export declare class EmbeddingSearchPipeline {
    private sources;
    private index;
    private embeddingModel;
    private ollamaAvailable;
    constructor(embeddingModel?: string);
    /**
     * Register a data source for searching.
     */
    registerSource(source: SearchSource): void;
    /**
     * Check if Ollama is available.
     */
    checkOllama(): Promise<boolean>;
    /**
     * Build a search query string for a HexaLog cell.
     * Combines coordinates, year, and geological/political context into a rich query.
     */
    buildQuery(coord: HexaLogCoord, context?: {
        geologicalEpoch?: string;
        politicalEpoch?: string;
        entityType?: string;
    }): string;
    /**
     * Search for boundaries in a HexaLog cell at a given year.
     *
     * Strategy:
     *  1. Generate query embedding from cell + year + epoch context
     *  2. Search each registered source for candidates
     *  3. Embed candidate descriptions and score by cosine similarity
     *  4. Return ranked results above confidence threshold
     */
    searchCell(coord: HexaLogCoord, options?: {
        entityTypes?: string[];
        minConfidence?: number;
        limit?: number;
    }): Promise<BoundarySearchResult[]>;
    /**
     * Fallback when Ollama unavailable — returns empty results.
     * In production this could fall back to a keyword-based search.
     */
    private searchCellFallback;
    /**
     * Index a boundary entity for future search.
     * Call after ingesting new boundary data.
     */
    indexEntity(entry: Omit<EmbeddingEntry, 'embedding'>): Promise<void>;
    /**
     * Find similar entities in the local index.
     * Useful for "what else existed near this boundary at that time?"
     */
    findSimilar(entityId: string, layerId: string, limit?: number): Promise<Array<{
        entry: EmbeddingEntry;
        score: number;
    }>>;
}
/**
 * Cliopatria/Seshat historical boundaries API.
 * Covers 3400BCE to 2024CE with polygon geometries.
 * Free, no API key required.
 */
export declare function makeCliopatriaSource(baseUrl?: string): SearchSource;
/**
 * OpenDomesday places API.
 * 1086 AD location data (points only, no polygon boundaries).
 * Free, no API key required.
 */
export declare function makeOpenDomesdaySource(): SearchSource;
/**
 * Geofabrik OSM administrative boundaries.
 * Modern political boundaries from OpenStreetMap.
 * Free, no API key required.
 */
export declare function makeGeofabrikSource(): SearchSource;
/**
 * Zenodo GPlates geological data.
 * Tectonic plate boundaries and geological provinces.
 * Free, no API key required.
 */
export declare function makeZenodoGeologySource(): SearchSource;
/**
 * Create a fully configured EmbeddingSearchPipeline with all known sources.
 */
export declare function createSearchPipeline(): EmbeddingSearchPipeline;
export {};
//# sourceMappingURL=embeddings.d.ts.map