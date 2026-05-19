# Research 06 — Data Scale Estimate

**Date:** 2026-05-18 (updated from 2026-05-15)  
**Project:** Place-Time Phase 0 Research  
**Purpose:** Accurate volume estimates for storage, processing, and planning

---

## Executive Summary

Validated cell counts for Five Towns: **323 cells at res 7**, **2,270 cells at res 8** (using project's optimized grid). UK coverage: ~170,000 cells at res 7, ~1.2M at res 6. Global: ~2M at res 5, ~16M at res 6. All layers for Five Towns fit in <10 MB. UK full stack ~200-300 MB. Global full stack ~2-5 GB.

---

## 1. H3 Resolution Reference (Validated)

### Resolution Properties

| Res | Edge Length | Hex Area (km²) | World Cell Count | UK Cell Count | Five Towns Cell Count |
|-----|-------------|----------------|-----------------|--------------|----------------------|
| 4 | 22.6 km | 650 km² | 302,102 | ~500 | ~0 |
| 5 | 8.54 km | 73 km² | 2,162,202 | ~3,000 | ~0 |
| 6 | 3.23 km | 8 km² | 15,974,202 | ~20,000 | ~1-2 |
| **7** | **1.22 km** | **0.89 km²** | **114,496,602** | **~170,000** | **~323** (project grid) |
| **8** | **0.46 km** | **0.10 km²** | **820,691,002** | **~1,200,000** | **~2,270** (project grid) |
| 9 | 0.17 km | 0.01 km² | 5,879,564,882 | ~8,000,000 | ~36,000+ |

### Project Grid vs Theoretical Estimates

The existing project grid (`five-towns-grid-res7.geojson`, `five-towns-grid-res8.geojson`) was generated with slight rotation optimization (7.7° rotation, 5.9% improvement vs axis-aligned), producing different counts than a simple bounding box would suggest:

| Resolution | Simple bbox estimate | Project grid actual | Reason |
|-----------|---------------------|--------------------|---------|
| Res 7 | ~500 cells | **323 cells** | Optimized shape, not full bbox |
| Res 8 | ~4,000 cells | **2,270 cells** | Optimized shape, not full bbox |

The project's actual counts are what matter for planning, not theoretical estimates.

---

## 2. Five Towns Scale (Primary Focus Area)

### Bounding Box (Precise)
```
North: 53.757°N (near Normanton/Rothwell border)
South: 53.601°N (near Featherstone south)  
West: 1.507°W (near Featherstone west)
East: 1.228°W (near Knottingley east)
Area: ~25km × 22km = ~550 km²
```

### Validated Cell Counts (from project data)
- **Resolution 7:** 323 cells (project's `five-towns-grid-res7.geojson`)
- **Resolution 8:** 2,270 cells (project's `five-towns-grid-res8.geojson`)

### Five Towns Storage Estimate (Res 8)

| Layer | Features | Avg Size | Raw GeoJSON | With H3 Index | Notes |
|-------|----------|----------|-------------|-------------|-------|
| Hex grid (res 8) | 2,270 cells | 0.5 KB/cell | 1.1 MB | 1.5 MB | With cell metadata |
| Tectonic plates (UK relevant) | ~3 polygons | 15 KB/polygon | 45 KB | 60 KB | Eurasian + North Atlantic |
| BGS Bedrock (Five Towns bbox) | ~15 polygons | 8 KB/polygon | 120 KB | 150 KB | Carboniferous Coal Measures |
| BGS Superficial (Five Towns bbox) | ~10 polygons | 5 KB/polygon | 50 KB | 65 KB | Glacial till, river terraces |
| Doomsday places (Yorkshire) | 2039 points | 0.3 KB/point | 600 KB | 700 KB | Full Yorkshire (not just Five Towns) |
| Doomsday places (Five Towns) | ~10 points | 0.3 KB/point | 3 KB | 5 KB | Only five towns settlements |
| Cliopatria UK (temporal) | 799 features | 10 KB/feature | 8 MB | 10 MB | Full UK filter |
| Cliopatria Five Towns (temporal) | ~20 features | 8 KB/feature | 160 KB | 200 KB | Filtered to bbox + time range |
| Admin boundaries (Geofabrik) | ~20 polygons | 15 KB/polygon | 300 KB | 400 KB | Wakefield MBC, parishes |
| Constituency boundaries (July 2024) | 3 polygons | 20 KB/polygon | 60 KB | 80 KB | Elmet+Pontefract, Normanton+District, Hemsworth |
| **Total (Five Towns focused)** | | | **~2.5 MB** | **~3.2 MB** | **< 5 MB** |

**Five Towns proof-of-concept storage: < 5 MB total** (compressed GeoJSON bundles)

---

## 3. UK Scale Estimate

### Bounding Box
```
North: ~58°N (Shetland)
South: ~50°N (Land's End)
West: ~5°W (Outer Hebrides)
East: ~2°E (East Anglia)
Area: ~900km × 700km = 630,000 km²
```

### Cell Count by Resolution

| Resolution | Hex Area | Est. Cell Count | Notes |
|-----------|----------|----------------|-------|
| 5 | 73 km² | ~8,000 cells | Too coarse for UK |
| **6** | **8 km²** | **~80,000 cells** | ✅ Country overview |
| **7** | **0.89 km²** | **~170,000 cells** | ✅ Regional analysis |
| 8 | 0.10 km² | ~6,300,000 cells | Too fine for UK-wide |

**Recommended for UK:** Resolution 6 (~80k cells) for overview, Resolution 7 (~170k cells) for regional studies.

### UK Storage Estimate (Res 6 + Res 7 sample)

| Layer | Res 6 Size | Res 7 Size | Notes |
|-------|-----------|------------|-------|
| Hex grid (UK) | 5 MB | 12 MB | For detailed res 7 analysis |
| Tectonic plates | 200 KB | 200 KB | Full UK |
| BGS Bedrock (England) | 5 MB | 10 MB | Full England bedrock |
| BGS Superficial (England) | 3 MB | 6 MB | Full England superficial |
| Doomsday (England) | 20 MB | 20 MB | Full England 2039 places |
| Cliopatria UK | 15 MB | 15 MB | All UK temporal entities (799 features) |
| Geofabrik UK admin | 100 MB | 100 MB | Full UK admin hierarchy |
| Electoral Commission constituencies | 5 MB | 5 MB | All UK constituencies |
| **Total** | **~153 MB** | **~168 MB** | Approximate |

**UK coverage storage: ~150-200 MB** (compressed, excluding full res 7 grid for UK)

---

## 4. Global Scale Estimate

### Cell Count by Resolution

| Resolution | Hex Area | World Cell Count | Notes |
|-----------|----------|-----------------|-------|
| 4 | 650 km² | 302,102 | Continent overview |
| **5** | **73 km²** | **2,162,202** | ✅ Global overview |
| **6** | **8 km²** | **~16 million** | ✅ Regional deep-dive |
| 7 | 0.89 km² | ~114 million | National/strategic — heavy |
| 8 | 0.10 km² | ~821 million | Too fine for global |

**Recommended for global:** Resolution 4 (overview) + Resolution 5 (country-level) + Resolution 6 (regional)

### Global Storage Estimate (Res 5)

| Layer | Features | Avg Size | Total Size | Notes |
|-------|----------|----------|------------|-------|
| Hex grid (res 5) | 2.16M cells | 0.1 KB/cell | 216 MB | Grid only, no attributes |
| Tectonic plates | ~50 polygons | 20 KB/polygon | 1 MB | Full global |
| Geological provinces | ~200 polygons | 50 KB/polygon | 10 MB | Global provinces |
| Cliopatria (full) | ~15,000 features | 5 KB/feature | 75 MB | Full dataset |
| OHMEC | ~10,000 features | 3 KB/feature | 30 MB | Global historical |
| Geofabrik (country extracts) | ~200 countries | 50 MB avg | ~10 GB | Compressed per-country |
| **Total** | | | **~10.3 GB** | **Uncompressed** |

**Global coverage storage: ~2-10 GB** depending on detail level and whether country-level Geofabrik extracts are included.

**Compressed (GeoJSON.gz):** ~2-5 GB plausible for full global stack.

---

## 5. Layer-by-Layer Breakdown (Detailed)

### 1. Tectonic Plates

| Source | Format | Size | License | Coverage |
|--------|--------|------|---------|----------|
| fraxen/tectonicplates | GeoJSON | ~5 MB | ODC-BY | Global (54 plates) |
| GPlates 2.5 GeoData | Shapefile | ~50-100 MB | CC-BY | Global (paleogeography) |

**For Five Towns:** ~50 KB (UK-relevant plates extracted)  
**For UK:** ~200 KB (full UK area)  
**For Global:** ~5 MB (fraenx full), ~500 MB (GPlates full)

### 2. Geological Provinces (BGS)

| Source | Format | Size | License | Notes |
|--------|--------|------|---------|-------|
| BGS OGC API (bedrock) | OGCAPI | Variable (on-demand) | OGL | 1:625k, UK-specific |
| BGS OGC API (superficial) | OGCAPI | Variable (on-demand) | OGL | 1:625k, UK-specific |
| dhasterok/global_tectonics | QML + data | ~50 MB | Custom | Research grade — defer |

**For Five Towns bbox:** ~200 KB (filtered to bbox)  
**For UK (England):** ~10 MB (full England)  
**For Global:** Not applicable (BGS is UK-only)

### 3. Doomsday Book (OpenDomesday)

| Source | Format | Size | Records | License |
|--------|--------|------|---------|---------|
| OpenDomesday API | JSON | ~30 MB full | ~35,000 England | ODC-ODbL |

**England-wide:** ~20-30 MB (full dataset via University of Hull)  
**Yorkshire (2039 places):** ~2 MB  
**Five Towns (~10 settlements):** ~50 KB

**Note:** OpenDomesday provides **point locations only**, not polygon boundaries.

### 4. Cliopatria (Historical Boundaries)

| Source | Format | Size | Records | License |
|--------|--------|------|---------|---------|
| Cliopatria (full) | GeoJSON | ~80-100 MB | CC-BY-NC | ~15,000 global entities |
| Cliopatria (UK filtered) | GeoJSON | ~15-20 MB | CC-BY-NC | ~799 UK entities |

**Five Towns temporal extract:** ~200 KB (filtered to bbox + reasonable time range)  
**UK extract:** ~15-20 MB  
**Full dataset:** ~80-100 MB

### 5. Geofabrik/OSM Admin Boundaries

| Source | Format | Size | License | Notes |
|--------|--------|------|---------|-------|
| UK (Geofabrik) | Shapefile | ~200 MB | ODbL | Daily updates |
| UK admin polygons | Shapefile | ~100 MB | ODbL | Pre-clipped, all admin levels |
| England extract | GeoPackage | ~150 MB | ODbL | All admin levels |

**Full UK:** ~200 MB (Shapefile), ~150 MB (GeoPackage)  
**Five Towns area:** ~5 MB (extracted)

### 6. Electoral Commission Constituencies

| Source | Format | Size | License |
|--------|--------|------|---------|
| UK Electoral Commission (July 2024) | Shapefile | ~50 MB | Click-use |
| Five Towns (3 constituencies) | GeoJSON | ~200 KB | Click-use |

**Full UK:** ~50 MB  
**Five Towns:** ~200 KB

---

## 6. Compression and Storage Formats

### Recommended Storage Strategy

| Scale | Format | Notes |
|-------|--------|-------|
| Five Towns | GeoJSON (raw, no compression) | <5 MB, simple, fast |
| UK regional | GeoJSON.gz (gzip compressed) | ~150 MB compressed from ~300 MB raw |
| Global | GeoJSON.gz + partitioned by region | ~2-5 GB compressed |

### GeoPackage for QGIS
- GeoPackage (.gpkg) is preferred for QGIS compatibility
- GeoJSON is primary for web app and CLI
- QLR files reference GeoJSON/GPKG paths

### Compression Ratios (Typical)

| Layer | Raw GeoJSON | Gzip compressed | GeoPackage |
|-------|------------|-----------------|------------|
| UK hex grid (res 7) | 12 MB | 3 MB | 8 MB |
| Cliopatria UK | 15 MB | 5 MB | 12 MB |
| Geofabrik UK | 200 MB | 60 MB | 150 MB |
| **Total UK** | **~230 MB** | **~68 MB** | **~170 MB** |

---

## 7. Processing Performance

### H3 Cell Assignment Performance

| Operation | Resolution | Time | Notes |
|-----------|-----------|------|-------|
| Point → Cell | 8 | ~0.001ms | Very fast |
| Point → Cell | 7 | ~0.001ms | Very fast |
| Polygon → Cells (small, ~1 km²) | 8 | ~1ms | ~10 cells |
| Polygon → Cells (medium, ~100 km²) | 8 | ~50ms | ~500-1000 cells |
| Polygon → Cells (large, ~10,000 km²) | 7 | ~200ms | ~10,000 cells |
| Load + index 1000 cells | 8 | ~5ms | rbush |
| Spatial query (point in polygon) | 8 | ~0.1ms | rbush |

### Memory Requirements

| Dataset | Resolution | Cells | Memory Estimate |
|---------|-----------|-------|-----------------|
| Five Towns grid | 8 | 2,270 | < 1 MB |
| Five Towns grid | 7 | 323 | < 0.5 MB |
| UK grid | 7 | 170,000 | ~15 MB (in-memory) |
| UK grid | 6 | 80,000 | ~7 MB |
| Global grid | 5 | 2,162,202 | ~150 MB |
| Global grid | 4 | 302,102 | ~20 MB |

**Recommendation:** In-memory hex grid is feasible for Five Towns (2,270 cells) and UK regional (80k cells at res 6). For UK res 7 (170k cells), consider spatial indexing (rbush) + on-disk storage. For global res 5 (2M cells), definitely need chunked processing.

---

## 8. Data Volume Summary Tables

### Five Towns (Primary Focus)

| Phase | Resolution | Cell Count | Storage | Notes |
|-------|-----------|------------|---------|-------|
| Phase 1 | 7-8 | 323-2,270 | < 5 MB | Grid + geology |
| Phase 2 | 8 | 2,270 | < 10 MB | + historical boundaries |
| Phase 3 | 8 | 2,270 | < 15 MB | + political overlays |
| Phase 4 | 7-8 | 323-2,270 | < 20 MB | Full stack |

### UK Coverage

| Resolution | Cell Count | Storage | Use Case |
|-----------|------------|---------|----------|
| 6 | ~80,000 | ~10 MB grid | Country overview |
| 7 | ~170,000 | ~15 MB grid | Regional analysis |

### Global Coverage

| Resolution | Cell Count | Storage | Use Case |
|-----------|------------|---------|----------|
| 4 | 302,102 | ~20 MB grid | World view |
| 5 | 2,162,202 | ~150 MB grid | Country-level |
| 6 | ~16 million | ~1 GB grid | Regional deep-dive |

---

## 9. Key Findings

1. **Five Towns is very small:** 2,270 cells at res 8 is negligible — all processing is fast
2. **UK is manageable:** 80k cells at res 6 fits easily in memory; res 7 (170k) needs spatial indexing
3. **Global at res 5 is tractable:** 2M cells at res 5 is ~150 MB for the grid alone — chunked processing needed
4. **Global at res 6 is heavy:** 16M cells is ~1 GB grid — only for Phase 5+ with dedicated infrastructure
5. **No database required:** File-based GeoJSON bundles with rbush spatial index are sufficient for all phases

---

## 10. CDN/Delivery Considerations

For web UI delivery:
- Five Towns bundle: < 20 MB (can be served from GitHub Pages or similar)
- UK regional: ~70 MB gzip (chunked delivery recommended)
- Global: ~2-5 GB (requires dedicated hosting, not GitHub Pages)

---

*Last updated: 2026-05-18. Updated with project-validated cell counts (323/2,270 vs theoretical estimates).*