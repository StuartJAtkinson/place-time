# Political Sources Audit

**Date:** 2026-05-15  
**Project:** Place-Time Phase 0 Research  
**Focus:** Modern + historical political boundaries (Five Towns area — West Yorkshire)

---

## Classification: Free vs Paid Sources

| Source | Free/Paid | License | Five Towns Quality | Recommended |
|--------|-----------|---------|-------------------|-------------|
| Geofabrik/OSM Admin Boundaries | **Free** | ODbL | Excellent | ✅ Primary |
| ONS Open Geography Portal | **Free** | OGL | Excellent | ✅ Primary |
| UK Electoral Commission | **Free** | Click-use | Excellent | ✅ Primary |
| OHMEC boundaries | **Free** | CC-BY-SA | Limited (UK) | ⚠️ Global only |
| Ordnance Survey (paid tiers) | **Paid** | Commercial | Highest | ⚠️ Only if budget allows |
| Historical Hansard | **Free** | Open Parliament | Text only | ⚠️ Metadata only |
| aourednik/historical-basemaps | **Free** | Various | Adequate (Europe) | ⚠️ Supplementary |

---

## 1. Geofabrik/OSM Admin Boundaries

**URL:** https://download.geofabrik.de/europe/united-kingdom.html  
**Admin polygons:** https://www.geofabrik.de/en/data/admin-polygons.html

### Details
- **Format:** Shapefile, GeoPackage (daily updates)
- **Content:** OpenStreetMap-derived administrative boundaries (district, county, region)
- **License:** Open Database License (ODbL) — same as OSM
- **Update frequency:** Daily (~21:00 CET)
- **UK coverage:** Complete, all administrative levels

### Five Towns Coverage
The Five Towns fall within:
- **Metropolitan Borough:** Wakefield (covers Pontefract, Castleford, Featherstone, Normanton, Knottingley)
- **West Yorkshire Combined Authority**
- **Yorkshire and the Humber region**
- **Civil parish boundaries** (optional layer — some settlements have parish councils)

### Integration Complexity: 1/5
- Direct download (no authentication)
- Standard Shapefile/GeoPackage formats
- ODbL license: fully FOSS-compatible, reciprocal
- Daily updates: automate via cron/wget

### Admin Levels Available
- Country (England)
- Region (Yorkshire and the Humber)
- Metropolitan county (West Yorkshire)
- Metropolitan district (Wakefield)
- Civil parish (where applicable)
- Electoral ward (for constituency reference)

### Recommendation
**Primary source for current UK administrative boundaries.** Use for Phase 3 political overlays. The ODbL license is ideal for FOSS-at-heart project. Daily updates mean data freshness is not an issue.

---

## 2. ONS Open Geography Portal

**URL:** https://api.bgs-ac.uk/ (BGS OGC API — different) | **ONS Portal:** https://geoportal.statistics.gov.uk/

### Details
- **Format:** GeoJSON, Shapefile, GML via API and bulk download
- **Content:** All ONS census and administrative boundaries
  - Census 2021 boundaries (OA, LSOA, MSOA)
  - Westminster parliamentary constituencies
  - Parishes, wards, local authority districts
  - Clinical Commissioning Groups, etc.
- **License:** Open Government Licence (OGL)
- **Access:** API + bulk download (no authentication for most datasets)

### Five Towns Coverage
- **Constituency:** Elmet and Pontefract; Normanton and District
- **MSOA:** Wakefield 050, 051, 052 (approximate)
- **LAUD:** Wakefield Metropolitan Borough
- **Parish:** Pontefract (town), Normanton (town), Featherstone (town), etc.

### Key API Patterns
```
# List collections
GET https://api.bgs-ac.uk/collections

# Get specific boundary (example: Westminster constituencies)
GET https://api.bgs-ac.uk/collections/boundaries/items?bbox=...)
```

Note: ONS API structure uses different endpoints — check geoportal for specific collection IDs.

### Integration Complexity: 2/5
- API requires exploration to find correct collection IDs
- Bulk download available for offline use
- OGL license: fully FOSS-compatible
- Coordinate system: often BNG (EPSG:27700) → needs transformation to WGS84 (EPSG:4326) for H3 indexing

### GSS Codes (Important for UK electoral data)
ONS uses GSS (Geography Statistical Standard) codes for all boundaries:
- E05001446 — Elmet and Pontefract (constituency)
- E05001475 — Normanton and District (constituency)
- E08000036 — Wakefield (local authority)

