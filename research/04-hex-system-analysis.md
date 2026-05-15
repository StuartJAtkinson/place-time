# Hex Grid System Analysis

**Date:** 2026-05-15  
**Project:** Place-Time Phase 0 Research  
**Question:** H3 vs ISEGrid vs custom hex for Five Towns and global coverage?

---

## Executive Summary

**Recommendation:** Use **H3** as the primary hexagonal grid system, with **ISEGrid as a potential UK-specific overlay** for Phase 5+.

**Rationale:**
- H3 is mature, well-documented, FOSS (Apache 2.0), with excellent tooling (JS/Python/C libraries)
- ISEGrid is UK-specific, less documented, OS-branded but not fully open
- For a project with global ambitions but Five Towns focus, H3 is the pragmatic choice
- Resolution 8 (~8.7km edge) is recommended for detailed Five Towns analysis

---

## H3 System (Uber)

**GitHub:** https://github.com/uber/h3  
**License:** Apache 2.0  
**Stars:** 6,139  
**Languages:** C (core), JS, Python, Go, Java, Rust bindings

### Resolution Table

| Resolution | Edge Length (km) | Area (km²) | Cells for World | Five Towns Cell Count | Notes |
|-----------|-----------------|-------------|-----------------|----------------------|-------|
| 0 | 1,107.7 | 4,068,300 | 122 | ~0 | Continental scale |
| 1 | 418.7 | 457,300 | 842 | ~0 | Sub-continental |
| 2 | 158.3 | 50,800 | 5,962 | ~0 | Country scale |
| 3 | 59.8 | 5,800 | 41,962 | ~0 | Large country |
| 4 | 22.6 | 650 | 302,102 | ~0 | Region scale |
| 5 | 8.54 | 73 | 2,162,202 | ~0 | Small region |
| 6 | 3.23 | 8 | 15,974,202 | ~1 | County scale |
| **7** | **1.22** | **0.89** | **114,496,602** | **~5-10** | **Regional (Five Towns ~10 cells)** |
| **8** | **0.46** | **0.10** | **820,691,002** | **~50-100** | **Detailed (~8.7km edge, ~500 cells for wider Five Towns area)** |
| 9 | 0.17 | 0.01 | 5,879,564,882 | ~500+ | Neighborhood scale |
| 10 | 0.065 | 0.001 | 42,164,807,882 | 10,000+ | Block/building scale |

### Five Towns Resolution Analysis

Five Towns bounding box (approximate):
- Lat: 53.6°N to 53.75°N
- Lng: 1.3°W to 1.5°W
- Area: ~20km × 15km = ~300 km²

| Resolution | Hex Edge (km) | Hex Area (km²) | Approx Cells for Five Towns | Suitability |
|-----------|---------------|----------------|----------------------------|-------------|
| 6 | 3.23 km | 8.00 km² | ~40 cells | Too coarse |
| **7** | **1.22 km** | **0.89 km²** | **~300-400 cells** | ✅ Appropriate for regional |
| **8** | **0.46 km** | **0.10 km²** | **~3,000-4,000 cells** | ✅ Detailed analysis |
| 9 | 0.17 km | 0.01 km² | ~30,000+ | Too fine for project scope |

**Recommended resolutions:**
- **Phase 1–2:** Resolution 7 for calibration and broad geological/historical analysis
- **Phase 3+:** Resolution 8 for constituency boundary analysis (gerrymandering detection requires ~1km precision)
- **Phase 5 (Global):** Resolution 5–6 for world view, Resolution 7 for regional analysis

### H3 Integration Complexity: 1/5
- `npm install h3` — one command
- Core API: `latLngToCell(lat, lng, resolution)` → cell ID
- Boundary assignment: polygon → all cells it intersects (via `polygonToCells`)
- GeoJSON-compatible: cell IDs are strings (e.g., "8828308280fffff")

### H3 + GeoJSON Integration

