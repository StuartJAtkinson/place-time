# Tools and Human Actions

**Date:** 2026-05-15  
**Project:** Place-Time Phase 0 Research  
**Purpose:** Consolidated list of all required tools and human action checkpoints

---

## Part 1: Automated Tools

### Core Development Stack

| Tool | Purpose | License | Status |
|------|---------|---------|--------|
| Node.js (v18+) | Runtime | MIT | ✅ Installed (see package.json) |
| TypeScript | Language | Apache 2.0 | ✅ Installed |
| h3-js | Hex indexing | Apache 2.0 | ✅ In package.json |
| geojson | GeoJSON parsing | MIT | ✅ In package.json |
| @turf/turf | Spatial analysis | MIT | ✅ In package.json |
| rbush | Spatial indexing | MIT | ✅ In package.json |
| GDAL/OGR | Format conversion | MIT/X11 | ⚠️ Need to install |
| QGIS | Visual validation | GPL 2+ | ⚠️ Human tool |
| Leaflet/OpenLayers | Web UI | MIT | ✅ In package.json |

### Toolchain Details

#### Node.js / TypeScript
- **Installed:** Check `node_modules/` and `package.json`
- **Purpose:** All ingestion scripts, hex indexing, web app
- **Scripts:** `npm run dev`, `npm run ingest:*`

#### h3-js (Uber H3)
```bash
npm install h3-js
```
- **Purpose:** All H3 hex operations
- **Key functions:** `latLngToCell()`, `polygonToCells()`, `cellToBoundary()`

#### GDAL/OGR
- **Purpose:** Convert between Shapefile/GeoPackage/GeoJSON
- **Windows install:** `osgeo4w` or `conda install gdal`
- **Purpose in pipeline:** Convert BGS data (often Shapefile/GeoPackage) to GeoJSON for ingestion

#### QGIS (Human Tool)
- **Purpose:** Visual validation of ingested data
- **Not automated:** Human reviews data quality in QGIS before phase gate

### Data Ingestion Tools (Automated)

| Script | Input | Output | Purpose |
|--------|-------|--------|---------|
| `src/ingest/geology.ts` | GeoJSON, Shapefile | Indexed GeoJSON | Tectonic plates, geological provinces |
| `src/ingest/historical.ts` | API JSON, GeoJSON | Indexed GeoJSON | Doomsday, Cliopatria boundaries |
| `src/ingest/political.ts` | Shapefile, GeoJSON | Indexed GeoJSON | Current admin, constituency boundaries |
| `src/ingest/utils.ts` | Various | Standardized GeoJSON | Shared conversion, validation functions |

### Pipeline Flow

```
Scrape (curl/wget/API calls)
    ↓
Group (assign to H3 cells)
    ↓
Clean (validate geometry, normalize properties)
    ↓
Standardize (emit GeoJSON + generate QLR files)
    ↓
QGIS Human Validation
    ↓
Phase Decision Gate
```

---

## Part 2: Human Actions Required

### Phase 0 Human Actions

| Action | When | Purpose | Approximate Time |
|--------|------|---------|-----------------|
| Review geological source list | After doc 01 | Decide primary/secondary sources | 30 minutes |
| Review historical source list | After doc 02 | Validate temporal coverage claims | 30 minutes |
| Review political source list | After doc 03 | Confirm budget (should be £0) | 15 minutes |
| Review hex system decision | After doc 04 | Approve H3 + resolution choice | 15 minutes |
| **Phase 0 Decision Gate** | After all docs | Approve all decisions, proceed to Phase 1 | 1 hour |

### Phase 1 Human Actions

| Action | When | Purpose | Approximate Time |
|--------|------|---------|-----------------|
| Validate Five Towns hex grid in QGIS | After hex grid generation | Confirm coverage, cell count | 1 hour |
| Validate geological layer in QGIS | After ingestion | Spot-check Yorkshire Coal Measures | 1 hour |
| Flag any geological data issues | After validation | Document gaps, quality concerns | 30 minutes |
| **Phase 1 Decision Gate** | After validation | Proceed to Phase 2 or remediate | 1 hour |

