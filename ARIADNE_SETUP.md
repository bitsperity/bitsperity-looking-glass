# ARIADNE Setup Guide

## Subsystem 3: Knowledge Graph for Trading Intelligence

Ariadne is a temporal knowledge graph that connects market data, news, and relationships to enable intelligent trading decisions.

---

## Architecture

- **Graph Database**: Neo4j 5.15 Community Edition
- **Backend**: FastAPI (Python 3.10+)
- **NER/NLP**: spaCy for entity extraction
- **Signals**: Technical indicators (SciPy, NumPy)
- **Integration**: Satbase (news/prices), Tesseract (semantic search)

---

## Quick Start

### 1. Install Dependencies

```bash
# Python dependencies
pip install -r requirements.txt

# Download spaCy model
python -m spacy download en_core_web_sm
```

### 2. Start Services

```bash
# Start all services (Neo4j, Satbase, Tesseract, Ariadne)
docker compose up -d

# Check service health
curl http://localhost:8082/health
```

### 3. Access Neo4j Browser

Navigate to `http://localhost:7474` in your browser.

- **Username**: `neo4j`
- **Password**: `ariadne2025`
- **URI**: `bolt://localhost:7687`

### 4. Ingest Data

```bash
# Ingest news from last 7 days
curl -X POST "http://localhost:8082/v1/kg/ingest/news?from_date=2025-10-14&to_date=2025-10-21&limit=100"

# Ingest price data and detect events
curl -X POST "http://localhost:8082/v1/kg/ingest/prices?from_date=2025-09-01&to_date=2025-10-21" \
  -H "Content-Type: application/json" \
  -d '{"symbols": ["NVDA", "AMD", "TSM", "ASML"]}'

# Compute correlations
curl -X POST "http://localhost:8082/v1/kg/learn/correlation" \
  -H "Content-Type: application/json" \
  -d '{
    "symbols": ["NVDA", "AMD", "TSM"],
    "window": 30,
    "method": "spearman"
  }'
```

### 5. Query the Graph

```bash
# Get context for a topic
curl "http://localhost:8082/v1/kg/context?topic=semiconductor&limit=50"

# Get context for specific tickers
curl "http://localhost:8082/v1/kg/context?tickers=NVDA&tickers=AMD&depth=2"

# Find similar companies
curl "http://localhost:8082/v1/kg/similar-entities?ticker=NVDA&limit=10"

# Get timeline for a company
curl "http://localhost:8082/v1/kg/timeline?ticker=NVDA&from_date=2025-10-01&to_date=2025-10-21"

# Get database stats
curl "http://localhost:8082/v1/kg/stats"
```

### 6. Run Smoke Tests

```bash
./scripts/ariadne_smoke_test.sh
```

---

## API Reference

### Read Endpoints

#### `GET /v1/kg/context`
Get a curated subgraph for a topic or tickers.

**Parameters:**
- `topic` (optional): Search term
- `tickers` (optional): List of ticker symbols
- `as_of` (optional): Temporal query timestamp
- `depth` (default: 2): Graph traversal depth
- `limit` (default: 200): Max nodes to return

**Response:**
```json
{
  "query": "semiconductor",
  "subgraph": {
    "nodes": [...],
    "edges": [...],
    "summary": "Found 42 nodes and 87 edges"
  },
  "as_of": null
}
```

#### `GET /v1/kg/impact`
Rank entities impacted by an event.

**Parameters:**
- `event_id` or `event_query`: Event identifier or search term
- `k` (default: 10): Number of entities to return
- `as_of` (optional): Temporal query timestamp

#### `GET /v1/kg/timeline`
Get timeline of events for an entity.

**Parameters:**
- `ticker` or `entity_id`: Entity identifier
- `from_date`, `to_date`: Date range

#### `GET /v1/kg/similar-entities`
Find similar entities using graph algorithms.

**Parameters:**
- `ticker`: Source ticker
- `method` (default: "node_similarity"): Similarity method
- `limit` (default: 10): Number of results

---

### Write Endpoints

#### `POST /v1/kg/fact`
Add or update a fact (edge) with provenance.

**Request Body:**
```json
{
  "source_id": "123",
  "source_label": "Company",
  "target_id": "456",
  "target_label": "Company",
  "rel_type": "SUPPLIES_TO",
  "properties": {"capacity": "5nm"},
  "source": "news:abc123",
  "confidence": 0.85,
  "method": "rule",
  "valid_from": "2025-01-01T00:00:00Z",
  "valid_to": null
}
```

#### `POST /v1/kg/observation`
Record an agent observation/journal entry.

**Request Body:**
```json
{
  "date": "2025-10-21T12:00:00Z",
  "content": "NVDA showing strong momentum...",
  "tags": ["momentum", "ai"],
  "related_tickers": ["NVDA"],
  "related_events": [],
  "confidence": 0.9
}
```

#### `POST /v1/kg/hypothesis`
Record a hypothesis edge.

