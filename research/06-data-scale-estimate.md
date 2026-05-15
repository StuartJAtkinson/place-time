# Data Scale Estimate

**Date:** 2026-05-15  
**Project:** Place-Time Phase 0 Research  
**Purpose:** Accurate volume estimates for storage, processing, and planning

---

## H3 Resolution Reference

For scale calculations, using H3 resolution 8 as primary (detailed Five Towns analysis) and resolution 7 as secondary (regional overview).

| Resolution | Edge Length | Hex Area | World Cell Count | UK Cell Count | Five Towns Cell Count |
|------------|-------------|----------|-----------------|--------------|---------------------|
| 4 | 22.6 km | 650 km² | 302,102 | ~500 | ~0 |
| 5 | 8.54 km | 73 km² | 2,162,202 | ~3,000 | ~0 |
| 6 | 3.23 km | 8 km² | 15,974,202 | ~20,000 | ~1 |
| **7** | **1.22 km** | **0.89 km²** | **114,496,602** | **~170,000** | **~5-10** |
| **8** | **0.46 km** | **0.10 km²** | **820,691,002** | **~1,200,000** | **~50-100** (wider area ~500) |

---

## Five Towns Scale Estimate

### Bounding Box
- **North:** ~53.75°N (near Normanton)
- **South:** ~53.60°N (near Featherstone south)
- **West:** ~1.50°W (near Featherstone west)
- **East:** ~1.25°W (near Knottingley east)
- **Approximate area:** 20km × 18km = ~360 km²

### Cell Count by Resolution

| Resolution | Hex Edge | Hex Area | Est. Cell Count for Five Towns | Notes |
|-----------|----------|----------|------------------------------|-------|
| 6 | 3.23 km | 8 km² | ~50 cells | Coarse, one cell covers multiple towns |
| **7** | **1.22 km** | **0.89 km²** | **~400 cells** | ✅ Appropriate for regional analysis |
| **8** | **0.46 km** | **0.10 km²** | **~4,000 cells** | ✅ Detailed analysis, 500 for tighter bounding box |
| 9 | 0.17 km | 0.01 km² | ~36,000+ | Too fine for project scope |

**Practical counts:**
- **Resolution 7:** ~400 cells for broad Five Towns area (includes surrounding countryside)
- **Resolution 8:** ~500 cells for focused bounding box, ~4,000 for extended area

### Storage Estimate: Five Towns (Res 8)

| Layer | Features | Avg Geometry Size | Raw GeoJSON | With H3 Index | Notes |
|-------|----------|-----------------|------------|-------------|-------|
| Hex grid (res 8) | 500 cells | 0.5 KB/cell | 250 KB | 350 KB | With cell metadata |
| Tectonic plates | ~5 polygons | 10 KB/polygon | 50 KB | 80 KB | British Isles plate |
| Geological provinces | ~10 polygons | 5 KB/polygon | 50 KB | 70 KB | Yorkshire Coal Measures + surrounding |
| Doomsday places | ~50 points | 0.3 KB/point | 15 KB | 20 KB | Five Towns area settlements |
| Historical boundaries (Cliopatria) | ~20 polygons | 8 KB/polygon | 160 KB | 200 KB | Key boundary snapshots |
| Admin boundaries (Geofabrik) | ~5 polygons | 15 KB/polygon | 75 KB | 100 KB | LA, parish level |
| Constituency boundaries | ~3 polygons | 10 KB/polygon | 30 KB | 45 KB | Elmet+Normanton constituencies |
| **Total** | | | **~630 KB** | **~865 KB** | **< 1 MB** |

**Five Towns proof-of-concept storage: < 1 MB** (compressed GeoJSON bundles)

---

## UK Scale Estimate

### Bounding Box
- **Extent:** ~50°N–58°N, 5°W–2°E
- **Approximate area:** 900km × 700km = 630,000 km²

### Cell Count by Resolution

| Resolution | Hex Area | Est. Cell Count | Notes |
|-----------|----------|----------------|-------|
| 5 | 73 km² | ~8,000 cells | Too coarse |
| **6** | **8 km²** | **~80,000 cells** | ✅ Country overview |
| **7** | **0.89 km²** | **~700,000 cells** | ✅ Regional analysis (may be heavy) |
| 8 | 0.10 km² | ~6,300,000 cells | Too fine for UK-wide |