### Phase 2 Human Actions

| Action | When | Purpose | Approximate Time |
|--------|------|---------|-----------------|
| Verify Doomsday polygons | After OpenDomesday ingestion | Confirm Barkston Hundred polygons exist | 1 hour |
| Validate temporal boundaries | After Cliopatria ingestion | Check boundaries at 1086, 1600, 1900 | 1 hour |
| Cross-reference boundaries | After both ingested | Verify alignment at shared borders | 1 hour |
| **Phase 2 Decision Gate** | After validation | Proceed to Phase 3 or remediate | 1 hour |

### Phase 3 Human Actions

| Action | When | Purpose | Approximate Time |
|--------|------|---------|-----------------|
| Review gerrymandering findings | After compactness analysis | Validate flagged constituencies | 2 hours |
| Visual comparison in QGIS | After findings | Confirm visual evidence of manipulation | 1 hour |
| Verify flagged changes | After comparison | Confirm gerrymandering vs legitimate reform | 2 hours |
| **Phase 3 Decision Gate** | After verification | Proceed to Phase 4 or pivot | 1 hour |

### Phase 4 Human Actions

| Action | When | Purpose | Approximate Time |
|--------|------|---------|-----------------|
| Web UI review | After implementation | Test time slider, layer toggles | 1 hour |
| QGIS project export review | After generation | Verify all layers load correctly | 1 hour |
| **Final Decision Gate** | After reviews | Approve final deliverable | 30 minutes |

---

## Part 3: Decision Gates Summary

| Phase | Decision Point | Go/No-Go Criteria |
|-------|---------------|-------------------|
| Phase 0 | Research complete | ✅ Source list validated, ✅ samples confirmed downloadable, ✅ budget £0 confirmed |
| Phase 1 | Hex grid + geology ingested | ✅ Hex coverage validated in QGIS, ✅ geological data quality approved |
| Phase 2 | Historical boundaries ingested | ✅ Doomsday polygons confirmed, ✅ temporal coverage validated |
| Phase 3 | Gerrymandering analysis complete | ✅ Findings documented, ✅ visual evidence clear in QGIS |
| Phase 4 | Integration complete | ✅ Web UI + QGIS project functional, ✅ exports validated |

---

## Part 4: FOSS Licensing Strategy

### Output Layers

| Layer | License | Justification |
|-------|---------|---------------|
| Geological base (derived from GPlates) | CC-BY | GPlates is CC-BY |
| Tectonic plates (derived from fraxen) | ODC-BY | fraxen/tectonicplates is ODC-BY |
| Doomsday (derived from OpenDomesday) | ODC-ODbL | OpenDomesday is ODbL |
| Historical boundaries (derived from Cliopatria) | CC-BY-NC | Cliopatria is CC-BY-NC |
| Political boundaries (derived from Geofabrik/OSM) | ODbL | OSM is ODbL |
| Constituency boundaries (derived from Electoral Commission) | Click-use | Electoral Commission is click-use |

### Ingestion Tools

| Tool | License | Usage |
|------|---------|-------|
| h3-js | Apache 2.0 | Hex indexing |
| geojson | MIT | GeoJSON parsing |
| @turf/turf | MIT | Spatial analysis |
| rbush | MIT | Spatial indexing |
| GDAL/OGR | MIT | Format conversion |
| All project TypeScript | MIT | Ingestion scripts |

### License Compatibility Matrix

| Source | Source License | Derived Data License | Commercial Use |
|--------|---------------|---------------------|----------------|
| fraxen/tectonicplates | ODC-BY | ODC-BY | ✅ Allowed (attribution required) |
| GPlates GeoData | CC-BY | CC-BY | ✅ Allowed (attribution required) |
| OpenDomesday | ODC-ODbL | ODC-ODbL | ✅ Allowed (share-alike) |
| Cliopatria | CC-BY-NC | CC-BY-NC | ❌ Non-commercial only |
| Geofabrik/OSM | ODbL | ODbL | ✅ Allowed (share-alike) |
| BGS | OGL | OGL | ✅ Allowed (open) |
| Electoral Commission | Click-use | Click-use | ⚠️ Registration required for commercial |

