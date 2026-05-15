# Research 09 — Epistemological Framework: Space-Time as First-Class Citizens

**Focus:** The philosophical and architectural implications of building a linked knowledge graph where geological time, political time, and spatial position are all queryable dimensions — not afterthoughts
**Date:** 2026-05-15
**Status:** Philosophical extension — Phase 1 decision gate

---

## The Core Philosophical Commitment

Most knowledge graphs treat **space** and **time** as attributes of entities — a boundary has a geometry, a geological event has a date. The HexaLog framework inverts this: **space and time are the grid**, and entities are points or regions on that grid.

This is the epistemological difference between:

```
Conventional KG:  [Entity] → hasGeometry → "POLYGON(...)"
                   [Entity] → hasDate → "1086"
                   Query: "find entities within this polygon at this date"

HexaLog KG:       [timePos, spacePos] → resolves-to → H3Cell
                   [H3Cell] → contains → Entity
                   Query: "what entities exist at this time-space coordinate?"
```

The first asks "where and when was this thing?" The second asks "what was the state of this time-space region at this moment?" These sound similar but produce fundamentally different query behaviours — especially when you need to reason about overlapping boundaries, successive geological layers, and contested territories.

---

## The Five Towns as a Philosophical Test Case

The Five Towns (Pontefract, Castleford, Featherstone, Knottingley, Normanton) are not chosen arbitrarily. They constitute a **microcosm of every problem in historical geospatial reasoning**:

| Dimension | Problem | Example in Five Towns |
|---|---|---|
| **Geological** | Layers override each other vertically | Carboniferous coal beneath Permian limestone beneath Quaternary till |
| **Political** | Boundaries overlay horizontally and change over time | West Riding → West Riding CB → Metro Borough → civil parish |
| **Settlement** | Place locations shift across epochs | Medieval Pontefract ~1km from modern town centre |
| **Economic** | Resources create and destroy boundaries | Yorkshire Coalfield → NCB → British Coal → individual collieries |
| **Contested** | Same territory, different authority claims | Norman barony vs. monastic holdings vs. modern unitary |
| **Scale** | Same place, different resolutions relevant | Geological fault at res 4, street pattern at res 12, building at res 15 |

These are not edge cases — they are the *defining challenges* of any serious attempt to reason about geography across time. A framework that cannot handle the Five Towns correctly cannot handle anywhere else.

The Five Towns therefore serves as a **sufficiency test**: if the HexaLog + knowledge graph stack can correctly answer the hard questions about this small region, it can scale.

---

## The Linked Data Commitment

The BFO + Wikidata + Neo4j stack is not just about better queries. It represents a commitment to **linked data principles** — every entity has a stable URI, every relationship is typed, every claim is sourced.

This means:

**Traceability**
```
Pontefract Castle (Q42631)
  → claimed-by: Norman Baron (Q878106)
  → superseded-by: West Riding (Q623824)
  → authorised-by: Doomsday Book (Q45584)
  → located-in: West Yorkshire (Q189570)
  → adjacent-to: Knottingley (Q639749)
  → has-quality: limestone geology
  → time:valid 1086-01-01 to present
```

Every link in that chain should be citable. The user can click through to the source of each claim.

**Disambiguation**
```
Castleford (Q505395) vs Castleford (Q2860443)
  → Q505395 is the town (Pevsner, modern OSM)
  → Q2860443 is the community within Featherstone MBC
  → They overlap geographically but have different Q IDs
  → Neo4j resolves via separate H3Cell nodes with distinct OVERLAYS relationships
```

**Temporal Reasoning**
```
Coal Measures (geological layer)
  → PRECEEDS: Permian limestone
  → CONTAINS: fault lines (GeologicalEvent)
  → AFFECTS: H3Cell covering entire Yorkshire Coalfield
  → time:valid -358900000 to -298900000 (Carboniferous period)

Yorkshire Coalfield (admin boundary)
  → PRECEDES: National Coal Board
  → OVERLAYS: same H3Cell as Coal Measures
  → time:valid -1800 to -1985
```

Reasoning: "The National Coal Board superseded the Yorkshire Coalfield administrative boundary, but the geological layer it exploited persisted through both political regimes." This is the kind of inference a properly structured KG should support.

---

## From Spatial Database to Historical Epistemology

The framework as designed would answer:
- "What geological layer is beneath this point?"
- "What administrative boundary overlaid it in 1920?"
- "Who owned this land in 1086?"

But the deeper question is:
- **"What can we know, and with what confidence, about the state of a place at a given moment in time?"**

This is the epistemological question. Every data source has:
- **Coverage** — what it actually captures
- **Accuracy** — how well it represents reality
- **Resolution** — what scale it operates at
- **Provenance** — where it comes from
- **License** — what use is permitted

The HexaLog grid makes these explicit per-cell:
```
H3Cell 8a194212a767fff (Pontefract market square)
  Geological confidence: HIGH (BGS 50k map, direct observation)
  Historical confidence: MEDIUM (Doomsday point location, no polygon)
  Political confidence: HIGH (Electoral Commission official boundary)
  Economic confidence: LOW (no public mining subsidence register)
```

