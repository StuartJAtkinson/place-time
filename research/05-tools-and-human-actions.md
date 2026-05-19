# Research 05 — Tools and Human Actions

**Date:** 2026-05-18 (updated from 2026-05-15)  
**Project:** Place-Time Phase 0 Research  
**Purpose:** Consolidated list of all required tools and human action checkpoints

---

## Executive Summary

All automated tools are open source. Node.js, TypeScript, h3-js, GDAL/OGR already configured in project. QGIS is required for human visual validation. No paid tooling required. Human decision gates are the critical path — they cannot be automated.

---

## Part 1: Automated Tools

### Core Development Stack (Already in project)

| Tool | Purpose | License | Status |
|------|---------|---------|--------|
| Node.js v18+ | Runtime | MIT | ✅ In package.json |
| TypeScript | Language | Apache 2.0 | ✅ In package.json |
| h3-js | Hex indexing | Apache 2.0 | ✅ In package.json |
| geojson | GeoJSON parsing | MIT | ✅ In package.json |
| @turf/turf | Spatial analysis | MIT | ✅ In package.json |
| rbush | Spatial indexing | MIT | ✅ In package.json |
| GDAL/OGR | Format conversion | MIT/X11 | ⚠️ Needs Windows install |
| QGIS | Visual validation | GPL 2+ | ⚠️ Human tool — see below |
| Leaflet | Web UI | MIT | ✅ In package.json |
| Vite | Build tool | MIT | ✅ In package.json |
| TypeScript (ts-node/tsx) | Script execution | MIT | ✅ In package.json |

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

#### GDAL/OGR (Windows Install Required)
- **Purpose:** Convert between Shapefile/GeoPackage/GeoJSON, BNG↔WGS84 transformation
- **Windows install options:**
  1. **OSGeo4W** (recommended): https://osgeo4w.osgeo.io/ — Express install → select gdal package
  2. **Conda:** `conda install -c conda-forge gdal`
- **Path:** Add `C:\OSGeo4W64\bin` to PATH after install
- **Verify:** `ogrinfo --version`

#### QGIS (Human Tool — Not Automated)
- **Purpose:** Visual validation of ingested data, boundary inspection, hex grid overlay
- **Install:** https://qgis.org/en/site/forusers/download.html (standalone installer)
- **QGIS MCP:** For AI-driven QGIS control, install nkarasiak QGIS MCP plugin
  - Port: 9876 (must restart each QGIS session)
  - Verify: `mcporter call qgis.ping`

### Data Ingestion Scripts (In project)

| Script | Input | Output | Purpose |
|--------|-------|--------|---------|
| `src/ingest/geology.ts` | GeoJSON, BGS API | Indexed GeoJSON | Tectonic plates, BGS bedrock |
| `src/ingest/historical.ts` | API JSON, GeoJSON | Indexed GeoJSON | Doomsday, Cliopatria |
| `src/ingest/boundaries.ts` | Shapefile, GeoJSON | Indexed GeoJSON | Current admin, constituencies |
| `src/ingest/utils.ts` | Various | Standardized GeoJSON | Coordinate transform, validation |

### Pipeline Flow

```
Fetch (curl/wget/API calls)
    ↓
Parse (GeoJSON/Shapefile/JSON)
    ↓
Transform (BNG→WGS84 if needed)
    ↓
Group (assign to H3 cells via polygonToCells)
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

## Part 2: Human Actions by Phase

### Phase 0 Human Actions (Research — Completed)

| Action | Status | Notes |
|--------|--------|-------|
| Review geological source list | ✅ Complete | fraxen + BGS confirmed primary |
| Review historical source list | ✅ Complete | OpenDomesday + Cliopatria confirmed |
| Review political source list | ✅ Complete | Geofabrik + ONS + Electoral Commission |
| Review hex system decision | ✅ Complete | H3 confirmed, res 8 primary |
| Phase 0 Decision Gate | ✅ Complete | All research docs updated |

### Phase 1 Human Actions (Hex Grid + Geological Base)

| Action | When | Purpose | Approx Time |
|--------|------|---------|-------------|
| Validate Five Towns hex grid in QGIS | After grid generation | Confirm coverage, cell count (323 at res 7, 2270 at res 8) | 1 hour |
| Test BGS OGC API connectivity | Before ingestion | Confirm API is live: `curl https://ogcapi.bgs.ac.uk/collections \| jq` | 15 min |
| Fetch BGS bedrock for Five Towns bbox | During ingestion | Extract Carboniferous Coal Measures polygons | 30 min |
| Validate geological layer in QGIS | After ingestion | Spot-check Yorkshire Coal Measures under Pontefract | 1 hour |
| Download and validate GPlates geodata | Optional | If detailed paleogeography needed | 2 hours |
| **Phase 1 Decision Gate** | After validation | Proceed to Phase 2 / remediate issues | 1 hour |

