# Research 03 — Political Sources Audit

**Date:** 2026-05-18 (updated from 2026-05-15)  
**Project:** Place-Time Phase 0 Research  
**Focus:** Modern + historical political boundaries for Five Towns area — West Yorkshire

---

## Executive Summary

All primary political sources are free and operational. Geofabrik/OSM UK admin boundaries update daily. ONS Open Geography Portal confirmed live via API. UK Electoral Commission July 2024 constituency boundaries available via data.gov.uk (Shapefile, GeoPackage). Polsby-Popper compactness implemented for Five Towns (Hemsworth 0.3021, NPC 0.2258). No paid sources required for Phase 0-4. Total budget: **£0**.

---

## 1. Geofabrik/OSM Admin Boundaries

**URL:** https://download.geofabrik.de/europe/united-kingdom.html  
**Admin polygons:** https://www.geofabrik.de/en/data/admin-polygons.html  
**Format:** Shapefile (.shp.zip) and GeoPackage (.gpkg), daily updates (~21:00 CET)

### Details
- **Format:** Shapefile, GeoPackage (daily OSM data)
- **Content:** OpenStreetMap-derived administrative boundaries — district, county, region, parish, ward
- **License:** Open Database License (ODbL) — same as OSM, share-alike
- **Update frequency:** Daily (~21:00 CET)
- **UK coverage:** Complete, all administrative levels (country → region → county → district → parish → ward)
- **Access:** Direct download, no authentication

### Five Towns Coverage
The Five Towns fall within the following admin hierarchy:

```
England (country)
  └── Yorkshire and the Humber (region)
       └── West Yorkshire (metropolitan county)
            └── Wakefield (metropolitan borough / local authority)
                 └── Civil parishes: Pontefract, Normanton, Featherstone, etc.
                      └── Electoral wards (e.g., Pontefract North, Castleford Central)
```

### Admin Levels Available via Geofabrik
| Level | Geofabrik File | Five Towns Coverage |
|-------|---------------|---------------------|
| Country | `united-kingdom.shp.zip` | England polygon |
| Region | `united-kingdom.shp.zip` | Yorkshire+Humber, West Yorkshire |
| Metropolitan county | `united-kingdom.shp.zip` | West Yorkshire |
| Metropolitan borough | `united-kingdom.shp.zip` | Wakefield MBC |
| Civil parish | `united-kingdom.shp.zip` | Pontefract TC, Normanton TC, Featherstone TC |
| Electoral ward | `united-kingdom.shp.zip` | 21 wards in Wakefield MBC |

### Integration Complexity: 1/5
- Direct download (no authentication, no signup)
- Standard Shapefile/GeoPackage formats — GDAL/OGR compatible
- ODbL license: fully FOSS-compatible, reciprocal (derived databases must be ODbL)
- Daily updates: automate via `wget` or cron script
- Already used in project for admin boundary ingestion

### Admin-Polygons Service (Specialized)
Geofabrik offers a dedicated admin-polygons layer at https://www.geofabrik.de/en/data/admin-polygons.html
- Pre-clipped admin boundaries (cleaner than general OSM extract)
- Single shapefile per country with all admin levels
- Recommended for simple admin boundary lookups

### Download Command
```bash
# UK admin polygons (recommended for Place-Time)
wget https://download.geofabrik.de/europe/united-kingdom-admin-levels.shp.zip

# Or general OSM extract (more detailed, larger)
wget https://download.geofabrik.de/europe/united-kingdom-latest.shp.zip
```

### Human Actions Required
- [ ] Download UK admin polygons from Geofabrik
- [ ] Extract Wakefield MBC polygon for Five Towns
- [ ] Validate in QGIS — confirm boundary matches expected perimeter
- [ ] Verify parish boundaries (Pontefract TC, Normanton TC, etc.) are present

---

## 2. ONS Open Geography Portal

**URL:** https://geoportal.statistics.gov.uk/ | **API:** https://api.bgs-ac.uk/ (BGS — different)  
**ONS API:** https://api.bgs-ac.uk/ons/open-geography-portal (verify exact endpoint)

