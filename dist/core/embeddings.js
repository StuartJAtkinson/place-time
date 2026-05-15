// Embedding-based Boundary Search Pipeline
// Uses local small AI (Ollama) + cosine similarity for iterative boundary discovery
//
// Pattern: For any HexaLog cell at any year, iteratively search public sources
// to determine what geological/political entity existed there.
//
// Public sources used:
//   - Cliopatria/Seshat API: historical political boundaries (3400BCE–2024CE)
//   - OpenDomesday: 1086 AD place locations (point data only)
//   - Geofabrik/OSM: modern administrative boundaries
//   - Zenodo GPlates: tectonic plates + geological provinces
//   - Wikidata: entity labels and relationships
// ─── Math Utilities ────────────────────────────────────────────────────────────
/** Dot product of two vectors */
function dot(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++)
        sum += a[i] * b[i];
    return sum;
}
/** Euclidean norm of a vector */
function norm(v) {
    return Math.sqrt(dot(v, v));
}
/** Cosine similarity between two vectors (0=orthogonal, 1=identical) */
export function cosineSimilarity(a, b) {
    if (a.length !== b.length)
        return 0;
    const n = norm(a) * norm(b);
    return n === 0 ? 0 : dot(a, b) / n;
}
// ─── Ollama API ───────────────────────────────────────────────────────────────
const OLLAMA_BASE = process.env.OLLAMA_BASE ?? 'http://localhost:11434';
/**
 * Generate an embedding for a text string using Ollama.
 * Uses the configured embedding model (default: 'nomic-embed-text').
 */