These codes are the key to linking boundary data with electoral data from other sources.

### Recommendation
**Primary source for UK statistical/census boundaries.** Essential for Phase 3. Use for:
- Current constituency boundaries (with GSS codes)
- Comparison with historical boundaries (from Cliopatria)
- Parish and ward level analysis for Five Towns

---

## 3. UK Electoral Commission

**URL:** https://www.electoralcommission.org.uk/our-work/our-research/our-electoral-data  
**Data:** https://www.electoralcommission.org.uk/our-work/our-research/our-electoral-data/download-our-electoral-data

### Details
- **Format:** Shapefile, GeoJSON (annual updates)
- **Content:** Official Westminster parliamentary constituency boundaries
- **License:** Click-use license (free for non-commercial, requires registration for commercial)
- **Update frequency:** Annual (after boundary reviews)

### Five Towns Current Constituencies
| Constituency | GSS Code | Notes |
|--------------|----------|-------|
| Elmet and Pontefract | E05001446 | Covers Pontefract, Castleford, part of Normanton |
| Normanton and District | E05001475 | Covers Normanton, part of Castleford |

### Integration Complexity: 1/5
- Direct download (requires registration for commercial use, free for non-commercial)
- Standard Shapefile format
- Annual updates — stable data
- Constituency polygon → H3 cell assignment

### Gerrymandering Data Application
The Electoral Commission data is the **ground truth** for current constituency boundaries. Use this to:
1. Calculate Polsby-Popper compactness for current boundaries
2. Compare with historical boundaries (Cliopatria, pre-1880 maps)
3. Identify constituencies with large deviation from population mean

### License Note
The "Click-use" license is not fully open — it has conditions. For non-commercial research, it's effectively free. For commercial applications, you need to register and may have restrictions. Document this in the project's license section.

### Recommendation
**Essential for Phase 3 gerrymandering analysis.** The official constituency data is required for compactness calculations. Use in combination with ONS boundaries. Budget: £0 for non-commercial research.

---

## 4. Ordnance Survey (Paid Tiers)

**URL:** https://www.ordnancesurvey.co.uk/

### Details
- **Free tier:** OS OpenData (some products free)
- **Paid tiers:** MasterMap, Boundary-Line, AddressBase (various price points)
- **License:** Commercial license required for paid products
- **Coverage:** Highest detail available for UK geography

### Products Relevant to Place-Time

| Product | Free/Paid | Content | Approx Cost | Notes |
|---------|-----------|---------|-------------|-------|
| OS OpenData | Free | Some boundary products | £0 | Limited product set |
| Boundary-Line | Paid | Parish, ward, Westminster boundaries | ~£500/year | Detailed, current |
| MasterMap | Paid | Full topographic detail | £2000+/year | Overkill for Place-Time |
| AddressBase | Paid | 30M+ UK addresses | £1000+/year | Not needed for project |

### Integration Complexity: 3/5 (for paid tier)
- Requires commercial license agreement
- API access via OS Data Hub
- Complex licensing terms
- High cost for what is essentially boundary polygon data

### Five Towns Coverage
If purchased, OS data would provide:
- Highest precision boundary definitions
- Historical OS mapping for boundary comparison
- Address-level data (not needed for this project)

### Recommendation
**Not required for Phase 0–4.** The free alternatives (Geofabrik, ONS, Electoral Commission) provide sufficient boundary quality for the project's goals. Only consider OS paid tiers if:
1. Phase 5 (global extension) reveals gaps in free data
2. Specific client/contractual requirement for OS-sourced data
3. Budget becomes available for commercial data purchase

**Defer to Phase 4 decision gate.** Flag as "potential future purchase" only.

---

## 5. Historical Hansard / Parliamentary Records

**URL:** https://api.parliament.uk/ | https://api.parliament.uk/static/  
**Historical:** https://www.historic hansard.org/

### Details
- **Content:** Parliamentary debate records, not spatial boundary data
- **Format:** JSON, HTML (text only)
- **License:** Open Parliament License (allows non-commercial use of parliamentary information)

### Place-Time Application
Hansard provides:
- **Textual records** of boundary changes (Act of Parliament, boundary reviews)
- **Metadata** about when constituencies were created/abolished/altered
- NOT polygon geometry — purely text

