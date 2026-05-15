# Place-Time Development Roadmap

**Date:** 2026-05-15  
**Project:** Place-Time Phase 0 Research Complete  
**Status:** Phase 0 validated → proceed to Phase 1  
**Principle:** FOSS at heart, human decision gates between phases
**Review cadence:** Quarterly (every 3 months, next: July 15 2026 09:00 BST)
**Longevity:** This is a project for the rest of Stuart's life — no deadline, no external pressure

---

## Executive Summary

Phase 0 research validated all data sources, hex system decisions, tool requirements, and budget expectations. **Required budget: £0** for Phase 0-4. All primary sources are free. H3 is confirmed as the hex system. Next step: Phase 1 (Hex Grid Calibration + Geological Base).

---

## Validated Decisions from Phase 0

| Decision | Outcome | Confidence |
|----------|---------|------------|
| Hex system | H3 (Apache 2.0, global, mature tooling) | High |
| H3 resolution for Five Towns | **Resolution 8** (primary), Resolution 7 (overview) | High |
| Geological source | fraxen/tectonicplates (primary) + BGS OGC API (UK detail) | High |
| Historical source | OpenDomesday (1086 points) + Cliopatria (temporal polygons) | High |
| Political source | Geofabrik + ONS + Electoral Commission (all free) | High |
| Budget | **£0** for all primary sources | High |
| License compatibility | ODbL, CC-BY, OGL for outputs; CC-BY-NC requires non-commercial use | Medium (monitor) |
| Tooling | Node.js + TypeScript + h3-js + GDAL/OGR + QGIS (human validation) | High |

### Critical Pivots from Original Plan

1. **OpenDomesday limitation:** API provides **point locations only**, not polygon boundaries. Original plan assumed polygon availability. Mitigated by using Cliopatria for boundary polygons and OpenDomesday for settlement attribute data.

2. **ISEGrid deferred:** ISEGrid is not a publicly accessible FOSS hex system. H3 is confirmed as the only viable choice for global+UK coverage. ISEGrid only considered again if OS provides free access in Phase 5.

3. **No custom hex development:** Building a custom hex system was considered but rejected — H3 is sufficient for all requirements.

4. **£0 budget confirmed:** All primary data sources are free. No budget required for Phase 0-4.

---

## Phased Roadmap

```
Phase 0: ✅ Research & Data Audit (COMPLETE)
    └── 7 research documents produced
    └── All sources identified and scored
    └── Budget £0 confirmed

Phase 1: Hex Grid Calibration + Geological Base
    ├── 1.1: H3 resolution calibration (res 7 + res 8 for Five Towns)
    ├── 1.2: Geological data ingestion (tectonic plates + BGS)
    ├── 1.3: Geological layer validation (QGIS human check)
    └── Decision gate: approve hex grid + geological data

Phase 2: Historical Boundaries (English Focus)
    ├── 2.1: Doomsday Book ingestion (OpenDomesday points)
    ├── 2.2: Cliopatria ingestion (temporal UK boundaries)
    ├── 2.3: Boundary validation (QGIS human check)
    └── Decision gate: approve historical boundaries

Phase 3: Political Overlays + Gerrymandering Detection
    ├── 3.1: Modern admin boundaries (Geofabrik)
    ├── 3.2: Constituency boundary analysis (Electoral Commission)
    ├── 3.3: Compactness calculation + comparison
    ├── 3.4: Visual validation + findings documentation
    └── Decision gate: approve gerrymandering findings

Phase 4: Integration + QGIS Export
    ├── 4.1: Time-aware query system
    ├── 4.2: Web UI (time slider, layer toggles)
    ├── 4.3: QGIS project export (.qlr + data bundles)
    └── Decision gate: final approval

Phase 5: Global Extension (OPTIONAL)
    └── Only proceeds if: proof-of-concept validated + resources available
```

---

## Phase 1: Hex Grid Calibration + Geological Base

**Duration:** 4-6 weeks  
**Human involvement:** Medium  
**Phase 0 output:** research/01-geological-sources.md, research/04-hex-system-analysis.md

### 1.1: H3 Resolution Calibration

**Goal:** Generate and validate Five Towns hex grid at res 7 and res 8

#### Steps
1. Calculate Five Towns bounding box (lat 53.6-53.75°N, lng 1.25-1.50°W)
2. Generate H3 grid at res 7 using `h3-js`
3. Generate H3 grid at res 8 using `h3-js`
4. Export as GeoJSON (`five-towns-grid-res7.geojson`, `five-towns-grid-res8.geojson`)
5. **Human: Validate in QGIS** — confirm all towns fall within grid, cell count appropriate
6. Select primary resolution (recommend: res 8 for detailed analysis)

