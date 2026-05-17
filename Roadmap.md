# Place-Time Roadmap

**Updated:** 2026-05-17

---

## What This Is

A hexagonal geological-to-political spatial index for Five Towns, West Yorkshire (Pontefract, Castleford, Featherstone, Knottingley, Normanton). The goal: make gerrymandering and historical boundary shifts visible by stacking geological → Domesday → medieval → modern political layers on a single interactive globe.

---

## Phase Status

```
Phase 0: ✅ Research & Data Audit
Phase 1: ✅ Hex Grid Calibration + Geological Base
Phase 2: ✅ Historical Boundaries
Phase 3: ✅ Political Boundaries (compactness analysis pending)
Phase 4: ✅ Integration + QGIS Export + Cesium Globe UI
Phase 5: ✅ Tectonic Back-Propagation Mesh
Phase 6: 🔲 Human-in-loop Validation + Gerrymandering Analysis
Phase 7: 🔲 Embedding Pipeline + Knowledge Layer
Phase 8: 🔲 Global Extension (optional)
```

---

## Phase Details

### Phase 0 — Research ✅
- 7 research docs in `research/`
- H3 selected (Apache 2.0, global, mature), all sources free (£0)
- PTR scale defined: PTR-0 (planetary) → PTR-10 (human knowability, ~2.1km edge = H3 res 9)

### Phase 1 — Hex Grid + Geology ✅
- `data/five-towns/five-towns-grid-res7.geojson` (323 cells, ~3.9km)
- `data/five-towns/five-towns-grid-res8.geojson` (2,270 cells, ~554m)
- Grid alignment optimised: 7.7° rotation, 5.9% improvement vs axis-aligned
- `data/geology/tectonic_plates.geojson` (54 features, fraxen/tectonicplates)
- `data/geology/geological_provinces.geojson` (49 features, BGS OGC API 1:625k)
- Global H3 grids: res 1 (842 cells), res 2 (5,882), res 3 (41,162) generated correctly via icosahedron projection

### Phase 2 — Historical Boundaries ✅
- `data/historical/domesday-five-towns.geojson` (10 settlements, Palmer/Hull records)
  - Note: OpenDomesday REST API is offline; full Yorkshire at Hull Hydra (may have moved)
- `data/historical/yorkshire-settlements-osm.geojson` (420 features, Overpass)
- `data/historical/cliopatria-uk.geojson` (799 features, 161–2024 CE, CC-BY-NC)

### Phase 3 — Political Boundaries ✅
- `data/boundaries/wakefield-mdc.geojson`, `west-yorkshire.geojson`
- `data/boundaries/constituencies-five-towns.geojson` (2 features: Normanton/Pontefract/Castleford + Hemsworth, PiP-filtered from 2022 Electoral Commission data)
- `data/boundaries/wards-wakefield.geojson` (21 Wakefield MDC wards, GSS E05001444–E05001464)
- ⏳ **3.5 Gerrymandering compactness** — Polsby-Popper analysis not started

### Phase 4 — Integration + UI ✅
- `export/place-time-five-towns.qlr` — combined QGIS project, 11 layers, relative paths
- `src/cli/query.ts` — working CLI: `npx tsx src/cli/query.ts --place pontefract --year 1086`
  - Returns H3 cell, Domesday settlements (radius), Cliopatria polities (PiP + temporal), constituency (PiP), ward (PiP), BGS geology
- **Cesium globe** (`src/ui/app.ts`) — replaced Leaflet; dynamic H3 grid rendered from viewport frustum at runtime
  - Single global H3 resolution: res 6 (~3.9km), all eras — one hex projection always visible
  - Era buttons (one scrollable row): Deep Time (Big Bang → Ice Age) + History (Doggerland → Today)
  - CE year slider (0–2024) with numeric input + year display
  - Camera: pitch clamped -90°→-45° (no globe translation on clamp), unlimited zoom, `constrainedAxis = UNIT_Z`
  - Click-to-pick: `globe.pick(ray)` → lat/lng → `latLngToCell(lat, lng, 6)` → hex highlight + console log
  - Grid cell count guarded: spherical cap estimate, never compute >3,000 cells

### Phase 5 — Tectonic Back-Propagation Mesh ✅
- `scripts/build-tectonic-mesh.ts` — enumerates H3 res-6 cells over UK bbox, extracts unique vertices (~99,788)
- Plate assignment via majority vote from 3 surrounding cells (GPlates MULLER2022)
- Batched GPlates POST API (200 points/batch), per-step checkpoints in `.cache/tectonic-checkpoints/`
- **Output: `public/tectonic-mesh.json` (36 MB)**
  - 99,788 unique hex vertices with paleo lat/lng at 9 time steps
  - Time steps (Ma): 0, 20, 50, 90, 130, 170, 200, 250, 335
  - null positions = point had no reconstruction (ocean/subducted)