**Recommended for UK:** Resolution 6 (county-level, ~80k cells) for overview, Resolution 7 (~700k cells) for detailed regional studies.

### Storage Estimate: UK (Res 6 + Res 7 sample)

| Layer | Res 6 Size | Res 7 Size | Notes |
|-------|-----------|------------|-------|
| Hex grid (UK) | 5 MB | 50 MB | For detailed res 7 analysis |
| Tectonic plates | 200 KB | 200 KB | Full UK |
| Geological provinces | 2 MB | 5 MB | UK bedrock geology |
| Historical boundaries (Cliopatria UK) | 15 MB | 15 MB | All temporal entities |
| Doomsday (England) | 20 MB | 20 MB | Full England 2039 places |
| Admin boundaries (Geofabrik UK) | 80 MB | 80 MB | Full UK admin hierarchy |
| Constituency boundaries | 5 MB | 5 MB | All UK constituencies |
| **Total** | **~127 MB** | **~175 MB** | Approximate |

**UK coverage storage: ~150-200 MB** (compressed, excluding full res 7 grid)

---

## Global Scale Estimate

### Cell Count by Resolution

| Resolution | Hex Area | World Cell Count | Notes |
|-----------|----------|-----------------|-------|
| 4 | 650 km² | 302,102 | Continent overview |
| **5** | **73 km²** | **2,162,202** | ✅ Global overview |
| **6** | **8 km²** | **~16 million** | ✅ Regional deep-dive |
| 7 | 0.89 km² | ~114 million | National/strategic |
| 8 | 0.10 km² | ~821 million | Too fine for global |

**Recommended for global:** Resolution 4 (overview) + Resolution 5 (country-level) + Resolution 6 (regional)

### Storage Estimate: Global (Res 5)

| Layer | Features | Avg Size | Total Size | Notes |
|-------|----------|----------|------------|-------|
| Hex grid (res 5) | 2.16M cells | 0.1 KB/cell | 216 MB | Grid only, no attributes |
| Tectonic plates | ~50 polygons | 20 KB/polygon | 1 MB | Full global |
| Geological provinces | ~200 polygons | 50 KB/polygon | 10 MB | Global provinces |
| Historical boundaries (Cliopatria) | ~15K records | 5 KB/record | 75 MB | Full dataset |
| Admin boundaries (Geofabrik) | Country-level | 100 MB | 100 MB | OSM country polygons |
| OHMEC | ~10K features | 3 KB/feature | 30 MB | Global historical |
| **Total** | | | **~432 MB** | **Compressed** |

**Global coverage storage: ~500 MB to 2 GB** depending on detail level and compression.

---

## Layer-by-Layer Breakdown

### 1. Tectonic Plates

| Source | Format | Size | License | Global/UK/Local |
|--------|--------|------|---------|-----------------|
| fraxen/tectonicplates | GeoJSON | ~5 MB | ODC-BY | Global |
| GPlates 2.5 GeoData | Shapefile | ~50-100 MB | CC-BY | Global |

**For Five Towns:** ~50 KB (British Isles plate extract)  
**For UK:** ~200 KB  
**For Global:** ~5 MB (fraenx), ~500 MB (GPlates full)

### 2. Geological Provinces

| Source | Format | Size | License | Notes |
|--------|--------|------|---------|-------|
| dhasterok/global_tectonics | QML + data | ~50 MB | Custom | Research grade |
| BGS OGC API | OGCAPI | Variable | OGL | UK-specific, on-demand |

**For Five Towns:** ~500 KB (Yorkshire Coal Measures extract)  
**For UK:** ~5-10 MB (full England)  
**For Global:** ~50 MB (global_tectonics full)

### 3. Doomsday Book (OpenDomesday)

| Source | Format | Size | Records | License |
|--------|--------|------|---------|---------|
| OpenDomesday API | JSON | ~30 MB full | ~35,000 England | ODC-ODbL |

**England-wide:** ~20-30 MB  
**Yorkshire (2039 places):** ~2 MB  
**Five Towns (~50 places):** ~50 KB

### 4. Cliopatria (Historical Boundaries)

| Source | Format | Size | Records | License |
|--------|--------|------|---------|---------|
| Cliopatria (Zenodo) | GeoJSON | ~80-100 MB | ~15,000 records | CC-BY-NC |

