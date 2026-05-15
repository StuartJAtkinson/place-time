# Place-Time Roadmap

**Updated:** 2026-05-15 (Phase 0 research complete)

> ⚠️ **This document is superseded by `research/07-development-roadmap.md`**  
> Phase 0 decisions are now validated. See the development roadmap for the full phased plan.

---

## Executive Summary (Phase 0 Research + Core Architecture Complete)

| Decision | Status | Details |
|----------|--------|---------|
| Hex system | ✅ **H3 confirmed** | Apache 2.0, global coverage, mature tooling |
| Resolution (Five Towns) | ✅ **Res 8 primary, Res 7 secondary** | ~500 cells for detailed, ~400 for regional |
| Budget | ✅ **£0** | All primary sources are free |
| **Dual-logarithmic spacetime** | ✅ **Implemented** | `hexalog.ts` — H3 resolution scales with time position |
| **Embedding search pipeline** | ✅ **Implemented** | `embeddings.ts` — Ollama + cosine similarity for boundary discovery |

### Core Architecture: HexaLog Space

The Place-Time framework uses a **dual-logarithmic spacetime grid** (`src/core/hexalog.ts`):

- **Time axis** (log₁₀): Big Bang (t=0) → year 2000 (t=1) — 13.8G years compressed to [0,1]
- **Space axis** (log₁₀): Earth-scale hexes (res 0) → 1-meter hexes (res 15) — logarithmic resolution

At any `(timePos, spacePos)`:
- A calendar year is computed via the timescale engine
- An H3 resolution is computed via `resolutionFromTimePos(timePos)`
- An H3 cell is resolved at that resolution for the given lat/lng

**Key insight**: Time position → H3 resolution → spatial precision
- Deep time (Big Bang) → res 0 (~5M km² hexes — continental scale)
- Year 1086 (Doomsday) → res 10 (~115m edge — building scale)
- Year 2000 (Modern) → res 12 (~16m edge — street scale)

This means the entire 13.8-billion-year history of the universe fits in bounded H3 cells, with recent epochs getting fine-grained resolution.

### Critical Findings from Phase 0

1. **OpenDomesday provides point locations only** — not polygon boundaries. Use Cliopatria for polygon boundaries + OpenDomesday for settlement attributes.

2. **ISEGrid is not a viable alternative** — it's an OS internal product without public FOSS access. H3 is confirmed as the only choice.

3. **No budget required for Phase 0-4** — all primary sources are free (Geofabrik, ONS, Electoral Commission, OpenDomesday, Cliopatria, fraxen/tectonicplates, BGS).

4. **Cliopatria license (CC-BY-NC) requires non-commercial use** — commercial applications need to seek alternatives or negotiate.

---

## Validated Technical Decisions

| Decision | Resolution | Notes |
|----------|-----------|-------|
| H3 vs ISEGrid vs custom | **H3 selected** | Apache 2.0, global, mature (6K stars), no custom development needed |
| H3 resolution for Five Towns | **Res 8 primary** | ~8.7km edge, ~500 cells, appropriate for constituency analysis |
| H3 resolution for UK regional | **Res 6-7** | ~8km (res 6) or ~1.2km (res 7) |
| H3 resolution for global | **Res 4-5** | ~22-650km edge for world view |
| Storage approach | **File-based (GeoJSON bundles)** | No database required for Phase 0-4, rbush for spatial indexing |
| Coordinate system | **WGS84 (EPSG:4326) primary** | BNG (EPSG:27700) for UK calculations via GDAL transformation |
| QGIS output format | **GeoJSON + QLR + GPKG** | .geojson for web, .qlr for project restore, .gpkg for offline bundles |

---

## Phase Structure (Validated)

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

## Reference Data Sources (Validated)

### Geological
| Source | Format | Size | License | Status |
|--------|--------|------|---------|--------|
| fraxen/tectonicplates | GeoJSON | ~5 MB | ODC-BY | ✅ Primary (easy ingestion) |
| GPlates 2.5 GeoData | Shapefile | ~500 MB | CC-BY | ⚠️ Secondary (large download) |
| BGS OGC API | OGCAPI | Variable | OGL | ✅ UK detail (excellent) |
| dhasterok/global_tectonics | QML | ~50 MB | Custom | ⚠️ Deferred (complex integration) |