#### Deliverables
- `data/five-towns-grid-res7.geojson` (~400 cells, ~350 KB)
- `data/five-towns-grid-res8.geojson` (~500 cells, ~450 KB)
- QGIS validation screenshot confirming coverage

#### Tools (Automated)
- h3-js: `polygonToCells()`, `cellToBoundary()`
- Node.js script: generate grid from bounding box

#### Tools (Human)
- QGIS: load grid + confirm towns visible within cells

#### Timeline: 1 week

### 1.2: Geological Data Ingestion

**Goal:** Ingest tectonic plates (fraxen) and BGS UK geology into hex-indexed pipeline

#### Steps
1. **Scrape:** Clone fraxen/tectonicplates repository
2. **Filter:** Extract Eurasian + North Atlantic plates relevant to UK
3. **Group:** Assign plate polygons to H3 cells (res 7)
4. **Clean:** Validate geometry, ensure WGS84
5. **Standardize:** Emit GeoJSON + QLR

6. **API:** Test BGS OGC API for bedrock geology
7. **Scrape:** Query BGS for Five Towns bounding box (EPSG:4326)
8. **Group:** Assign BGS features to H3 cells
9. **Clean:** Transform BNG (EPSG:27700) → WGS84 (EPSG:4326)
10. **Standardize:** Emit GeoJSON + QLR

#### Deliverables
- `data/geology/tectonic-plates.geojson` (UK-relevant plates, hex-indexed)
- `data/geology/bedrock-geology.geojson` (BGS UK geology, hex-indexed)
- QLR files for both layers

#### Tools (Automated)
- `curl` / `wget` for data fetching
- GDAL/OGR for coordinate transformation
- h3-js for cell assignment
- Custom Node.js ingestion script

#### Timeline: 2-3 weeks

### 1.3: Geological Layer Validation

**Goal:** Verify ingested data quality in QGIS

#### Steps
1. **Human: Load in QGIS** — all geological layers + hex grid overlay
2. **Human: Spot-check** — validate Yorkshire Coal Measures around Pontefract
3. **Human: Document issues** — gaps, misalignments, missing data

#### Deliverables
- `data/geology/validation-report.md` — quality assessment
- QGIS project file with geological layers

#### Timeline: 1 week (includes remediation if issues found)

### Phase 1 Decision Gate

**Criteria:**
- [ ] Hex grid coverage validated in QGIS (all Five Towns settlements within grid)
- [ ] Cell count confirmed (res 7: ~400, res 8: ~500)
- [ ] Tectonic plate layer loaded and displaying correctly
- [ ] BGS bedrock geology layer loaded and displaying correctly
- [ ] Validation report documents any quality issues

**Decision:** Proceed to Phase 2 / Remediate issues / Pivot (if critical issues found)

---

## Phase 2: Historical Boundaries (English Focus)

**Duration:** 6-8 weeks  
**Human involvement:** Medium  
**Phase 0 output:** research/02-historical-sources.md

### 2.1: Doomsday Book Ingestion

**Goal:** Ingest OpenDomesday data for Yorkshire/Five Towns

#### Steps
1. **API:** Test OpenDomesday REST API
2. **Scrape:** Paginate through Yorkshire places (2039 places)
3. **Group:** Assign each place to H3 cell (centroid)
4. **Clean:** Validate lat/lng, normalize names
5. **Standardize:** Emit GeoJSON with Doomsday attributes (households, hundred, etc.)

#### Deliverables
- `data/historical/domesday-yorkshire.geojson` (2039 places, hex-indexed)
- **Note:** Only point locations (no polygon boundaries from this source)

#### Tools (Automated)
- `curl` for API calls
- Node.js script with pagination handling

#### Timeline: 2 weeks

### 2.2: Cliopatria Ingestion

**Goal:** Ingest UK temporal political entities from Cliopatria

#### Steps
1. **Download:** Clone Cliopatria repo + unzip cliopatria.geojson
2. **Filter:** Extract UK-relevant entities (England, UK polities)
3. **Group:** Assign polygon entities to H3 cells (polygon → multiple cells)
4. **Clean:** Validate FromYear/ToYear temporal data
5. **Standardize:** Emit GeoJSON with temporal properties

#### Deliverables
- `data/historical/cliopatria-uk.geojson` (UK temporal entities, hex-indexed)
- QLR files for temporal boundary layers

#### Tools (Automated)
- `curl` / `wget` for download
- Node.js for filtering + temporal queries
- h3-js `polygonToCells()` for multi-cell assignment

#### Timeline: 3 weeks (data is large, processing takes time)