A query for "what was under the market square in 1850" could return:
- A high-confidence geological answer (Coal Measures at 300m depth)
- A medium-confidence economic answer (colliery within 500m, hand-drawn map)
- A low-confidence political answer (West Riding boundary, digitized from 1844 Act)

The user sees the confidence levels and can decide how to act. This is the epistemology made explicit.

---

## The BFO Layer as the Unifying Commitment

All of the above — spatial grid, temporal resolution, confidence scoring, linked entities — requires a **formal ontological commitment** to remain coherent as the system scales. BFO provides that.

The BFO distinction between **Continuants** (things that exist through time) and **Occurrents** (things that happen through time) maps directly onto Place-Time:

| BFO Class | Place-Time Example | Changes Over Time? |
|---|---|---|
| `bfo:Site` | H3Cell | No — it's a spatial region, not an entity that moves |
| `bfo:MaterialEntity` (Continuant) | GeologicalLayer, Boundary, Place | Yes — but persists as the same entity |
| `bfo:Process` (Occurrent) | Deposition, CharterGrant, PitClosure | No — happens and ends |
| `bfo:FiatObjectPart` | Constituency, County | Boundaries shift; entity persists |
| `bfo:Quality` | h3Resolution, cellArea | These are qualities of the site |

The key BFO relations become the Place-Time query vocabulary:

```cypher
// What geological processes occurred in this H3Cell?
MATCH (cell:H3Cell {id: '8a194212a767fff'})
MATCH (process:bfoProcess)-[:SITUATED_IN]->(cell)
WHERE process.year BETWEEN -400000000 AND -300000000
RETURN process

// What boundaries superseded this one?
MATCH (old:Boundary)-[:SUPERSEDES*1..3]->(new:Boundary)
WHERE old.name = 'West Riding County Council'
RETURN old, new

// What continuants are situated in this cell across all time?
MATCH (c:bfoContinuant)-[:SITUATED_IN]->(cell:H3Cell {id: '8a194212a767fff'})
RETURN c.type, collect(c.name) as entities
```

---

## Open Questions (Decision Gates)

1. **Is the BFO commitment necessary for Phase 1?** A simplified entity typing without full OWL might be faster to implement. But without it, as the graph scales, entity type confusion will accumulate. My recommendation: **adopt BFO from the start**, even in a simplified form (just `Continuant` vs `Occurrent` with the key relations).

2. **Should confidence be formalised as a BFO quality?** `bfo:hasQuality` could link each entity to a `ConfidenceLevel` object with dimensions (coverage, accuracy, resolution, provenance, license). This makes confidence scores queryable and auditable.

3. **Wikidata Q IDs as canonical URIs?** Every entity in the Place-Time KG should link to a Wikidata Q ID where one exists. This makes the KG part of the global linked data cloud. Non-Wikidata entities get `place-time:{entity-type}:{local-id}` URIs.

4. **Is the epistemological layer (confidence, provenance) in scope for Phase 1?** It probably should be, since it's what makes the system trustworthy. But it adds complexity. Decision: include confidence metadata in the data model from the start, even if the UI doesn't expose it fully until Phase 4.

---

## Relationship to the Existing Stack

This document does not replace `research/08-knowledge-graph-stack.md` — it extends the *philosophical justification* for the choices made there:

- **Neo4j** is chosen because graph traversal is the natural query model for a KG where relations are as important as entities
- **Infranodus** is chosen because text networks are the most tractable way to build contextual query expansion without expensive fine-tuned models
- **Wikidata** is chosen because it is the only free, large-scale, BFO-adjacent knowledge base with stable canonical URIs
- **BFO** is chosen because it provides the upper ontology that prevents the KG from collapsing into undifferentiated node soup

The Five Towns is the proof-of-concept. The framework, if it works, applies equally to any region — but you have to get it right in a small, well-documented place first.

---

## Next Step

If this philosophy is accepted, the immediate next concrete step before Phase 1 is:

**`research/10-five-towns-ontology-draft.md`** — a draft OWL/TURTLE ontology file defining the Five Towns entity types and their BFO classifications, aligned with the Wikidata Q IDs for the five towns and their key geological/political features.

This would be reviewed by Stuart (human decision gate) before any TypeScript types are written or data is ingested.

---

## Key Links

- **BFO 2.0 specification**: https://basic-formal-ontology.org/
- **Wikidata SPARQL**: https://query.wikidata.org/sparql
- **Five Towns Wikidata Q IDs**: Q42631 (Pontefract), Q505395 (Castleford), Q2860443 (Featherstone), Q639749 (Knottingley), Q2568552 (Normanton)
- **dbpedia Five Towns**: https://dbpedia.org/page/Five_Towns
- **ROBOT tool**: https://robot.obolibrary.org/ (ontology validation)
- **Wikidata:Relations**: https://www.wikidata.org/wiki/Wikidata:Relations