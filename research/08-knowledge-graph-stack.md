# Research 08 — Knowledge Graph Stack: Neo4j + Infranodus + Wikidata + BFO

**Focus:** Five Towns test case (Pontefract, Castleford, Featherstone, Knottingley, Normanton)
**Date:** 2026-05-15
**Status:** Decision gate — awaiting Stuart approval to proceed

---

## Executive Summary

Adding a knowledge graph layer beneath the HexaLog spatial index would give Place-Time:

1. **Neo4j** — graph database for all spatial-temporal entity relationships (geological layers, boundaries, epochs), with Cypher queries replacing hand-written search ranking
2. **Infranodus** — text-to-network enrichment layer over the research corpus, feeding context-aware terms into the embedding search pipeline
3. **Wikidata** — the free BFO-adjacent knowledge base providing authoritative Q IDs, class hierarchies, andSPARQL endpoint for entity resolution
4. **BFO** — the upper ontology structure for distinguishing continuants (persistent entities) from occurrents (events/processes), and the relation vocabulary to link them properly

The combined stack turns the HexaLog query from "what hex cell is this, what epoch is active" into "what geological continuant *process* deposited this material here, what boundary continuants *overlay* it now, and how do they relate in the ontology?"

---

## 1. Neo4j — Graph Database for Place-Time

### Why Neo4j

HexaLog produces *relationships* more than it produces *tables*. A geological layer doesn't just exist at a location — it *precedes* a younger layer, it *contains* specific formations, it *interfaces with* adjacent plates. A political boundary doesn't just sit on top of geology — it *supersedes* a previous boundary, it *aligns-with* a geological fault line in two places, it *excludes* an enclave.

SQL can express this, but Cypher expresses it naturally:

```cypher
// "What geological processes created the material under Featherstone in the Carboniferous,
// and what political boundaries overlay it today?"
MATCH (g:GeologicalLayer {name: 'Coal Measures'})-[:PRECEEDS*1..3]->(younger:GeologicalLayer)
MATCH (g)-[:LOCATED_AT]->(hex:H3Cell {id: '8a194212a767fff'})
MATCH (b:Boundary)-[:OVERLAYS]->(hex)
WHERE b.validFrom <= 1850 AND (b.validTo IS NULL OR b.validTo >= 1850)
RETURN g, younger, b, hex
```

This replaces the `EmbeddingSearchPipeline` ranking with graph traversal — which is more explainable, more auditable, and more compatible with ontological reasoning.

### Five Towns Application

**Nodes:**

| Node Type | Example (Five Towns) | Properties |
|-----------|---------------------|------------|
| `H3Cell` | `8a194212a767fff` | lat, lng, h3Resolution, centroid |
| `GeologicalLayer` | "Coal Measures (Pennine Coalfield Group)" | epoch, lithology, thickness_m, formation |
| `TectonicPlate` | "Eurasian Plate" | plateCode, movementRate_mm_yr |
| `Boundary` | "West Riding County Council (1889-1974)" | validFrom, validTo, authority, legislation |
| `Constituency` | "Pontefract and Castleford (1997-present)" | onCode, electorate, boundarySet |
| `Place` | "Pontefract" | doomsdayName, modernName, centroid, settlementType |
| `GeologicalEvent` | "Permian desert deposition (Zechstein Sea)" | year, process, duration_yr |
| `PoliticalEvent` | "Pontefract Castle charter granted (1190)" | year, act, agent |

**Key Relationships:**

```
(geological:GeologicalLayer)-[:PRECEEDS]->(younger:GeologicalLayer)
(geological:GeologicalLayer)-[:LOCATED_AT]->(cell:H3Cell)
(geological:GeologicalLayer)-[:PART_OF]->(plate:TectonicPlate)
(boundary:Boundary)-[:OVERLAYS]->(cell:H3Cell)
(boundary:Boundary)-[:SUPERSEDES]->(older:Boundary)
(boundary:Boundary)-[:AUTHORIZED_BY]->(act:PoliticalEvent)
(constituency:Constituency)-[:DERIVES_FROM]->(boundary:Boundary)
(place:Place)-[:LOCATED_IN]->(boundary:Boundary)
(event:GeologicalEvent)-[:AFFECTS]->(cell:H3Cell)
(event:PoliticalEvent)-[:ESTABLISHES]->(boundary:Boundary)
```

### Neo4j Deployment in Homelab

