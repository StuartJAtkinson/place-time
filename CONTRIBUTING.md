# Contributing to Place-Time

**Date:** 2026-05-18 (updated after Phase 0 research sprint)  
**Project:** H:\place-time  
**Principle:** FOSS at heart, human-in-the-loop at decision gates  
**Budget:** £0 for Phase 0-4 (all data sources are free)

---

## Executive Summary

Phase 0 research is complete. All 9 research documents have been updated with validated information about current data sources, API status, cell counts, and human action requirements. The project is ready to proceed to Phase 1 (Hex Grid Calibration + Geological Base).

**Key validated findings:**
- H3 confirmed as hex system (Apache 2.0, global, 6K stars)
- Five Towns cell counts confirmed: 323 at res 7, 2,270 at res 8
- All primary data sources are free (£0 budget)
- July 2024 constituency boundaries available (need update from 2022 data)
- OpenDomesday confirmed as points only (polygons from Cliopatria)
- BGS OGC API confirmed live with 13 collections

---

## Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **npm** v8 or higher
- **Git**
- **QGIS** (for human validation steps) — https://qgis.org/en/site/forusers/download.html
- **GDAL/OGR** (for format conversion) — see Windows installation below

### Setup

```bash
# Clone the repository (or pull latest if already cloned)
cd H:\place-time
git pull

# Install dependencies
npm install

# Verify installation
node --version   # should be v18+
npx tsc --version

# Test data sources (API connectivity)
curl https://ogcapi.bgs.ac.uk/collections | jq    # BGS OGC API
curl https://opendomesday.org/api/v1/place/?limit=5 | jq  # OpenDomesday API

# Ingest all data (after confirming API connectivity)
npm run ingest:all

# Verify with a query
npm run query -- --place pontefract --year 1086

# Start web UI (Cesium globe)
npm run dev   # → http://localhost:5173

# Generate QGIS project
npm run build:qgis   # → export/place-time-five-towns.qlr
```

### QGIS MCP Setup (for AI-driven QGIS control)

QGIS MCP allows OpenClaw to drive QGIS directly:

1. Install the nkarasiak QGIS MCP plugin
   - Download from: https://github.com/nkarasiak/qgis-mcp-plugin (or search QGIS Plugin Manager)
   - Or install via QGIS: Plugins → Manage and Install Plugins → search "MCP"
2. Open QGIS desktop application
3. Start the plugin server: **Plugins > QGIS MCP > Start Server**
4. Verify connection: `mcporter call qgis.ping` → `{"pong": true}`
5. Note: The plugin server must be restarted each QGIS session. Port 9876.

---

## Project Structure

```
place-time/
├── data/                    # Data directory (gitignored)
│   ├── geology/            # Geological source data
│   ├── historical/          # Historical boundary data (Doomsday, Cliopatria)
│   ├── boundaries/          # Political boundary data (Geofabrik, ONS)
│   └── five-towns/          # Generated hex grids
├── public/                  # Web UI static files + tectonic mesh
├── research/                # Phase 0 research documents (9 total)
│   ├── 01-geological-sources.md    # GPlates, fraxen, BGS OGC API
│   ├── 02-historical-sources.md    # OpenDomesday, Cliopatria, temporal coverage
│   ├── 03-political-sources.md     # Geofabrik, ONS, Electoral Commission, July 2024
│   ├── 04-hex-system-analysis.md   # H3 vs ISEGrid, res 7/8 cell counts
│   ├── 05-tools-and-human-actions.md  # Tool list, human action checklists
│   ├── 06-data-scale-estimate.md    # Volume estimates (Five Towns <5MB)
│   ├── 07-development-roadmap.md    # This roadmap
│   ├── 08-knowledge-graph-stack.md # Neo4j + Infranodus + Wikidata + BFO
│   └── 09-epistemological-framework.md  # Philosophical framework
├── src/
│   ├── core/                # Core modules (hex, qgis, types)
│   ├── ingest/              # Data ingestion scripts
│   └── ui/                  # Web UI components (Cesium globe)
├── export/                  # QGIS layer definition files (.qlr)
├── scripts/                 # Build and utility scripts
├── package.json
├── tsconfig.json
└── README.md
```

---

## Validated Cell Counts

| Resolution | Hex Edge | Hex Area | Five Towns Cell Count |
|-----------|----------|----------|----------------------|
| 6 | 3.23 km | 8 km² | ~70 (too coarse) |
| **7** | **1.22 km** | **0.89 km²** | **323 cells** |
| **8** | **0.46 km** | **0.10 km²** | **2,270 cells** |
| 9 | 0.17 km | 0.01 km² | ~36,000 (too fine) |