**Phase 1 Decision Gate Criteria:**
- [ ] Hex grid loaded in QGIS — all Five Towns settlements within grid cells
- [ ] Cell count confirmed (res 7: ~323, res 8: ~2,270)
- [ ] fraxen/tectonicplates loaded and Eurasian Plate covers UK correctly
- [ ] BGS bedrock queried for Five Towns bbox — Carboniferous Coal Measures visible
- [ ] Coordinate transformation working (WGS84 output from BNG input)
- [ ] Validation report documents any quality issues

### Phase 2 Human Actions (Historical Boundaries)

| Action | When | Purpose | Approx Time |
|--------|------|---------|-------------|
| Verify OpenDomesday API connectivity | Before ingestion | Test: `curl https://opendomesday.org/api/v1/place/?limit=5 \| jq` | 15 min |
| Fetch all Yorkshire Doomsday places | During ingestion | 2039 places via paginated API | 1 hour |
| Validate Doomsday points in QGIS | After ingestion | Confirm Tanshelf (Pontefract), Leoperce (Castleford) positions | 1 hour |
| Note: Hundred polygons come from Cliopatria, not OpenDomesday | — | OpenDomesday provides points only | — |
| Clone/filter Cliopatria UK dataset | During ingestion | 799 UK features (already done in project) | 30 min |
| Validate Cliopatria 1086 boundaries in QGIS | After ingestion | Barkston Hundred, Osgoldcross, Agbrigg | 1 hour |
| Query boundaries at 1600, 1850, 1974 in QGIS | After validation | Temporal transition check | 1 hour |
| **Phase 2 Decision Gate** | After validation | Proceed to Phase 3 / remediate | 1 hour |

**Phase 2 Decision Gate Criteria:**
- [ ] OpenDomesday points loaded for Yorkshire (2039 places)
- [ ] All 5 Five Towns settlements confirmed in API (Tanshelf, Leoperce, Fernesforde, Chenulvelai, Normentone)
- [ ] Cliopatria temporal boundaries queryable at 1086, 1600, 1850, 1974, 2024
- [ ] Boundary stacking order confirmed (geology → Doomsday → medieval → modern)
- [ ] Visual validation confirms Doomsday points within Cliopatria boundary polygons

### Phase 3 Human Actions (Political Overlays + Gerrymandering)

| Action | When | Purpose | Approx Time |
|--------|------|---------|-------------|
| Download July 2024 constituency boundaries | Before ingestion | From data.gov.uk CKAN dataset | 30 min |
| Extract Five Towns constituencies (3) | During ingestion | Elmet+Pontefract, Normanton+District, Hemsworth | 15 min |
| Recalculate Polsby-Popper with 2024 boundaries | After ingestion | Compare vs old 2022 data | 1 hour |
| Visual comparison in QGIS (current vs historical) | After compactness | Overlay Cliopatria historical with current boundaries | 2 hours |
| Verify flagged changes with Hansard/Boundary Commission | After visual check | Document which changes are gerrymandering vs legitimate reform | 2 hours |
| Download Geofabrik UK admin boundaries | During ingestion | For admin hierarchy context | 30 min |
| Validate admin hierarchy in QGIS | After ingestion | Wakefield MBC, parishes, wards | 1 hour |
| **Phase 3 Decision Gate** | After verification | Proceed to Phase 4 / additional research | 2 hours |

