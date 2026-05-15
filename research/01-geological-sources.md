# Geological Sources Audit

**Date:** 2026-05-15  
**Project:** Place-Time Phase 0 Research  
**Focus:** Five Towns area (Pontefract, Knottingley, Featherstone, Castleford, Normanton) — West Yorkshire

---

## Sources Evaluated

| Source | Format | Approx Size | License | API Access | Five Towns Quality | Integration Complexity | Recommended |
|--------|--------|-------------|---------|------------|-------------------|------------------------|-------------|
| GPlates 2.5 GeoData (Zenodo) | Vector + Raster | ~500 MB | CC-BY | Direct download | Good (tectonic plates) | 3/5 | ✅ Primary |
| fraxen/tectonicplates (GitHub) | GeoJSON | ~5 MB | ODC-BY | Direct download/clone | Adequate (plate boundaries) | 1/5 | ✅ Secondary |
| dhasterok/global_tectonics (GitHub) | QML + data | ~50 MB | Custom | Clone + QGIS project | Good (geological provinces) | 4/5 | ⚠️ Deferred |
| BGS OGC API | OGCAPI/GeoJSON | Variable | OGL | API endpoint | Excellent (1:50k detail) | 2/5 | ✅ UK-specific |
| USGS | Various | Large | Public Domain | API + download | Adequate | 3/5 | ⚠️ Global backup |
| Natural Earth | Shapefile/GeoJSON | ~1 GB | Public Domain | Direct download | Coarse (1:10m-1:110m) | 1/5 | Background only |

---

## 1. GPlates 2.5 GeoData (Zenodo)

**URL:** https://zenodo.org/records/14194897  
**Version:** v1.0 (April 2024)  
**Bundled with:** GPlates 2.5 software

### Details
- **Format:** Vector (shapefiles, GeoPackage) + Raster (georeferenced images)
- **Content:** Complete paleogeographic reconstructions, tectonic plate boundaries, continental outlines through geological time
- **License:** Creative Commons Attribution 4.0 (CC-BY)
- **Access:** Direct download as `gplates_2.5.0_geodata.zip` (~500 MB)
- **Update frequency:** Tied to GPlates releases (roughly annual)

### Five Towns Coverage
The Five Towns sit on the boundary between the Eurasian and North Atlantic tectonic plates. GPlates provides:
- Plate boundary polygons (useful for macro-scale geological context)
- Paleogeographic reconstructions (ancient coastlines, mountain ranges)
- Does NOT provide detailed surface geology (rock types, strata) — that's BGS territory

### Integration Complexity: 3/5
- Requires download + unzip (~500 MB)
- Vector layers loadable in QGIS directly
- GeoJSON conversion via GDAL/OGR for pipeline ingestion
- No API — manual download, but data is static

### Recommendation
**Primary source for tectonic plate layer.** Use for understanding the macro geological context. The CC-BY license is fully compatible with Place-Time's FOSS-at-heart principle.

---

## 2. fraxen/tectonicplates (GitHub)

**URL:** https://github.com/fraxen/tectonicplates  
**Stars:** 167 | **License:** NOASSERTION → ODC-BY  
**Last update:** October 2014 (static dataset)

### Details
- **Format:** GeoJSON (single file per plate, also combined GeoJSON folder)
- **Content:** Peter Bird's updated digital model of plate boundaries (2003 paper)
- **License:** Originally listed as NOASSERTION; README states ODC-BY 1.0 (Open Data Commons Attribution License)
- **Size:** ~5 MB total for all plates
- **Access:** `git clone` or download zip (~5 MB)

### Five Towns Coverage
- Contains Eurasian and North Atlantic plate boundary polygons
- Five Towns fall near the plate boundary — data is relevant
- Simple polygon geometry, no temporal reconstructions