export async function embedText(text, model = 'nomic-embed-text') {
    const response = await fetch(`${OLLAMA_BASE}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt: text }),
    });
    if (!response.ok) {
        throw new Error(`Ollama embedding failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return data.embeddings[0];
}
/**
 * Generate embeddings for multiple texts in one batch call.
 * Concurrency-limited to avoid overwhelming the Ollama instance.
 */
export async function embedBatch(texts, model = 'nomic-embed-text', concurrency = 4) {
    const results = [];
    for (let i = 0; i < texts.length; i += concurrency) {
        const batch = texts.slice(i, i + concurrency);
        const batchResults = await Promise.all(batch.map(text => embedText(text, model)));
        results.push(...batchResults);
    }
    return results;
}
/**
 * Check if Ollama is available and responsive.
 */
export async function ollamaPing() {
    try {
        const response = await fetch(`${OLLAMA_BASE}/api/tags`, { method: 'GET' });
        return response.ok;
    }
    catch {
        return false;
    }
}
// ─── Embedding Search Pipeline ───────────────────────────────────────────────
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
export class EmbeddingSearchPipeline {
    sources = new Map();
    index = new Map(); // layerId → entries
    embeddingModel;
    ollamaAvailable = null;
    constructor(embeddingModel = 'nomic-embed-text') {
        this.embeddingModel = embeddingModel;
    }
    /**
     * Register a data source for searching.
     */
    registerSource(source) {
        this.sources.set(source.id, source);
        this.index.set(source.id, []);
    }
    /**
     * Check if Ollama is available.
     */
    async checkOllama() {
        if (this.ollamaAvailable === null) {
            this.ollamaAvailable = await ollamaPing();
        }
        return this.ollamaAvailable;
    }
    /**
     * Build a search query string for a HexaLog cell.
     * Combines coordinates, year, and geological/political context into a rich query.
     */
    buildQuery(coord, context) {
        const parts = [];
        // Spatial context (Five Towns area as default anchor)
        parts.push('location:Five Towns area (Pontefract, Castleford, Featherstone, Knottingley, Normanton)');
        // Temporal context
        parts.push(`year:${coord.year}`);
        if (coord.timePos < 0) {
            parts.push('era:future');
        }
        else if (coord.timePos > 1) {
            parts.push('era:far-future');
        }
        if (context?.geologicalEpoch) {
            parts.push(`geological period:${context.geologicalEpoch}`);
        }
        if (context?.politicalEpoch) {
            parts.push(`political era:${context.politicalEpoch}`);
        }
        if (context?.entityType) {
            parts.push(`entity type:${context.entityType}`);
        }
        return parts.join(' ');
    }
    /**
     * Search for boundaries in a HexaLog cell at a given year.
     *
     * Strategy:
     *  1. Generate query embedding from cell + year + epoch context
     *  2. Search each registered source for candidates
     *  3. Embed candidate descriptions and score by cosine similarity
     *  4. Return ranked results above confidence threshold
     */
    async searchCell(coord, options = {}) {
        const { entityTypes = ['boundary', 'administrative', 'geological'], minConfidence = 0.6, limit = 10 } = options;
        const ollamaReady = await this.checkOllama();
        if (!ollamaReady) {
            console.warn('[EmbeddingSearch] Ollama unavailable — boundary search disabled');
            console.warn('  Start Ollama with: ollama run nomic-embed-text');
            return this.searchCellFallback(coord, entityTypes, minConfidence, limit);
        }
        // Build search queries for each entity type
        const queries = entityTypes.map(type => this.buildQuery(coord, { entityType: type }));
        // Embed all queries
        const queryEmbeddings = await embedBatch(queries, this.embeddingModel);
        const results = [];
        // Search each source
        for (const [_sourceId, source] of this.sources) {
            // Check time range
            if (coord.year < source.timeRange.minYear || coord.year > source.timeRange.maxYear) {
                continue;
            }
            try {
                // Search source with each query type
                for (let i = 0; i < entityTypes.length; i++) {
                    const hits = await source.search(queries[i], coord.year);
                    if (hits.length === 0)
                        continue;
                    // Embed hit descriptions for similarity scoring
                    const hitTexts = hits.map(h => `${h.label} ${h.description}`);
                    const hitEmbeddings = await embedBatch(hitTexts, this.embeddingModel);
                    for (let j = 0; j < hits.length; j++) {
                        const score = cosineSimilarity(queryEmbeddings[i], hitEmbeddings[j]);
                        if (score >= minConfidence) {
                            results.push({
                                entityId: hits[j].id,
                                entityName: hits[j].label,
                                layerId: _sourceId,
                                year: coord.year,
                                geometry: hits[j].geometry ?? null,
                                confidence: score,
                                source: source.name,
                                metadata: hits[j].properties,
                            });
                        }
                    }
                }
            }
            catch (err) {
                console.error(`[EmbeddingSearch] Source ${_sourceId} failed:`, err);
            }
        }
        // Sort by confidence and dedupe
        results.sort((a, b) => b.confidence - a.confidence);
        const seen = new Set();
        const deduped = results.filter(r => {
            const key = `${r.entityId}:${r.layerId}`;
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        });
        return deduped.slice(0, limit);
    }
    /**
     * Fallback when Ollama unavailable — returns empty results.
     * In production this could fall back to a keyword-based search.
     */
    searchCellFallback(_coord, _entityTypes, _minConfidence, _limit) {
        return Promise.resolve([]);
    }
    /**
     * Index a boundary entity for future search.
     * Call after ingesting new boundary data.
     */
    async indexEntity(entry) {
        const ollamaReady = await this.checkOllama();
        if (!ollamaReady)
            return;
        const text = `${entry.label} ${entry.description}`;
        const embedding = await embedText(text, this.embeddingModel);
        const fullEntry = { ...entry, embedding };
        const entries = this.index.get(entry.layerId) ?? [];
        entries.push(fullEntry);
        this.index.set(entry.layerId, entries);
    }
    /**
     * Find similar entities in the local index.
     * Useful for "what else existed near this boundary at that time?"
     */
    async findSimilar(entityId, layerId, limit = 5) {
        const entries = this.index.get(layerId);
        if (!entries)
            return [];
        const target = entries.find(e => e.id === entityId);
        if (!target)
            return [];
        const scores = entries
            .filter(e => e.id !== entityId)
            .map(e => ({ entry: e, score: cosineSimilarity(target.embedding, e.embedding) }));
        scores.sort((a, b) => b.score - a.score);
        return scores.slice(0, limit);
    }
}
// ─── Pre-configured Search Sources ───────────────────────────────────────────
/**
 * Cliopatria/Seshat historical boundaries API.
 * Covers 3400BCE to 2024CE with polygon geometries.
 * Free, no API key required.
 */
export function makeCliopatriaSource(baseUrl = 'https://cliopatria.snalS.org') {
    return {
        id: 'history:cliopatria',
        name: 'Cliopatria Historical Boundaries',
        endpoint: baseUrl,
        description: 'Historical political boundaries from 3400BCE to 2024CE',
        timeRange: { minYear: -3400, maxYear: 2024 },
        search: async (query, year) => {
            // Integration point for Cliopatria SPARQL endpoint
            // Build SPARQL query for historical administrative boundaries
            console.log(`[Cliopatria query] "${query}" year=${year}`);
            return [];
        },
    };
}
/**
 * OpenDomesday places API.
 * 1086 AD location data (points only, no polygon boundaries).
 * Free, no API key required.
 */
export function makeOpenDomesdaySource() {
    return {
        id: 'history:opendomesday',
        name: 'OpenDomesday',
        endpoint: 'https://opendomesday.org/api/',
        description: '1086 AD Doomsday Book place locations',
        timeRange: { minYear: 1086, maxYear: 1086 },
        search: async (query, year) => {
            if (year !== 1086)
                return [];
            // Integration point for OpenDomesday API
            // Returns point locations for places (no polygon data available)
            console.log(`[OpenDomesday query] "${query}"`);
            return [];
        },
    };
}
/**
 * Geofabrik OSM administrative boundaries.
 * Modern political boundaries from OpenStreetMap.
 * Free, no API key required.
 */
export function makeGeofabrikSource() {
    return {
        id: 'admin:geofabrik',
        name: 'Geofabrik OSM',
        endpoint: 'https://download.geofabrik.de/',
        description: 'OpenStreetMap administrative boundary extracts',
        timeRange: { minYear: 2000, maxYear: 2030 },
        search: async (query, year) => {
            // Integration point for Geofabrik boundary tiles
            // Use pre-downloaded extracts for the Five Towns region
            console.log(`[Geofabrik query] "${query}" year=${year}`);
            return [];
        },
    };
}
/**
 * Zenodo GPlates geological data.
 * Tectonic plate boundaries and geological provinces.
 * Free, no API key required.
 */
export function makeZenodoGeologySource() {
    return {
        id: 'geology:zenodo',
        name: 'Zenodo GPlates GeoData',
        description: 'Global tectonic plates and geological provinces',
        timeRange: { minYear: -4_540_000_000, maxYear: 2000 },
        search: async (query, _year) => {
            // Integration point for Zenodo GPlates data
            // Already ingested locally via ingest/geology.ts
            console.log(`[Zenodo Geology query] "${query}"`);
            return [];
        },
    };
}
// ─── Factory ─────────────────────────────────────────────────────────────────
/**
 * Create a fully configured EmbeddingSearchPipeline with all known sources.
 */
export function createSearchPipeline() {
    const pipeline = new EmbeddingSearchPipeline();
    pipeline.registerSource(makeCliopatriaSource());
    pipeline.registerSource(makeOpenDomesdaySource());
    pipeline.registerSource(makeGeofabrikSource());
    pipeline.registerSource(makeZenodoGeologySource());
    return pipeline;
}
//# sourceMappingURL=embeddings.js.map