**Phase 3 Decision Gate Criteria:**
- [ ] July 2024 constituency boundaries loaded and indexed
- [ ] Polsby-Popper scores recalculated for all Five Towns constituencies
- [ ] Historical boundary comparison completed (current vs 1086, 1850, 1974)
- [ ] Gerrymandering report documents findings with visual evidence
- [ ] QGIS screenshots confirm boundary overlay visualization
- [ ] Hansard/Boundary Commission references for documented changes

### Phase 4 Human Actions (Integration + QGIS Export)

| Action | When | Purpose | Approx Time |
|--------|------|---------|-------------|
| Web UI review | After implementation | Test era timeline, time slider, hex info panel, tectonic deformation | 1 hour |
| QGIS project export review | After generation | Verify all 11+ layers load correctly from .qlr | 1 hour |
| Final data validation | Before gate | Spot-check all layers, confirm no data corruption | 1 hour |
| Documentation review | Before gate | README, CONTRIBUTING updates | 30 min |
| **Final Decision Gate** | After reviews | Approve final deliverable | 1 hour |

---

## Part 3: Decision Gates Summary

| Phase | Decision Point | Go/No-Go Criteria |
|-------|---------------|-------------------|
| Phase 0 | Research complete | ✅ Source list validated, samples confirmed downloadable, budget £0 confirmed, all 9 research docs updated |
| Phase 1 | Hex grid + geology ingested | ✅ Hex coverage validated in QGIS, BGS bedrock confirmed, tectonic plates loaded |
| Phase 2 | Historical boundaries ingested | ✅ Doomsday points confirmed, Cliopatria temporal coverage validated, boundary stacking confirmed |
| Phase 3 | Gerrymandering analysis complete | ✅ Polsby-Popper recalculated with 2024 data, historical comparison done, findings documented |
| Phase 4 | Integration complete | ✅ Web UI functional (Cesium globe, era timeline, hex info), QGIS project loads all layers |

---

## Part 4: FOSS Licensing Strategy

### Output Layers

| Layer | License | Justification |
|-------|---------|---------------|
| Hex grid (derived) | No license (generated) | Project-generated, no source license |
| Tectonic plates (derived from fraxen) | ODC-BY | fraxen/tectonicplates is ODC-BY |
| Paleogeography (derived from GPlates) | CC-BY | GPlates GeoData is CC-BY |
| Doomsday (derived from OpenDomesday) | ODC-ODbL | OpenDomesday is ODbL (share-alike) |
| Historical boundaries (derived from Cliopatria) | CC-BY-NC | Cliopatria is CC-BY-NC (non-commercial) |
| Admin boundaries (derived from Geofabrik/OSM) | ODbL | OSM is ODbL (share-alike) |
| Constituency boundaries (derived from Electoral Commission) | Click-use | Electoral Commission is click-use (free for non-commercial) |
| Geological (derived from BGS) | OGL | BGS is Open Government License |

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
| Electoral Commission | Click-use | Click-use | ⚠️ Free for non-commercial |

### License Risk Assessment

| Risk Level | Source | Mitigation |
|------------|--------|------------|
| **High** | Cliopatria (CC-BY-NC) | Non-commercial use only — if commercial needed, seek alternative or negotiate |
| **Medium** | Electoral Commission (Click-use) | Register for commercial use; non-commercial is free |
| **Low** | All other sources | FOSS-compatible licenses throughout |

### FOSS-at-Heart Commitment
All outputs are:
- GeoJSON primary (no proprietary format as primary)
- QLR/GPKG for QGIS compatibility
- All source licenses are compatible (no proprietary lock-in)
- Tooling is MIT/Apache 2.0 throughout

---

## Part 5: API Sign-ups Required

