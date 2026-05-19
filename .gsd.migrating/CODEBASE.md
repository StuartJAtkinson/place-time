# Codebase Map

Generated: 2026-05-19T12:26:59Z | Files: 100 | Described: 0/100
<!-- gsd:codebase-meta {"generatedAt":"2026-05-19T12:26:59Z","fingerprint":"63b067106194a3af72c668df10fc459a0302871b","fileCount":100,"truncated":false} -->

### (root)/
- `.gitignore`
- `CONTRIBUTING.md`
- `DEVELOPMENT-PLAN.md`
- `index.html`
- `package-lock.json`
- `package.json`
- `README.md`
- `research.md`
- `Roadmap.md`
- `test-ingest.mjs`
- `tsconfig-scripts.json`
- `tsconfig.json`
- `vite.config.ts`

### data/boundaries/
- `data/boundaries/constituencies-five-towns.geojson`
- `data/boundaries/constituencies-five-towns.qlr`
- `data/boundaries/wakefield-mdc.geojson`
- `data/boundaries/wakefield-mdc.qlr`
- `data/boundaries/wards-wakefield.geojson`
- `data/boundaries/wards-wakefield.qlr`
- `data/boundaries/west-yorkshire.geojson`
- `data/boundaries/west-yorkshire.qlr`

### data/five-towns/
- `data/five-towns/five-towns-grid-res7.geojson`
- `data/five-towns/five-towns-grid-res7.qlr`
- `data/five-towns/five-towns-grid-res8.geojson`
- `data/five-towns/five-towns-grid-res8.qlr`
- `data/five-towns/five-towns-grid-res9.geojson`

### data/geology/
- `data/geology/geological_provinces.geojson`
- `data/geology/geological_provinces.qlr`
- `data/geology/tectonic_plates.geojson`
- `data/geology/tectonic_plates.qlr`

### data/historical/
- `data/historical/cliopatria-uk.geojson`
- `data/historical/cliopatria-uk.qlr`
- `data/historical/domesday-five-towns.geojson`
- `data/historical/domesday-five-towns.qlr`
- `data/historical/yorkshire-settlements-osm.geojson`
- `data/historical/yorkshire-settlements-osm.qlr`

### export/
- `export/place-time-five-towns.qlr`

### public/
- `public/cliopatria-uk.geojson`
- `public/constituencies-five-towns.geojson`
- `public/domesday-five-towns.geojson`
- `public/five-towns-grid-res7.geojson`
- `public/five-towns-grid-res8.geojson`
- `public/five-towns-grid-res9.geojson`
- `public/geological_provinces.geojson`
- `public/grid-global.geojson`
- `public/grid-h3-r1.geojson`
- `public/grid-h3-r2.geojson`
- `public/grid-h3-r3.geojson`
- `public/grid-uk.geojson`
- `public/tectonic_plates.geojson`
- `public/tectonic-mesh.json`
- `public/wakefield-mdc.geojson`
- `public/wards-wakefield.geojson`
- `public/west-yorkshire.geojson`
- `public/yorkshire-settlements-osm.geojson`

### public/data/
- `public/data/five-towns-hex-grid.geojson`
- `public/data/five-towns-hex-grid.qlr`
- `public/data/five-towns-places.geojson`
- `public/data/five-towns-places.qlr`
- `public/data/timescale-events.json`
- `public/data/timescale-export.json`

### research/
- `research/01-geological-sources.md`
- `research/02-historical-sources.md`
- `research/03-political-sources.md`
- `research/04-hex-system-analysis.md`
- `research/05-tools-and-human-actions.md`
- `research/06-data-scale-estimate.md`
- `research/07-development-roadmap.md`
- `research/08-knowledge-graph-stack.md`
- `research/09-epistemological-framework.md`

### scripts/
- `scripts/build-tectonic-mesh.ts`
- `scripts/build-timescale.d.ts`
- `scripts/build-timescale.d.ts.map`
- `scripts/build-timescale.js`
- `scripts/build-timescale.js.map`
- `scripts/build-timescale.ts`
- `scripts/compactness.ts`
- `scripts/filter-cliopatria.py`
- `scripts/generate-five-towns-test-data.mjs`
- `scripts/generate-h3-global-grids.ts`
- `scripts/generate-qgis-project.ts`
- `scripts/install-qgis.ts`
- `scripts/optimise-grid-alignment.ts`
- `scripts/phase1-grid-calibration.mjs`
- `scripts/phase1-grid-calibration.ts`
- `scripts/tectonic-cell-analysis.ts`
- `scripts/verify-hexalog.ts`

### src/cli/
- `src/cli/query.ts`

### src/core/
- `src/core/cell-plate-map.json`
- `src/core/embeddings.ts`
- `src/core/grid-alignment.json`
- `src/core/hex.ts`
- `src/core/hexalog.ts`
- `src/core/qgis.ts`
- `src/core/timescale.ts`
- `src/core/types.ts`

### src/ingest/
- `src/ingest/boundaries.ts`
- `src/ingest/geology.ts`
- `src/ingest/historical.ts`

### src/ui/
- `src/ui/app.ts`
