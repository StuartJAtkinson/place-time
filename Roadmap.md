# Place-Time Roadmap

**Updated:** 2026-05-18 (Phase 0 Research validated)

---

## What This Is

A hexagonal geological-to-political spatial index for Five Towns, West Yorkshire (Pontefract, Castleford, Featherstone, Knottingley, Normanton). The goal: make gerrymandering and historical boundary shifts visible by stacking geological → Domesday → medieval → modern political layers on a single interactive globe.

**Principle:** FOSS at heart, standards-compliant, human-in-the-loop at decision gates  
**Budget:** £0 for Phase 0-4 (all sources free)  
**Longevity:** Project for the rest of Stuart's life — no deadline, no external pressure  
**Review cadence:** Quarterly (next: August 2026)

---

## Phase Status

```
Phase 0: ✅ Research & Data Audit — COMPLETE (2026-05-18)
Phase 1: 🔲 Hex Grid Calibration + Geological Base
Phase 2: 🔲 Historical Boundaries (English Focus)
Phase 3: 🔲 Political Overlays + Gerrymandering Detection
Phase 4: 🔲 Integration + QGIS Export + Cesium Globe UI
Phase 5: 🔲 Tectonic Back-Propagation Mesh (COMPLETE — needs validation)
Phase 6: 🔲 Human-in-loop Validation + Gerrymandering Analysis
Phase 7: 🔲 Embedding Pipeline + Knowledge Layer
Phase 8: 🔲 Global Extension (optional)
```

---

## Phase 0 — Research ✅ (COMPLETE)

**Duration:** 1 week sprint | **Human involvement:** High | **Date:** 2026-05-18

### Phase 0 Validated Decisions

| Decision | Outcome | Confidence | Source |
|----------|---------|------------|--------|
| Hex system | H3 (Apache 2.0, global, mature) | **High** | research/04-hex-system-analysis.md |
| H3 resolution for Five Towns | **Res 8 primary** (~460m, 2,270 cells), **Res 7 secondary** (~1.22km, 323 cells) | **High** | research/04-hex-system-analysis.md |
| Geological source | fraxen/tectonicplates (primary) + BGS OGC API (UK detail) | **High** | research/01-geological-sources.md |
| Historical source | OpenDomesday (1086 points) + Cliopatria (temporal polygons) | **High** | research/02-historical-sources.md |
| Political source | Geofabrik + ONS + Electoral Commission July 2024 (all free) | **High** | research/03-political-sources.md |
| Budget | **£0** for Phase 0-4 | **High** | research/05-tools-and-human-actions.md |
| License compatibility | ODbL/CC-BY/OGL for outputs; CC-BY-NC requires non-commercial use | **Medium** | research/05-tools-and-human-actions.md |
| Tooling | Node.js + TypeScript + h3-js + GDAL/OGR + QGIS | **High** | research/05-tools-and-human-actions.md |

### Critical Pivots from Original Plan (Validated in Phase 0)

1. **OpenDomesday provides points, not polygons:** API confirmed as points only — no polygon boundaries for hundreds. Mitigation: Cliopatria provides boundary polygons for same era.

2. **ISEGrid is not publicly accessible:** No FOSS ISEGrid found. H3 confirmed as only viable option.

3. **No custom hex development:** Building custom hex was rejected — H3 is sufficient.

4. **July 2024 constituency boundaries available:** New boundaries effective July 4, 2024. Need to update from 2022 data.

5. **£0 budget confirmed:** All 9 research docs updated with validated data — no paid sources required.

### Phase 0 Research Documents