### 2.3: Historical Boundary Validation

**Goal:** Verify ingested boundaries in QGIS at key dates

#### Steps
1. **Human: Load Cliopatria layer in QGIS**
2. **Human: Query boundaries at 1086** — compare with Doomsday places
3. **Human: Query boundaries at 1600, 1900, 2024** — verify temporal changes
4. **Human: Cross-reference** — Doomsday points within Cliopatria polygons?

#### Deliverables
- QGIS project with historical layers
- Validation notes on boundary quality

#### Timeline: 1-2 weeks

### Phase 2 Decision Gate

**Criteria:**
- [ ] Doomsday points loaded for Yorkshire (2039 places)
- [ ] Cliopatria temporal boundaries queryable at 1086, 1600, 1900, 2024
- [ ] Boundary stacking order established (geology → Doomsday → medieval → modern)
- [ ] Visual validation confirms alignment at shared borders

**Decision:** Proceed to Phase 3 / Remediate / Pivot

---

## Phase 3: Political Overlays + Gerrymandering Detection

**Duration:** 8-12 weeks  
**Human involvement:** Medium-High  
**Phase 0 output:** research/03-political-sources.md

### 3.1: Modern Admin Boundaries

**Goal:** Ingest Geofabrik/OSM UK boundaries for current administrative geography

#### Steps
1. **Download:** Fetch Geofabrik UK admin extract
2. **Filter:** Extract Wakefield Metropolitan Borough area
3. **Group:** Assign boundaries to H3 cells
4. **Clean:** Normalize GSS codes, LA names
5. **Standardize:** Emit GeoJSON + QLR

#### Deliverables
- `data/boundaries/admin-boundaries.geojson` (Five Towns area)
- QLR files for admin hierarchy (LA → parish → ward)

#### Timeline: 2 weeks

### 3.2: Constituency Boundary Analysis

**Goal:** Calculate gerrymandering metrics for current vs historical boundaries

#### Steps
1. **Download:** Electoral Commission constituency shapefiles
2. **Filter:** Extract Elmet and Pontefract + Normanton and District
3. **Calculate:** Polsby-Popper compactness for each current constituency
4. **Compare:** Current boundaries vs Cliopatria historical (pre-1880 county lines)
5. **Flag:** Constituencies with dramatic compactness drop

#### Polsby-Popper Formula
```
Compactness = (4 × π × Area) / Perimeter²
```
- 1.0 = perfect circle (most compact)
- Lower = more irregular (potential gerrymandering indicator)

#### Deliverables
- `data/boundaries/compactness-analysis.geojson` (all constituencies with scores)
- `research/constituency-gerrymandering-report.md` (findings)

#### Tools (Automated)
- Node.js: calculate polygon area + perimeter
- Python (optional): verify calculations

#### Timeline: 4-6 weeks (compactness calculation + human review of flagged constituencies)

### 3.3: Visual Validation + Findings

**Goal:** Document gerrymandering evidence in QGIS + report

#### Steps
1. **Human: Visual comparison in QGIS** — current vs historical boundaries overlaid
2. **Human: Verify flagged changes** — confirm gerrymandering vs legitimate reform
3. **Human: Document findings** — narrative explanation of each constituency's history

#### Deliverables
- QGIS project with current + historical overlay
- Gerrymandering report with visual evidence (screenshots)
- Documented list of boundary manipulation events

#### Timeline: 2-3 weeks (includes human review time)

### Phase 3 Decision Gate

**Criteria:**
- [ ] All current constituency boundaries loaded and indexed
- [ ] Compactness scores calculated for each constituency
- [ ] Comparison with historical boundaries completed
- [ ] Gerrymandering report documents findings
- [ ] Visual evidence clear in QGIS exports

**Decision:** Proceed to Phase 4 / Additional research needed / Pivot

---

## Phase 4: Integration + QGIS Export

**Duration:** 4-6 weeks  
**Human involvement:** Low-Medium  
**Phase 0 output:** research/05-tools-and-human-actions.md

### 4.1: Time-Aware Query System

**Goal:** Build query engine for "what was here at year X?"

#### Steps
1. Implement `executeTimeQuery(lat, lng, year)` across all temporal layers
2. Build layer toggles in web UI
3. Build time scrubber (year selector)

#### Deliverables
- Web API endpoint: `GET /query?lat=&lng=&year=`
- Returns all boundaries active at that location/year

#### Timeline: 2 weeks

### 4.2: Web UI

**Goal:** Local web application with map view, time slider, layer toggles