### Integration Complexity: 2/5
- API available for recent sessions
- Historical Hansard available via bulk download
- No spatial component — use for temporal validation only

### Recommendation
**Supplementary for Phase 3.** Use to:
- Validate boundary change dates (does Cliopatria match Hansard record?)
- Find the specific legislation that changed a constituency boundary
- Document the historical narrative of boundary manipulation

Not a primary boundary source — use for research documentation, not data ingestion.

---

## 6. OHMEC (Historical Indigenous/Political Boundaries)

**URL:** https://github.com/ohmec/ohmec  
**License:** CC-BY-SA 4.0

### Details
- **Content:** Historical boundaries by date, globally
- **Temporal:** Variable per region, designed for date queries
- **UK Coverage:** Limited — primary focus on Americas

### Five Towns Coverage
Minimal. OHMEC does not add value for UK-specific political boundaries.

### Recommendation
**Global extension only (Phase 5).** Not relevant for Five Towns focus area. Include as context layer for world map view.

---

## 7. aourednik/historical-basemaps

**URL:** https://github.com/aourednik/historical-basemaps  
**License:** Various (check per dataset)

### Details
- **Content:** European historical boundaries
- **Temporal:** Primarily 1500–1900 CE
- **UK Coverage:** Adequate for some periods

### Integration Complexity: 3/5
- Variable license (must check each layer)
- Multiple layers, multiple integration paths
- Data quality varies per region

### Recommendation
**Supplementary for Phase 2.** Use if Cliopatria + OpenDomesday leave gaps in the 1500–1850 period.

---

## Summary: Political Layer Source Stack

| Priority | Source | Layer | License | Free/Paid | Integration Effort |
|----------|--------|-------|---------|-----------|-------------------|
| 1 | Geofabrik/OSM | Current admin boundaries | ODbL | Free | Low |
| 2 | ONS Open Geography Portal | Census/statistical boundaries | OGL | Free | Medium |
| 3 | UK Electoral Commission | Constituency boundaries | Click-use | Free* | Low |
| 4 | Historical Hansard | Boundary change metadata | Open Parliament | Free | Medium |
| 5 | Ordnance Survey | High-precision boundaries | Commercial | Paid | High |
| 6 | OHMEC | Global historical boundaries | CC-BY-SA | Free | Low (not UK) |

### Budget Implications

| Source | Cost | Notes |
|--------|------|-------|
| Geofabrik | £0 | Daily free updates |
| ONS | £0 | OGL — no cost |
| Electoral Commission | £0 | Non-commercial free |
| Hansard | £0 | Open Parliament license |
| OS (if purchased) | £500–2000+/year | Only if budget available |

**Total required budget: £0** for all primary sources.

### Free vs Paid Decision Matrix

| Layer Type | Free Source | Paid Alternative | Recommendation |
|------------|-------------|-----------------|----------------|
| Admin boundaries | Geofabrik (ODbL) | OS Boundary-Line | **Use free** |
| Census boundaries | ONS (OGL) | OS MasterMap | **Use free** |
| Constituency boundaries | Electoral Commission | OS Boundary-Line | **Use free** |
| High-precision mapping | None free | OS MasterMap | **Defer** |
| Historical maps | Cliopatria, OpenDomesday | Historical Ordnance Survey | **Use free** |

### Critical Decision Points

1. **Commercial use check:** If Place-Time outputs will be used commercially (consulting, paid tool), register with Electoral Commission and consider license implications of ODbL/OGL/CC-BY-NC sources.

2. **OS paid tier:** Only purchase if (a) budget available AND (b) Phase 4 decision gate identifies gaps in free data quality.

3. **Boundary-Line vs Geofabrik:** OS Boundary-Line has more official legalforce but costs money. Geofabrik (OSM-derived) is free but may have minor accuracy differences. For gerrymandering analysis, both are adequate.

---

## Gerrymandering Detection Data Flow

```
Phase 3: Political Overlays + Gerrymandering Detection

Current Constituencies (Electoral Commission)
        ↓
Calculate Polsby-Popper Compactness Score
        ↓
Compare with Historical Boundaries (Cliopatria, pre-1880)
        ↓
Flag constituencies with large compactness change
        ↓
Overlay with admin boundaries (Geofabrik/ONS) for context
        ↓
Document findings + QGIS export
```

All data sources for this flow are **free** — no paid sources required.

---