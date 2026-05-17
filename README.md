# Place-Time: Hexagonal Geological to Political Spatial Index

> A queryable spatial index stacking geological → historical → political layers across time, indexed by H3 hexagonal tessellation. Focus area: Five Towns, West Yorkshire.

**Status:** Working proof-of-concept — Phases 0–4 complete  
**Stack:** TypeScript / Node.js / H3-js / Leaflet / QGIS  
**Budget:** £0 (all open data sources)

---

## What It Does

Given a place and a year, return everything that was happening there — from the bedrock geology to the Norman polity to the modern ward boundary. The CLI query `--place pontefract --year 1086` returns:

- H3 cell at res 7 and 8
- Domesday settlement (Tanshelf → Barkston hundred)
- Cliopatria polity (Norman England, 1085–1093)
- Modern constituency (Normanton, Pontefract and Castleford)
- Ward (Pontefract North)
- BGS bedrock (Yorkshire Coal Measures)

---

## Quick Start

```bash
npm install

# Query the CLI
npm run query -- --place pontefract --year 1086
npm run query -- --place castleford --year 2024
npm run query -- --lat 53.693 --lng -1.310 --year 1350

# Web UI (time slider + layer toggles + click-to-query)
npm run dev   # → http://localhost:5173

# Re-ingest data from sources
npm run ingest:all

# Regenerate H3 grids
npx tsx scripts/phase1-grid-calibration.ts

# Regenerate QGIS project file
npm run build:qgis
```

Known places: `pontefract`, `castleford`, `featherstone`, `knottingley`, `normanton`, `wakefield`

---

## Data Layers

| Layer | Features | Source | License |
|-------|----------|--------|---------|
| Tectonic Plates | 54 | fraxen/tectonicplates | ODC-BY |
| Geological Provinces (BGS) | 49 | BGS OGC API 1:625k bedrock | OGL |
| Five Towns H3 Grid (Res 7) | 187 | Generated (~8.6km edge) | — |
| Five Towns H3 Grid (Res 8) | 1307 | Generated (~4.3km edge) | — |
| Domesday Settlements 1086 | 10 | Palmer/Hull dataset | ODbL |
| Yorkshire Settlements (OSM) | 420 | Overpass API | ODbL |
| Cliopatria UK Polities | 799 | Seshat/Cliopatria (161–2024 CE) | CC-BY-NC |
| West Yorkshire | 1 | ONS Open Geography | OGL |
| Wakefield Metropolitan District | 1 | ONS Open Geography | OGL |
| Westminster Constituencies | 2 | ONS (2022 boundaries) | OGL |
| Wakefield Wards (2023) | 21 | ONS | OGL |

All data in `data/` as GeoJSON. Human-readable label fields: `PCON22NM`, `WD23NM`, `Name` (Cliopatria), `domesdayName`/`modernName`, `name` (OSM), `name`+`rockDescription` (geology), `settlement` (H3).

---

## QGIS

Load all 11 layers in one click:

**Layer > Add from Layer Definition File > `export/place-time-five-towns.qlr`**

The QLR uses paths relative to the `export/` directory (`../data/...`) so it works after cloning to any location.

---

## Architecture

```
H3 hex grid (res 7 + 8, Yorkshire bounding box)
    ↓
Ingestion pipeline (src/ingest/)
    ├── geology.ts      → BGS OGC API + fraxen/tectonicplates
    ├── historical.ts   → Palmer/Hull Domesday + Overpass + Cliopatria
    └── boundaries.ts   → ONS ArcGIS REST (MDC, county, constituencies, wards)
    ↓
GeoJSON bundles (data/)
    ↓
├── CLI query (src/cli/query.ts)          point-in-polygon, temporal filter
├── Web UI  (src/ui/app.ts + index.html)  Leaflet, time slider, click-to-query
└── QGIS export (export/*.qlr)            layer definition files
```

**HexaLog space** (`src/core/hexalog.ts`): dual-logarithmic time×space grid — Big Bang at res 0 (~5M km²), year 2000 at res 15 (~1m). The H3 resolution scales with the time position so spatial precision matches temporal precision.

**Embedding pipeline** (`src/core/hexalog.ts` `EmbeddingSearchPipeline`): Ollama local model for boundary discovery queries. Scaffolded — requires building a vector index from the GeoJSON bundles.

---

## Five Towns Focus

West Yorkshire cluster sitting at the intersection of:

- **Geological**: Yorkshire Coal Measures, Permian Zechstein, Carboniferous strata
- **Domesday (1086)**: Tanshelf (Pontefract), Leoperce (Castleford), Fernesforde (Featherstone), Chenulvelai (Knottingley), Normentone (Normanton) — Barkston, Osgoldcross and Agbrigg hundreds
- **Medieval**: Honor of Pontefract, monastic holdings, wapentake divisions
- **Modern**: Two Westminster constituencies — *Normanton, Pontefract and Castleford* and *Hemsworth* — illustrating how the 2022 boundary review re-drew the electoral map

The gerrymandering analysis (Polsby-Popper compactness vs historical county lines) is the next unbuilt piece.

---

## Known Issues / Next Steps

1. **Gerrymandering analysis** — Polsby-Popper compactness calculation not yet implemented
2. **Embedding pipeline** — `EmbeddingSearchPipeline.searchSource()` is a placeholder; needs a real vector index
3. **OpenDomesday API offline** — full Yorkshire Domesday: https://hydra.hull.ac.uk/resources/hull:domesdayDisplaySet
4. **Cliopatria license** — CC-BY-NC; commercial use requires alternatives or negotiation

---

## Links

- H3 (Uber): https://github.com/uber/h3
- BGS OGC API: https://ogcapi.bgs.ac.uk/
- Cliopatria: https://github.com/Seshat-Global-History-Databank/cliopatria
- fraxen/tectonicplates: https://github.com/fraxen/tectonicplates
- ONS Open Geography: https://geoportal.statistics.gov.uk/

---

*Independent project. Not affiliated with any data provider.*
