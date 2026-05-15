# Place-Time: Structured Development Plan

> Hexagonal geological-to-political spatial index framework
> Focus: Five Towns (Pontefract, Knottingley, Featherstone, Castleford, Normanton)
> Principle: FOSS at heart, standards-compliant, human-in-the-loop at decision gates

**Date:** 2026-05-15
**Status:** Pre-research phase — planning

---

## Executive Summary

Place-Time is a hexagonal tessellation framework that maps all Earth surface history from geological reference spheres through political boundaries over time. The goal is a queryable, standards-compliant spatial index that makes gerrymandering and historical boundary manipulation transparent.

**Delivery model:** Long-term phased development with human decision gates between phases. Not a continuous automated pipeline — requires human verification at each major step.

**This document:** Practical steps for Phase 0 (Research) and beyond. Each phase is a distinct work package with defined outputs, tooling, human actions required, and quality gates.

---

## Phase Structure

```
Phase 0: Research & Data Audit (Human-Driven)
Phase 1: Hex Grid Calibration + Geological Base
Phase 2: Historical Boundaries (English Focus)
Phase 3: Political Overlays + Gerrymandering Detection
Phase 4: Integration + QGIS Export
Phase 5: Global Extension (Optional)
```

Each phase ends with a **decision gate**: human reviews output and decides whether to proceed, pivot, or pause.

---

## Phase 0: Research & Data Audit

**Duration:** 2-3 weeks | **Type:** Research sprint | **Human involvement:** High

### 0.1: Geological Layer Research

**Goal:** Identify all viable geological data sources (public + paid), assess coverage, quality, licensing, and API accessibility for Five Towns area.

#### Tasks

1. **Enumerate geological data sources**
   - List: GPlates 2.5 GeoData, fraxen/tectonicplates, dhasterok/global_tectonics, BGS (British Geological Survey), USGS, Natural Earth
   - For each: license, format, coverage, resolution, update frequency, API availability

2. **Assess API access methods**
   - Direct download vs authenticated API vs request-based
   - Rate limits, quota costs, bulk download options
   - GeoJSON vs Shapefile vs proprietary formats

3. **Quality assessment for Five Towns**
   - Does source have detail at 1:50k scale or better?
   - Are Carboniferous/Yorkshire Coal Measures well-represented?
   - Tectonic plate boundaries for British Isles region

4. **Human decision: Choose primary geological source(s)**
   - Output: ranked shortlist with pros/cons
   - Human selects which sources to pursue

#### Tools
- `curl` / `wget` for API testing
- `ogrinfo` (GDAL) for format inspection
- `jq` for JSON analysis
- QGIS for visual verification of samples

#### Human Actions
- Review ranked source list
- Decide which sources to license/access (paid sources may require budget approval)
- Sign up for API accounts where needed
- Validate sample data downloaded in QGIS

#### Output
- `research/geological-sources.md` — full audit of sources with assessment scores
- `data/geology/` directory populated with sample extracts

---

### 0.2: Historical Boundaries Research

**Goal:** Identify Doomsday Book, Cliopatria, and other historical boundary sources with temporal coverage for Five Towns area.

#### Tasks

1. **OpenDomesday API audit**
   - Test REST API for Yorkshire/Five Towns queries
   - Assess: data format, completeness (does it include polygon boundaries or just point locations?), update cadence
   - Check if hundreds and townships have polygon geometry

2. **Cliopatria/Seshat assessment**
   - Evaluate coverage for UK 1066–2024
   - Temporal resolution: can we query "what was the boundary in 1086, 1240, 1550, 1880, 2024"?
   - API or bulk download? License implications (CC-BY-NC)

3. **Supplementary historical sources**
   - UK Data Service historical boundaries
   - British Library georeferenced historical maps
   - Aourednik/historical-basemaps for broader European coverage

4. **Human decision: Select historical boundary stack**
   - Output: ranked list with temporal coverage matrix (which years we can query)
   - Human validates against specific Five Towns requirements

#### Tools
- `curl` for API testing
- `geojsonio` or QGIS for visual inspection of sample boundaries
- Python `requests` for API batch queries

#### Human Actions
- Verify Doomsday polygons for Five Towns in QGIS
- Review Cliopatria temporal coverage against key historical dates
- Decide on licensing approach (CC-BY-NC may limit commercial use)

#### Output
- `research/historical-sources.md` — full audit with temporal coverage matrix
- `data/historical/` directory with sample extracts

---

### 0.3: Political Boundaries Research

**Goal:** Identify modern administrative boundaries, constituency definitions, and electoral data sources.

#### Tasks

1. **UK Administrative Boundaries**
   - Geofabrik: daily OSM extracts — assess format, update frequency, UK coverage
   - ONS Open Geography Portal: census boundaries, GSS codes
   - Ordnance Survey: MasterMap,Boundary-Line (requires license)