- Cesium UI loads this on startup; scrubbing the era/time slider deforms hex wireframe
  - `getCellPositionsAtTime(cellId, timeMa)` — linear interpolation between bracketing steps
  - Fallback: static modern H3 boundary if mesh not loaded or cell not covered

---

## Next Steps (Phase 6 — Human-in-loop Validation)

These require human decisions and UI interaction. They cannot be fully automated:

| Task | What's needed | How |
|------|--------------|-----|
| **QGIS visual validation** | Open layers, verify alignment | QGIS: Layer > Add from Layer Definition File → `export/place-time-five-towns.qlr`; start MCP plugin first |
| **Cesium UI review** | Run `npm run dev`, open http://localhost:5173, check era buttons, time slider, tectonic deformation | Manual |
| **Tectonic deformation check** | Drag era slider from "Today" → "Pangea" and verify hexes deform toward correct plate positions | Manual in browser |
| **Gerrymandering compactness** | Polsby-Popper on `constituencies-five-towns.geojson` — needs decision on methodology | Code task (ready to implement) |
| **Cliopatria temporal filter** | Verify polities appear/disappear correctly at right years in the CLI and UI | Manual + code |
| **Westminster constituency labels** | The 2 constituencies show geographically — do they label correctly? | Manual in QGIS/UI |

---

## Phase 7 — Embedding Pipeline

`EmbeddingSearchPipeline.searchSource()` in `src/core/hexalog.ts` is a scaffold stub. To make it real:
- Build a vector index from GeoJSON bundles (Ollama + cosine similarity is already wired in `src/core/embeddings.ts`)
- Index needs: feature name, temporal range, cell IDs, description text
- Query at `(lat, lng, year)` → top-k matching features

---

## Phase 8 — Global Extension (Optional)

Currently the tectonic mesh covers the UK bbox only. For a full globe:
- Run `npm run build:tectonic -- --area=global` (long job, ~12–24h for all H3 res-6 cells globally)
- ~500K cells globally at res 6 → mesh would be ~350MB

---

## Key Commands

```bash
npm run dev                                          # Cesium UI at localhost:5173
npx tsx src/cli/query.ts --place pontefract --year 1086  # CLI query
npm run build:tectonic                              # rebuild tectonic mesh (UK bbox)
npm run ingest:all                                  # re-fetch all data layers
npm run build:qgis                                  # regenerate QGIS .qlr file
```

---

## Architecture Summary

```
Place-Time Resolution (PTR) Scale
  PTR-0   H3 res 0   ~1,377km   planetary / tectonic plate
  PTR-3   H3 res 3   ~73km      ancient empire / large region
  PTR-5   H3 res 5   ~10km      hundred / wapentake
  PTR-6   H3 res 6   ~3.9km     ← CURRENT UI RESOLUTION (all eras)
  PTR-8   H3 res 8   ~554m      neighbourhood / hamlet
  PTR-10  H3 res 9   ~2.1km     ← LEAF NODE (human knowability / Dunbar scale)

Tectonic deformation: GPlates MULLER2022 at 9 steps (0→335 Ma)
  Vertex-based: shared vertices between cells move together (topologically connected)
  Interpolated at runtime in getCellPositionsAtTime()

Physical column bounds (hexalog.ts):
  COLUMN_TOP_M    =  10,000m  (above Everest)
  COLUMN_BOTTOM_M = -12,000m  (below Challenger Deep)
  COLUMN_SPAN_M   =  22,000m
```

---

## Data Files

| File | Size | Description |
|------|------|-------------|
| `public/tectonic-mesh.json` | 36 MB | Vertex tectonic displacement table (9 time steps) |
| `data/historical/cliopatria-uk.geojson` | ~15 MB | 799 temporal polities |
| `data/historical/yorkshire-settlements-osm.geojson` | ~2 MB | 420 OSM settlements |
| `data/boundaries/constituencies-five-towns.geojson` | <1 MB | 2 Westminster constituencies |
| `data/geology/tectonic_plates.geojson` | ~5 MB | 54 tectonic plates |
| `data/geology/geological_provinces.geojson` | ~3 MB | 49 BGS bedrock provinces |

---

## Known Issues / Decisions Pending

1. **OpenDomesday API offline** — Palmer/Hull records used instead. Full Yorkshire dataset may exist at https://hydra.hull.ac.uk/resources/hull:domesdayDisplaySet
2. **Cliopatria license CC-BY-NC** — non-commercial use only. Commercial applications need alternative.
3. **Big Bang button** — brief says a 3D nebula/white-hole blob should replace the globe at the Big Bang era; not implemented.
4. **Skybox** — Cesium default skybox should be black during pre-Earth eras; not implemented.
5. **Globe shapefiles per era** — continental reconstruction shapefiles for each era button not yet sourced/integrated.