**Request Body:**
```json
{
  "source_id": "123",
  "source_label": "Company",
  "target_id": "456",
  "target_label": "Instrument",
  "hypothesis": "Supply constraint will drive price up 15%",
  "confidence": 0.7,
  "expires_at": "2025-12-31T00:00:00Z"
}
```

---

### Learn Endpoints (Background Tasks)

#### `POST /v1/kg/learn/correlation`
Compute price correlations and store in graph.

**Request Body:**
```json
{
  "symbols": ["NVDA", "AMD", "TSM"],
  "window": 30,
  "from_date": "2025-09-01",
  "to_date": "2025-10-21",
  "method": "spearman"
}
```

#### `POST /v1/kg/learn/community`
Run Louvain community detection on company graph.

---

### Ingest Endpoints (Background Tasks)

#### `POST /v1/kg/ingest/news`
Ingest news from Satbase, extract entities and relations.

**Parameters:**
- `from_date`, `to_date`: Date range
- `limit` (default: 100): Max articles
- `use_tesseract` (default: false): Pre-filter with semantic search

#### `POST /v1/kg/ingest/prices`
Ingest price data from Satbase, detect technical events.

**Parameters:**
- `symbols[]`: List of tickers
- `from_date`, `to_date`: Date range

---

## Data Model

### Node Labels

- **Company**: `{ticker, name, sector, industry, community_id}`
- **Instrument**: `{symbol, exchange, asset_type}`
- **Event**: `{id, type, title, occurred_at, description, source, confidence}`
- **Concept**: `{name, category}`
- **Location**: `{country, region, city}`
- **Observation**: `{id, date, content, tags, confidence}`
- **PriceEvent**: `{id, symbol, event_type, occurred_at, properties, confidence}`
- **News**: `{news_id, title, published_at, source, url, event_type}`

### Relationship Types

- **SUPPLIES_TO**: Company → Company (supply chain)
- **AFFECTS**: Event → Company/Sector/Concept (impact)
- **MENTIONS**: News → Company/Event/Concept
- **PRICE_EVENT_OF**: PriceEvent → Instrument
- **CORRELATED_WITH**: Instrument ↔ Instrument (undirected)
- **COMPETES_WITH**: Company ↔ Company
- **ACQUIRES**: Company → Company
- **OBSERVES**: Observation → Company
- **RELATES_TO**: Observation → Event
- **HYPOTHESIS**: Any → Any (with expiry)

---

## Cypher Examples

### Find supply chain for NVDA
```cypher
MATCH path = (nvda:Company {ticker: 'NVDA'})<-[:SUPPLIES_TO*1..2]-(supplier)
RETURN path
LIMIT 50;
```

### Find recent high-impact events
```cypher
MATCH (e:Event)-[r:AFFECTS]->(c:Company)
WHERE e.occurred_at > datetime() - duration({days: 30})
  AND abs(r.impact) > 0.7
RETURN e, r, c
ORDER BY e.occurred_at DESC;
```

### Find companies in same community as NVDA
```cypher
MATCH (nvda:Company {ticker: 'NVDA'})
MATCH (similar:Company)
WHERE similar.community_id = nvda.community_id
  AND similar <> nvda
RETURN similar.ticker, similar.name, similar.sector
LIMIT 10;
```

### Get agent observations about AI trends
```cypher
MATCH (o:Observation)
WHERE 'ai' IN o.tags
  AND o.date > datetime() - duration({days: 7})
RETURN o.date, o.content
ORDER BY o.date DESC;
```

---

## Troubleshooting

### Neo4j connection failed
```bash
# Check if Neo4j is running
docker compose ps neo4j

# Check logs
docker compose logs neo4j

# Restart Neo4j
docker compose restart neo4j
```

### spaCy model not found
```bash
# Download the model
python -m spacy download en_core_web_sm

# Or use a larger model for better accuracy
python -m spacy download en_core_web_trf
```

### No data in graph
```bash
# Check if Satbase has data
curl http://localhost:8080/v1/news?limit=5

# Run ingestion manually
curl -X POST "http://localhost:8082/v1/kg/ingest/news?from_date=2025-10-14&to_date=2025-10-21&limit=50"

# Check logs
docker compose logs ariadne-api
```

---

## Performance Tuning

### Neo4j Memory Settings

Edit `docker-compose.yml` to adjust Neo4j memory:

```yaml
neo4j:
  environment:
    - NEO4J_dbms_memory_heap_initial__size=1G
    - NEO4J_dbms_memory_heap_max__size=4G
    - NEO4J_dbms_memory_pagecache_size=2G
```

### Batch Size Tuning

For large ingestion jobs, adjust batch processing in `ingest.py`:
- Reduce `limit` parameter for news ingestion
- Process in smaller batches to avoid memory issues

---

## Next Steps

1. **Frontend Integration**: Add Ariadne visualizations to LookingGlass
2. **LLM Enrichment**: Implement optional LLM-based relation extraction
3. **Advanced Algorithms**: Integrate Neo4j GDS for PageRank, betweenness centrality
4. **Real-time Updates**: Add webhook support for live news ingestion
5. **Query Optimization**: Add more indexes for common query patterns

---

## License

Part of the Alpaca Bot project.