2. **Constituency Definitions**
   - UK Electoral Commission: official constituency shapefiles + GSS codes
   - Historical constituency changes (Hansard records, Library House of Commons)

3. **Gerrymandering metrics sources**
   - Polsby-Popper compactness data
   - Efficiency gap calculations
   - Historical comparison baselines (1880s county maps)

4. **Paid data assessment**
   - ONS charged boundaries
   - Ordnance Survey premium layers
   - Commercial electoral data vendors

5. **Human decision: Political layer source stack**
   - Output: free vs paid matrix for each political layer type
   - Human decides which paid sources are justified vs free alternatives

#### Tools
- Geofabrik download scripts
- ONS API access
- QGIS for boundary inspection

#### Human Actions
- Review free vs paid decision matrix
- Approve budget for any paid sources (if needed)
- Validate Five Towns constituency boundaries in QGIS

#### Output
- `research/political-sources.md` — full audit with free/paid classification
- `data/boundaries/` directory with sample extracts

---

### 0.4: Hex Grid System Selection

**Goal:** Finalize H3 vs ISEGrid vs custom hex decision with practical justification.

#### Tasks

1. **H3 evaluation (Uber)**
   - Resolution vs coverage tradeoff for Five Towns
   - Integration complexity with GeoJSON
   -已有 open source tooling support

2. **ISEGrid evaluation (UK Ordnance Survey)**
   - UK-specific alignment advantages
   - Licensing implications
   - Tooling maturity

3. **Hybrid approach evaluation**
   - H3 for global coverage, ISEGrid for UK detail layer
   - Coordinate system bridging (WGS84 ↔ BNG)

4. **Human decision: Hex grid architecture**
   - Output: decision with rationale
   - May defer to Phase 1 if still uncertain

#### Human Actions
- Review hex system comparison
- Decide primary hex system for project

#### Output
- `research/hex-system-decision.md` — architecture decision with rationale

---

### Phase 0 Deliverables

- [ ] `research/geological-sources.md` — scored source list with API assessment
- [ ] `research/historical-sources.md` — temporal coverage matrix
- [ ] `research/political-sources.md` — free/paid decision matrix
- [ ] `research/hex-system-decision.md` — architecture decision
- [ ] `data/geology/` — sample geological data extracts (validated in QGIS)
- [ ] `data/historical/` — sample historical boundary extracts
- [ ] `data/boundaries/` — sample political boundary extracts
- [ ] Phase 0 decision gate: human approves / rejects / pivots

---

## Phase 1: Hex Grid Calibration + Geological Base

**Duration:** 4-6 weeks | **Type:** Build | **Human involvement:** Medium

### 1.1: H3 Resolution Calibration

**Goal:** Finalize H3 resolution for Five Towns and validate global coverage claim.

#### Tasks

1. **Calculate reference spheres**
   - Outer sphere: all known highest points + 1km buffer (Everest, ancient paleopeaks)
   - Inner sphere: Mariana Trench - 1km buffer
   - Confirm: no Earth surface location falls outside these bounds

2. **Resolution selection for Five Towns**
   - Resolution 7: ~23km hex, ~50-80 cells for Yorkshire
   - Resolution 8: ~8.7km hex, ~300-500 cells for Five Towns
   - Validate: is res 8 fine enough for constituency boundary analysis?

3. **Generate Five Towns hex grid**
   - Bounding box: approx 53.6-53.9°N, 1.3-1.5°W
   - Output: GeoJSON hex grid at selected resolution

4. **Validate hex coverage in QGIS**
   - Load hex grid alongside geological layers
   - Confirm all Five Towns settlements fall within hex cells
   - Human approves grid before proceeding

#### Human Actions
- Approve H3 resolution selection
- Validate Five Towns hex coverage in QGIS

#### Output
- `data/five-towns-grid.geojson` — hex grid for primary focus area

---

### 1.2: Geological Data Ingestion

**Goal:** Ingest selected geological sources into structured pipeline.

#### Tasks

1. **Scrape:** Fetch geological data from selected sources (APIs or bulk downloads)
2. **Group:** Assign each feature to H3 cell(s)
3. **Clean:** Validate geometries, remove duplicates, normalize property names
4. **Standardize:** Output as GeoJSON + generate QLR files

#### Tools (Automated)
- `ogr2ogr` (GDAL) for format conversion
- Custom Node.js ingestion scripts (already scaffolded in `src/ingest/geology.ts`)
- `geojson-merge` for combining sources

#### Tools (Human-Assisted)
- QGIS validation: spot-check geological polygons align with known geology
- Correct obvious mismappings (e.g., features assigned to wrong H3 cell)