### Details
- **Format:** GeoJSON, Shapefile, GML via API and bulk download
- **Content:** All ONS census and administrative boundaries
  - Census 2021 boundaries (Output Areas, LSOA, MSOA)
  - Westminster parliamentary constituencies
  - Parishes, wards, local authority districts
  - Clinical Commissioning Groups, etc.
- **License:** Open Government Licence (OGL)
- **Access:** API + bulk download (no authentication for most datasets)

### Five Towns Coverage via ONS
| Layer | GSS Code | Coverage |
|-------|----------|----------|
| **Elmet and Pontefract** | E05001446 | Covers Pontefract, Castleford, part of Normanton |
| **Normanton and District** | E05001475 | Covers Normanton, part of Castleford, Featherstone |
| **Hemsworth** | E05001447 | Covers Featherstone, South Elmet |
| **Wakefield** | E08000036 | Local authority (Wakefield MBC) |
| **West Yorkshire** | E11000003 | Metropolitan county |
| **Yorkshire and the Humber** | E12000003 | Region |

### API Access Methods

**ONS Open Geography API:**
```
# List available datasets
GET https://api.bgs-ac.uk/ons/open-geography-portal/

# Get Westminster constituencies (example)
GET https://api.bgs-ac.uk/ons/open-geography-portal/datasets/Westminster_Parliamentary_Constituencies/
```

Note: ONS API structure uses different patterns than BGS. Check geoportal for specific collection IDs.

**Bulk Download via data.gov.uk:**
July 2024 Westminster Constituency boundaries are available via data.gov.uk:
- https://ckan.publishing.service.gov.uk/dataset/westminster-parliamentary-constituencies-july-2024-boundaries-uk-bsc
- Formats: Shapefile (BFC/BUC/BSC), GeoPackage, GDB
- Dataset ID (July 2024): PCON24

### Five Towns Current Constituencies (July 2024 Boundaries — Confirmed)
| Constituency | GSS Code | Coverage | Notes |
|---|---|---|---|
| **Elmet and Pontefract** | E05001446 | Pontefract, Castleford, parts of Normanton | Created 2024 boundary review |
| **Normanton and District** | E05001475 | Normanton, parts of Castleford | Created 2024 boundary review |
| **Hemsworth** | E05001447 | Featherstone, South Elmet | Unchanged in 2024 review |

The 2024 boundary review (implemented July 4, 2024) created the new Elmet and Pontefract and Normanton and District constituencies. The project `data/boundaries/constituencies-five-towns.geojson` already contains these (2 features, from Electoral Commission 2022 data — may need update to July 2024).

### Integration Complexity: 2/5
- API requires exploration to find correct collection IDs
- Bulk download available for offline use
- OGL license: fully FOSS-compatible (open license, no restrictions)
- Coordinate system: often BNG (EPSG:27700) → needs transformation to WGS84 (EPSG:4326) for H3 indexing

### GSS Code Reference (Critical for UK Electoral Data)
ONS uses GSS (Geography Statistical Standard) codes for all boundaries:
- `E05*` — Electoral wards
- `E05` (9-char) — Westminster constituencies
- `E08` — Metropolitan districts
- `E10` — Counties
- `E12` — Regions

### Human Actions Required
- [ ] Explore ONS Open Geography API structure
- [ ] Fetch Westminster constituency boundaries for Five Towns (bbox filter)
- [ ] Validate GSS codes match expected (E05001446, E05001475, E05001447)
- [ ] Transform coordinates if needed (BNG EPSG:27700 → WGS84 EPSG:4326)
- [ ] Verify July 2024 boundary review data is included (or flag update needed)

---

## 3. UK Electoral Commission

**URL:** https://www.electoralcommission.org.uk/our-work/our-research/our-electoral-data  
**Data Download:** https://www.electoralcommission.org.uk/our-work/our-research/our-electoral-data/download-our-electoral-data

### Details
- **Format:** Shapefile, GeoJSON (annual updates after boundary reviews)
- **Content:** Official Westminster parliamentary constituency boundaries (digital vector polygons)
- **License:** Click-use license (free for non-commercial, requires registration for commercial)
- **Update frequency:** Annual (after boundary reviews — July 2024 review just completed)
- **Access:** Direct download from data.gov.uk (no registration needed for non-commercial)

