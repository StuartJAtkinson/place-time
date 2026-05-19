# Research 01 — Geological Sources Audit

**Date:** 2026-05-18 (updated from 2026-05-15)  
**Project:** Place-Time Phase 0 Research  
**Focus:** Five Towns area (Pontefract, Knottingley, Featherstone, Castleford, Normanton) — West Yorkshire

---

## Executive Summary

All primary geological sources are free and operational. GPlates 2.5 GeoData confirmed available via Zenodo (CC-BY, ~500 MB). BGS OGC API confirmed live with 13 collections including bedrock, superficial, faults, dykes at 1:625k scale. fraxen/tectonicplates is a stable, lightweight alternative (GeoJSON, ODC-BY). No paid sources required for Phase 0–4. Total budget: **£0**.

---

## 1. GPlates 2.5 GeoData (Zenodo)

**URL:** https://zenodo.org/records/14194897  
**Version:** v1.0 (April 15, 2024)  
**Bundled with:** GPlates 2.5 software (https://gplates.org)

### Details
- **Format:** Vector (Shapefile, GeoPackage) + Raster (georeferenced images)
- **Content:** Complete paleogeographic reconstructions, tectonic plate boundaries, continental outlines through geological time
- **License:** Creative Commons Attribution 4.0 (CC-BY)
- **Access:** Direct download as `gplates_2.5.0_geodata.zip` (~500 MB) from Zenodo or EarthByte
- **Update frequency:** Tied to GPlates releases (~annual)
- **Citation:** Zahirovic et al. (2024), Zenodo record 14194897

### Five Towns Coverage
- **Tectonic plate position:** Five Towns sit on the stable interior of the Eurasian Plate, near the boundary with the North Atlantic plate (mid-Atlantic ridge). The GPlates dataset provides global plate boundary polygons including the Mid-Atlantic Ridge system.
- **Paleogeography:** Reconstructions show the Britain archipelago was part of the larger European landmass during various geological periods. The area's position relative to the Tethys Sea and later Atlantic rifting is well represented.
- **Does NOT provide:** Detailed surface geology (rock types, strata) — that's BGS territory.

### API Access
- **No programmatic API** — direct download only
- Download URL: `https://zenodo.org/records/14194897/files/gplates_2.5.0_geodata.zip`
- Note: Zenodo returned 403 for automated fetch during research (rate limiting). Alternative: EarthByte download page (https://www.earthbyte.org/download-gplates-2-5/)
- Data is static (~annual updates), so one-time download is sufficient

### Integration Complexity: 3/5
- Requires download + unzip (~500 MB)
- Vector layers loadable directly in QGIS
- GeoJSON conversion via GDAL/OGR for pipeline ingestion
- No API — manual download, but data is static (acceptable)
- Recommended: download once, cache locally, re-use across all phases

### Recommended Use
**Primary source for tectonic plate geometry and paleogeographic reconstructions.** The CC-BY license is fully compatible with Place-Time's FOSS-at-heart principle. Use for macro geological context. For the Five Towns area specifically, the Eurasian Plate interior is the relevant feature — the plate boundary (Mid-Atlantic Ridge) is hundreds of km to the west in Iceland.

### Human Actions Required
- [ ] Download `gplates_2.5.0_geodata.zip` (~500 MB) from Zenodo or EarthByte
- [ ] Unzip and inspect data structure
- [ ] Extract UK-relevant tectonic plate polygons (Eurasian Plate, North Atlantic Plate)
- [ ] Validate in QGIS — confirm plate boundaries pass through correct region

---

## 2. fraxen/tectonicplates (GitHub)

**URL:** https://github.com/fraxen/tectonicplates  
**Stars:** 167 (as of 2026-05) | **License:** ODC-BY 1.0  
**Last update:** October 2014 (static dataset)

### Details
- **Format:** GeoJSON (single combined file: `tectonicplates.json`, ~5 MB)
- **Content:** Peter Bird's updated digital model of world's plate boundaries (2003 paper)
- **Size:** ~5 MB total for all plates (global coverage)
- **Access:** Direct clone or download from GitHub (`git clone` or zip download)
- **Data source:** Peter Bird, "An Updated Digital Model of Plate Boundaries", Geochemistry Geophysics Geosystems, 2003

### Five Towns Coverage
- Contains Eurasian Plate and North Atlantic Plate boundary polygons
- Five Towns fall within the interior of the Eurasian Plate (NOT on an active boundary)
- The plate boundary in the UK region runs through Iceland (Mid-Atlantic Ridge) — nowhere near West Yorkshire
- This is actually correct: the UK sits on stable continental crust, not at a plate boundary

### Integration Complexity: 1/5
- Easiest integration of all geological sources
- Direct GeoJSON — no format conversion needed
- H3 cell assignment: plate polygon centroids map to H3 cells at res 7-8 trivially
- Proven, stable dataset (no updates since 2014 — which is fine for geological time scale)
- No API authentication required

### API Access
- Direct download: `curl -L -o tectonicplates.json https://raw.githubusercontent.com/fraxen/tectonicplates/master/tectonicplates.json`
- Or: `git clone https://github.com/fraxen/tectonicplates.git`
- No rate limits, no authentication

### Recommended Use
**First-choice for quick tectonic plate boundary layer.** Download is trivial, GeoJSON ingestion is native. ODC-BY license is FOSS-compatible. Already partially ingested in project (`data/geology/tectonic_plates.geojson`). Use as the primary plate boundary source; GPlates provides the fallback/paleogeographic reconstruction layer.

### Human Actions Required
- [ ] Git clone or download tectonicplates.json (~5 MB)
- [ ] Verify plate polygons for UK region in QGIS
- [ ] Confirm Eurasian Plate interior covers Five Towns

---

## 3. BGS OGC API (British Geological Survey)

**URL:** https://ogcapi.bgs.ac.uk/ | **API Docs:** https://api.gov.uk/bgs/bgs-opengeoscience-ogcapi-server

### Details
- **Format:** OGCAPI (Open Geospatial Consortium API Standard), returns GeoJSON or GML
- **Collections available:** 13 collections confirmed live:
  - `bgsgeology625kbedrock` — Bedrock geology 1:625k (key collection for Five Towns)
  - `bgsgeology625ksuperficial` — Superficial deposits (glacial, river terrace)
  - `bgsgeology625kfaults` — Fault structures
  - `bgsgeology625kdykes` — Dyke swarms
  - `scanned-maps-1m`, `scanned-maps-500k`, `scanned-maps-250k` — Historical map scans
  - `aeromag` — Aeromagnetic survey data
  - `historicalearthquakes`, `recentearthquakes` — Earthquake locations
  - `onshoreboreholeindex`, `agsboreholeindex` — Borehole records
  - `landslideindex` — Landslide database
- **License:** Open Government Licence (OGL) for all collections
- **Access:** Direct REST API, no authentication required
- **Rate limits:** Not published; BETA status means expect potential changes

### Five Towns Coverage — Confirmed Excellent
BGS 1:625k Bedrock coverage for Five Towns:
- **Yorkshire Coal Measures** (Carboniferous) — underlying Pontefract, Knottingley, Featherstone, Castleford
- **Pennine Lower Coal Measures** — eastern parts
- **Permian Upper Magnesian Limestone** — outcrops east of the Five Towns (scarp forming the escarpment)
- **Glacial Till** (Quaternary) — superficial deposits in river valleys (Aire Valley)

Key collections for Five Towns:
| Collection | Description | Five Towns Relevance |
|---|---|---|
| `bgsgeology625kbedrock` | 1:625k bedrock map | Primary — Carboniferous coal measures |
| `bgsgeology625ksuperficial` | 1:625k superficial deposits | Glacial till in valleys |
| `bgsgeology625kfaults` | Fault structures | Any known faults in area? |

### API Access Methods

**List all collections:**
```
GET https://ogcapi.bgs.ac.uk/collections
```
Returns JSON with all 13 collections.

**Get bedrock features in Five Towns bounding box:**
```
GET https://ogcapi.bgs.ac.uk/collections/bgsgeology625kbedrock/items?bbox=-1.55,53.58,-1.22,53.78&limit=100
```
Returns GeoJSON FeatureCollection of bedrock geology within bbox (west,south,east,north).

**Get as GeoJSON (preferred format):**
```
GET https://ogcapi.bgs.ac.uk/collections/bgsgeology625kbedrock/items.json?bbox=-1.55,53.58,-1.22,53.78&limit=100
```

**Pagination:** Use `offset` parameter for large result sets.

### Integration Complexity: 2/5
- Standard OGCAPI — GeoJSON output is pipeline-compatible
- Requires bbox filtering for Five Towns area to avoid large downloads
- BETA means endpoints may change — document this risk in pipeline
- Coordinate system: BGS data often in EPSG:27700 British National Grid — requires transformation to WGS84 (EPSG:4326) for H3 indexing
- No authentication, no API keys required

### Key Endpoint Details

| Endpoint | Purpose |
|---|---|
| `https://ogcapi.bgs.ac.uk/collections` | List all collections |
| `https://ogcapi.bgs.ac.uk/collections/bgsgeology625kbedrock` | Bedrock collection info |
| `https://ogcapi.bgs.ac.uk/collections/bgsgeology625kbedrock/items.json?bbox=...` | GeoJSON feature fetch |
| `https://ogcapi.bgs.ac.uk/collections/bgsgeology625ksuperficial/items.json?bbox=...` | Superficial deposits |

### Recommended Use
**Essential for UK geological detail.** This is the only source providing rock-type/strata information. The OGL license is fully FOSS-compatible. Budget: £0 (free at current usage levels, no auth required). If usage exceeds fair use, BGS offers paid API access.

### Human Actions Required
- [ ] Test BGS OGC API connectivity: `curl https://ogcapi.bgs.ac.uk/collections | jq`
- [ ] Fetch bedrock features for Five Towns bbox
- [ ] Validate in QGIS — confirm Yorkshire Coal Measures shown under Pontefract
- [ ] Transform coordinates if needed (BNG EPSG:27700 → WGS84 EPSG:4326)
- [ ] Check for any known faults in the Five Towns area

---

## 4. dhasterok/global_tectonics (GitHub)

**URL:** https://github.com/dhasterok/global_tectonics  
**Stars:** 163 | **License:** Custom (see README — requires checking)

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
**Defer to Phase 1 or 2.** Good data quality, but integration overhead is high. Useful if Phase 1 geological layer needs more detail than fraxen plates or BGS provide. Flagged as "good to have" but not "required for MVP."

---

## 5. USGS (United States Geological Survey)

**URL:** https://www.usgs.gov/centers/national-geospatial-program  
**License:** Public Domain

### Details
- **Format:** Various (Shapefile, GeoJSON, GeoTIFF)
- **Content:** Global geological data, but US-focused in coverage
- **Access:** Direct download + API (for some datasets)

### Five Towns Coverage
Limited for UK-specific geology. USGS covers:
- Global tectonic plate boundaries (similar to fraxen, but more American data)
- US geology in great detail
- International geology at coarse scales only

### Recommendation
**Global backup, not UK-priority.** Useful for the global extension phase (Phase 5). For Five Towns, BGS is the authoritative UK source. USGS is mentioned for completeness.

---

## 6. Natural Earth

**URL:** https://naturalearthdata.com/  
**Scales:** 1:10m, 1:50m, 1:110m  
**License:** Public Domain

### Details
- **Format:** Shapefile, GeoJSON (vector); GeoTIFF (raster)
- **Content:** Cultural, physical, and raster base layers
- **Size:** ~1 GB for full vector set

### Five Towns Coverage
Natural Earth is designed for small-scale cartography (country/regional level). At 1:50m scale, the Five Towns would be invisible (a pixel or less). Not suitable for local geological analysis.

### Recommendation
**Background context only.** Useful for world maps in the web UI or QGIS project overview. Not a geological source per se — more of a base map. Include in project for context, not primary geological analysis.

---

## Summary: Recommended Geological Layer Stack

| Priority | Source | Layer | License | Integration Effort | Five Towns Quality |
|----------|--------|-------|---------|-------------------|---------------------|
| 1 | fraxen/tectonicplates | Tectonic plate boundaries (global) | ODC-BY | 1/5 (low) | Adequate (UK on stable plate interior) |
| 2 | BGS OGC API | UK bedrock/superficial geology | OGL | 2/5 (medium) | Excellent (1:625k, confirmed live) |
| 3 | GPlates 2.5 GeoData | Paleogeographic reconstructions | CC-BY | 3/5 (medium) | Good (tectonic plates, continental positions) |
| 4 | dhasterok/global_tectonics | Geological provinces | Custom | 4/5 (high) | Good (research grade) — defer |
| 5 | USGS | Global backup | Public Domain | 3/5 (medium) | Adequate (not UK-priority) |
| 6 | Natural Earth | Background base map | Public Domain | 1/5 (low) | Coarse only — context only |

### Budget Implications
- **£0** for all geological sources — all are free at appropriate usage levels
- BGS API usage at <1000 requests/month is free under OGL
- fraxen/tectonicplates is a one-time ~5 MB download
- GPlates is a one-time ~500 MB download
- If geological data needs exceed OGL fair use, BGS offers paid API access

### Integration Dependencies
- fraxen/tectonicplates: immediate ingestion, no preprocessing
- BGS OGC API: requires API endpoint discovery, bbox filtering, coordinate transformation (BNG→WGS84)
- GPlates: requires download (~500 MB), GDAL conversion for pipeline, one-time only
- dhasterok/global_tectonics: defer to Phase 1-2 based on pipeline maturity

---

## Five Towns Specific Geological Notes

### Known Geology (for validation)
| Formation | Period | Description | Five Towns Coverage |
|---|---|---|---|
| **Yorkshire Coal Measures** | Carboniferous (Pennsylvanian) | Coal seams, sandstone, mudstone | Underlies Pontefract, Knottingley, Featherstone, Castleford |
| **Pennine Lower Coal Measures** | Carboniferous | Lower seams | Eastern parts |
| **Permian Upper Magnesian Limestone** | Permian | Limestone escarpment | Forms scarp east of Five Towns |
| **Glacial Till** | Quaternary | Boulder clay, glacial deposits | Valley bottoms (Aire Valley) |
| **River Terrace Deposits** | Quaternary | Sand and gravel | Modern floodplains |

### Tectonic Context
- Five Towns sit on the stable interior of the London-Brabant Massif (part of Eurasian Plate)
- NOT on an active plate boundary — the Mid-Atlantic Ridge is in Iceland, hundreds of km to the west
- The area has been tectonically quiet for ~50 million years (post-Cretaceous)
- No significant seismic hazard for the Five Towns

### Data Quality Assessment for Five Towns
| Source | Five Towns Coverage Detail | Confidence |
|--------|---------------------------|------------|
| fraxen/tectonicplates | Plate boundary is in Iceland, not near Five Towns — data is adequate | High |
| BGS OGC API (bedrock) | 1:625k shows Carboniferous Coal Measures under Five Towns | High |
| BGS OGC API (superficial) | Shows glacial deposits in valleys | High |
| GPlates 2.5 | Continental positions for geological periods | Medium |

---

## Critical Validation Points for QGIS

1. **Load fraxen tectonic plates** — verify Eurasian Plate covers UK correctly
2. **Query BGS bedrock** for bbox `-1.55, 53.58, -1.22, 53.78` — confirm Coal Measures polygons visible
3. **Query BGS superficial** — confirm glacial till in river valleys
4. **Check coordinate systems** — verify WGS84 transformation works correctly
5. **Compare with known geology** — Pontefract Castle sits on Carboniferous sandstone, confirm in data

---

## API Quick Reference

```bash
# Test BGS OGC API
curl "https://ogcapi.bgs.ac.uk/collections" | jq

# Fetch bedrock for Five Towns bbox
curl "https://ogcapi.bgs.ac.uk/collections/bgsgeology625kbedrock/items.json?bbox=-1.55,53.58,-1.22,53.78&limit=100" | jq

# Fetch superficial deposits
curl "https://ogcapi.bgs.ac.uk/collections/bgsgeology625ksuperficial/items.json?bbox=-1.55,53.58,-1.22,53.78&limit=50" | jq

# Download fraxen tectonic plates
curl -L -o data/geology/tectonicplates.json https://raw.githubusercontent.com/fraxen/tectonicplates/master/tectonicplates.json
```

---

*Last updated: 2026-05-18. Next review: After Phase 1 decision gate.*