| Document | Purpose | Status |
|----------|---------|--------|
| `research/01-geological-sources.md` | Geological source audit — GPlates, fraxen, BGS OGC API | ✅ Complete |
| `research/02-historical-sources.md` | Historical source audit + temporal coverage matrix | ✅ Complete |
| `research/03-political-sources.md` | Political source audit + free/paid matrix + July 2024 boundaries | ✅ Complete |
| `research/04-hex-system-analysis.md` | H3 vs ISEGrid decision + resolution selection (323/2,270 cells validated) | ✅ Complete |
| `research/05-tools-and-human-actions.md` | Tool list + human actions + decision gates | ✅ Complete |
| `research/06-data-scale-estimate.md` | Volume estimates (Five Towns <5MB, UK ~200MB, Global ~2-5GB) | ✅ Complete |
| `research/07-development-roadmap.md` | Refined phased roadmap (this document) | ✅ Complete |
| `research/08-knowledge-graph-stack.md` | Neo4j + Infranodus + Wikidata + BFO decision gate | ✅ Complete (decision pending Stuart approval) |
| `research/09-epistemological-framework.md` | Philosophical framework for knowledge graph | ✅ Complete (decision pending Stuart approval) |

---

## Phase 1: Hex Grid Calibration + Geological Base

**Duration:** 4-6 weeks | **Type:** Build | **Human involvement:** Medium  
**Phase 0 output:** All research documents validated

### 1.1: H3 Resolution Calibration

**Goal:** Validate Five Towns hex grid at res 7 (323 cells) and res 8 (2,270 cells)

#### Steps
1. Confirm existing grids: `five-towns-grid-res7.geojson` (323 cells), `five-towns-grid-res8.geojson` (2,270 cells)
2. **Human: Validate in QGIS** — confirm all towns fall within grid, check cell alignment
3. Select primary resolution (recommend: res 8 for detailed analysis)
4. Document grid alignment (7.7° rotation, 5.9% improvement vs axis-aligned)

#### Deliverables
- Confirmed grid counts: res 7 = 323 cells, res 8 = 2,270 cells
- QGIS validation screenshot
- Decision on primary resolution

#### Timeline: 1 week

### 1.2: Geological Data Ingestion

**Goal:** Ingest tectonic plates (fraxen) + BGS UK geology into hex-indexed pipeline

#### Steps
1. **Download fraxen/tectonicplates** — `curl -L -o data/geology/tectonicplates.json https://raw.githubusercontent.com/fraxen/tectonicplates/master/tectonicplates.json`
2. **Filter:** Extract Eurasian + North Atlantic plates relevant to UK
3. **Ingest:** Assign plate polygons to H3 cells (res 7)
4. **Standardize:** Emit GeoJSON + QLR

5. **Test BGS OGC API** — `curl https://ogcapi.bgs.ac.uk/collections | jq`
6. **Query BGS bedrock** for Five Towns bbox: `https://ogcapi.bgs.ac.uk/collections/bgsgeology625kbedrock/items.json?bbox=-1.55,53.58,-1.22,53.78&limit=100`
7. **Query BGS superficial** for Five Towns bbox
8. **Transform coordinates** if needed (BNG EPSG:27700 → WGS84 EPSG:4326)
9. **Group:** Assign BGS features to H3 cells
10. **Standardize:** Emit GeoJSON + QLR

#### Deliverables
- `data/geology/tectonic-plates.geojson` (UK-relevant plates, hex-indexed) — already exists
- `data/geology/bedrock-geology.geojson` (BGS UK bedrock, hex-indexed)
- `data/geology/superficial-geology.geojson` (BGS UK superficial, hex-indexed)
- QLR files for all geological layers

#### Tools (Automated)
- `curl`/`wget` for data fetching
- GDAL/OGR for coordinate transformation
- h3-js for cell assignment
- Node.js ingestion scripts in `src/ingest/geology.ts`

#### Timeline: 2-3 weeks

### 1.3: Geological Layer Validation

**Goal:** Verify ingested data quality in QGIS

#### Steps
1. **Human: Load in QGIS** — all geological layers + hex grid overlay
2. **Human: Spot-check** — validate Yorkshire Coal Measures around Pontefract (Carboniferous)
3. **Human: Document issues** — gaps, misalignments, missing data

#### Deliverables
- `data/geology/validation-report.md` — quality assessment
- QGIS screenshot confirming Carboniferous Coal Measures visible under Five Towns

#### Timeline: 1 week (includes remediation if issues found)

### Phase 1 Decision Gate

