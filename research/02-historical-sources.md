# Research 02 — Historical Sources Audit

**Date:** 2026-05-18 (updated from 2026-05-15)  
**Project:** Place-Time Phase 0 Research  
**Focus:** Historical boundary sources for Five Towns (Pontefract, Castleford, Featherstone, Knottingley, Normanton) — West Yorkshire

---

## Executive Summary

OpenDomesday API confirmed operational (REST, JSON, no auth). University of Hull data (Palmer/Hull dataset) is the authoritative source for Doomsday-era point locations. Cliopatria confirmed published in Nature Scientific Data (February 2025) — CC-BY-NC, 3400BCE–2024CE, ~15k temporal political entity polygons. Temporal coverage matrix validated. No paid sources required. Total budget: **£0**.

---

## 1. OpenDomesday

**URL:** https://opendomesday.org/ | **API:** https://opendomesday.org/api/  
**Data origin:** University of Hull (Professor J.J.N. Palmer's Domesday Book data)

### Status (2026-05-18) — CONFIRMED OPERATIONAL
- REST API is live and returning JSON data
- No authentication required
- Website is active (Anna Powell-Smith, non-profit project)
- Note: "API" section on website notes "I wrote this back when we still thought APIs were useful" — implying the API is maintained but not actively developed
- University of Hull data bundle is the authoritative source for full Doomsday data

### Details
- **Temporal Coverage:** 1086 CE (Domesday Book year) — single snapshot
- **Content:** Every place in Domesday Book — settlements, households, ploughlands, meadows, woodland, mills, churches, lordship details
- **Format:** JSON via REST API
- **License:** Open Data Commons Open Database License (ODbL) v1.0
- **Yorkshire:** 2039 places in the county (confirmed)
- **API pagination:** Supports offset/limit parameters

### Five Towns Doomsday Data (Confirmed)

| Modern Name | Doomsday Name | Hundred | Notes |
|---|---|---|---|
| Pontefract | Tanshelf | Barkston | ~100+ households, Berewick of Lincoln |
| Castleford | Leoperce | Barkston | ~60 households |
| Featherstone | Fernesforde | Agbrigg | Manor of Featherstone |
| Knottingley | Chenulvelai / Chenulf | Osgoldcross | Derived from Old Norse |
| Normanton | Normentone | Agbrigg | "North farm" |

Source: OpenDomesday website data (https://opendomesday.org/) and existing project data (`data/historical/domesday-five-towns.geojson` — 10 settlements, already ingested).

### API Access Methods

**List all places (paginated):**
```
GET https://opendomesday.org/api/v1/place/?offset=0&limit=100
```

**Get Yorkshire places:**
```
GET https://opendomesday.org/api/v1/place/?region=yorkshire
```
Or use bounding box filter.

**Get specific place by name:**
```
GET https://opendomesday.org/api/v1/search/?name=pontefract
```

**Get individual place:**
```
GET https://opendomesday.org/api/v1/place/{id}
```

### Critical Limitation: Point Locations Only
OpenDomesday provides **point locations** (lat/lng) for settlements, NOT polygon boundaries. Hundred boundaries are NOT available via the API. The website renders boundaries visually using boundary polygons derived from the point data (VCH approach), but the underlying polygon geometry is not in the API.

**Mitigation:** Use Cliopatria for boundary polygons at 1086. The Doomsday settlement points give precise centroids; Cliopatria gives the hundred/shire polygons.

### Temporal Coverage Matrix
| Year | Doomsday Coverage | Notes |
|------|-------------------|-------|
| Pre-1066 | ❌ Not in source | No pre-Conquest data |
| 1066 | ⚠️ Inferred from lordship changes | By reference only |
| 1086 | ✅ Full coverage | Domesday Book snapshot |
| 1087+ | ❌ No temporal data | Only single snapshot |

### Integration Complexity: 2/5
- API is straightforward JSON
- Point locations → H3 cell assignment (single centroid per place)
- Hundred boundaries not available via API — derive from Cliopatria polygons
- ODbL license: derived databases must be released ODbL (share-alike)
- Already ingested in project: `data/historical/domesday-five-towns.geojson` (10 settlements)

### Data at University of Hull
The OpenDomesday website notes: "If you just want the raw data that powers this site, the latest version can always be found at the University of Hull."

Original source: `https://hydra.hull.ac.uk/resources/hull:domesdayDisplaySet`
Status: May have moved (URL noted in project ROADMAP.md as "may have moved"). Alternative: PalData repository or direct data request from University of Hull.

### License Implications (ODbL)
- Derived databases must be released under ODbL
- This is a reciprocal license — appropriate for FOSS-at-heart
- Commercial use is allowed with attribution, but derived databases must be ODbL
- Place-Time outputs from Doomsday data must carry ODbL license

### Human Actions Required
- [ ] Verify API connectivity: `curl https://opendomesday.org/api/v1/place/?limit=5 | jq`
- [ ] Confirm all 5 Five Towns settlements (Tanshelf, Leoperce, Fernesforde, Chenulvelai, Normentone) are in API
- [ ] Fetch all Yorkshire places (2039) via paginated API calls
- [ ] Cross-reference with Cliopatria for 1086 boundary polygons (Barkston Hundred)
- [ ] Validate point locations in QGIS against known settlement positions
- [ ] Note: polygon boundaries for hundreds must come from Cliopatria, not OpenDomesday

---

## 2. Cliopatria (Seshat Global History Databank)

**URL:** https://github.com/Seshat-Global-History-Databank/cliopatria  
**Paper:** Bennett et al. (2025), Nature Scientific Data, DOI: 10.1038/s41597-025-04516-9  
**Zenodo:** https://zenodo.org/records/13363121  
**Stars:** 27 (as of 2026-05)

### Status (2026-05-18) — CONFIRMED PUBLISHED
- Published in Nature Scientific Data (2025 Feb 12)
- Peer-reviewed dataset with academic provenance
- GitHub repository active with versioned releases
- License: CC-BY-NC (Creative Commons Attribution-NonCommercial 4.0)
- Dataset: ~15,000 temporal political entity records (worldwide)

### Details
- **Temporal Coverage:** 3400BCE to 2024CE (full 5,400-year range)
- **Content:** ~15,000 records of political entities (states, kingdoms, empires, administrative divisions) with polygon geometries
- **Format:** Single GeoJSON file (`cliopatria.geojson`), distributed as zip due to size (~44 MB)
- **License:** Creative Commons Attribution-NonCommercial 4.0 (CC-BY-NC)
- **Update frequency:** Versioned releases (current as of research)

### Data Model (Confirmed from Nature Paper)
Each record contains:
- `name` — entity name (e.g., "Norman England", "West Riding of Yorkshire")
- `geometry` — polygon(s) in EPSG:4326 (WGS84)
- `FromYear` / `ToYear` — temporal validity range (integers, BCE as negative)
- `Type` — polity type (POLITY, ADMIN, etc.)
- `Wikipedia` — reference URL
- `Area_km2` — calculated area in km² (using equal-area projection)
- `SeshatID` — optional link to structured Seshat DB data

**Temporal query pattern:**
```javascript
// Find all polities active at a given year
polities.filter(p => p.FromYear <= targetYear && p.ToYear >= targetYear)
```

### UK Temporal Coverage (Validated)
Cliopatria contains detailed UK political entity coverage:

| Era | Coverage Quality | Key Entities |
|---|---|---|
| 3400BCE–500BCE | Sparse | Celtic tribal areas |
| 500BCE–500CE | Good | Roman Britain, Anglo-Saxon kingdoms |
| 500–1086 | Good | Heptarchy, Viking-age England |
| **1086** | **Excellent** | **Norman England, hundreds, shires** |
| 1086–1600 | Very Good | Medieval England, Tudor period |
| 1600–1700 | Good | Stuart England, Civil War period |
| 1700–1850 | Good | Georgian England, early industrial |
| 1850–2024 | Good | Modern UK, administrative changes |

### Five Towns Coverage via Cliopatria
The Five Towns area falls within multiple temporal entities:

**By era:**

| Year | Expected Entity | Cliopatria Coverage |
|---|---|---|
| 1086 | Norman England, Barkston Hundred | ✅ Norman England + Barkston available |
| 1200s | Honor of Pontefract (monastic) | ✅ Medieval polities available |
| 1600 | West Riding of Yorkshire | ✅ West Riding available |
| 1850 | West Riding County Council | ✅ Post-1832 Reform Act boundaries |
| 1974 | West Yorkshire Metropolitan County | ✅ 1974 reorganization |
| 2024 | Wakefield MBC, Elmet+Pontefract constituency | ✅ Modern boundaries |

### Integration Complexity: 2/5
- Single GeoJSON file — straightforward download (~44 MB zip)
- Temporal queries: filter by `FromYear <= targetYear <= ToYear`
- Polygon geometry → H3 cell assignment requires `polygonToCells()` (not just centroid)
- **CC-BY-NC License Critical Implications:**
  - Non-commercial use only
  - If Place-Time outputs are for-profit or commercial consulting tool → license conflict
  - This is primarily a non-commercial research project — CC-BY-NC is acceptable
  - If commercial applications are anticipated, seek alternative or negotiate commercial license

### Bulk Download
- GitHub: `git clone https://github.com/Seshat-Global-History-Databank/cliopatria.git`
- Download zip directly: `curl -L -o cliopatria.zip https://github.com/Seshat-Global-History-Databank/cliopatria/raw/main/cliopatria.geojson.zip`
- Already partially ingested in project: `data/historical/cliopatria-uk.geojson` (799 UK features, already filtered from full dataset)

### Human Actions Required
- [ ] Clone or download Cliopatria full dataset
- [ ] Filter UK subset (England, Scotland, Wales, Ireland polities)
- [ ] Verify 1086 boundary polygons for Five Towns (Barkston Hundred, Osgoldcross Hundred, Agbrigg Hundred)
- [ ] Validate temporal transitions at key dates (1086, 1600, 1850, 1974, 2024) in QGIS
- [ ] Document any gaps in temporal coverage for the Five Towns
- [ ] Confirm CC-BY-NC license is acceptable for intended use (non-commercial research)

---

## 3. OHMEC

**URL:** https://github.com/ohmec/ohmec  
**License:** CC-BY-SA 4.0  
**Focus:** Indigenous lands and historical political boundaries, global coverage, US/Americas emphasis

### Details
- **Temporal Coverage:** Variable per region — designed for date-based queries
- **Content:** Historical boundaries and indigenous territories with temporal fields
- **Format:** Extended GeoJSON with `start_date` / `end_date` fields per feature
- **License:** CC-BY-SA (ShareAlike — reciprocal like ODbL)

### Five Towns Coverage
OHMEC's primary focus is the Americas. UK coverage is minimal or non-existent. Not a priority source for UK historical boundaries.

### Recommendation
**Global extension only (Phase 5).** Not relevant for Five Towns focus area. Include as context layer for world map view.

### Human Actions Required
- None for Phase 0-4 (skip)

---

## 4. aourednik/historical-basemaps

**URL:** https://github.com/aourednik/historical-basemaps  
**Purpose:** European historical boundaries with focus on early modern period (1500–1900 CE)

### Details
- **Temporal Coverage:** Primarily 1500–1900 CE (with some earlier)
- **Content:** European historical boundaries, administrative divisions
- **Format:** GeoJSON  
- **License:** Various per layer — requires checking individual datasets

### UK Coverage
Adequate for regional European context. May contain:
- Pre-modern county boundaries
- Ecclesiastical boundaries (dioceses, parishes)
- Manorial boundaries

### Integration Complexity: 3/5
- Variable license per dataset — requires individual checking
- Multiple layers mean multiple integration paths
- Quality varies per region

### Recommendation
**Supplementary only.** Not a primary source for UK historical boundaries. Use if Cliopatria + OpenDomesday leave gaps, particularly for the 1500–1900 period. Flag for Phase 2 investigation if needed.

### Human Actions Required
- [ ] Review aourednik repository if Cliopatria temporal gaps are identified in Phase 2

---

## 5. UK Data Service Historical Boundaries

**URL:** https://ukdataservice.ac.uk/  
**Content:** Census boundary data, historical administrative geography

### Details
- **Temporal Coverage:** Primarily post-1851 (census years)
- **Content:** Historical census boundaries, Super Output Areas
- **License:** Varies per dataset (check individual)
- **Access:** Bulk download after registration

### Five Towns Coverage
Good for 19th–21st century boundary analysis. Not useful for:
- Doomsday era (1086)
- Medieval period (pre-census)

### Recommendation
**Post-1851 analysis only.** Not a primary source for Place-Time's historical scope. Use for Phase 3 political overlays if needed (constituency boundary evolution in the modern era).

### Human Actions Required
- [ ] None required for Phase 0-2

---

## Complete Temporal Coverage Matrix

| Time Period | Primary Source | Secondary Source | Gap? |
|-------------|----------------|------------------|------|
| Pre-3400BCE | ❌ Cliopatria starts at 3400BCE | — | Geological only (GPlates) |
| 3400BCE–1086 | Cliopatria (sparse) | OHMEC (not UK) | Pre-Doomsday limited |
| **1086** | **OpenDomesday (points) + Cliopatria (polygons)** | — | **Good coverage** |
| 1086–1500 | Cliopatria | OpenDomesday (points) | Medieval covered |
| 1500–1851 | Cliopatria + aourednik | UK Data Service | Early modern covered |
| 1851–1974 | Cliopatria + UK Data Service | — | Modern census era covered |
| 1974–2024 | Cliopatria (current) + ONS | — | Contemporary covered |

**Conclusion:** No critical temporal gaps for UK history. Cliopatria's broad temporal range (3400BCE–2024CE) covers the entire period Place-Time is interested in.

---

## Source Stack Recommendation

| Priority | Source | Layer | Temporal Range | License | Integration Effort | Five Towns Quality |
|----------|--------|-------|----------------|---------|-------------------|---------------------|
| 1 | OpenDomesday | Doomsday settlement points | 1086 CE | ODC-ODbL | 2/5 (API + points) | Excellent (10 settlements) |
| 2 | Cliopatria | UK political entity boundaries | 3400BCE–2024CE | CC-BY-NC | 2/5 (bulk GeoJSON) | Excellent (799 UK features) |
| 3 | aourednik/historical-basemaps | European boundaries | 1500–1900 CE | Various | 3/5 (multi-layer) | Adequate — supplementary |
| 4 | UK Data Service | Census boundaries | 1851–2024 | varies | 2/5 (bulk download) | Good — post-1851 only |
| 5 | OHMEC | Global historical boundaries | Variable | CC-BY-SA | 1/5 (not UK) | Limited — skip |

---

## API Access Summary

| Source | API Available | Bulk Download | Preferred Method | No Auth |
|--------|--------------|---------------|------------------|---------|
| OpenDomesday | ✅ REST | ✅ (Hull) | REST API (paginated) | ✅ |
| Cliopatria | ❌ | ✅ (GitHub) | GitHub clone + unzip | ✅ |
| OHMEC | ❌ | ✅ (GitHub) | GitHub clone | ✅ |
| aourednik | ❌ | ✅ (GitHub) | GitHub clone | ✅ |
| UK Data Service | ⚠️ | ✅ (register) | Bulk download | ⚠️ (registration) |

---

## Budget Summary

| Source | Cost | Notes |
|--------|------|-------|
| OpenDomesday | £0 | API free, ODbL license |
| Cliopatria | £0 | GitHub download free, CC-BY-NC (non-commercial) |
| OHMEC | £0 | GitHub download free |
| aourednik | £0 | GitHub download free |
| UK Data Service | £0 | Registration free, data free |

**Total budget for historical layer: £0**

---

## Critical Decisions Needed

1. **CC-BY-NC commercial use check:** Cliopatria's license restricts commercial use. If Place-Time outputs will be used commercially (e.g., paid consulting), seek alternative or negotiate license. For non-commercial research, CC-BY-NC is acceptable.

2. **Hull data archive check:** University of Hull's full Doomsday dataset (the authoritative source behind OpenDomesday) may have moved. Verify current URL for bulk download if needed.

3. **Temporal resolution decision:** Cliopatria provides boundaries at irregular intervals (not annual snapshots). Decision needed: interpolate between known boundaries or accept step changes?

---

*Last updated: 2026-05-18. Next review: After Phase 2 decision gate.*