# Place-Time — Research Findings

**Date:** 2026-05-15
**Project:** H:\place-time
**Updated:** Hexagonal tessellation approach + reference sphere concept

---

## Core Concept: Reference Spheres

**Outer Sphere (Ceiling):** All terrestrial history
- Elevation: +9km (1km above Mt. Everest at 8.849km)
- Rationale: Captures highest points in geological record, not just modern peaks
- Data: Use global tectonic reconstruction to identify ancient high points

**Inner Sphere (Floor):** All marine history
- Elevation: -11km (1km below Mariana Trench at ~10.994km)
- Rationale: Captures deepest marine trenches throughout history
- Data: Ocean basin evolution models from GPlates

**Surface (Query Surface):** Modern sea level
- Elevation: 0m (WGS84 ellipsoid)
- Rationale: Primary reference for all political/historical boundaries

---

## Hexagonal Grid Systems

### Uber H3 (Recommended for global coverage)
- **GitHub:** https://github.com/uber/h3
- **License:** Apache 2.0
- **Description:** Hexagonal hierarchical geospatial indexing system
- **Resolution levels:** 0 (~5M km² hex) to 15 (~1km² hex)
- **Five Towns coverage:** Resolution 7 or 8 gives ~10-25km² hexes — appropriate for regional analysis

### UK Ordnance Survey ISEGrid
- **Description:** British National Grid-aligned hexagonal grid
- **Advantage:** Aligned with UK mapping conventions
- **Consideration:** Less universal than H3, better for UK-specific work

### Why Hexagons?
- Perfect tessellation (no gaps)
- Equal-area cells (normalization friendly)
- 6 directional neighbors at 60° intervals
- Natural subdivision across resolution levels

---

## Geological Base Layer Sources

### GPlates 2.5 GeoData (Recommended Primary Source)
- **URL:** https://zenodo.org/records/14194897
- **Format:** Vector + Raster, bundled with GPlates 2.5
- **License:** CC-BY
- **Content:** Complete paleogeographic reconstructions, tectonic plates, continental outlines
- **Use case:** Authoritative tectonic plate boundaries and geological province overlays

### fraxen/tectonicplates
- **URL:** https://github.com/fraxen/tectonicplates
- **Stars:** 167 | **License:** NOASSERTION
- **Format:** GeoJSON (simple, lightweight)
- **Use case:** Quick integration, world plate boundaries as single GeoJSON
- **Hex mapping:** Each plate polygon → H3 cell assignment for spatial indexing

### dhasterok/global_tectonics
- **URL:** https://github.com/dhasterok/global_tectonics
- **Stars:** 163 | **Language:** QML/Python
- **Format:** QML project file + data
- **Use case:** More detailed geological provinces, research-grade

---

## Historical Boundaries

### Cliopatria (Most Comprehensive Global)
- **URL:** https://github.com/Seshat-Global-History-Databank/cliopatria
- **Paper:** Nature Scientific Data (2025) — http://www.nature.com/articles/s41597-025-04516-9
- **Coverage:** Worldwide political entities 3400BCE–2024CE
- **Format:** GeoJSON
- **License:** CC-BY-NC
- **Stars:** 27
- **Hex mapping:** Each boundary polygon → H3 cell(s) with validFrom/validTo timestamps

### OpenDomesday (English/1086 Focus)
- **URL:** https://opendomesday.org
- **API:** RESTful, supports geographical queries
- **Data:** Every place in Domesday Book (1086) with household counts, hundred, township
- **Format:** GeoJSON via API
- **License:** ODC-ODbL
- **Coverage:** England only, very detailed for Yorkshire (2039 places in county)
- **Five Towns relevance:** Tanshelf (Pontefract), Leoperce (Castleford) directly available

### OHMEC (Temporal Queries by Date)
- **URL:** https://github.com/ohmec/ohmec
- **Unique:** Query boundaries at any specific date
- **Format:** GeoJSON
- **License:** CC-BY-SA
- **Advantage:** Temporal data model directly supports time-slider queries

---

## Five Towns Specific Data

### Towns and Doomsday Names
| Modern Name | Doomsday Name | Hundred |
|------------|---------------|---------|
| Pontefract | Tanshelf | Barkston |
| Castleford | Leoperce | Barkston |
| Featherstone | (needs lookup) | |
| Knottingley | (needs lookup) | |
| Normanton | (needs lookup) | |

### Geological Context
- **Yorkshire Coal Measures** — Carboniferous period, underlying coal seams
- **Permian Magnesian Limestone** — Surface geology around the area
- **Tectonic plate** — Island of Britain sits between Eurasian and North Atlantic plates

### Relevant Historical Boundaries
- **Hundred:** Barkston (covers Pontefract area in Doomsday)
- **Shire:** Yorkshire (Auge)
- **Modern:** Elmet and Pontefract constituency, Normanton and District constituency

---

## Gerrymandering Metrics

### Polsby-Popper Compactness Score
```
Compactness = (4 × π × Area) / Perimeter²
```
- 1.0 = perfect circle (most compact)
- Lower = more irregular (potential gerrymandering indicator)
- Use for: Compare current constituency boundaries against historical county lines

### Data Sources for Gerrymandering Detection
- **UK Electoral Commission:** Current constituency shapefiles with GSS codes
- **1880s county maps:** Pre-Reform Act stable geography for comparison
- **Range-Voting.org:** Gerrymandering mathematics resources

---

## QGIS Compatibility

- **.geojson:** Native QGIS support
- **.gpkg (GeoPackage):** SQLite-based, multi-layer, preferred for bundles
- **.qlr (QGIS Layer Resource):** XML project restore files
- **CRS:** WGS84 (EPSG:4326) for API, BNG (EPSG:27700) for UK area calculations

---

## H3 Resolution Selection for Five Towns

| Resolution | Hex Edge Length | Approx Area | Cells for Yorkshire |
|-----------|----------------|-------------|---------------------|
| 5 | 163.7 km | 73,900 km² | ~2-3 |
| 6 | 61.6 km | 10,500 km² | ~10-15 |
| 7 | 23.2 km | 1,500 km² | ~50-80 |
| 8 | 8.74 km | 210 km² | ~300-500 |

**Recommendation:** Resolution 7 for regional coverage (~23km hex), Resolution 8 for detailed boundary analysis (~8.7km hex).

---

## Technical Implementation Notes

### Data Pipeline Architecture
```
Scrape (fetch from sources)
  → Group (assign to H3 cells)
  → Clean (validate/deduplicate)
  → Standardize (emit GeoJSON + QLR + GPKG)
```

### H3 Cell Assignment Logic
```typescript
// For each polygon feature:
1. Get bounding box
2. Generate H3 cells covering the polygon at chosen resolution
3. Store cell IDs with feature reference
4. For point queries: convert lat/lng to H3 cell ID at resolution
5. For boundary queries: find all H3 cells intersected by polygon
```

### Scale Considerations
- Global coverage requires careful resolution selection
- Five Towns area (~500 km²) at res 8 = ~2000 cells (manageable)
- UK at res 7 = ~50k cells (challenging but tractable)
- World at res 5 = ~500 cells (coarse but workable)

---

*This document will be updated as data sources are evaluated and technical decisions are made.*