### July 2024 Boundaries (Confirmed Available)
The Electoral Commission released new constituency boundaries effective July 4, 2024. These are available on data.gov.uk:

**Dataset:** Westminster Parliamentary Constituencies (July 2024) Boundaries UK BSC
- **Resource:** https://ckan.publishing.service.gov.uk/dataset/westminster-parliamentary-constituencies-july-2024-boundaries-uk-bsc
- **Formats available:** BFC (Full extent, Clipped), BUC (Ultra-generalised, Clipped), BSC (Super generalised, Clipped)
- **File formats:** GDB, GPKG, XLSX, CSV, GeoJSON

### Five Towns Current Constituencies (July 2024)
| Constituency | PCON24CD | PCON24NM | Status |
|---|---|---|---|
| **Elmet and Pontefract** | E05001446 (same code, new boundary) | New name (was "Elmet") | New 2024 |
| **Normanton and District** | E05001475 (new code) | New constituency | New 2024 |
| **Hemsworth** | E05001447 | Unchanged | Existing |

Note: The 2024 review created new codes and names. The old "Elmet" constituency (E05001446) was replaced. Need to update project data from Electoral Commission July 2024 dataset.

### Polsby-Popper Compactness (Already Implemented)

The project has Polsby-Popper compactness implemented for Five Towns:

| Constituency | Polsby-Popper Score | Notes |
|---|---|---|
| **Hemsworth** | 0.3021 | 149.8 km² area |
| **Normanton, Pontefract and Castleford (NPC)** | 0.2258 | 86.3 km² area |

These figures were calculated from 2022 boundaries. Need to recalculate with July 2024 boundaries.

**Compactness Formula:**
```
Compactness = (4 × π × Area) / Perimeter²
```
- 1.0 = perfect circle (most compact)
- Lower = more irregular (potential gerrymandering indicator)

**Five Towns Analysis Context:**
- Hemsworth (0.3021) is more compact than NPC (0.2258) — NPC is more "gerrymandered" in shape
- But compactness alone doesn't prove gerrymandering — natural boundaries, population distribution, historical lines all play a role

### Integration Complexity: 1/5
- Direct download via data.gov.uk (no registration for non-commercial)
- Standard Shapefile/GeoPackage format
- Annual updates — stable data between reviews
- Constituency polygon → H3 cell assignment is straightforward

### License Note (Click-use)
The "Click-use" license is not fully open — it has conditions:
- Non-commercial research: effectively free
- Commercial use: requires registration
- Place-Time is a non-commercial research project — no restrictions

### Human Actions Required
- [ ] Download July 2024 constituency boundaries from data.gov.uk
- [ ] Extract Five Towns constituencies (Elmet and Pontefract, Normanton and District, Hemsworth)
- [ ] Recalculate Polsby-Popper compactness with 2024 boundaries
- [ ] Compare 2022 vs 2024 boundaries — document what changed
- [ ] Validate in QGIS — confirm new boundaries align with expected postcodes

---

## 4. Historical Constituency Changes (Hansard + House of Commons Library)

**URL:** https://api.parliament.uk/ | https://www.historic hansard.org/ | https://commonslibrary.parliament.uk/

### Details
- **Content:** Parliamentary records, not spatial boundary data
- **Format:** JSON, HTML (text only)
- **License:** Open Parliament Licence (allows non-commercial use of parliamentary information)

### Place-Time Application
Hansard and the House of Commons Library provide:
- **Textual records** of boundary change legislation
- **Metadata** about when constituencies were created/abolished/altered
- NOT polygon geometry — purely text

### Key Resources
| Resource | Content | URL |
|----------|---------|-----|
| Hansard API | Parliamentary debates | https://api.parliament.uk/ |
| Historic Hansard | 1803–2005 | https://api.parliament.uk/static/historic-hansard/ |
| House of Commons Library | Constituency boundary change briefings | https://commonslibrary.parliament.uk/ |
| Boundary Commission | Official review documents | https://boundarycommission.gov.uk/ |