#### Steps
1. Build Leaflet/OpenLayers map view
2. Add hex grid layer toggle
3. Add geological layer toggle
4. Add historical layer toggle (with year selector)
5. Add political layer toggle
6. Implement time scrubber

#### Deliverables
- `public/index.html` — web UI
- `src/ui/` — TypeScript UI components

#### Timeline: 2 weeks

### 4.3: QGIS Project Export

**Goal:** Generate complete QGIS project file for offline use

#### Steps
1. Generate `.qlr` files for all layers
2. Package data bundles (GeoJSON + GPKG)
3. Document QGIS workflow for Five Towns analysis

#### Deliverables
- `export/five-towns-full.qgz` — complete QGIS project
- `export/` directory with all layer bundles

#### Timeline: 1 week

### Phase 4 Decision Gate (Final)

**Criteria:**
- [ ] Web UI functional with time slider + layer toggles
- [ ] QGIS project loads all layers correctly
- [ ] Exports validated (GeoJSON, GPKG, QLR)
- [ ] User documentation complete

**Decision:** Project complete / Remediation / Scope reduction

---

## Phase 5: Global Extension (OPTIONAL)

**Duration:** 12+ weeks  
**Prerequisites:** 
- Five Towns proof-of-concept validated
- Funding/resources available
- Human approval of global scope

**Scope:**
- Extend hex grid to resolution 5 for global coverage
- Ingest global geological data (GPlates full dataset)
- Ingest Cliopatria full dataset
- Build world map view in web UI

---

## Resource Requirements by Phase

| Phase | Duration | Node.js Dev | Human Time | External Tools |
|-------|----------|-------------|------------|----------------|
| Phase 0 | 2-3 weeks | 0 (research) | 2-4 hours | QGIS (review only) |
| Phase 1 | 4-6 weeks | 3-4 weeks | 4-6 hours | QGIS (validation) |
| Phase 2 | 6-8 weeks | 4-6 weeks | 8-10 hours | QGIS (validation) |
| Phase 3 | 8-12 weeks | 6-8 weeks | 16-24 hours | QGIS (analysis) |
| Phase 4 | 4-6 weeks | 3-4 weeks | 4-6 hours | QGIS (export) |
| **Total** | **~24-35 weeks** | **~16-22 weeks** | **~34-50 hours** | |

---

## Critical Path Dependencies

```
Phase 0 → Phase 1 (can start immediately after Phase 0 gate)
Phase 1 → Phase 2 (depends on: hex grid validated)
Phase 2 → Phase 3 (depends on: historical boundaries validated)
Phase 3 → Phase 4 (depends on: gerrymandering analysis complete)
Phase 4 → Phase 5 (optional gate, depends on: proof-of-concept validated)
```

---

## Decision Gate Schedule

| Gate | Target Date | Go/No-Go Criteria |
|------|-------------|-------------------|
| Phase 0 Gate | Start of Week 1 | Research docs complete, source list validated |
| Phase 1 Gate | Week 4-6 | Hex grid + geological layer validated in QGIS |
| Phase 2 Gate | Week 10-14 | Historical boundaries validated, temporal coverage confirmed |
| Phase 3 Gate | Week 18-26 | Gerrymandering findings documented, visual evidence clear |
| Phase 4 Gate | Week 22-31 | Web UI + QGIS project functional |
| Phase 5 Gate | If approved | Proof-of-concept validated + resources available |

---

## FOSS Licensing Compliance

All outputs from each phase will be:
- Released under ODbL for OSM-derived data
- Released under CC-BY for GPlates/fraxen-derived data  
- Released under CC-BY-NC for Cliopatria-derived data (non-commercial)
- Tooling (TypeScript) released under MIT

This aligns with Place-Time's "FOSS at heart" principle.

---

## Appendix: Validated Research Documents

| Document | Purpose | Status |
|----------|---------|--------|
| `research/01-geological-sources.md` | Geological source audit | ✅ Complete |
| `research/02-historical-sources.md` | Historical source audit + temporal coverage | ✅ Complete |
| `research/03-political-sources.md` | Political source audit + free/paid matrix | ✅ Complete |
| `research/04-hex-system-analysis.md` | H3 vs ISEGrid decision + resolution selection | ✅ Complete |
| `research/05-tools-and-human-actions.md` | Tool list + human actions + decision gates | ✅ Complete |
| `research/06-data-scale-estimate.md` | Volume estimates for all layers/scales | ✅ Complete |
| `research/07-development-roadmap.md` | This document — refined phased roadmap | ✅ Complete |

---

*This roadmap updates the original ROADMAP.md and DEVELOPMENT-PLAN.md with validated Phase 0 research findings. All decisions are based on confirmed data source characteristics, not assumptions.*