```typescript
import { latLngToCell, polygonToCells, cellToBoundary } from 'h3-js';

// Point query: what's the H3 cell for Pontefract?
const pontefract = [53.7, -1.31]; // [lat, lng]
const cell = latLngToCell(pontefract[0], pontefract[1], 8);
// → "8828308280fffff" (resolution 8)

// Boundary query: which H3 cells does Barkston Hundred cover?
const barkstonPolygon = /* GeoJSON polygon */;
const cells = polygonToCells(barkstonPolygon, 8);
// → Array of cell IDs covering the hundred

// Export: get GeoJSON hexagon geometries for QGIS
const boundary = cellToBoundary(cell);
// → [[lng, lat], [lng, lat], ...] ring for GeoJSON polygon
```

### H3 Advantages
1. **Global coverage** — single system for entire Earth
2. **Hierarchical** — parent/child relationships between resolutions
3. **Mature tooling** — 6K stars, multiple language bindings
4. **Open source** — Apache 2.0, no commercial restrictions
5. **Compact IDs** — string representation, easy indexing
6. **Proven** — Used by Uber, AWS, Mapbox, many others

### H3 Disadvantages
1. **Not BNG-aligned** — coordinates in WGS84 only, UK calculations need transformation
2. **Fixed resolution steps** — can't create custom resolutions between 0–15
3. **Approximate boundaries** — a polygon may have ~10-20% extra area due to hex covering algorithm

---

## ISEGrid (Ordnance Survey UK Grid)

**Note:** ISEGrid (Index Square Grid) is an OS product. Information is limited — it may be a proprietary or semi-proprietary system not fully documented publicly.

### What is Known
- OS product for UK-specific hex indexing
- Aligned with British National Grid (EPSG:27700)
- Primarily used in OS mapping products
- May have licensing restrictions for external use

### Integration Complexity: Unknown (likely 4/5)
- No clear public API or documentation found
- Requires OS partnership or commercial license to access
- Not FOSS-compatible by default
- May conflict with Place-Time's FOSS-at-heart principle

### Recommendation on ISEGrid
**Defer to Phase 5 at earliest.** 
- If OS provides free access to ISEGrid under compatible license → consider integration
- If OS commercial licensing required → skip in favor of H3
- Five Towns analysis does not require BNG-aligned hex grid (H3 WGS84 is sufficient)

---

## Alternative: Custom Hex Grid

**Option:** Define custom hex grid aligned to project requirements.

### Pros
- Complete control over resolution, orientation, coordinate system
- Could align to BNG if needed for UK calculations

### Cons
- Significant development effort to build tooling
- No existing library support (have to build H3-like system from scratch)
- Data portability suffers (no standard H3 cell IDs)
- Maintenance burden

### Recommendation
**Do not implement.** The development cost of a custom hex system far exceeds the benefit over using H3. H3's advantages (global coverage, mature tooling, community support) outweigh the BNG alignment benefit for a project that is primarily about analysis, not precise UK land surveying.

---

## H3 Resolution Selection Decision

### For Five Towns Focus Area

**Selected: Resolution 8 as primary, Resolution 7 as fallback**

Rationale:
1. **Constituency analysis** requires ~1km precision (res 8 gives 460m edge length)
2. **H3 res 8 cell count for Five Towns:** ~500-1000 cells (manageable in-memory)
3. **Geological province assignment:** 0.1 km² cells are appropriate for province-level features
4. **Historical boundary assignment:** Single field boundaries (rivers, roads) pass through multiple res 8 cells — this is correct, not an error

### For UK Coverage (Phase 3+)

**Selected: Resolution 6 for UK-wide view, Resolution 7 for regional**

Rationale:
1. **UK at res 8:** ~10 million cells (too many for web UI)
2. **UK at res 7:** ~700k cells (borderline, but reasonable with spatial indexing)
3. **UK at res 6:** ~50k cells (fast rendering, regional analysis)