**Criteria:**
- [ ] Hex grid coverage validated in QGIS (all Five Towns settlements within grid)
- [ ] Cell count confirmed: res 7 = 323, res 8 = 2,270
- [ ] fraxen/tectonicplates loaded — Eurasian Plate covers UK correctly
- [ ] BGS bedrock queried — Carboniferous Coal Measures visible under Pontefract
- [ ] BGS superficial queried — glacial till in river valleys visible
- [ ] Coordinate transformation working (WGS84 output from BNG input)
- [ ] Validation report documents any quality issues

**Decision:** Proceed to Phase 2 / Remediate issues / Pivot

---

## Phase 2: Historical Boundaries (English Focus)

**Duration:** 6-8 weeks | **Type:** Build | **Human involvement:** Medium  
**Phase 0 output:** research/02-historical-sources.md

### 2.1: Doomsday Book Ingestion (OpenDomesday)

**Goal:** Ingest 1086 boundaries for Yorkshire/Five Towns area

#### Steps
1. **Test API:** `curl https://opendomesday.org/api/v1/place/?limit=5 | jq`
2. **Fetch Yorkshire places** — paginate through 2039 places
3. **Confirm Five Towns settlements:** Tanshelf (Pontefract), Leoperce (Castleford), Fernesforde (Featherstone), Chenulvelai (Knottingley), Normentone (Normanton)
4. **Note:** OpenDomesday provides **points only**, not polygon boundaries
5. **Group:** Assign each place to H3 cell (centroid)
6. **Standardize:** Emit GeoJSON with Doomsday attributes

#### Deliverables
- `data/historical/domesday-yorkshire.geojson` (2039 places, hex-indexed)
- `data/historical/domesday-five-towns.geojson` (10 settlements, already exists)
- **Key finding documented:** Hundred polygons must come from Cliopatria, not OpenDomesday

#### Timeline: 2 weeks

### 2.2: Cliopatria Ingestion (UK Political Entities)

**Goal:** Ingest UK temporal political entities from Cliopatria (799 UK features, 161–2024 CE)

#### Steps
1. **Confirm existing dataset:** `data/historical/cliopatria-uk.geojson` (799 features)
2. **Validate 1086 boundaries** in QGIS — Norman England, Barkston Hundred, Osgoldcross Hundred, Agbrigg Hundred
3. **Query at key dates:** 1086, 1600, 1850, 1974, 2024 — verify temporal transitions
4. **Cross-reference:** Doomsday points should fall within Cliopatria boundary polygons for 1086

#### Deliverables
- Cliopatria UK dataset validated and indexed
- QLR files for temporal boundary layers
- Temporal coverage matrix confirmed for Five Towns

#### Timeline: 3 weeks (data is large, processing takes time)

### 2.3: Historical Boundary Validation

**Goal:** Verify ingested boundaries in QGIS at key dates

#### Steps
1. **Human: Load Cliopatria layer in QGIS**
2. **Human: Query boundaries at 1086** — compare with Doomsday places
3. **Human: Query boundaries at 1600, 1850, 1974, 2024** — verify temporal changes
4. **Human: Cross-reference** — Doomsday points within Cliopatria polygons?

#### Deliverables
- QGIS project with historical layers
- Validation notes on boundary quality
- Documented temporal coverage for Five Towns

#### Timeline: 1-2 weeks

### Phase 2 Decision Gate

**Criteria:**
- [ ] OpenDomesday points loaded for Yorkshire (2039 places)
- [ ] All 5 Five Towns settlements confirmed in API (Tanshelf, Leoperce, Fernesforde, Chenulvelai, Normentone)
- [ ] Cliopatria temporal boundaries queryable at 1086, 1600, 1850, 1974, 2024
- [ ] Boundary stacking order confirmed (geology → Doomsday → medieval → modern)
- [ ] Doomsday points confirmed within Cliopatria boundary polygons for 1086

**Decision:** Proceed to Phase 3 / Remediate / Pivot

---

## Phase 3: Political Overlays + Gerrymandering Detection

**Duration:** 8-12 weeks | **Type:** Build + Analysis | **Human involvement:** Medium-High  
**Phase 0 output:** research/03-political-sources.md

### 3.1: Modern Admin Boundaries

