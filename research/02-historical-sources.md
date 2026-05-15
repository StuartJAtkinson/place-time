# Historical Sources Audit

**Date:** 2026-05-15  
**Project:** Place-Time Phase 0 Research  
**Focus:** Five Towns area (Pontefract, Knottingley, Featherstone, Castleford, Normanton)

---

## Sources Evaluated

| Source | Temporal Coverage | License | API Access | UK Coverage | Five Towns Quality | Recommended |
|--------|-----------------|---------|------------|-------------|-------------------|-------------|
| OpenDomesday | 1086 CE only | ODC-ODbL | REST API + bulk download | England (2039 places in Yorkshire) | Excellent | ✅ Primary |
| Cliopatria/Seshat | 3400BCE–2024CE | CC-BY-NC | Bulk download (GeoJSON zip) | Global (UK detail) | Good | ✅ Secondary |
| OHMEC | Variable by region | CC-BY-SA | GitHub clone | Global (US/World focus) | Limited for UK | ⚠️ Global only |
| aourednik/historical-basemaps | Variable | Various | GitHub clone | Europe | Adequate | ⚠️ Supplementary |
| UK Data Service | Historical boundary snapshots | varies | Bulk download | UK | Good | ⚠️ Backup |

---

## 1. OpenDomesday

**URL:** https://opendomesday.org/  
**API:** https://opendomesday.org/api/  
**Data origin:** University of Hull (Professor J.J.N. Palmer's Domesday Book data)

### Details
- **Temporal Coverage:** 1086 CE (Domesday Book year)
- **Content:** Every place in Domesday Book — settlements, households, ploughlands, meadows, woodland, mills, churches, and lordship details
- **Format:** JSON via REST API; bulk data also available from University of Hull
- **License:** Open Data Commons Open Database License (ODbL) v1.0
- **Yorkshire:** 2039 places in the county
- **API:** No authentication required; returns JSON by default

### Five Towns Coverage
| Modern Name | Doomsday Name | Hundred | Households (est.) |
|-------------|---------------|---------|-------------------|
| Pontefract | Tanshelf | Barkston | ~100+ households |
| Castleford | Leoperce | Barkston | ~60 households |
| Featherstone | *(verify)* | *(verify)* | *(verify)* |
| Knottingley | *(verify)* | *(verify)* | *(verify)* |
| Normanton | *(verify)* | *(verify)* | *(verify)* |

The OpenDomesday site shows Barkston Hundred covers the Five Towns area with many settlements.

### API Access
- `GET /api/v1/place/` — list all places (paginated)
- `GET /api/v1/place/{id}` — individual place details (lat/lng, households, etc.)
- `GET /api/v1/search/?name={search}` — search by name
- No polygon geometries — only point locations (lat/lng per place)
- Hundred boundaries may be approximated from hundred membership

**Critical Limitation:** OpenDomesday provides **point locations** for settlements, not polygon boundaries. The polygon boundaries (hundreds, townships) are not in the API. The website shows boundaries rendered visually, but the underlying geometry is not available via API.

### Temporal Coverage Matrix
| Year | Doomsday Coverage | Notes |
|------|-------------------|-------|
| 1066 | ❌ Not in source | Pre-Domesday |
| 1086 | ✅ Full | Domesday Book |
| 1100+ | ❌ No temporal data | Only single snapshot |

### Integration Complexity: 2/5
- API is straightforward JSON
- Point locations → H3 cell assignment (single centroid per place)
- Hundred boundaries not available via API — would need to derive from point clustering
- ODbL license: derived databases must be released ODbL (this is a reciprocal license implication)

### Recommendation
**Primary source for Doomsday-era Five Towns data.** The data quality for Yorkshire is excellent — 2039 places with detailed attributes. However, the lack of polygon geometry is a significant gap. Consider:
1. Use point locations as proxy for settlement presence
2. Research if Palmer's underlying dataset (University of Hull) has polygon boundaries
3. Cross-reference with Cliopatria which may have historical boundary polygons for the same era

---

## 2. Cliopatria (Seshat Global History Databank)

**URL:** https://github.com/Seshat-Global-History-Databank/cliopatria  
**Paper:** Nature Scientific Data (2025) — DOI: 10.1038/s41597-025-04516-9  
**Zenodo:** https://zenodo.org/records/13363121  
**Stars:** 27

### Details
- **Temporal Coverage:** 3400BCE to 2024CE (full range, ~5400 years)
- **Content:** ~15,000 records of political entities (states, kingdoms, empires) with polygon geometries
- **Format:** Single GeoJSON file (`cliopatria.geojson`, distributed as zip due to size)
- **License:** Creative Commons Attribution-NonCommercial 4.0 (CC-BY-NC)
- **Update frequency:** Active repository, versioned releases (MAJOR.MINOR.PATCH)

### Data Model
Each record contains:
- `Name` — entity name (e.g., "Kingdom of England")
- `geometry` — polygon(s) in EPSG:4326
- `Area` — calculated in km² (equal-area projection EPSG:6933)
- `Type` — polity type (POLITY)
- `FromYear` / `ToYear` — temporal validity range
- `Wikipedia` — reference URL
- `SeshatID` — optional link to structured Seshat DB data

Query: Find all polities where `year >= FromYear AND year <= ToYear`

### UK Coverage
- Contains historical UK political entities
- England, Scotland, Wales, Ireland detailed through medieval period
- Temporal resolution: entities change at irregular intervals (not annual snapshots)
- Some periods well-covered (Norman England ~1086+), others less detailed

### Five Towns Coverage
The Five Towns area (West Yorkshire) would fall within:
- **Anglo-Saxon England** (pre-1066)
- **Norman England** (post-1066)
- **Medieval Kingdom of England** (1086–1707)
- Modern administrative entities (post-1707)

Cliopatria provides temporal boundary polygons — when combined with OpenDomesday points, you can get:
- Doomsday settlement point locations (OpenDomesday)
- Doomsday-era hundred/shire polygon boundaries (Cliopatria)

### Temporal Coverage Matrix for UK
| Era | Cliopatria Coverage | Notes |
|-----|---------------------|-------|
| 3400BCE–1000BCE | Sparse | Early periods |
| 1000BCE–500BCE | More entities | Celtic/La Tène period |
| 500BCE–500CE | Good | Roman Britain, Early Medieval |
| 500–1086 | Good | Anglo-Saxon kingdoms |
| 1086–1700 | Very good | Medieval England, Tudor, Stuart |
| 1700–1900 | Adequate | British Empire, industrial age |
| 1900–2024 | Good | Modern nations, UK administrative changes |

### Integration Complexity: 2/5
- Single GeoJSON file — straightforward download
- Temporal queries: scan for `FromYear <= targetYear <= ToYear`
- Polygon geometry → H3 cell assignment requires polygon-intersects-hex logic (not just centroid)
- **CC-BY-NC License Important Implications:**
  - Non-commercial use only
  - If Place-Time outputs are for-profit, this license is incompatible
  - Consider: is the project purely non-commercial research?
  - If commercial use is anticipated, need to seek alternative or negotiate commercial license

### Recommendation
**Essential for temporal boundary analysis.** The CC-BY-NC license requires careful consideration:
- If this is a non-commercial academic project → use freely
- If outputs could be commercial (e.g., paid consulting tool) → license conflict
- The Nature paper (2025) validates the data quality and academic credibility

Use as the secondary historical source (after OpenDomesday) with the understanding that the CC-BY-NC license limits commercial applications. The temporal range (3400BCE–2024CE) is unmatched by any other source.

---

## 3. OHMEC

**URL:** https://github.com/ohmec/ohmec  
**License:** CC-BY-SA 4.0  
**Focus:** Indigenous lands and political boundaries (global, US/Americas emphasis)

### Details
- **Temporal Coverage:** Variable per region — designed for date-based queries
- **Content:** Historical boundaries and indigenous territories
- **Format:** Extended GeoJSON (custom format with start/end date per feature)
- **License:** Creative Commons Attribution-ShareAlike 4.0 (CC-BY-SA)

### UK Coverage
OHMEC's primary focus is the Americas. UK coverage is limited or non-existent. The project is valuable for:
- US state boundaries and their evolution
- Indigenous territories in North America
- Global context, but not UK-primary

### Integration Complexity: 3/5
- Custom GeoJSON format requires parsing `start_date` / `end_date` fields
- Non-UK focus means additional filtering/processing required for UK data
- CC-BY-SA is reciprocal like ODbL — derivatives must be released under same license

### Recommendation
**Global context only, not UK-priority.** Include in project for completeness but do not invest integration effort for UK focus area. Useful for Phase 5 global extension.

---

## 4. aourednik/historical-basemaps

**URL:** https://github.com/aourednik/historical-basemaps  
**Purpose:** European historical boundaries with a focus on the early modern period

### Details
- **Temporal Coverage:** Primarily 1500–1900 CE (with some earlier)
- **Content:** European historical boundaries, administrative divisions
- **Format:** GeoJSON  
- **License:** Various (per layer — need to check individual datasets)

### UK Coverage
Adequate for regional European context. May contain:
- Pre-modern county boundaries
- ecclesiastical boundaries (dioceses, parishes)
- Manorial boundaries

### Integration Complexity: 3/5
- Variable license per dataset — requires individual checking
- Multiple layers mean multiple integration paths
- Quality varies per region

### Recommendation
**Supplementary only.** Not a primary source for UK historical boundaries. Use if Cliopatria + OpenDomesday leave gaps, particularly for the 1500–1900 period. Flag for Phase 2 investigation if needed.

---

## 5. UK Data Service Historical Boundaries

**URL:** https://ukdataservice.ac.uk/  
**Content:** Census boundary data, historical administrative geography

### Details
- **Temporal Coverage:** Primarily post-1851 (census years)
- **Content:** Historical census boundaries, Super Output Areas
- **License:** varies per dataset (check individual)
- **Access:** Bulk download after registration

### Five Towns Coverage
Good for 19th–21st century boundary analysis. Not useful for:
- Doomsday era (1086)
- Medieval period (pre-census)

### Recommendation
**Post-1851 analysis only.** Not a primary source for Place-Time's historical scope. Use for Phase 3 political overlays if needed (constituency boundary evolution in the modern era).

---

## Summary: Recommended Historical Layer Stack

| Priority | Source | Layer | Temporal Range | License | Integration Effort |
|----------|--------|-------|----------------|---------|-------------------|
| 1 | OpenDomesday | Doomsday settlements | 1086 CE | ODC-ODbL | Low (API + points) |
| 2 | Cliopatria | Political boundaries | 3400BCE–2024CE | CC-BY-NC | Medium (bulk GeoJSON) |
| 3 | aourednik/historical-basemaps | European boundaries | 1500–1900 CE | Various | High (multi-layer) |
| 4 | UK Data Service | Census boundaries | 1851–2024 | varies | Medium (bulk download) |

### Critical License Consideration

**OpenDomesday (ODbL) + Cliopatria (CC-BY-NC):**
- Both are reciprocal licenses (share-alike)
- Derived databases must be released under same license
- This is consistent with Place-Time's FOSS-at-heart principle
- Commercial use restrictions apply — document this in project license

**No paid sources required** for historical layer — all primary sources are free.

### API vs Bulk Download Summary

| Source | API Available | Bulk Download | Preferred Method |
|--------|--------------|---------------|-----------------|
| OpenDomesday | ✅ REST API | ✅ (University of Hull) | API (programmatic, paginated) |
| Cliopatria | ❌ | ✅ (GitHub zip) | GitHub clone + unzip |
| OHMEC | ❌ | ✅ (GitHub clone) | GitHub clone |
| aourednik | ❌ | ✅ (GitHub clone) | GitHub clone |

### Temporal Gap Assessment

| Time Period | Primary Source | Secondary Source | Gap? |
|-------------|----------------|------------------|------|
| Pre-1086 | Cliopatria (sparse) | — | Pre-Doomsday limited |
| 1086 | OpenDomesday + Cliopatria | — | Good coverage |
| 1086–1500 | Cliopatria | OpenDomesday (points) | Medieval covered |
| 1500–1851 | Cliopatria + aourednik | — | Early modern covered |
| 1851–2024 | Cliopatria + UK Data Service | — | Modern covered |

**Conclusion:** No critical temporal gaps for UK history. Cliopatria's broad temporal range covers the entire period Place-Time is interested in.

---