### Historical (English Focus)
| Source | Format | Temporal | License | Status |
|--------|--------|----------|---------|--------|
| OpenDomesday | REST API (points) | 1086 only | ODC-ODbL | ✅ Primary (points only, not polygons) |
| Cliopatria | GeoJSON | 3400BCE–2024CE | CC-BY-NC | ✅ Secondary (temporal polygons) |
| aourednik/historical-basemaps | GeoJSON | 1500-1900 CE | Various | ⚠️ Supplementary |
| OHMEC | GeoJSON | Variable | CC-BY-SA | ⚠️ Global only (not UK) |

### Political/Modern
| Source | Format | License | Status |
|--------|--------|---------|--------|
| Geofabrik/OSM | Shapefile/GeoPackage | ODbL | ✅ Primary (free, daily updates) |
| ONS Open Geography | GeoJSON/Shapefile | OGL | ✅ Primary (free) |
| Electoral Commission | Shapefile | Click-use | ✅ Primary (free for non-commercial) |
| Ordnance Survey | various | Commercial | ⚠️ Only if budget allows |

### Gerrymandering
- **UK Electoral Commission** — current constituency definitions (free for non-commercial)
- **Cliopatria** — historical boundaries for comparison (CC-BY-NC non-commercial)
- **Range-Voting.org** — Polsby-Popper compactness methodology

---

## Technical Decisions (All Now Validated)

| Decision | Resolution | Change from Original |
|----------|-----------|---------------------|
| H3 vs ISEGrid vs custom | **H3 selected** | ISEGrid deferred (not publicly accessible FOSS) |
| H3 resolution level (Five Towns) | **Res 8 primary** | Confirmed based on constituency analysis requirements |
| Static bundling vs on-demand | **Static bundles** | No change, confirmed for homelab deployment |
| Database vs file-based | **File-based (GeoJSON)** | No database needed for project scope |
| Coordinate system | **WGS84 primary, BNG for UK calculations** | No change |

---

## Data Scale Summary

| Scope | Resolution | Cell Count | Storage (compressed) |
|-------|-----------|------------|----------------------|
| Five Towns | 8 | ~500 cells | < 5 MB |
| Five Towns | 7 | ~400 cells | < 3 MB |
| UK overview | 6 | ~80,000 cells | ~10 MB grid |
| UK regional | 7 | ~700,000 cells | ~80 MB grid |
| World view | 5 | ~2.16M cells | ~150 MB grid |

---

## Phase 0 Research Documents

All located in `research/` directory:

| Document | Purpose |
|----------|---------|
| `research/01-geological-sources.md` | Geological source audit with scoring |
| `research/02-historical-sources.md` | Historical source audit + temporal coverage matrix |
| `research/03-political-sources.md` | Political source audit + free/paid matrix |
| `research/04-hex-system-analysis.md` | H3 vs ISEGrid decision + resolution analysis |
| `research/05-tools-and-human-actions.md` | Tool list, human actions, decision gates |
| `research/06-data-scale-estimate.md` | Volume estimates for all layers/scales |
| `research/07-development-roadmap.md` | Full phased roadmap with validated decisions |

See also: `CONTRIBUTING.md` for tooling setup and human action checklists.

---

## Key Links

- **Phase 0 research:** `research/` directory
- **Contributing guide:** `CONTRIBUTING.md`
- **Development plan:** `DEVELOPMENT-PLAN.md`
- **GPlates 2.5 GeoData:** https://zenodo.org/records/14194897
- **fraenx/tectonicplates:** https://github.com/fraxen/tectonicplates
- **BGS OGC API:** https://ogcapi.bgs.ac.uk/
- **OpenDomesday API:** https://opendomesday.org/api/
- **Cliopatria:** https://github.com/Seshat-Global-History-Databank/cliopatria
- **H3 (Uber):** https://github.com/uber/h3

---

*For the full phased roadmap with timeline estimates and decision gate criteria, see `research/07-development-roadmap.md`*