**Recommendation:** Resolution 8 as primary for detailed analysis, Resolution 7 for regional overview.

---

## Data Sources Summary (All Free)

### Geological
| Source | License | Status |
|--------|---------|--------|
| fraxen/tectonicplates (GitHub) | ODC-BY | ✅ Live — `curl https://raw.githubusercontent.com/fraxen/tectonicplates/master/tectonicplates.json` |
| BGS OGC API | OGL | ✅ Live — `https://ogcapi.bgs.ac.uk/collections` (13 collections) |
| GPlates 2.5 GeoData (Zenodo) | CC-BY | Download from zenodo.org/records/14194897 (~500 MB) |

### Historical
| Source | License | Status |
|--------|---------|--------|
| OpenDomesday API | ODC-ODbL | ✅ Live — `https://opendomesday.org/api/v1/place/` (points only, not polygons) |
| Cliopatria (GitHub) | CC-BY-NC | ✅ Live — clone from github.com/Seshat-Global-History-Databank/cliopatria |

### Political
| Source | License | Status |
|--------|---------|--------|
| Geofabrik/OSM | ODbL | ✅ Live — `https://download.geofabrik.de/europe/united-kingdom.html` (daily updates) |
| ONS Open Geography | OGL | ✅ Live — `https://geoportal.statistics.gov.uk/` |
| Electoral Commission (July 2024) | Click-use (free non-commercial) | ✅ Live — data.gov.uk dataset "westminster-parliamentary-constituencies-july-2024-boundaries-uk-bsc" |

---

## Tooling Setup

### Node.js / TypeScript
Already configured via package.json. Run `npm install` to ensure all dependencies are present.

### GDAL/OGR Installation (Windows)

**Option 1: OSGeo4W (recommended)**
1. Download from https://osgeo4w.osgeo.io/
2. Run installer with "Express" type
3. Select `gdal` package during installation
4. Add to PATH: `C:\OSGeo4W64\bin`

**Option 2: Conda**
```bash
conda install -c conda-forge gdal
```

**Verify installation:**
```bash
ogrinfo --version
# Should output GDAL version, e.g., GDAL 3.x.x
```

### QGIS Installation

1. Download from https://qgis.org/en/site/forusers/download.html
2. Use standalone installer (not OSGeo4W bundle for simplicity)
3. Verify by opening QGIS desktop application

---

## Data Sources Setup Commands

### Geological Sources

```bash
# fraxen/tectonicplates — direct download (~5 MB)
curl -L -o data/geology/tectonicplates.json https://raw.githubusercontent.com/fraxen/tectonicplates/master/tectonicplates.json

# BGS OGC API — no clone needed, query via API
# Test endpoint:
curl "https://ogcapi.bgs.ac.uk/collections" | jq

# Fetch bedrock for Five Towns bbox (-1.55,53.58,-1.22,53.78)
curl "https://ogcapi.bgs.ac.uk/collections/bgsgeology625kbedrock/items.json?bbox=-1.55,53.58,-1.22,53.78&limit=100" | jq

# Fetch superficial deposits
curl "https://ogcapi.bgs.ac.uk/collections/bgsgeology625ksuperficial/items.json?bbox=-1.55,53.58,-1.22,53.78&limit=50" | jq

# GPlates 2.5 GeoData — manual download from Zenodo (~500 MB)
# URL: https://zenodo.org/records/14194897
# File: gplates_2.5.0_geodata.zip
```

### Historical Sources

```bash
# Cliopatria — GitHub clone (~44 MB zip)
git clone https://github.com/Seshat-Global-History-Databank/cliopatria.git data/historical/cliopatria
# Note: cliopatria.geojson is distributed as zip — unzip after clone
unzip data/historical/cliopatria/cliopatria.geojson.zip -d data/historical/cliopatria/

# OpenDomesday — API only, no clone needed
# Test:
curl "https://opendomesday.org/api/v1/place/?limit=5" | jq

# Fetch Yorkshire places (2039 total, paginated)
# Use offset/limit for pagination
curl "https://opendomesday.org/api/v1/place/?limit=1000&offset=0" | jq   # first 1000
curl "https://opendomesday.org/api/v1/place/?limit=1000&offset=1000" | jq  # next 1000
curl "https://opendomesday.org/api/v1/place/?limit=1000&offset=2000" | jq  # remaining 39
```

### Political Sources

