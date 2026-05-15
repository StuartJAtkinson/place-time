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
import { DEFAULT_CONFIG, yearToPosition, positionToYear, geologicalEpochAtPosition, politicalEpochAtPosition } from './timescale.js';
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
export function resolutionFromTimePos(timePos) {
    const maxRes = 15;
    const minRes = 0;
    if (timePos >= 1)
        return maxRes;
    if (timePos <= 0)
        return minRes;
    // Logarithmic interpolation from earth-scale to 1-meter scale
    // log10(earth_diameter_meters) = log10(12_742_000) ≈ 7.105
    // At timePos=0: log10(cell_size_m) = 7.105 → res 0
    // At timePos=1: log10(cell_size_m) = 0         → res 15
    // Scale factor: 7.105 / 15 ≈ 0.473 per res
    const logEarthM = Math.log10(EARTH_CIRCUMFERENCE_M);
    const logCellSize = logEarthM * (1 - timePos); // 7.1 at pos 0, 0 at pos 1
    const res = Math.floor(logCellSize / (logEarthM / maxRes));
    return Math.max(minRes, Math.min(maxRes, res));
}
/**
 * Reverse: given an H3 resolution, what timePos would produce it?
 * (useful for mapping geological epoch boundaries to time positions)
 */
export function timePosFromResolution(resolution) {
    const maxRes = 15;
    const logEarthM = Math.log10(EARTH_CIRCUMFERENCE_M);
    const logCellSize = (logEarthM / maxRes) * resolution;
    return 1 - (logCellSize / logEarthM);
}
/**
 * Build a HexaLogCoord from a query.
 * Requires either year or timePos. If lat/lng provided, resolves H3 cell.
 */
export function buildHexaLogCoord(query, config = DEFAULT_CONFIG) {
    // Resolve time
    let timePos;
    if (query.year !== undefined) {
        timePos = yearToPosition(config, query.year);
    }
    else if (query.timePos !== undefined) {
        timePos = query.timePos;
    }
    else {
        timePos = 0.5; // Default: mid-scale (Pleistocene)
    }
    // Resolve space
    const spacePos = query.spacePos ?? 0.5;
    // Resolve H3 resolution from time position (spatial scale is time-dependent)
    const h3Res = resolutionFromTimePos(timePos);
    // Resolve H3 cell if lat/lng provided
    let h3Cell = null;
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
/**
 * Generate a HexaLogCell for a given query.
 */
export function getHexaLogCell(query) {
    const coord = buildHexaLogCoord(query);
    let geometry;
    let centroid;
    let children;
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
    }
    else {
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
export function getHexaLogNeighbors(cellId, timePos) {
    return gridDisk(cellId, 1).filter(id => id !== cellId);
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
    sources = [];
    ollamaUrl;
    constructor(ollamaUrl = 'http://localhost:11434') {
        this.ollamaUrl = ollamaUrl;
    }
    addSource(source) {
        this.sources.push(source);
    }
    /**
     * Generate embedding for a query using local Ollama model.
     */
    async embed(text, model = 'nomic-embed-text') {
        const response = await fetch(`${this.ollamaUrl}/api/embeddings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, prompt: text }),
        });
        if (!response.ok) {
            throw new Error(`Ollama embedding failed: ${response.status}`);
        }
        const data = await response.json();
        return data.embedding;
    }
    /**
     * Cosine similarity between two vectors.
     */
    cosineSim(a, b) {
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
    buildSearchContext(h3Cell, year, h3Res) {
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
    approximateHexArea(res) {
        const areas = {
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
    async search(h3Cell, year, options = {}) {
        const { maxIterations = 3, confidenceThreshold = 0.75, expandToNeighbors = true, } = options;
        const h3Res = resolutionFromTimePos(yearToPosition(DEFAULT_CONFIG, year));
        const context = this.buildSearchContext(h3Cell, year, h3Res);
        const queryEmbedding = await this.embed(context);
        const results = [];
        let currentCells = [h3Cell];
        let iteration = 0;
        while (iteration < maxIterations && results.length === 0) {
            for (const cell of currentCells) {
                for (const source of this.sources) {
                    const sourceResults = await this.searchSource(source, cell, year, queryEmbedding, h3Res);
                    results.push(...sourceResults);
                }
            }
            if (results.length > 0)
                break;
            // Expand search space
            iteration++;
            if (expandToNeighbors && iteration < maxIterations) {
                const expanded = new Set();
                for (const cell of currentCells) {
                    gridDisk(cell, iteration).forEach(n => expanded.add(n));
                }
                currentCells = [...expanded];
            }
        }
        // Sort by confidence and return
        return results.sort((a, b) => b.confidence - a.confidence);
    }
    async searchSource(source, h3Cell, year, queryEmbedding, h3Res) {
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
        }
        catch {
            // Source unavailable or error — skip
        }
        return [];
    }
}
// ─── H3 Resolution to Position Utilities ──────────────────────────────────────
/**
 * At a given timePos, what is the approximate edge length of an H3 hex in meters?
 */
export function hexEdgeLengthM(resolution) {
    // H3 cell edge lengths by resolution (approximate, in meters)
    const edges = {
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
export function hexAreaKm2(resolution) {
    // Approximate hex area by resolution (km²)
    const areas = {
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
export function describeResolution(timePos) {
    const res = resolutionFromTimePos(timePos);
    const edgeM = hexEdgeLengthM(res);
    const areaKm2 = hexAreaKm2(res);
    const year = positionToYear(DEFAULT_CONFIG, timePos);
    if (res <= 2)
        return `Continental scale (~${areaKm2.toExponential(1)} km² per hex)`;
    if (res <= 4)
        return `Regional scale (~${areaKm2.toFixed(0)} km² per hex, ~${(edgeM / 1000).toFixed(0)} km edge)`;
    if (res <= 6)
        return `County-scale (~${areaKm2.toFixed(1)} km² per hex, ~${edgeM.toFixed(0)} m edge)`;
    if (res <= 8)
        return `Town-scale (~${areaKm2.toFixed(2)} km² per hex, ~${edgeM.toFixed(0)} m edge)`;
    if (res <= 11)
        return `Building-scale (~${edgeM.toFixed(1)} m edge, ~${(areaKm2 * 1e6).toFixed(0)} m² per hex)`;
    return `Precision (~${edgeM.toFixed(2)} m edge)`;
}
//# sourceMappingURL=hexalog.js.map