**UK extract (temporal):** ~15-20 MB  
**Five Towns temporal:** ~200 KB (focused area + time range)

### 5. Geofabrik/OSM Admin Boundaries

| Source | Format | Size | License | Notes |
|--------|--------|------|---------|-------|
| UK (Geofabrik) | Shapefile | ~200 MB | ODbL | Daily updates |
| England extract | GeoPackage | ~150 MB | ODbL | All admin levels |

**Full UK:** ~200 MB  
**Five Towns area:** ~5 MB (extract)

### 6. Electoral Commission Constituencies

| Source | Format | Size | License |
|--------|--------|------|---------|
| UK Electoral Commission | Shapefile | ~50 MB | Click-use |

**Full UK:** ~50 MB  
**Five Towns (3 constituencies):** ~500 KB

---

## Compression and Storage Formats

### Raw vs Compressed (Typical)

| Layer | Raw GeoJSON | Compressed (.gz) | GeoPackage |
|-------|------------|-------------------|------------|
| UK hex grid (res 7) | 70 MB | 15 MB | 50 MB |
| Cliopatria UK | 20 MB | 6 MB | 15 MB |
| Geofabrik UK | 200 MB | 60 MB | 150 MB |
| **Total UK** | **~290 MB** | **~81 MB** | **~215 MB** |

**Recommendation:** Use GeoPackage for QGIS compatibility, GeoJSON.gz for web app static bundles.

---

## Processing Scale Estimates

### H3 Cell Assignment Performance

| Operation | Resolution | Time | Notes |
|-----------|-----------|------|-------|
| Point → Cell | 8 | ~0.001ms | Very fast |
| Point → Cell | 7 | ~0.001ms | Very fast |
| Polygon → Cells (small, 1 km²) | 8 | ~1ms | ~10 cells |
| Polygon → Cells (medium, 100 km²) | 8 | ~50ms | ~1000 cells |
| Polygon → Cells (large, 10,000 km²) | 7 | ~200ms | ~10,000 cells |
| Load + index 1000 cells | 8 | ~5ms | rbush |
| Spatial query (point in polygon) | 8 | ~0.1ms | rbush |

### Memory Requirements

| Dataset | Resolution | Cells | Memory Estimate |
|---------|-----------|-------|-----------------|
| Five Towns grid | 8 | 500 | < 1 MB |
| Five Towns grid | 7 | 400 | < 1 MB |
| UK grid | 7 | 700,000 | ~50 MB (in-memory) |
| UK grid | 6 | 80,000 | ~5 MB |
| Global grid | 5 | 2,162,202 | ~150 MB |
| Global grid | 4 | 302,102 | ~20 MB |

**Recommendation:** In-memory hex grid is feasible for Five Towns (500 cells) and UK regional (80k cells at res 6). For UK res 7 (700k cells) or global res 5 (2M cells), consider spatial indexing (rbush) + on-disk storage.

---

## Summary Tables

### Five Towns (Primary Focus)

| Phase | Resolution | Cell Count | Storage | Notes |
|-------|-----------|------------|---------|-------|
| Phase 1 | 7-8 | 400-500 | < 1 MB | Grid + geology |
| Phase 2 | 8 | 500 | < 2 MB | + historical boundaries |
| Phase 3 | 8 | 500 | < 3 MB | + political overlays |
| Phase 4 | 7-8 | 500 | < 5 MB | Full stack |

### UK Coverage

| Resolution | Cell Count | Storage | Use Case |
|-----------|------------|---------|----------|
| 6 | ~80,000 | ~10 MB grid | Country overview |
| 7 | ~700,000 | ~80 MB grid | Regional analysis |

### Global Coverage

| Resolution | Cell Count | Storage | Use Case |
|-----------|------------|---------|----------|
| 4 | 302,102 | ~20 MB grid | World view |
| 5 | 2,162,202 | ~150 MB grid | Country-level |
| 6 | 16,000,000 | ~1 GB grid | Regional deep-dive |

---

## Conclusion

- **Five Towns proof-of-concept:** < 5 MB total, easily handled in-memory
- **UK regional (Phase 3):** ~150-200 MB compressed, spatial indexing required
- **Global (Phase 5):** ~500 MB to 2 GB, requires chunked processing and likely server-side spatial queries

**No database required for Phase 0-4** — file-based GeoJSON bundles with rbush spatial index are sufficient for the project's scope and data volumes.

---