- **Memory requirement**: Neo4j Desktop ~2GB heap for 100k nodes, 500k relationships (Five Towns dataset)
- **Interface**: Neo4j Browser (localhost:7474) + Cypher query editor
- **Backup**: Single `neo4j dump` file to `H:\place-time\data\neo4j\`
- **License**: Community Edition (free) for homelab — no licensing cost
- **Alternative**: Memgraph (also Apache 2.0, better performance on small hardware)

### Phase Integration

- **Phase 1** (geological base): Load tectonic plates and BGS geology as `GeologicalLayer` nodes + `PRECEEDS` relationships
- **Phase 2** (historical boundaries): Load Cliopatria as `Boundary` nodes with `SUPERSEDES` chains
- **Phase 3** (modern boundaries): Load Geofabrik/OSM + Electoral Commission as `Boundary` + `Constituency` nodes
- **Phase 4** (integration): Full graph with all relationship types traversable

---

## 2. Infranodus — Research Corpus as Contextual Network

### Why Infranodus

The HexaLog `EmbeddingSearchPipeline` does semantic search via Ollama embeddings — but embeddings alone miss *structural relationships* between entities. If you've ingested 7 research documents about the Five Towns geology, a user querying "coal measures" should also get context from documents that mention "Pennine Coalfield", "Yorkshire Coalfield", "Coal Mining Act", etc. — not just documents that literally contain "coal measures."

Infranodus builds a **word co-occurrence network** from a text corpus. Every document you ingest becomes part of a graph where:
- **Nodes** = key terms/concepts (extracted via NLP)
- **Edges** = co-occurrence in the same document or paragraph
- **Edge weight** = frequency of co-occurrence

The resulting network has clear communities (topics), bridges (cross-domain terms), and outliers. It gives the embedding search a **topical context layer** — when you query "coal measures in the Carboniferous," Infranodus returns related terms from the corpus network that expand the query beyond exact string matches.

### Five Towns Application

**Input corpus** (initial):
```
research/01-geological-sources.md
research/02-historical-sources.md
research/03-political-sources.md
research/05-tools-and-human-actions.md
research/06-data-scale-estimate.md
src/core/timescale.ts (as documentation)
src/ingest/geology.ts (as documentation)
```

**Example network output:**

```
[Coal Measures] ←strong→ [Pennine Coalfield]
[Coal Measures] ←strong→ [Carboniferous]
[Coal Measures] ←weak→ [Zechstein]
[Coalfield] ←bridge→ [Victorian mining]
[Victorian] ←bridge→ [Miners' Strike 1984]
[Geology] ←strong→ [Tectonic plates]
[Pontefract] ←strong→ [Norman conquest]
[Pontefract] ←moderate→ [Doomsday Book]
```

When a user queries "Coal Measures at Featherstone," the Infranodus layer would return additional context terms ("Pennine Coalfield", "Victorian mining", "Miners' Strike") that expand the Ollama query embedding — making the search more contextually aware of the Five Towns-specific narrative rather than just generic geological terms.

### Infranodus Deployment

- **Install**: Docker (`docker run -p 3000:3000 nicolafal/infra`) or Node app
- **API**: REST/JSON — POST corpus text, GET network graph (GraphML or JSON)
- **License**: AGPL (requires source disclosure if hosted — relevant for FOSS constraint)
- **Alternative**: Linkurious (community edition) or Obsidian + Dataview plugin for local-only
- **Cost**: Free for non-commercial use

### Phase Integration

- **Phase 0** (already done): Research corpus exists — Infranodus can be run against it immediately as a proof-of-concept
- **Phase 1**: Network expands as geological data is ingested and documented
- **Phase 4**: Full network with all corpus docs + ingested data descriptions

---

## 3. Wikidata — BFO-Adjacent Knowledge Graph

### Why Wikidata

Wikidata is the closest thing to a free, open, BFO-aligned knowledge base. It has:

- **92M+ entities** with unique Q IDs (stable, citable URIs)
- **Formal class hierarchy** via `wdt:P279` (subclass of) and `wdt:P31` (instance of)
- **Time validity** via `pqn:P582` / `pqn:P585` (end time / point in time)
- **Geographic coordinates** via `pq:P625` (coordinate location)
- **Rich relationships** between entities — not just labels

Wikidata's ontology is not strict BFO but it maps closely enough:
- `wd:Q#` entities can be classified as BFO **Continuants** (geological formations, boundaries, places)
- `wd:Q#` events/processes map to BFO **Occurrents** (formation events, boundary changes, mining events)
- The `wdt:P` (truth-qualified) and `pqn:P` (qualifier) relations handle the time dimension

The Five Towns entities already have Wikidata entries:
- `Q42631` — Pontefract (place)
- `Q505395` — Castleford
- `Q2860443` — Featherstone
- `Q639749` — Knottingley
- `Q2568552` — Normanton

Geological and historical entities too:
- `Q828584` — Carboniferous (geological period)
- `Q45584` — Doomsday Book
- `Q878106` — West Riding of Yorkshire (historic county)
- `Q623824` — Normans

### Wikidata SPARQL Integration

The `EmbeddingSearchPipeline` can query Wikidata via SPARQL to enrich results:

```sparql
PREFIX wdt: <https://www.wikidata.org/wiki/Special:EntityData/Q878106.ttl>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wd: <http://www.wikidata.org/entity/>

SELECT ?boundary ?label ?startDate ?endDate ?geom
WHERE {
  ?boundary wdt:P31 wd:Q202388 .   # instance of administrative territorial entity
  ?boundary wdt:P131 wd:Q878106 .  # located in West Riding of Yorkshire
  ?boundary wdt:P571 ?startDate .  # inception date
  OPTIONAL { ?boundary wdt:P576 ?endDate }  # dissolution date
  OPTIONAL { ?boundary wdt:P625 ?geom }      # coordinate location
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
}
```

This is exactly the kind of query that would replace hardcoded boundary definitions — Wikidata *is* the boundary knowledge base, linked to authoritative sources.

### Wikidata Deployment

- **Endpoint**: `https://query.wikidata.org/sparql` (public, no key required)
- **Rate limit**: 1 request/second for non-commercial use
- **Mirror**: Can run a local Wikibase instance for offline Five Towns work
- **License**: CC0 (public domain) for all Wikidata data
- **Cost**: £0 — entirely free

### Phase Integration

- **Phase 2** (historical): Wikidata SPARQL to fetch boundary Q IDs, link to Cliopatria
- **Phase 3** (political): Wikidata for modern admin boundaries (OSM/Geofabrik already linked to Wikidata Q IDs)
- **Phase 4**: Full entity resolution against Wikidata for all Place-Time entities

---

## 4. BFO — Upper Ontology for Place-Time

### Why BFO Matters Here

Without an upper ontology, the HexaLog graph has nodes and relationships but no *semantic grounding*. The BFO (Basic Formal Ontology) provides that:

**BFO 2.0 Core Distinctions:**

```
bfo:Entity
├── bfo:Continuant       # entities that persist through time
│   ├── bfo:SpatialRegion   # regions of space (includes H3Cell as bfo:Site)
│   └── bfo:MaterialEntity # actual things (geological layers, boundaries)
│       └── bfo:IndependentContinuant
│           ├── bfo:Object
│           └── bfo:FiatObject
└── bfo:Occurrent        # entities that happen/foccur through time
    ├── bfo:Process
    └── bfo:History  # a temporal region (epoch, era)
```

**Key BFO relations relevant to Place-Time:**

| BFO Relation | Place-Time Use |
|---|---|
| `bfo:situated-in` | Geological layer is situated in a spatial region (H3Cell) |
| `bfo:participates-in` | A boundary participates in a political event |
| `bfo:has-quality` | H3Cell has quality (h3Resolution, cellArea) |
| `bfo:derives-from` | A constituency boundary derives from a prior boundary |
| `bfo:precedes` | One geological layer precedes another |
| `bfo:realizes` | A boundary realizes a political function (administrative authority) |
| `bfo:site-of` | A spatial region is the site of an occurrent |

### Five Towns BFO Model

```turtle
# Geological continuants (they persist through time)
:CoalMeasuresPennine a bfo:MaterialEntity ;
    bfo:continuant-part-of :EurasianPlate ;
    bfo:situated-in :H3Cell_8a194212a767fff ;
    bfo:has-quality [ a bfo:Quality ; rdf:value "shale" ] ;
    rdfs:label "Pennine Coal Measures" .

# Political continuant (boundary persists through time)
:WestRiding1889 a bfo:MaterialEntity ;
    bfo:precedes :WestRiding1974 ;
    bfo:situated-in :H3Cell_8a194212a767fff ;
    rdfs:label "West Riding County Council (1889-1974)" .

# Geological occurrent (the deposition event happened)
:CarboniferousDeposition a bfo:Process ;
    bfo:occurs-in :H3Cell_8a194212a767fff ;
    bfo:precedes :PermianDeposition ;
    rdfs:label "Carboniferous coal deposition" ;
    time:hasTime [ a time:Instant ; time:inXSDDate "358900000 BCE"^^xsd:date ] .

# Political occurrent (boundary change event)
:PontefractCharter1190 a bfo:Process ;
    bfo:occurs-in :H3Cell_8a194212a767fff ;
    bfo:results-in :PontefractMunicipalBoundary ;
    rdfs:label "Pontefract charter granted" ;
    time:hasTime [ a time:Instant ; time:inXSDDate "1190"^^xsd:year ] .
```

### BFO Tools

- **ROBOT**: OWL reasoner for validating BFO-aligned ontology files
- **Protégé**: Ontology editor for browsing/editing BFO structure
- **Ontobee**: BFO reference browser (http://www.ontobee.org/ontology/BOFO)
- **dbpedia**: Links BFO terms to DBpedia resources for Five Towns entities

### Phase Integration

- **Phase 1**: Define BFO ontology for geological domain (layers as continuants, deposition events as occurrents)
- **Phase 2**: Extend to political domain (boundaries as continuants, charter/grants as occurrents)
- **Phase 4**: Full BFO alignment validation using ROBOT

---

## 5. Five Towns Test Case: Integrated Query Flow

With all four systems in place, a user query for "coal measures under Featherstone in 1850" resolves as:

```
1. INFRANODUS
   Query "coal measures under Featherstone 1850"
   → Returns: ["Pennine Coalfield", "Victorian mining", "Featherstone colliery"]
   (expands Ollama query embedding)

2. EMBEDDING SEARCH (embeddings.ts)
   Expanded query → Ollama nomic-embed-text
   → Candidate entities from Cliopatria + local Neo4j index

3. WIKIDATA
   For each candidate boundary:
   → SPARQL lookup Q ID, class, coordinates, time validity
   → Map to BFO entity type (Continuant / Occurrent)
   → Fetch authoritative label and description

4. NEO4J
   Cypher traversal from H3Cell (Featherstone ~8a194212a767fff):
   → Find GeologicalLayer nodes situated-in that cell
   → Find Boundary nodes that overlay that cell
   → Follow PRECEEDS chain to Carboniferous
   → Follow OVERLAYS chain to Victorian administrative boundary
   → Return full graph path with provenance

5. OUTPUT
   HexaLog response:
   - H3Cell: 8a194212a767fff
   - GeologicalContinuant: Pennine Coal Measures (Q:Q... from Wikidata)
   - GeologicalEvent: Carboniferous deposition (Q:Q... from Wikidata)
   - PoliticalContinuant: West Riding County Council 1889-1974
   - PoliticalOccurrent: Featherstone Colliery established 1840
   - Confidence: 0.94 (based on graph distance + embedding similarity)
```

---

## 6. Budget Assessment

| Component | License | Cost | Notes |
|-----------|---------|------|-------|
| Neo4j Community | CC BY-SA 4.0 | £0 | Homelab use permitted |
| Infranodus | AGPL 3.0 | £0 | Source must be disclosed if hosted |
| Wikidata | CC0 | £0 | All data public domain |
| BFO | CC-BY 4.0 | £0 | Formal ontology, freely available |
| Wikibase (local mirror) | GPL 2.0 | £0 | Optional offline copy |

**Total cost for Five Towns test case: £0**

---

## 7. Decision Gate Criteria

Before Phase 1 build starts, Stuart needs to approve:

1. **Neo4j adoption** — confirm homelab can host it (memory, port 7474), or prefer Memgraph as lighter alternative?
2. **Infranodus inclusion** — AGPL constraint acceptable? Or prefer local-only text network approach with Obsidian/Dataview?
3. **BFO rigor** — full OWL/BFO alignment, or a simplified "Continuant vs Occurrent" naming convention without full ontology?
4. **Wikidata depth** — SPARQL endpoint only, or local Wikibase mirror for offline Five Towns work?

---

## Next Steps

1. If approved: `npm run research:sparql` — test Wikidata SPARQL queries for Five Towns entities
2. If approved: Install Neo4j locally, load Five Towns geological data as initial graph
3. If approved: Run Infranodus against existing `research/` corpus, examine network structure
4. Decision gate: Stuart confirms Phase 1 stack before build begins

---

## Key Links

- **Neo4j**: https://neo4j.com/product/ (Community Edition free)
- **Memgraph**: https://memgraph.com (lighter alternative, Apache 2.0)
- **Infranodus**: https://infranodus.com (AGPL, Docker available)
- **Wikidata SPARQL**: https://query.wikidata.org
- **Wikidata entities**: https://www.wikidata.org/wiki/Q42631 (Pontefract example)
- **BFO 2.0**: https://basic-formal-ontology.org/ (CC-BY 4.0)
- **ROBOT tool**: https://robot.obolibrary.org/ (OWL validation)
- **dbpedia**: https://dbpedia.org (links Wikidata to BFO terms)
- **Ontobee**: http://www.ontobee.org/ontology/BOFO (BFO browser)