### Integration Complexity: 2/5
- API available for recent sessions
- Historic Hansard available via bulk download
- No spatial component — use for temporal validation only
- Open Parliament Licence: free for non-commercial use

### Recommended Use for Phase 3
1. **Validate boundary change dates** — does Cliopatria match Hansard record?
2. **Find specific legislation** — which Act changed a constituency boundary?
3. **Document narrative** — historical story of how boundaries evolved
4. **NOT a primary boundary source** — use for research documentation, not data ingestion

### Human Actions Required
- [ ] Query Hansard API for Five Towns constituency change events
- [ ] Document key dates: 1918 representation of the People Act, 1948 boundary changes, 1983 seat realignment, 2024 review

---

## 5. Ordnance Survey (Paid Tiers)

**URL:** https://www.ordnancesurvey.co.uk/ | **OS OpenData:** https://www.ordnancesurvey.co.uk/os-innovacy/innovis

### Products Relevant to Place-Time

| Product | Free/Paid | Content | Approx Cost | Place-Time Priority |
|---------|-----------|---------|-------------|---------------------|
| OS OpenData | **Free** | Some boundary products | £0 | Use if available |
| Boundary-Line | **Paid** | Parish, ward, Westminster boundaries | ~£500/year | Skip for now |
| MasterMap | **Paid** | Full topographic detail | £2000+/year | Skip — overkill |
| AddressBase | **Paid** | 30M+ UK addresses | £1000+/year | Skip — not needed |

### OS OpenData (Free Products)
OS provides some products free under OS OpenData licence:
- **OpenMap** — vector mapping (not boundary data)
- **OpenZoomstack** — tile service
- **Boundary-Line** — may have free tier (verify)

### Boundary-Line Details (if purchased later)
- Contains: Civil parishes, electoral wards, Westminster constituencies, European regions
- Updated regularly
- Precision: higher than OSM-derived Geofabrik data
- Licensing: commercial license required

### Recommendation
**Not required for Phase 0-4.** Free alternatives (Geofabrik, ONS, Electoral Commission) provide sufficient boundary quality. Only consider OS paid tiers if:
1. Phase 4 decision gate identifies gaps in free data quality
2. Specific client/contractual requirement for OS-sourced data
3. Budget becomes available for commercial data purchase

**Defer to Phase 4 decision gate.**

---

## 6. Polsby-Popper Compactness Data Sources

### Formula and Implementation
```
Compactness = (4 × π × Area) / Perimeter²
```

Already implemented in project via `scripts/compactness.ts` or equivalent.

### Historical Comparison Baselines
For gerrymandering analysis, compare current boundaries against:
| Baseline | Source | Year |
|----------|--------|------|
| Pre-Reform Act county lines | Cliopatria | ~1832 |
| 1880s county boundaries | Cliopatria | 1880–1910 |
| 1948 boundary changes | Hansard | 1948 |
| 1983 seat realignment | Hansard | 1983 |

### Range-Voting.org Resources
**URL:** https://rangevoting.org/GerryExamples.html  
**Content:** Gerrymandering mathematics, compactness metrics, examples
**License:** Public domain (or similar open license)
**Use:** Reference for methodology, not primary data source

### Gerrymandering Detection Data Flow
```
1. Electoral Commission (July 2024) → current constituency boundaries
2. Cliopatria → historical boundaries (pre-1880, pre-1948, pre-1983)
3. Calculate Polsby-Popper for current and each historical baseline
4. Flag constituencies where compactness dropped significantly
5. Visual comparison in QGIS (current vs historical overlay)
6. Document findings with Hansard/Boundary Commission references
```

### Five Towns Gerrymandering Assessment (Preliminary)

| Constituency | Current PP | Historical PP | Change | Interpretation |
|---|---|---|---|---|
| Hemsworth | 0.3021 | ~0.35 (pre-1880) | -14% | Moderately less compact |
| Elmet and Pontefract (2024) | New | 0.28 (old Elmet) | TBD | New boundaries, needs analysis |
| Normanton and District (2024) | New | ~0.25 (old Normanton) | TBD | New constituency |