**Goal:** Ingest Geofabrik/OSM UK boundaries for current administrative geography

#### Steps
1. **Download:** Geofabrik UK admin polygons: `wget https://download.geofabrik.de/europe/united-kingdom-admin-levels.shp.zip`
2. **Extract:** Wakefield MBC area
3. **Ingest:** Assign boundaries to H3 cells
4. **Standardize:** Emit GeoJSON + QLR

#### Deliverables
- `data/boundaries/wakefield-mdc.geojson` — already exists
- `data/boundaries/wards-wakefield.geojson` — 21 wards, already exists
- Updated admin hierarchy with parish boundaries

#### Timeline: 2 weeks

### 3.2: July 2024 Constituency Boundaries

**Goal:** Update from 2022 data to July 2024 boundaries, recalculate Polsby-Popper

#### Steps
1. **Download:** July 2024 constituency boundaries from data.gov.uk
   - Dataset: https://ckan.publishing.service.gov.uk/dataset/westminster-parliamentary-constituencies-july-2024-boundaries-uk-bsc
   - Format: Shapefile (BFC/BUC/BSC), GeoPackage, GDB
2. **Extract Five Towns:** Elmet and Pontefract (E05001446), Normanton and District (E05001475), Hemsworth (E05001447)
3. **Recalculate Polsby-Popper compactness:**
   - Old: Hemsworth 0.3021, NPC 0.2258 (from 2022 data)
   - New: Calculate with July 2024 boundaries
4. **Compare:** Document what changed between 2022 and 2024

#### Deliverables
- `data/boundaries/constituencies-five-towns.geojson` — updated with July 2024 boundaries
- Polsby-Popper scores recalculated for all three constituencies
- Comparison with 2022 boundaries documented

#### Timeline: 1-2 weeks

### 3.3: Gerrymandering Analysis

**Goal:** Compare current boundaries with historical baselines, document findings

#### Steps
1. **Query Cliopatria** for historical boundaries at: ~1832 (pre-Reform), 1880, 1948, 1983
2. **Calculate Polsby-Popper** for historical boundaries at each date
3. **Visual comparison in QGIS:** Current vs historical overlay
4. **Cross-reference with Hansard/Boundary Commission** — document which changes were deliberate boundary manipulation vs legitimate reform
5. **Flag constituencies** with significant compactness change

#### Polsby-Popper Formula
```
Compactness = (4 × π × Area) / Perimeter²
```
- 1.0 = perfect circle (most compact)
- Lower = more irregular (potential gerrymandering indicator)

#### Five Towns Preliminary Analysis

| Constituency | 2022 PP Score | Expected 2024 PP | Change |
|---|---|---|---|
| Hemsworth | 0.3021 | Likely similar | Unchanged in 2024 review |
| Elmet and Pontefract | 0.28 (old Elmet) | New boundaries | New constituency created 2024 |
| Normanton and District | ~0.25 (old Normanton) | New boundaries | New constituency created 2024 |

#### Deliverables
- `data/boundaries/compactness-analysis.geojson` — all constituencies with scores over time
- `research/constituency-gerrymandering-report.md` — findings with visual evidence
- QGIS screenshots showing current vs historical overlay

#### Timeline: 4-6 weeks (includes human review of flagged constituencies)

### Phase 3 Decision Gate

**Criteria:**
- [ ] July 2024 constituency boundaries loaded and indexed
- [ ] Polsby-Popper scores recalculated for all Five Towns constituencies
- [ ] Historical boundary comparison completed (current vs 1086, 1850, 1974)
- [ ] Gerrymandering report documents findings with visual evidence
- [ ] QGIS screenshots confirm boundary overlay visualization
- [ ] Hansard/Boundary Commission references for documented changes

**Decision:** Proceed to Phase 4 / Additional research needed / Pivot

---

## Phase 4: Integration + QGIS Export

**Duration:** 4-6 weeks | **Type:** Build | **Human involvement:** Low-Medium  
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

### 4.2: Web UI (Cesium Globe)

**Goal:** Local web application with 3D globe, time slider, layer toggles