```bash
# Geofabrik UK admin polygons (~100 MB)
wget https://download.geofabrik.de/europe/united-kingdom-admin-levels.shp.zip

# Or full OSM extract (~200 MB)
wget https://download.geofabrik.de/europe/united-kingdom-latest.shp.zip

# Electoral Commission July 2024 constituencies
# Download from data.gov.uk:
# https://ckan.publishing.service.gov.uk/dataset/westminster-parliamentary-constituencies-july-2024-boundaries-uk-bsc
# Direct resource link (find on dataset page):
# Shapefile (BFC): https://open-england、公共storage.s3.amazonaws.com/...
# GeoPackage: https://open-england...
```

---

## Running the Project

### Development Server

```bash
npm run dev
# Opens Cesium web UI at http://localhost:5173
```

### Data Ingestion

```bash
# Ingest geological data (tectonic plates + BGS)
npm run ingest:geology

# Ingest historical data (Doomsday + Cliopatria)
npm run ingest:historical

# Ingest political boundaries (Geofabrik + Electoral Commission)
npm run ingest:boundaries

# Ingest all
npm run ingest:all

# Generate QGIS layer files (.qlr)
npm run build:qgis
```

### CLI Queries

```bash
# Query by place name
npm run query -- --place pontefract --year 1086

# Query by coordinates
npm run query -- --lat 53.7 --lng -1.31 --year 1086

# Query at different years
npm run query -- --place castleford --year 1600
npm run query -- --place normanton --year 1850
npm run query -- --place featherstone --year 2024
```

---

## Human Action Checklists

### Phase 0 Completion ✅ (Done)

Before proceeding from Phase 0 to Phase 1, verify:

- [x] `research/01-geological-sources.md` reviewed (GPlates, fraxen, BGS OGC API validated)
- [x] `research/02-historical-sources.md` reviewed (OpenDomesday + Cliopatria validated)
- [x] `research/03-political-sources.md` reviewed (Geofabrik + ONS + Electoral Commission + July 2024 boundaries)
- [x] `research/04-hex-system-analysis.md` reviewed (H3 confirmed, 323/2,270 cells validated)
- [x] `research/05-tools-and-human-actions.md` reviewed (tool list + human actions confirmed)
- [x] `research/06-data-scale-estimate.md` reviewed (Five Towns <5MB, UK ~200MB)
- [x] `research/07-development-roadmap.md` reviewed (this document)
- [x] Budget confirmed (£0 for Phase 0-4)
- [x] H3 resolution confirmed (res 8 primary, res 7 secondary)
- [x] Tooling installed and verified (Node.js, GDAL/OGR, QGIS)

### Phase 1 Completion Checklist

Before proceeding from Phase 1 to Phase 2:

- [ ] **QGIS Validation:** Load `export/place-time-five-towns.qlr` — confirm all 11 layers load correctly
- [ ] **Hex grid check:** Verify res 7 (323 cells) and res 8 (2,270 cells) grids loaded
- [ ] **BGS API test:** Confirm BGS OGC API is accessible
- [ ] **fraenx tectonic plates:** Load `data/geology/tectonic-plates.geojson` — verify Eurasian Plate covers UK
- [ ] **BGS bedrock:** Query Five Towns bbox — confirm Carboniferous Coal Measures under Pontefract
- [ ] **Coordinate transform:** Verify BNG→WGS84 transformation working
- [ ] **Phase 1 Decision Gate:** Stuart approves hex grid + geological data

### Phase 2 Completion Checklist

Before proceeding from Phase 2 to Phase 3:

- [ ] **OpenDomesday API test:** `curl https://opendomesday.org/api/v1/place/?limit=5 | jq` works
- [ ] **Yorkshire places:** Fetched 2039 Doomsday places via paginated API
- [ ] **Five Towns settlements:** All 5 confirmed in API (Tanshelf, Leoperce, Fernesforde, Chenulvelai, Normentone)
- [ ] **Cliopatria UK:** Dataset validated (799 features, 161–2024 CE)
- [ ] **1086 boundaries:** Barkston Hundred, Osgoldcross, Agbrigg validated in QGIS
- [ ] **Temporal queries:** Verified at 1086, 1600, 1850, 1974, 2024
- [ ] **Phase 2 Decision Gate:** Stuart approves historical boundaries

### Phase 3 Completion Checklist

Before proceeding from Phase 3 to Phase 4:

- [ ] **July 2024 boundaries:** Downloaded from data.gov.uk, loaded for Five Towns
- [ ] **Polsby-Popper recalculated:** All 3 constituencies with July 2024 boundaries
- [ ] **Historical comparison:** Cliopatria at ~1832, 1880, 1948, 1983
- [ ] **Visual comparison:** QGIS overlay of current vs historical
- [ ] **Hansard/Boundary Commission:** Cross-referenced documented changes
- [ ] **Gerrymandering report:** Documented findings with visual evidence
- [ ] **Phase 3 Decision Gate:** Stuart approves gerrymandering findings