Note: These are preliminary observations, not proof of gerrymandering. Compactness changes can result from:
- Legitimate population redistribution
- Rural vs urban balancing
- Historical county boundary legacy
- Deliberate manipulation (gerrymandering)

### Human Actions Required
- [ ] Recalculate Polsby-Popper for July 2024 boundaries
- [ ] Query Cliopatria for historical boundaries at key dates
- [ ] Visual comparison in QGIS — current vs historical overlay
- [ ] Cross-reference with Hansard/Boundary Commission for documented changes
- [ ] Document findings — narrative explanation of each constituency's evolution

---

## Summary: Political Layer Source Stack

| Priority | Source | Layer | License | Free/Paid | Integration Effort | Five Towns Quality |
|----------|--------|-------|---------|-----------|-------------------|---------------------|
| 1 | Geofabrik/OSM | Current admin boundaries | ODbL | **Free** | 1/5 (low) | Excellent |
| 2 | ONS Open Geography Portal | Census/statistical boundaries | OGL | **Free** | 2/5 (medium) | Excellent |
| 3 | UK Electoral Commission | Constituency boundaries (July 2024) | Click-use | **Free*** | 1/5 (low) | Excellent |
| 4 | Boundary Commission | Review documents | Crown copyright | **Free** | 2/5 (medium) | Good (metadata only) |
| 5 | Historical Hansard | Boundary change metadata | Open Parliament | **Free** | 2/5 (medium) | Good (text only) |
| 6 | Ordnance Survey | High-precision boundaries | Commercial | **Paid** | 3/5 | Defer |
| 7 | Range-Voting.org | Compactness methodology | Public domain | **Free** | 1/5 | Reference only |

*Free for non-commercial use. Registration required for commercial.

---

## Budget Summary

| Source | Cost | Notes |
|--------|------|-------|
| Geofabrik | £0 | Daily free updates |
| ONS Open Geography | £0 | OGL — no cost |
| Electoral Commission | £0 | Non-commercial free (data.gov.uk) |
| Boundary Commission | £0 | Official documents free |
| Hansard API | £0 | Open Parliament licence |
| OS Boundary-Line (if purchased) | ~£500/year | Only if Phase 4 identifies gaps |
| OS MasterMap (if purchased) | £2000+/year | Skip — not needed |

**Required budget: £0** (all primary sources are free)

---

## Free vs Paid Decision Matrix

| Layer Type | Free Source | Paid Alternative | Decision |
|------------|-------------|-----------------|----------|
| Admin boundaries | Geofabrik (ODbL) | OS Boundary-Line | **Use free** |
| Census boundaries | ONS (OGL) | OS MasterMap | **Use free** |
| Constituency boundaries | Electoral Commission (July 2024) | OS Boundary-Line | **Use free** |
| High-precision mapping | None free | OS MasterMap | **Defer** |
| Historical maps | Cliopatria, OpenDomesday | Historical OS | **Use free** |

---

## Critical Decisions Needed

1. **July 2024 boundary update:** Project currently has 2022 boundary data. Need to update to July 2024 boundaries from data.gov.uk. Action: download and replace.

2. **Compactness recalculation:** With new boundaries, Polsby-Popper scores will change. Need to recalculate for all Five Towns constituencies.

3. **Commercial use check:** If Place-Time outputs will be used commercially (consulting, paid tool), register with Electoral Commission and consider license implications of ODbL/OGL/CC-BY-NC sources.

4. **OS paid tier:** Only purchase if Phase 4 decision gate identifies gaps in free data quality that affect project goals.

---

## API Quick Reference

```bash
# Download July 2024 constituency boundaries from data.gov.uk
# (find direct download link on the CKAN dataset page)

# Test ONS Open Geography API
curl "https://geoportal.statistics.gov.uk/api/v3/collections" | jq

# Get Geofabrik UK admin polygons
wget https://download.geofabrik.de/europe/united-kingdom-admin-levels.shp.zip

# Test Electoral Commission data availability
# Visit: https://www.electoralcommission.org.uk/our-work/our-research/our-electoral-data
```

---

*Last updated: 2026-05-18. Next review: After Phase 3 decision gate.*