#### Output
- `data/geology/tectonic_plates.geojson` — ingested + indexed
- `data/geology/geological_provinces.geojson` — ingested + indexed
- `src/ingest/geology.ts` — updated with full pipeline
- QLR files for QGIS

---

### 1.3: Geological Layer Validation

**Goal:** Verify ingested data quality matches research phase assessment.

#### Tasks

1. **Load in QGIS** — all geological layers with hex grid
2. **Spot checks** — validate known geology (Yorkshire Coal Measures around Pontefract)
3. **Document issues** — gaps, misalignments, missing data

#### Human Actions
- Visual QA in QGIS against known geological maps
- Log issues for remediation in Phase 1 or back to Phase 0

#### Output
- `data/geology/validation-report.md` — documented quality assessment

---

### Phase 1 Decision Gate

Human reviews:
- Hex grid coverage validated
- Geological data ingested and QA'd
- Pipeline scripts operational

Decision: proceed / remediate / pivot

---

## Phase 2: Historical Boundaries (English Focus)

**Duration:** 6-8 weeks | **Type:** Build | **Human involvement:** Medium

### 2.1: Doomsday Book Ingestion (OpenDomesday)

**Goal:** Ingest 1086 boundaries for Yorkshire/Five Towns area.

#### Tasks

1. **Scrape:** OpenDomesday REST API for Yorkshire hundreds and townships
2. **Group:** Assign to H3 cells
3. **Clean:** Validate polygon geometries (some Doomsday data is points, not polygons)
4. **Standardize:** GeoJSON + QLR

#### Tools (Automated)
- `curl` / `wget` for API scraping
- Custom Node.js scripts for Doomsday-specific parsing

#### Tools (Human-Assisted)
- QGIS: verify polygon boundaries for Barkston Hundred (covers Pontefract)
- Cross-reference: Tanshelf (Pontefract) and Leoperce (Castleford) in Doomsday data

#### Human Actions
- Confirm Doomsday polygons are present for Five Towns or flag as points-only
- Validate boundary geometry in QGIS

#### Output
- `data/historical/domesday-yorkshire.geojson` — Doomsday boundaries indexed by H3

---

### 2.2: Cliopatria Ingestion (UK Political Entities)

**Goal:** Ingest UK political entities 1066–2024 with temporal timestamps.

#### Tasks

1. **Scrape/Access:** Cliopatria bulk download or API
2. **Group:** Assign to H3 cells
3. **Clean:** Validate temporal data (validFrom/validTo fields)
4. **Standardize:** GeoJSON with temporal properties

#### Tools (Automated)
- Node.js Cliopatria ingestion scripts
- Temporal validation (check validFrom <= validTo for all entities)

#### Tools (Human-Assisted)
- QGIS: spot-check temporal boundaries at known dates (1086, 1700, 1880, 2024)
- Verify: Doomsday, medieval, and modern boundaries align at shared borders

#### Human Actions
- Validate temporal boundary changes at key dates
- Flag any anomalous boundary transitions

#### Output
- `data/historical/cliopatria-uk.geojson` — temporal political entities indexed by H3

---

### Phase 2 Decision Gate

Human reviews:
- Doomsday boundaries validated for Five Towns
- Cliopatria temporal coverage confirmed
- Boundary stacking order established

---

## Phase 3: Political Overlays + Gerrymandering Detection

**Duration:** 8-12 weeks | **Type:** Build + Analysis | **Human involvement:** Medium-High

### 3.1: Modern Administrative Boundaries

**Goal:** Ingest current UK boundaries (parish → constituency) from Geofabrik/OSM.

#### Tasks

1. **Scrape:** Geofabrik daily UK extracts (admin boundaries)
2. **Group:** Assign to H3 cells
3. **Clean:** Normalize GSS codes, constituency names
4. **Standardize:** GeoJSON + QLR

#### Tools (Automated)
- Geofabrik download scripts
- `ogr2ogr` for format conversion

#### Output
- `data/boundaries/admin-boundaries.geojson` — current UK admin hierarchy

---

### 3.2: Constituency Boundary Analysis

**Goal:** Calculate gerrymandering metrics (Polsby-Popper compactness) for current vs historical boundaries.

#### Tasks

1. **Calculate Polsby-Popper compactness** for each current constituency
2. **Compare** against 1880s county boundaries (pre-Reform Act stable geography)
3. **Flag** constituencies with dramatic compactness drop (potential gerrymandering)

#### Tools (Automated)
- Python/Node.js compactness calculation
- Boundary comparison algorithms

#### Tools (Human-Assisted)
- QGIS: visual comparison of current vs historical boundaries
- Historical map overlay validation

#### Human Actions
- Review flagged constituencies
- Verify flagged changes are due to gerrymandering vs legitimate administrative reform
- Decide which boundary changes to attribute to deliberate manipulation

