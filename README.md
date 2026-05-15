# Place-Time: Hexagonal Geological to Political Spatial Index

> A rational grid system for all Earth's surface history, indexed by hexagonal tessellation from geological reference spheres.

**Status:** Early Planning | **Focus Area:** Five Towns (Pontefract, Knottingley, Featherstone, Castleford, Normanton) | **Stack:** TypeScript / Node.js / QGIS-compatible | **Channel:** homelab-native

---

## Core Concept

**Reference Spheres:**
- **Outer sphere:** Highest peaks of all time (+1km buffer above Everest) → defines the ceiling of all terrestrial history
- **Inner sphere:** Lowest trenches (Mariana Trench -1km buffer) → defines the floor of all marine history
- These two spheres form a closed shell containing every location that has ever existed on Earth's surface

**Hexagonal Tessellation:** The entire shell is covered by a hexagonal grid, providing a rational, discrete coordinate system that doesn't depend on political boundaries or modern geography.

**Data Model:** Scrape → Group → Clean → Standardize, following OSM/Google-scale data principles. This is not a small project — only organisations with global map infrastructure can maintain it properly. We focus on:
1. **Ingestion pipeline** for open-source standards-compliant data
2. **Hexagonal indexing** for rational spatial queries
3. **Time-aware layering** (geological → political)
4. **Five Towns focus area** as primary use case

---

## Why Hexagons?

- **Tessellation:** Hexagons tile a sphere perfectly (like soccer balls, carbon nanotubes)
- **Equal area:** Each hexagon represents equal surface area — useful for normalization
- **Directional neighbors:** Each hexagon has exactly 6 neighbors at 60° angles — natural for directional queries
- **Resolution levels:** Hexagonal grids subdivide naturally (H3 from Uber, ISEGrid from UK Ordnance Survey)

---

## Focus Area: Five Towns

West Yorkshire cluster:
- **Pontefract** (ancient: Tanshelf in Doomsday Book)
- **Knottingley**
- **Featherstone**
- **Castleford** (ancient: Leoperce in Doomsday Book)
- **Normanton**

These towns sit at the intersection of:
- Carboniferous geology (Yorkshire Coal Measures)
- Medieval hundredal system (Aghine / Barkston / Osgoldcross)
- Modern metropolitan borough boundaries
- Railway-era electoral gerrymandering

This makes them an ideal test case for stacking geological → historical → political layers.

### The Stack We're Building On

| Layer | Source | Format | License |
|-------|--------|--------|---------|
| Geological base | GPlates 2.5 GeoData (Zenodo) | GeoJSON/Vector | CC-BY |
| Tectonic plates | fraxen/tectonicplates (GitHub) | GeoJSON | NoASSERTION |
| Geological provinces | Global Tectonics (dhasterok) | GeoJSON/QML | Custom |
| Historical boundaries | Cliopatria (Nature/Seshat) | GeoJSON | CC-BY-NC |
| Doomsday Book | OpenDomesday (Hull) | REST/GeoJSON | ODC-ODbL |
| Historical basemaps | aourednik/historical-basemaps | GeoJSON | Various |
| Political entities | OHMEC | GeoJSON | CC-BY-SA |
| Modern boundaries | Geofabrik/OSM | Shapefile/GeoPackage | ODbL |
| Humanitarian overlays | HDX (OCHA) | Various | Various |

---

## Project Goals

1. **QGIS-compatible output** — primary export format is GeoJSON/GeoPackage that loads directly into QGIS
2. **Time-aware querying** — "what was here at year X?" as a first-class operation
3. **Layered boundary system:**

   ```
   CORE
    └── Mantle boundary (depth model)
    └── Tectonic plate boundaries (surface projection)
    └── Geological provinces (rock type/surface)
    └── Hydrological features (rivers, watershed divides)
    └── Administrative boundaries (historical + modern)
        └── Parish / Township
        └── Hundred / Wapentake
        └── Shire / County
        └── Constituency / Parliament
        └── Electoral district
        └── EU/NATO/UN overlay capability
   SURFACE
   ```

4. **Gerrymandering transparency** — overlay current constituency boundaries with historical county lines to surface how electoral geography has been manipulated over time

---

## Why This Matters

Your Pontefract example is a perfect case study:

- **Geological**: Pontefract sits on Yorkshire Coal Measures, Permian and Triassic strata. The underlying geology hasn't moved in 100 million years.
- **Doomsday**: "Tanshelf" in the Domesday Book (1086). The settlement pattern was established, the hundredal system structured the administrative geography.
- **Medieval**: The Honor of Pontefract, the castle, the monastic holdings — all overlay a geography that traces back to these earlier systems.
- **Modern**: The metropolitan borough, the constituency boundaries — all are derived from these earlier layers, often with deliberate manipulation (gerrymandering) visible when you stack the layers.

The tool makes that stacking visual and queryable.

---

## Key Features

- [ ] GeoJSON/GeoPackage ingestion pipeline for each source
- [ ] Time-slider interface for querying boundaries at any date
- [ ] Layer compositor showing all active boundaries for a given place/date
- [ ] Gerrymander index: measure boundary compactness, compare historical vs current
- [ ] QGIS layer file generator (.qlr) for one-click project restore
- [ ] Export to Shapefile for legacy GIS compatibility

---

## Technical Approach

- **Runtime:** Node.js (TypeScript), runs as local web app
- **Data:** Pre-processed static GeoJSON bundles (no live API calls for base data)
- **Query:** In-memory spatial index (rbush or similar) for fast boundary lookups
- **Output:** QGIS-compatible (.geojson, .gpkg, .qlr)
- **Interface:** Local web UI with map view (Leaflet or OpenLayers), time scrubber, layer toggles

---

## Getting Started

```bash
cd H:\place-time
# Data ingestion (when implemented)
npm run ingest:geology
npm run ingest:historical
npm run ingest:boundaries
# Dev server
npm run dev
```

---

## Links

- Geological base data: [GPlates 2.5 GeoData (Zenodo)](https://zenodo.org/records/14194897)
- Tectonic plates: [fraxen/tectonicplates](https://github.com/fraxen/tectonicplates)
- Historical boundaries: [Cliopatria (Seshat)](https://github.com/Seshat-Global-History-Databank/cliopatria)
- English historical: [OpenDomesday](https://opendomesday.org)
- Gerrymandering research: [Range-Voting.org](http://range-voting.org/Gerrymeth.html)

---

*This project is independent and not affiliated with GPlates, OSM, or any data provider.*