#### Steps
1. Confirm existing Cesium globe UI works: `npm run dev` → http://localhost:5175
2. Verify era buttons (Deep Time + History)
3. Verify time slider (0–2024)
4. Verify hex info panel with tectonic plate / geological epoch / Polsby-Popper compactness
5. Verify tectonic deformation on era slider

#### Deliverables
- Working Cesium UI with all era buttons functional
- Time slider working across full range
- Hex info panel showing relevant data for selected cell

#### Timeline: 1 week (already substantially complete per ROADMAP.md)

### 4.3: QGIS Project Export

**Goal:** Generate complete QGIS project file for offline use

#### Steps
1. Generate `.qlr` files for all layers (already done: `export/place-time-five-towns.qlr`)
2. Package data bundles (GeoJSON + GPKG)
3. Document QGIS workflow for Five Towns analysis

#### Deliverables
- `export/place-time-five-towns.qlr` — 11 layers, relative paths (already exists)
- `export/` directory with all layer bundles
- QGIS workflow documentation

#### Timeline: 1 week

### Phase 4 Decision Gate (Final)

**Criteria:**
- [ ] Web UI functional — Cesium globe, era timeline, hex info panel with tectonic deformation
- [ ] QGIS project loads all layers correctly from .qlr
- [ ] Exports validated (GeoJSON, GPKG, QLR)
- [ ] User documentation complete (README, CONTRIBUTING)

**Decision:** Project complete / Remediation / Scope reduction

---

## Phase 5: Tectonic Back-Propagation Mesh ✅

**Status:** COMPLETE (per previous ROADMAP.md) — needs validation

The tectonic mesh (`public/tectonic-mesh.json`, 36 MB) has been generated with 99,788 vertices at 9 time steps (0–335 Ma). Needs human validation in QGIS/Cesium.

---

## Phase 6: Human-in-loop Validation

**Duration:** 2-4 weeks | **Type:** Validation | **Human involvement:** High

### Tasks

| Task | What's needed | How |
|------|--------------|-----|
| **QGIS visual validation** | Open layers, verify alignment | QGIS: Layer > Add from Layer Definition File → `export/place-time-five-towns.qlr` |
| **Cesium UI review** | Run `npm run dev`, open http://localhost:5175, check era buttons, time slider, tectonic deformation | Manual |
| **Tectonic deformation check** | Drag era slider from "Today" → "Pangea" and verify hexes deform toward correct plate positions | Manual in browser |
| **Cliopatria temporal filter** | Verify polities appear/disappear correctly at right years in the CLI and UI | Manual + code |
| **Westminster constituency labels** | The 3 constituencies show geographically — do they label correctly? | Manual in QGIS/UI |

---

## Phase 7: Embedding Pipeline (Optional)

**Status:** Deferred pending Stuart approval of knowledge graph stack (research/08, research/09)

`EmbeddingSearchPipeline.searchSource()` in `src/core/hexalog.ts` is a scaffold stub. To make it real:
- Build vector index from GeoJSON bundles (Ollama + cosine similarity already wired in `src/core/embeddings.ts`)
- Index needs: feature name, temporal range, cell IDs, description text

**Decision gate:** Stuart needs to approve Neo4j + Infranodus + Wikidata + BFO stack before Phase 7 build starts.

---

## Phase 8: Global Extension (Optional)

**Duration:** 12+ weeks | **Prerequisites:** 
- Five Towns proof-of-concept validated
- Funding/resources available
- Human approval of global scope

**Scope:**
- Extend hex grid to resolution 5 for global coverage (2.16M cells)
- Ingest global geological data (GPlates full dataset)
- Ingest Cliopatria full dataset
- Build world map view in web UI

---

## Critical Path Dependencies

```
Phase 0 → Phase 1 (can start immediately after Phase 0 gate)
Phase 1 → Phase 2 (depends on: hex grid + geological data validated)
Phase 2 → Phase 3 (depends on: historical boundaries validated)
Phase 3 → Phase 4 (depends on: gerrymandering analysis complete)
Phase 4 → Phase 5 (optional — tectonic mesh already complete)
Phase 4 → Phase 6 (validation — parallel to Phase 5)
Phase 6 → Phase 7 (embedding pipeline — depends on Phase 6 completion + Stuart approval)
Phase 7 → Phase 8 (global extension — optional gate)
```