#### Output
- `data/boundaries/compactness-analysis.geojson` — all constituencies with compactness scores
- `research/constituency-gerrymandering-report.md` — documented findings

---

### Phase 3 Decision Gate

Human reviews:
- Gerrymandering report with documented findings
- Visual evidence clear in QGIS exports
- Proceed to integration or flag additional research needed

---

## Phase 4: Integration + QGIS Export

**Duration:** 4-6 weeks | **Type:** Build | **Human involvement:** Low-Medium

### 4.1: Unified Layer Compositor

**Goal:** Build query system that shows all active boundaries for a given place and year.

#### Tasks

1. **Implement** `executeTimeQuery()` across all layers
2. **Build** layer toggles in web UI
3. **Build** time scrubber for year selection

#### Tools (Automated)
- Hex query engine (already scaffolded in `src/core/hex.ts`)
- Web UI (Leaflet or OpenLayers)

#### Output
- Web application with time-aware layer compositor

---

### 4.2: QGIS Project Export

**Goal:** Generate complete QGIS project (.qlr + data bundles) for offline use.

#### Tasks

1. **Generate** `.qlr` files for all layers
2. **Package** data bundles (GeoJSON + GPKG)
3. **Document** QGIS workflow for Five Towns analysis

#### Tools (Automated)
- QLR generator (already scaffolded in `src/core/qgis.ts`)

#### Output
- `export/five-towns-full.qgz` — complete QGIS project file

---

## Phase 5: Global Extension (Optional)

**Duration:** 12+ weeks | **Type:** Build | **Human involvement:** Low

Only proceeds if:
- Five Towns proof-of-concept validated
- Funding/resources available for global coverage
- Human approves global scope

---

## Human Decision Gates Summary

| Phase | Decision Point | Go/No-Go Criteria |
|-------|---------------|-------------------|
| Phase 0 | Research complete | Source list validated, samples downloaded, budget decisions made |
| Phase 1 | Hex grid + geology ingested | Hex coverage validated in QGIS, geological data quality approved |
| Phase 2 | Historical boundaries ingested | Doomsday polygons confirmed, temporal coverage validated |
| Phase 3 | Gerrymandering analysis complete | Findings documented, visual evidence clear |
| Phase 4 | Integration complete | Web UI + QGIS project functional, exports validated |

---

## Toolchain Summary

### Automated Tools
- **Data ingestion:** Node.js + TypeScript (custom scripts)
- **Format conversion:** GDAL/OGR (`ogr2ogr`, `ogrinfo`)
- **Spatial indexing:** H3 (uber/h3-js)
- **GeoJSON manipulation:** geojson, @turf/turf
- **Web UI:** Leaflet or OpenLayers
- **QGIS compatibility:** Custom QLR generator

### Human Tools (Outside AI)
- **QGIS:** Visual validation, boundary inspection, hex grid overlay
- **Browser:** OpenDomesday map interface, Cliopatria web viewer
- **Spreadsheets:** Source comparison scoring, issue tracking
- **Version control:** Git commits for each phase gate approval

---

## Data Scale Reference

| Layer | Estimated Size | Notes |
|-------|---------------|-------|
| Tectonic plates (world) | ~200KB | Simple GeoJSON |
| Geological provinces (world) | ~10MB | Moderate detail |
| Doomsday England | ~20MB | ~35k settlements |
| Cliopatria UK | ~50MB | ~10k temporal entities |
| UK admin boundaries (Geofabrik) | ~200MB | Full hierarchy |
| Five Towns hex grid (res 8) | ~500 cells | Focused area |

**Total for Five Towns proof-of-concept:** ~50-100MB
**Total for UK coverage:** ~300-500MB
**Total for global:** ~2-5GB (compressed GeoJSON)

---

## FOSS Licensing Strategy

All output layers emitted as:
- **GeoJSON** — CC-BY for derived data (following source licenses)
- **QLR/GPKG** — ODbL for OSM-derived, CC-BY-NC for Cliopatria

Never proprietary formats as primary output.

Ingestion tools: MIT/Apache 2.0

---

## Appendix: Source Assessment Criteria

Each source scored on:
1. **Coverage** — Does it cover the Five Towns area with sufficient resolution?
2. **Temporal depth** — Does it have the historical time range we need?
3. **Format compatibility** — Can we ingest it as GeoJSON/GeoPackage?
4. **License** — Is it FOSS-compatible? Commercial use allowed?
5. **API accessibility** — Direct download vs request-based vs manual only
6. **Update frequency** — Static snapshot vs living data
7. **Quality** — Accuracy, precision, completeness
8. **Cost** — Free vs one-time vs recurring

Scoring: 1-5 per criterion, weighted sum, ranked shortlist produced.

---

*This plan is a living document — update after each phase decision gate.*