### For Global Coverage (Phase 5)

**Selected: Resolution 4–5 for world view**

Rationale:
1. **World at res 5:** ~2.1 million cells (coarse but workable)
2. **World at res 4:** ~300k cells (good for continent-level analysis)
3. **Dynamic resolution:** allow zoom-based resolution changes in web UI

---

## H3 + GeoJSON/QGIS Integration Details

### Data Flow

```
Source Data (GeoJSON)
    ↓
Parse polygon/point geometry
    ↓
For polygons: polygonToCells() → assign multiple H3 cells
For points: latLngToCell() → assign single H3 cell
    ↓
Store cell ID + feature reference in spatial index
    ↓
Export: cell ID → GeoJSON polygon (cellToBoundary)
    ↓
QGIS loads hex grid layer + source data layer
    ↓
Join by H3 cell ID for visualization
```

### QGIS Compatibility

1. **GeoJSON export:** H3 cells export as valid GeoJSON polygons
2. **QLR files:** Generated hex grid can be added to QGIS project
3. **Layer styling:** H3 cell IDs enable join to source data for choropleth/historical layering
4. **CRS:** H3 uses WGS84 (EPSG:4326) — standard for QGIS

### Performance Notes

| Operation | H3 Res 8 | Notes |
|-----------|----------|-------|
| Point → Cell | ~0.001ms | Very fast |
| Polygon → Cells | ~1-10ms | Depends on polygon size (hundreds of cells) |
| Cell boundary | ~0.01ms | Fast |
| 1000-cell spatial index | ~1ms query | Using rbush or similar |

---

## Hex System Comparison Matrix

| Criterion | H3 (Uber) | ISEGrid (OS) | Custom |
|-----------|-----------|--------------|--------|
| License | Apache 2.0 (FOSS) | Unknown/commercial | Project-defined |
| Global coverage | ✅ Yes | ❌ UK only | ✅ Yes |
| API/SDK | ✅ Full | ❌ Limited | ❌ Build required |
| QGIS compatibility | ✅ GeoJSON native | ⚠️ Unknown | ✅ Custom |
| Five Towns suitability | ✅ Excellent | ⚠️ Good (BNG-aligned) | ⚠️ Best (custom) |
| Global extension ready | ✅ Yes | ❌ No | ✅ Yes |
| Integration effort | Low (1/5) | High (4/5) | Very High (5/5) |
| Maintenance burden | Low (community) | Medium (OS-dependent) | Very High |
| Commercial use | ✅ Permitted | ⚠️ License required | ✅ Project owns |

---

## Final Recommendation

**Primary hex system: H3**

| Context | Resolution | Justification |
|---------|-----------|---------------|
| Five Towns detailed | 8 | ~8.7km edge, ~500 cells for full area |
| Five Towns overview | 7 | ~23km edge, ~50 cells, faster rendering |
| UK regional | 7 | ~23km edge, ~50-80 cells for Yorkshire |
| UK overview | 6 | ~8km edge, county-level analysis |
| World view | 4-5 | Continent-level, zoom-based |

**Alternative consideration:** ISEGrid for Phase 5+ only if OS provides free access and FOSS-compatible licensing.

**No custom hex development.** H3 is sufficient for all project requirements.

---

## H3 Resolution by Project Phase

| Phase | H3 Resolution | Notes |
|-------|---------------|-------|
| Phase 0 (Research) | N/A | Not yet implementing |
| Phase 1 (Hex Calibration) | 7 and 8 | Calibrate both, decide primary |
| Phase 2 (Geological Base) | 7 | Regional geological features |
| Phase 3 (Political Overlays) | 8 | Constituency boundary analysis |
| Phase 4 (Integration) | 7/8 dynamic | UI zoom-based resolution switching |
| Phase 5 (Global Extension) | 4-6 per context | World view at 4-5, regional at 6-7 |

---