### Phase 4 Completion Checklist

Final approval:

- [ ] **Web UI review:** `npm run dev` — Cesium globe, era buttons, time slider, hex info panel, tectonic deformation
- [ ] **QGIS project:** `export/place-time-five-towns.qlr` — all layers load correctly
- [ ] **CLI query:** Tested with various place/year combinations
- [ ] **Documentation:** README and CONTRIBUTING updated
- [ ] **Final Decision Gate:** Stuart approves final deliverable

---

## Key Commands Reference

```bash
# Setup
npm install                    # Install dependencies
npx tsc --watch              # Watch TypeScript changes

# Data ingestion
npm run ingest:geology       # Run geological ingestion pipeline
npm run ingest:historical    # Run historical ingestion pipeline
npm run ingest:boundaries   # Run political ingestion pipeline
npm run generate:qlr        # Generate QGIS layer files

# Development
npm run dev                  # Start development server (Cesium UI)
npm run query                # Run CLI query

# Validation
ogrinfo --version            # Check GDAL installation
curl https://ogcapi.bgs.ac.uk/collections | jq  # Test BGS API
curl https://opendomesday.org/api/v1/place/?limit=5 | jq  # Test OpenDomesday API

# QGIS
# Layer > Add from Layer Definition File > select export/place-time-five-towns.qlr
```

---

## License Notes

This project uses multiple data sources with different licenses:

| Source | License | Notes |
|--------|---------|-------|
| fraxen/tectonicplates | ODC-BY | Attribution required |
| GPlates 2.5 GeoData | CC-BY | Attribution required |
| OpenDomesday | ODC-ODbL | Share-alike (derived DB must be ODbL) |
| Cliopatria | CC-BY-NC | **Non-commercial only** — important! |
| Geofabrik/OSM | ODbL | Share-alike |
| BGS | OGL | Open Government License |
| Electoral Commission | Click-use | Free for non-commercial |

**Important:** Cliopatria's CC-BY-NC license means commercial use is restricted. If this project or its derivatives are used commercially, seek alternative data or negotiate a commercial license.

All ingestion tooling is MIT licensed.

---

## Troubleshooting

### GDAL not found after install

Add to PATH or use full path:
```bash
# Windows: Add to system PATH
# C:\OSGeo4W64\bin (if using OSGeo4W)

# Or use full path
C:\OSGeo4W64\bin\ogr2ogr.exe ...
```

### npm install fails

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules
npm install
```

### API rate limits

- OpenDomesday: No auth, unknown rate limit — implement backoff if 429 received
- BGS OGC API: No auth, BETA — expect changes, implement error handling
- Cliopatria: Bulk download only — no rate limit issues

### QGIS MCP plugin not connecting

1. Ensure QGIS is running with the MCP plugin enabled (Plugins > QGIS MCP > Start Server)
2. Check port 9876 is not in use: `netstat -an | grep 9876`
3. Restart QGIS and try again

---

## Development Principles

1. **FOSS at heart:** All outputs compatible with FOSS licenses
2. **Human decision gates:** No automated progression between phases
3. **QGIS validation:** Human must validate in QGIS before phase gate
4. **File-based storage:** No database required (GeoJSON + spatial index sufficient)
5. **Standards-compliant:** GeoJSON, OGC standards, OSM data model
6. **£0 budget:** All primary sources are free — no paid data required for Phase 0-4

---

## Phase 7: Knowledge Graph (Decision Pending)

Research documents 08 and 09 outline a knowledge graph stack (Neo4j + Infranodus + Wikidata + BFO). Stuart needs to approve before Phase 7 build starts.

Key questions:
1. Neo4j adoption — confirm homelab can host (memory, port 7474)?
2. Infranodus inclusion — AGPL constraint acceptable (source disclosure)?
3. BFO rigor — full OWL/BFO alignment, or simplified naming convention?
4. Wikidata depth — SPARQL endpoint only, or local Wikibase mirror?

---

## Phase 8: Global Extension (Optional)

Only proceeds if:
- Five Towns proof-of-concept validated
- Funding/resources available
- Stuart approves global scope

Currently the tectonic mesh covers the UK bbox only. For a full globe:
- Run `npm run build:tectonic -- --area=global` (long job, ~12–24h for all H3 res-6 cells globally)
- ~500K cells globally at res 6 → mesh would be ~350MB

---

*Last updated: 2026-05-18 after Phase 0 research sprint complete. All research documents validated.*