### License Risk Assessment

| Risk | Source | Mitigation |
|------|--------|------------|
| **High** | Cliopatria (CC-BY-NC) | Non-commercial use only; if commercial needed, seek alternative or negotiate |
| **Medium** | Electoral Commission (Click-use) | Register for commercial use; non-commercial is free |
| **Low** | All other sources | FOSS-compatible licenses throughout |

---

## Part 5: API Sign-ups Required

| Source | Sign-up Required? | Action |
|--------|-------------------|--------|
| GPlates 2.5 GeoData | ❌ No | Direct download (no auth) |
| fraxen/tectonicplates | ❌ No | GitHub clone (no auth) |
| BGS OGC API | ❌ No | Direct API (no auth) |
| OpenDomesday API | ❌ No | Direct API (no auth, rate limit unknown) |
| Cliopatria | ❌ No | GitHub clone (no auth) |
| Geofabrik | ❌ No | Direct download (no auth) |
| ONS Open Geography | ❌ No | Direct access (no auth) |
| Electoral Commission | ⚠️ Yes (commercial only) | Register if commercial use anticipated |

**Total sign-ups for Phase 0-4: 0** (no authentication required for any free source)

---

## Part 6: Budget Summary

| Item | Cost | Notes |
|------|------|-------|
| Geological sources | £0 | All free |
| Historical sources | £0 | All free |
| Political sources | £0 | All free |
| GDAL/OGR | £0 | Open source |
| Node.js tooling | £0 | Open source |
| QGIS | £0 | Open source |
| OS Boundary-Line (optional) | £500+/year | Only if Phase 4 identifies gaps |

**Required budget for Phase 0-4: £0**

---

## Part 7: Development Environment Checklist

### Pre-Phase 1 Setup

- [ ] Node.js v18+ installed
- [ ] TypeScript configured
- [ ] `npm install` successful
- [ ] GDAL/OGR installed (`osgeo4w` or equivalent for Windows)
- [ ] QGIS installed (for human validation)
- [ ] Git configured
- [ ] `H:\place-time` directory accessible

### Phase 1 Start

- [ ] Clone fraxen/tectonicplates repo
- [ ] Test BGS OGC API endpoint connectivity
- [ ] Download GPlates GeoData sample (if bandwidth available)
- [ ] Verify `h3-js` installation with test script

### Phase 2 Start

- [ ] Clone Cliopatria repo (bulk download)
- [ ] Test OpenDomesday API with sample query
- [ ] Verify `rbush` spatial index installation

---

## Appendix: Command Reference

### Development Commands
```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Run geological ingestion
npm run ingest:geology

# Run historical ingestion
npm run ingest:historical

# Run political ingestion
npm run ingest:boundaries

# TypeScript compile
npx tsc

# QGIS layer file generation
npm run generate:qlr
```

### Data Download Commands
```bash
# Clone tectonic plates
git clone https://github.com/fraxen/tectonicplates.git data/geology/tectonicplates

# Clone Cliopatria
git clone https://github.com/Seshat-Global-History-Databank/cliopatria.git data/historical/cliopatria

# BGS OGC API test
curl "https://ogcapi.bgs.ac.uk/collections" | jq

# OpenDomesday API test
curl "https://opendomesday.org/api/v1/place/" | jq
```

### GDAL Commands
```bash
# Convert Shapefile to GeoJSON
ogr2ogr -f GeoJSON output.json input.shp

# Convert to GeoPackage
ogr2ogr -f GPKG output.gpkg input.shp

# Transform coordinate system
ogr2ogr -s_srs EPSG:27700 -t_srs EPSG:4326 output.json input.json

# Inspect shapefile
ogrinfo -al -so input.shp
```

---