---

## Human Decision Gates Summary

| Phase | Decision Point | Go/No-Go Criteria |
|-------|---------------|-------------------|
| Phase 0 | Research complete | ✅ All 9 research docs updated, budget £0 confirmed, H3 resolution selected |
| Phase 1 | Hex grid + geology ingested | ✅ Hex coverage validated (323/2,270 cells), BGS bedrock confirmed |
| Phase 2 | Historical boundaries ingested | ✅ Doomsday points confirmed, Cliopatria temporal coverage validated |
| Phase 3 | Gerrymandering analysis complete | ✅ Polsby-Popper recalculated with July 2024 data, findings documented |
| Phase 4 | Integration complete | ✅ Web UI + QGIS project functional |
| Phase 7 | Knowledge graph approval | ⏳ Stuart must approve Neo4j + Infranodus + Wikidata + BFO stack |
| Phase 8 | Global extension | ⏳ Optional — depends on proof-of-concept + resources |

---

## Resource Requirements by Phase

| Phase | Duration | Node.js Dev | Human Time | External Tools |
|-------|----------|-------------|------------|----------------|
| Phase 0 | 1 week | 0 (research) | 8-12 hours | QGIS (review only) |
| Phase 1 | 4-6 weeks | 3-4 weeks | 6-8 hours | QGIS (validation) |
| Phase 2 | 6-8 weeks | 4-6 weeks | 10-12 hours | QGIS (validation) |
| Phase 3 | 8-12 weeks | 6-8 weeks | 20-30 hours | QGIS (analysis) |
| Phase 4 | 4-6 weeks | 3-4 weeks | 6-8 hours | QGIS (export) |
| **Total** | **~23-29 weeks** | **~16-22 weeks** | **~50-70 hours** | |

---

## Data Files (Current State)

| File | Size | Description |
|------|------|-------------|
| `public/tectonic-mesh.json` | 36 MB | Vertex tectonic displacement table (9 time steps) |
| `data/historical/cliopatria-uk.geojson` | ~15 MB | 799 temporal polities |
| `data/historical/yorkshire-settlements-osm.geojson` | ~2 MB | 420 OSM settlements |
| `data/boundaries/constituencies-five-towns.geojson` | <1 MB | 2 Westminster constituencies (needs update to July 2024) |
| `data/geology/tectonic_plates.geojson` | ~5 MB | 54 tectonic plates |
| `data/geology/geological_provinces.geojson` | ~3 MB | 49 BGS bedrock provinces |
| `data/five-towns/five-towns-grid-res7.geojson` | ~50 KB | 323 cells |
| `data/five-towns/five-towns-grid-res8.geojson` | ~350 KB | 2,270 cells |

---

## Known Issues / Decisions Pending

1. **July 2024 constituency boundaries** — need to update from 2022 data to July 2024
2. **OpenDomesday limitation** — points only, no polygon boundaries (mitigated by Cliopatria)
3. **Cliopatria CC-BY-NC** — non-commercial use only; commercial use requires alternative
4. **Big Bang button** — brief says 3D nebula/white-hole blob should replace globe at the Big Bang era; not implemented
5. **Skybox** — Cesium default skybox should be black during pre-Earth eras; not implemented
6. **Globe shapefiles per era** — continental reconstruction shapefiles for each era button not yet sourced/integrated
7. **Phase 7 knowledge graph** — Stuart approval pending for Neo4j + Infranodus + Wikidata + BFO stack

---

## Key Commands

```bash
npm run dev                                          # Cesium UI at localhost:5175
npx tsx src/cli/query.ts --place pontefract --year 1086  # CLI query
npm run ingest:geology                              # Ingest geological data
npm run ingest:historical                           # Ingest historical data
npm run ingest:boundaries                           # Ingest political boundaries
npm run build:qgis                                  # Regenerate QGIS .qlr
```

---

*Last updated: 2026-05-18 after Phase 0 research sprint complete. All research documents validated with current API status, confirmed data sources, and practical cell counts.*