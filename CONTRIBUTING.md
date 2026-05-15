# Contributing to Place-Time

**Date:** 2026-05-15  
**Project:** H:\place-time  
**Principle:** FOSS at heart, human-in-the-loop at decision gates

---

## Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **npm** v8 or higher
- **Git**
- **QGIS** (for human validation steps)
- **GDAL/OGR** (for format conversion)

### Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/place-time.git
cd place-time

# Install dependencies
npm install

# Verify installation
npm run dev
```

---

## Project Structure

```
place-time/
├── data/                    # Data directory (gitignored)
│   ├── geology/            # Geological source data
│   ├── historical/          # Historical boundary data
│   └── boundaries/          # Political boundary data
├── public/                  # Web UI static files
├── research/                # Phase 0 research documents
│   ├── 01-geological-sources.md
│   ├── 02-historical-sources.md
│   ├── 03-political-sources.md
│   ├── 04-hex-system-analysis.md
│   ├── 05-tools-and-human-actions.md
│   ├── 06-data-scale-estimate.md
│   └── 07-development-roadmap.md
├── src/
│   ├── core/                # Core modules (hex, qgis, types)
│   ├── ingest/              # Data ingestion scripts
│   └── ui/                  # Web UI components
├── package.json
└── tsconfig.json
```

---

## Tooling Setup

### Node.js / TypeScript

```bash
# Already configured via package.json
npm install
```

### GDAL/OGR Installation (Windows)

**Option 1: OSGeo4W**
1. Download OSGeo4W installer from https://osgeo4w.osgeo.io/
2. Install with "Express" type → select gdal package
3. Add to PATH: `C:\OSGeo4W64\bin`

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
2. Install (Windows: use standalone installer)
3. Verify by opening QGIS desktop application

---

## Data Sources Setup

### Geological Sources

```bash
# Clone tectonic plates (fraenx)
git clone https://github.com/fraxen/tectonicplates.git data/geology/tectonicplates

# BGS OGC API — no clone needed, query via API
# Test endpoint:
curl "https://ogcapi.bgs.ac.uk/collections" | jq
```

### Historical Sources

```bash
# Clone Cliopatria (full dataset)
git clone https://github.com/Seshat-Global-History-Databank/cliopatria.git data/historical/cliopatria
# Note: cliopatria.geojson is distributed as zip — unzip after clone
unzip data/historical/cliopatria/cliopatria.geojson.zip -d data/historical/cliopatria/

# OpenDomesday — API only, no clone needed
# Test:
curl "https://opendomesday.org/api/v1/place/" | jq
```

### Political Sources

```bash
# Geofabrik UK extract (admin boundaries)
# Download from: https://download.geofabrik.de/europe/united-kingdom.html
# Look for: united-kingdom.shp.zip
# Manual download required — no git clone

# Electoral Commission constituencies
# Download from: https://www.electoralcommission.org.uk/our-work/our-research/our-electoral-data
# Manual registration required for commercial use
```

---

## Running the Project

### Development Server

```bash
npm run dev
# Opens web UI at http://localhost:3000
```

### Data Ingestion

```bash
# Ingest geological data (tectonic plates + BGS)
npm run ingest:geology

# Ingest historical data (Doomsday + Cliopatria)
npm run ingest:historical

# Ingest political boundaries (Geofabrik + Electoral Commission)
npm run ingest:boundaries

# Generate QGIS layer files (.qlr)
npm run generate:qlr
```

### TypeScript Compilation

```bash
# Compile TypeScript
npx tsc

# Watch mode
npx tsc --watch
```

---

## Human Action Checklists

### Phase 0 Completion Checklist

Before proceeding from Phase 0 to Phase 1, verify:

- [ ] `research/01-geological-sources.md` reviewed
- [ ] `research/02-historical-sources.md` reviewed
- [ ] `research/03-political-sources.md` reviewed
- [ ] `research/04-hex-system-analysis.md` reviewed
- [ ] `research/05-tools-and-human-actions.md` reviewed
- [ ] `research/06-data-scale-estimate.md` reviewed
- [ ] `research/07-development-roadmap.md` reviewed and approved
- [ ] Budget confirmed (£0 for Phase 0-4)
- [ ] H3 resolution decision confirmed (res 8 for Five Towns)
- [ ] Tooling installed and verified (Node.js, GDAL/OGR, QGIS)

### Phase 1 Completion Checklist

Before proceeding from Phase 1 to Phase 2:

- [ ] `data/five-towns-grid-res7.geojson` generated and validated
- [ ] `data/five-towns-grid-res8.geojson` generated and validated
- [ ] **QGIS Validation:** Hex grid loaded, all Five Towns settlements within grid
- [ ] `data/geology/tectonic-plates.geojson` ingested and hex-indexed
- [ ] `data/geology/bedrock-geology.geojson` (BGS) ingested and hex-indexed
- [ ] **QGIS Validation:** Geological layers display correctly over hex grid
- [ ] `data/geology/validation-report.md` completed
- [ ] Phase 1 decision gate approved

### Phase 2 Completion Checklist

Before proceeding from Phase 2 to Phase 3:

- [ ] `data/historical/domesday-yorkshire.geojson` ingested (2039 places)
- [ ] `data/historical/cliopatria-uk.geojson` ingested (UK temporal entities)
- [ ] **QGIS Validation:** Cliopatria boundaries queryable at 1086, 1600, 1900, 2024
- [ ] **QGIS Validation:** Doomsday points align with Cliopatria boundary polygons
- [ ] Boundary stacking order documented
- [ ] Phase 2 decision gate approved

### Phase 3 Completion Checklist

Before proceeding from Phase 3 to Phase 4:

- [ ] `data/boundaries/admin-boundaries.geojson` ingested (Geofabrik)
- [ ] `data/boundaries/constituencies.geojson` ingested (Electoral Commission)
- [ ] Polsby-Popper compactness calculated for all constituencies
- [ ] `data/boundaries/compactness-analysis.geojson` generated
- [ ] Historical boundary comparison completed (current vs pre-1880)
- [ ] **QGIS Validation:** Visual comparison of gerrymandered boundaries
- [ ] `research/constituency-gerrymandering-report.md` completed
- [ ] Phase 3 decision gate approved

### Phase 4 Completion Checklist

Final approval:

- [ ] Web UI functional (time slider, layer toggles, map view)
- [ ] `GET /query?lat=&lng=&year=` endpoint operational
- [ ] `export/five-towns-full.qgz` QGIS project generated
- [ ] All GeoJSON bundles validated
- [ ] User documentation complete
- [ ] Final decision gate approved

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
npm run dev                  # Start development server

# Validation
ogrinfo -al input.shp        # Inspect shapefile
curl "https://opendomesday.org/api/v1/place/" | jq  # Test OpenDomesday API
curl "https://ogcapi.bgs.ac.uk/collections" | jq    # Test BGS API
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

---

## Development Principles

1. **FOSS at heart:** All outputs compatible with FOSS licenses
2. **Human decision gates:** No automated progression between phases
3. **QGIS validation:** Human must validate in QGIS before phase gate
4. **File-based storage:** No database required (GeoJSON + spatial index sufficient)
5. **Standards-compliant:** GeoJSON, OGC standards, OSM data model

---

*Last updated: 2026-05-15 (Phase 0 complete)*