### Integration Complexity: 1/5
- Easiest integration of all sources
- Direct GeoJSON — no format conversion needed
- H3 cell assignment straightforward (single polygon's centroid → H3 cell)
- Proven, stable dataset (no updates since 2014 — which is fine for geological time)

### Recommendation
**First-choice for quick tectonic plate boundary layer.** Download is trivial, GeoJSON ingestion is native. The ODC-BY license is compatible with FOSS outputs. Use as the primary plate boundary source, GPlates as the authoritative fallback.

---

## 3. dhasterok/global_tectonics (GitHub)

**URL:** https://github.com/dhasterok/global_tectonics  
**Stars:** 163 | **License:** Custom (see README)

### Details
- **Format:** QGIS project file (QML) + associated data files
- **Content:** Global geological provinces and tectonic plates, published in Earth-Science Reviews (2022)
- **Size:** ~50 MB
- **License:** Custom — requires checking the repository license file
- **Access:** `git clone` required, complex QGIS project structure

### Five Towns Coverage
- Detailed geological province polygons (not just plate boundaries)
- Would show the Yorkshire Coal Measures underlying the Five Towns
- Research-grade data with academic peer review

### Integration Complexity: 4/5
- QML/QGIS native format not directly pipeline-friendly
- Requires: (1) extract data from QGIS project, (2) convert to GeoJSON, (3) validate in QGIS
- Custom license may have restrictions
- QGIS project dependency makes automated ingestion harder

### Recommendation
**Defer to Phase 1 or 2.** Good data quality, but integration overhead is high. Useful if Phase 1 geological layer needs more detail than fraxen plates provide. Flagged as "good to have" but not "required for MVP."

---

## 4. BGS (British Geological Survey) OGC API

**URL:** https://ogcapi.bgs.ac.uk/  
**Documentation:** https://api.gov.uk/bgs/bgs-opengeoscience-ogcapi-server

### Details
- **Format:** OGCAPI (Open Geospatial Consortium API), returns GeoJSON/GML
- **Content:** Various BGS datasets including:
  - Geology (Superficial deposits, Bedrock)
  - Faults and structures
  - Boreholes
  - Lexicon (rock classification)
- **License:** Open Government Licence (OGL) for most datasets
- **Access:** Direct REST API, no authentication required
- **Rate limits:** Not published, but BETA status means expect changes

### Five Towns Coverage
**Excellent.** BGS has 1:50,000 scale bedrock geology for West Yorkshire. Specifically:
- **Carboniferous Middle Coal Measures** underlie Pontefract area
- **Permian Upper Magnexian Limestone** outcrops to the east
- **Glacial deposits** cover lowland areas

### Integration Complexity: 2/5
- Standard OGCAPI — GeoJSON output is pipeline-compatible
- Requires API exploration to find correct collection endpoints
- BETA means endpoints may change (document this risk)
- Need to handle projection (BGS data often in EPSG:27700 British National Grid, requires transformation to WGS84 for H3 indexing)

### Recommendation
**Essential for UK geological detail.** This is the only source providing the rock-type/strata information needed for the geological base layer. The OGL license is fully FOSS-compatible. Budget: £0 (free at current usage levels). If usage becomes high-volume, consider BGS paid API.

---

## 5. USGS (United States Geological Survey)

**URL:** https://www.usgs.gov/centers/national-geospatial-program

### Details
- **Format:** Various (Shapefile, GeoJSON, GeoTIFF)
- **Content:** Global geological data, but US-focused in coverage
- **License:** Public Domain
- **Access:** Direct download + API (for some datasets)

### Five Towns Coverage
Limited for UK-specific geology. USGS covers:
- Global tectonic plate boundaries (similar to fraxen)
- US geology in great detail
- International geology at coarse scales only

### Recommendation
**Global backup, not UK-priority.** Useful for the global extension phase (Phase 5). For Five Towns, BGS is the authoritative UK source. USGS is mentioned for completeness.

---

## 6. Natural Earth

**URL:** https://naturalearthdata.com/  
**Scales:** 1:10m, 1:50m, 1:110m

### Details
- **Format:** Shapefile, GeoJSON (vector); GeoTIFF (raster)
- **Content:** Cultural, physical, and raster base layers
- **License:** Public Domain (no restrictions)
- **Size:** ~1 GB for full vector set

### Five Towns Coverage
Natural Earth is designed for small-scale cartography (country/regional level). At 1:50m scale, the Five Towns would be invisible (a pixel or less). Not suitable for local geological analysis.

### Recommendation
**Background context only.** Useful for world maps in the web UI or QGIS project overview. Not a geological source per se — more of a base map. Include in project for context, not primary geological analysis.

---

## Summary: Recommended Geological Layer Stack

| Priority | Source | Layer | License | Integration Effort |
|----------|--------|-------|---------|-------------------|
| 1 | fraxen/tectonicplates | Tectonic plate boundaries (global) | ODC-BY | Low (direct GeoJSON) |
| 2 | BGS OGC API | UK bedrock/superficial geology | OGL | Medium (API + projection) |
| 3 | GPlates 2.5 GeoData | Paleogeographic reconstructions | CC-BY | Medium (download + convert) |
| 4 | dhasterok/global_tectonics | Geological provinces | Custom | High (QGIS project extraction) |

### Budget Implications
- **£0** for all geological sources — all are free at appropriate usage levels
- BGS API usage at <1000 requests/month is free under OGL
- If geological data needs exceed OGL fair use, BGS offers paid API access

### Integration Dependencies
- fraxen/tectonicplates: immediate ingestion, no preprocessing
- BGS OGC API: requires API endpoint discovery, coordinate transformation (BNG→WGS84)
- GPlates: requires download (~500 MB), GDAL conversion for pipeline
- dhasterok/global_tectonics: defer to Phase 1-2 based on pipeline maturity

---

## Five Towns Specific Notes

### Known Geology (for validation)
- **Yorkshire Coal Measures** (Carboniferous) — underlying Pontefract, Knottingley, Featherstone
- **Pennine Lower Coal Measures** — Castleford area
- **Permian Upper Magnesian Limestone** — forming the scarp east of the Five Towns
- **Glacial Till** — superficial deposits in river valleys

### Tectonic Context
- Five Towns sit on the stable interior of the London-Brabant Massif (part of Eurasian Plate)
- Not on an active plate boundary — but proximity to the North Atlantic/Eurasian plate boundary (mid-Atlantic ridge) is geologically interesting
- The area has been tectonically quiet for ~50 million years (post-Cretaceous)

### BGS Data to Request
Endpoint: `https://ogcapi.bgs.ac.uk/collections/`
Key collections for Five Towns:
- `bedrock Geology` (1:50k scale, EPSG:27700)
- `superficial deposits` (glacial, river terrace deposits)
- `structures` (faults, if any in area)

---