| Source | Sign-up Required? | Action |
|--------|-------------------|--------|
| GPlates 2.5 GeoData | ❌ No | Direct download (no auth) |
| fraxen/tectonicplates | ❌ No | GitHub clone (no auth) |
| BGS OGC API | ❌ No | Direct API (no auth) |
| OpenDomesday API | ❌ No | Direct API (no auth) |
| Cliopatria | ❌ No | GitHub clone (no auth) |
| Geofabrik | ❌ No | Direct download (no auth) |
| ONS Open Geography | ❌ No | Direct access (no auth) |
| Electoral Commission | ⚠️ Yes (commercial only) | Register if commercial use anticipated |
| UK Data Service | ⚠️ Yes (registration) | Register for bulk downloads |

**Total sign-ups for Phase 0-4: 0** (no authentication required for any free source, except commercial use of Electoral Commission data)

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

- [ ] Node.js v18+ installed (`node --version`)
- [ ] TypeScript configured (`npx tsc --version`)
- [ ] `npm install` successful (all packages in package.json resolve)
- [ ] GDAL/OGR installed (`ogrinfo --version` — Windows: OSGeo4W)
- [ ] QGIS installed (for human validation)
- [ ] Git configured
- [ ] `H:\place-time` directory accessible

### Phase 1 Start

- [ ] Test BGS OGC API: `curl https://ogcapi.bgs.ac.uk/collections | jq`
- [ ] Test OpenDomesday API: `curl https://opendomesday.org/api/v1/place/?limit=5 | jq`
- [ ] Download fraxen/tectonicplates (~5 MB)
- [ ] Verify h3-js installation with test script

### Phase 2 Start

- [ ] Clone Cliopatria repo or confirm existing UK filtered dataset
- [ ] Verify Doomsday points for all 5 Five Towns settlements
- [ ] Confirm rbush spatial index installation

### Phase 3 Start

- [ ] Download July 2024 constituency boundaries from data.gov.uk
- [ ] Verify Geofabrik UK admin polygons download

---

## Appendix: Command Reference

### Development Commands
```bash
# Install dependencies
npm install

# Run dev server (Cesium UI)
npm run dev

# Run geological ingestion
npm run ingest:geology

# Run historical ingestion
npm run ingest:historical

# Run political ingestion
npm run ingest:boundaries

# Run all ingestion
npm run ingest:all

# TypeScript compile
npx tsc

# QGIS layer file generation
npm run build:qgis

# Query CLI
npm run query -- --place pontefract --year 1086
npm run query -- --lat 53.7 --lng -1.31 --year 1086
```

### Data Download Commands
```bash
# Clone tectonic plates
curl -L -o data/geology/tectonicplates.json https://raw.githubusercontent.com/fraxen/tectonicplates/master/tectonicplates.json

# Clone Cliopatria
git clone https://github.com/Seshat-Global-History-Databank/cliopatria.git data/historical/cliopatria

# BGS OGC API test
curl "https://ogcapi.bgs.ac.uk/collections" | jq

# Fetch BGS bedrock for Five Towns bbox
curl "https://ogcapi.bgs.ac.uk/collections/bgsgeology625kbedrock/items.json?bbox=-1.55,53.58,-1.22,53.78&limit=100" | jq

# OpenDomesday API test
curl "https://opendomesday.org/api/v1/place/?limit=10" | jq

# Download Geofabrik UK admin polygons
wget https://download.geofabrik.de/europe/united-kingdom-admin-levels.shp.zip

# Download July 2024 constituency boundaries from data.gov.uk
# (find direct link on: https://ckan.publishing.service.gov.uk/dataset/westminster-parliamentary-constituencies-july-2024-boundaries-uk-bsc)
```

### GDAL Commands
```bash
# Convert Shapefile to GeoJSON
ogr2ogr -f GeoJSON output.json input.shp

# Convert to GeoPackage
ogr2ogr -f GPKG output.gpkg input.shp

# Transform coordinate system (BNG → WGS84)
ogr2ogr -s_srs EPSG:27700 -t_srs EPSG:4326 output.json input.json

# Inspect shapefile
ogrinfo -al -so input.shp

# Clip to bounding box
ogr2ogr -f GeoJSON output.json input.shp -spat -1.55 53.58 -1.22 53.78
```

---

*Last updated: 2026-05-18. Updated with July 2024 constituency data, validated API status, and refined human action checklists.*