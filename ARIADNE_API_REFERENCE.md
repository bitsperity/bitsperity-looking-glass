# ARIADNE API Reference

**Version:** 0.1.0  
**Base URL:** `http://localhost:8082`

Ariadne ist das Knowledge Graph System für strukturiertes Wissen über Märkte, Wirtschaft und Politik. Es bietet Endpoints für Lesen, Schreiben, Lernen, Validierung und Ingestion.

---

## 📋 Inhaltsverzeichnis

1. [Health & Status](#health--status)
2. [Read Endpoints (KG Query)](#read-endpoints-kg-query)
3. [Write Endpoints (KG Mutation)](#write-endpoints-kg-mutation)
4. [Learn Endpoints (Graph Analytics)](#learn-endpoints-graph-analytics)
5. [Validate Endpoints (Hypothesis Workflow)](#validate-endpoints-hypothesis-workflow)
6. [Ingest Endpoints (ETL)](#ingest-endpoints-etl)
7. [Models & Schemas](#models--schemas)

---

## Health & Status

### `GET /health`

**Beschreibung:** Prüft Systemstatus und Neo4j-Verbindung.

**Response:**
```json
{
  "status": "ok",
  "service": "ariadne",
  "neo4j_connected": true,
  "node_count": 1234,
  "edge_count": 5678
}
```

**Use Case:** Monitoring, Load Balancer Health Checks.

---

## Read Endpoints (KG Query)

Diese Endpoints sind **read-only** und dienen dem Agent zum Abrufen von Kontext, Impact-Analysen, Timelines und Ähnlichkeiten.

---

### `GET /v1/kg/context`

**Beschreibung:** Liefert einen kontextuellen Subgraph für ein Thema oder Ticker-Symbol.

**Parameter:**
| Name | Type | Required | Default | Beschreibung |
|------|------|----------|---------|--------------|
| `topic` | `string` | ❌ | `null` | Suchbegriff für Konzepte/Events (z.B. "AI", "inflation") |
| `tickers` | `list[string]` | ❌ | `[]` | Ticker-Symbole (z.B. `["NVDA", "AMD"]`) |
| `as_of` | `datetime` | ❌ | `null` | Point-in-Time Query (nur Fakten gültig zu diesem Zeitpunkt) |
| `depth` | `int` | ❌ | `2` | Graph-Traversierungs-Tiefe (1-3) |
| `limit` | `int` | ❌ | `200` | Max. Anzahl Nodes |

**Response:**
```json
{
  "nodes": [
    {
      "id": "123",
      "labels": ["Company"],
      "properties": {
        "ticker": "NVDA",
        "name": "NVIDIA Corporation",
        "sector": "Technology"
      }
    },
    {
      "id": "456",
      "labels": ["Concept"],
      "properties": {
        "name": "AI Semiconductors",
        "category": "Technology"
      }
    }
  ],
  "edges": [
    {
      "source_id": "123",
      "target_id": "456",
      "rel_type": "PRODUCES",
      "properties": {
        "confidence": 0.95,
        "valid_from": "2024-01-01T00:00:00",
        "valid_to": null
      }
    }
  ]
}
```

**Use Cases:**
- Agent fragt: "Was wissen wir über NVDA und seine Supply Chain?"
- Vor Trading-Entscheidung: Kontext über makroökonomische Verbindungen abrufen
- Point-in-Time Query: "Welche Beziehungen hatte NVDA im September 2024?"

**Temporal Logic:**
- Ohne `as_of`: Alle aktuell gültigen Fakten (`valid_to IS NULL OR valid_to >= now()`)
- Mit `as_of`: Nur Fakten mit `valid_from <= as_of <= valid_to` (oder `valid_to IS NULL`)

---

### `GET /v1/kg/impact`

**Beschreibung:** Analysiert den Impact eines Events auf Unternehmen/Instrumente.

**Parameter:**
| Name | Type | Required | Default | Beschreibung |
|------|------|----------|---------|--------------|
| `event_id` | `string` | ❌* | `null` | Neo4j Element-ID eines Events |
| `event_query` | `string` | ❌* | `null` | Suchbegriff (z.B. "Fed rate hike") |
| `k` | `int` | ❌ | `10` | Top-K betroffene Entities |
| `as_of` | `datetime` | ❌ | `null` | Point-in-Time Query |

*Entweder `event_id` **oder** `event_query` muss angegeben werden.

**Response:**
```json
{
  "event": {
    "id": "789",
    "labels": ["Event"],
    "properties": {
      "name": "Fed Rate Hike +25bps",
      "category": "Monetary Policy",
      "occurred_at": "2025-09-18T00:00:00"
    }
  },
  "impacted_entities": [
    {
      "entity": {
        "id": "123",
        "labels": ["Company"],
        "properties": {
          "ticker": "NVDA",
          "name": "NVIDIA"
        }
      },
      "impact_score": 2.3,
      "direct_edges": 2,
      "indirect_count": 3,
      "path_sample": ["Event:Fed Rate Hike", "AFFECTS", "Concept:Tech Stocks", "INCLUDES", "Company:NVDA"]
    }
  ]
}
```

**Impact Score Berechnung:**
```
impact_score = direct_edges + (0.1 * indirect_count)
```

**Use Cases:**
- "OPEC kündigt Produktionskürzung an – welche Unternehmen sind betroffen?"
- "Fed erhöht Zinsen – welche Sektoren leiden?"
- Automatische Alert-Generierung bei großen Events

**Temporal Logic:**
- Berücksichtigt nur Edges mit `valid_from <= as_of <= valid_to` (falls `as_of` gegeben)

---

### `GET /v1/kg/timeline`

**Beschreibung:** Chronologische Timeline aller Events und PriceEvents für eine Entity.

**Parameter:**
| Name | Type | Required | Default | Beschreibung |
|------|------|----------|---------|--------------|
| `entity_id` | `string` | ❌* | `null` | Neo4j Element-ID |
| `ticker` | `string` | ❌* | `null` | Ticker-Symbol (z.B. "NVDA") |
| `from_date` | `datetime` | ❌ | `-30d` | Start-Datum |
| `to_date` | `datetime` | ❌ | `now` | End-Datum |

*Entweder `entity_id` **oder** `ticker` muss angegeben werden.

**Response:**
```json
{
  "entity": {
    "id": "123",
    "labels": ["Company"],
    "properties": {
      "ticker": "NVDA",
      "name": "NVIDIA"
    }
  },
  "events": [
    {
      "id": "456",
      "name": "US Export Controls on AI Chips",
      "category": "Regulation",
      "occurred_at": "2025-09-15T00:00:00",
      "source": "manual"
    }
  ],
  "price_events": [
    {
      "id": "789",
      "event_type": "ma_crossover",
      "occurred_at": "2025-09-20T00:00:00",
      "price": 125.50,
      "volume": 45000000,
      "metadata": {
        "ma_short": 50,
        "ma_long": 200,
        "direction": "bullish"
      }
    }
  ],
  "edges": [
    {
      "source_id": "123",
      "target_id": "456",
      "rel_type": "AFFECTS",
      "properties": {
        "confidence": 0.85,
        "valid_from": "2025-09-15T00:00:00"
      }
    }
  ]
}
```

**Use Cases:**
- "Was ist bei NVDA im September passiert?"
- Vor Earnings: Historische Events reviewen
- Pattern Recognition: "Korreliert MA-Crossover mit bestimmten Events?"

**Temporal Logic:**
- Events: `occurred_at BETWEEN from_date AND to_date`
- Edges: `valid_from BETWEEN from_date AND to_date`
- PriceEvents: `occurred_at BETWEEN from_date AND to_date`

---

### `GET /v1/kg/similar-entities`

**Beschreibung:** Findet ähnliche Unternehmen/Instrumente basierend auf Graph-Struktur.

**Parameter:**
| Name | Type | Required | Default | Beschreibung |
|------|------|----------|---------|--------------|
| `ticker` | `string` | ✅ | - | Referenz-Ticker (z.B. "NVDA") |
| `method` | `string` | ❌ | `"weighted_jaccard"` | `"weighted_jaccard"` oder `"gds"` |
| `limit` | `int` | ❌ | `10` | Top-K ähnliche Entities |

**Response:**
```json
{
  "reference": {
    "id": "123",
    "labels": ["Company"],
    "properties": {
      "ticker": "NVDA",
      "name": "NVIDIA",
      "sector": "Technology"
    }
  },
  "similar_entities": [
    {
      "entity": {
        "id": "456",
        "labels": ["Company"],
        "properties": {
          "ticker": "AMD",
          "name": "Advanced Micro Devices",
          "sector": "Technology"
        }
      },
      "similarity_score": 0.78,
      "shared_neighbors": 12,
      "common_relations": ["COMPETES_WITH", "SUPPLIES_TO", "AFFECTED_BY"]
    }
  ]
}
```

**Similarity-Methoden:**

1. **Weighted Jaccard (Default):**
   ```
   similarity = |neighbors_A ∩ neighbors_B| / |neighbors_A ∪ neighbors_B|
   ```
   Gewichte pro Relation-Typ:
   - `COMPETES_WITH`: 3.0
   - `SUPPLIES_TO`: 2.0
   - `AFFECTED_BY`: 2.0
   - `CORRELATES_WITH`: 1.5
   - Default: 1.0
   
   Bonus: +0.1 für gleichen Sektor

2. **GDS (Graph Data Science):**
   - Nutzt Neo4j GDS `nodeSimilarity.stream`
   - Fortgeschrittene Algorithmen (auch für große Graphen)

**Use Cases:**
- "Welche Unternehmen sind NVDA ähnlich?" (für Peer-Vergleich, Diversifikation)
- Automatische Watchlist-Erweiterung
- "Wenn Event X NVDA betrifft, wer könnte noch betroffen sein?"

---

### `GET /v1/kg/patterns`

**Beschreibung:** Sucht validierte Patterns (wiederkehrende Muster).

**Parameter:**
| Name | Type | Required | Default | Beschreibung |
|------|------|----------|---------|--------------|
| `category` | `string` | ❌ | `null` | Filter: `"technical"`, `"fundamental"`, `"macro"`, `"behavioral"` |
| `min_confidence` | `float` | ❌ | `0.7` | Minimum Confidence (0.0-1.0) |
| `min_occurrences` | `int` | ❌ | `1` | Mindestens N-mal beobachtet |

**Response:**
```json
{
  "status": "success",
  "count": 2,
  "patterns": [
    {
      "id": "pat-001",
      "name": "Fed Rate Hike → Tech Selloff",
      "description": "Zinserhöhungen korrelieren mit Tech-Underperformance",
      "category": "macro",
      "confidence": 0.85,
      "validated_at": "2025-10-01T12:00:00",
      "validated_by": "agent-1",
      "manifold_source_id": "thought-123",
      "occurrences": 7,
      "success_rate": 0.71
    }
  ]
}
```

**Use Cases:**
- Agent lernt aus Vergangenheit: "Welche Muster haben wir validiert?"
- Vor Trading: "Gibt es ein bekanntes Pattern für diese Situation?"
- Research: "Wie oft trat dieses Pattern auf?"

---

### `GET /v1/kg/patterns/{pattern_id}/occurrences`

**Beschreibung:** Zeigt historische Instanzen eines Patterns.

**Parameter:**
| Name | Type | Required | Default | Beschreibung |
|------|------|----------|---------|--------------|
| `pattern_id` | `string` | ✅ | - | Pattern-ID (z.B. "pat-001") |
| `from_date` | `datetime` | ❌ | `null` | Start-Datum |
| `to_date` | `datetime` | ❌ | `null` | End-Datum |

**Response:**
```json
{
  "status": "success",
  "pattern_id": "pat-001",
  "count": 3,
  "occurrences": [
    {
      "event_id": "789",
      "event_name": "Fed Rate Hike +25bps",
      "occurred_at": "2025-09-18T00:00:00",
      "evidence_type": "VALIDATES",
      "confidence": 0.90
    }
  ]
}
```

**Use Cases:**
- "Wann trat dieses Pattern zuletzt auf?"
- Backtesting: "Pattern-Performance über Zeit"

---

### `GET /v1/kg/regimes/current`

**Beschreibung:** Aktuelles Markt-Regime.

**Response:**
```json
{
  "status": "success",
  "count": 1,
  "regimes": [
    {
      "id": "regime-001",
      "name": "Bull Market Q4 2025",
      "type": "bull",
      "characteristics": ["low_vol", "tech_outperformance", "strong_earnings"],
      "start_date": "2025-10-01T00:00:00",
      "end_date": null,
      "confidence": 0.88
    }
  ]
}
```

**Use Cases:**
- Kontext für Trading-Entscheidungen: "In welchem Regime sind wir?"
- Regime-basierte Strategien aktivieren

---

### `GET /v1/kg/regimes/similar`

**Beschreibung:** Findet historische Regimes mit ähnlichen Charakteristiken.

**Parameter:**
| Name | Type | Required | Default | Beschreibung |
|------|------|----------|---------|--------------|
| `characteristics` | `list[string]` | ✅ | - | Liste von Merkmalen (z.B. `["high_vol", "bear"]`) |
| `limit` | `int` | ❌ | `5` | Top-K ähnliche Regimes |

**Response:**
```json
{
  "status": "success",
  "count": 2,
  "regimes": [
    {
      "id": "regime-002",
      "name": "Bear Market Q1 2024",
      "type": "bear",
      "characteristics": ["high_vol", "rate_uncertainty"],
      "start_date": "2024-01-15T00:00:00",
      "end_date": "2024-04-30T00:00:00",
      "confidence": 0.82,
      "similarity_score": 0.75
    }
  ]
}
```

**Similarity:** Anzahl übereinstimmender Charakteristiken / Anzahl Gesamtcharakteristiken.

**Use Cases:**
- "Wie verhielt sich der Markt zuletzt in ähnlichen Regimes?"
- Pattern-Matching für Regime-Übergänge

---

## Write Endpoints (KG Mutation)

Diese Endpoints erlauben dem Agent, **strukturiertes Wissen** in den KG zu schreiben.

---

### `POST /v1/kg/fact`

**Beschreibung:** Fügt einen **validierten Fakt** als temporale Edge hinzu.

**Request Body:**
```json
{
  "source_label": "Company",
  "source_id": "123",
  "target_label": "Concept",
  "target_id": "456",
  "rel_type": "PRODUCES",
  "properties": {
    "market_share": 0.35
  },
  "valid_from": "2025-01-01T00:00:00",
  "valid_to": null,
  "source": "manual",
  "confidence": 0.95,
  "method": "human_verified"
}
```

**Response:**
```json
{
  "status": "created",
  "edge": {
    "source_id": "123",
    "target_id": "456",
    "rel_type": "PRODUCES",
    "properties": {
      "market_share": 0.35,
      "valid_from": "2025-01-01T00:00:00",
      "valid_to": null,
      "version": 1,
      "ingested_at": "2025-10-22T14:30:00"
    }
  }
}
```

**Temporale Logik:**
- `valid_from`: Pflichtfeld (wann gilt der Fakt?)
- `valid_to`: Optional (`null` = aktuell gültig)
- `version`: Automatisch inkrementiert bei Updates

**Idempotenz:**
- Mehrfaches Schreiben mit gleichen Parametern erhöht Version
- Alte Versions bleiben erhalten (Audit-Trail)

**Use Cases:**
- Agent verifiziert eine Hypothese → wird zu Fakt
- Manuelle Wissenseingabe: "NVDA hat 35% Marktanteil in AI-Chips"
- Temporal Update: "Produktionskapazität von TSMC erhöht sich ab Q4"

---

### `POST /v1/kg/observation`

**Beschreibung:** Speichert eine Agent-Beobachtung als Node.

**Request Body:**
```json
{
  "observation": "NVDA Aktie zeigt bullisches Momentum trotz Makro-Headwinds",
  "entity_id": "123",
  "entity_label": "Company",
  "confidence": 0.75,
  "tags": ["technical", "momentum"],
  "properties": {
    "rsi": 68.5,
    "ma_50_200_spread": 12.3
  }
}
```

**Response:**
```json
{
  "status": "created",
  "observation_id": "obs-001",
  "linked_to_entity": "123"
}
```

**Use Cases:**
- Agent-Daily-Routine: "Was habe ich heute beobachtet?"
- Quantitative Beobachtungen mit Metriken
- Vorstufe zu Hypothesen

---

### `POST /v1/kg/hypothesis`

**Beschreibung:** Erstellt eine **Hypothese**, die validiert werden muss.

**Request Body:**
```json
{
  "hypothesis": "NVDA profitiert von Hyperscaler-CapEx-Anstieg",
  "source_label": "Company",
  "source_id": "123",
  "target_label": "Concept",
  "target_id": "789",
  "rel_type": "BENEFITS_FROM",
  "confidence": 0.65,
  "manifold_thought_id": "thought-456",
  "properties": {
    "expected_impact": "revenue_growth"
  }
}
```

**Response:**
```json
{
  "status": "created",
  "hypothesis_id": "hyp-001",
  "manifold_thought_id": "thought-456",
  "evidence_count": 0,
  "contradiction_count": 0,
  "validation_pending": false
}
```

**Workflow:**
1. Agent erstellt Hypothese (dieser Endpoint)
2. Agent sammelt Evidence (`POST /v1/kg/validate/hypothesis/{id}/evidence`)
3. Wenn `evidence_count + contradiction_count >= threshold` → Validation triggern
4. Agent validiert (`POST /v1/kg/validate/hypothesis/{id}/validate`)
5. Wenn `validated` → optional zu Pattern promoten

**Ariadne ↔ Manifold Sync:**
- `manifold_thought_id`: Pflichtfeld (Link zu Agent-Thought)
- Bei Validation wird Manifold-Status via `ValidationResponse` zurückgegeben
- Agent aktualisiert Manifold separat

**Use Cases:**
- Agent hat eine Vermutung → als Hypothese formulieren
- Systematisches Testen von Investment-Thesen
- Unterscheidung zwischen "vermutetes Wissen" und "validiertem Fakt"

---

## Learn Endpoints (Graph Analytics)

Diese Endpoints führen **Background-Analysen** aus (Long-Running Tasks).

---

### `POST /v1/kg/learn/correlation`

**Beschreibung:** Berechnet Korrelationen zwischen Instrumenten (basierend auf Preis-Daten).

**Request Body:**
```json
{
  "symbols": ["NVDA", "AMD", "INTC"],
  "window": 90,
  "from_date": "2025-01-01T00:00:00",
  "to_date": "2025-10-22T00:00:00",
  "method": "spearman"
}
```

**Parameter:**
- `symbols`: Liste von Ticker-Symbolen
- `window`: Zeitfenster in Tagen
- `method`: `"spearman"` (robust) oder `"pearson"` (linear)

**Response:**
```json
{
  "status": "started",
  "message": "Correlation analysis running in background",
  "symbols": ["NVDA", "AMD", "INTC"],
  "window": 90,
  "method": "spearman"
}
```

**Output:**
- Erstellt `CORRELATES_WITH` Edges zwischen Company-Nodes
- Properties: `correlation`, `window_days`, `method`, `calculated_at`
- Nur signifikante Korrelationen (|r| > 0.5) werden gespeichert

**Use Cases:**
- Portfolio-Optimierung: "Welche Stocks korrelieren stark?"
- Diversifikation: "Finde niedrig korrelierte Assets"
- Automatische Erkennung von Sektor-Zusammenhängen

**Datenquelle:** Satbase BTC Oracle (Preis-History)

---

### `POST /v1/kg/learn/community`

**Beschreibung:** Führt Community Detection aus (findet Cluster im Graph).

**Response:**
```json
{
  "status": "started",
  "message": "Community detection running in background"
}
```

**Output:**
- Erstellt `SAME_COMMUNITY` Edges zwischen Nodes im gleichen Cluster
- Property: `community_id` (z.B. "comm-001")
- Nutzt **Louvain-Algorithmus** (falls GDS verfügbar) oder fallback zu einfachem Clustering

**Use Cases:**
- Sektor-Erkennung: "Welche Unternehmen bilden ein Cluster?"
- Thematische Groupierung: "AI-Ecosystem", "Energy Transition"
- Visualisierung: Communities farblich markieren

---

## Validate Endpoints (Hypothesis Workflow)

Diese Endpoints ermöglichen den **systematischen Validierungsprozess** von Hypothesen.

---

### `POST /v1/kg/validate/hypothesis/{hypothesis_id}/evidence`

**Beschreibung:** Fügt **Supporting Evidence** oder **Contradicting Evidence** zu einer Hypothese hinzu.

**Request Body:**
```json
{
  "hypothesis_id": "hyp-001",
  "evidence_type": "supporting",
  "evidence_source_id": "789",
  "evidence_source_type": "Event",
  "confidence": 0.85,
  "notes": "NVDA Earnings Beat: Datacenter Revenue +94% YoY",
  "annotated_by": "agent-1"
}
```

**Parameter:**
- `evidence_type`: `"supporting"` oder `"contradicting"`
- `evidence_source_id`: Neo4j Element-ID des Evidence-Nodes (Event, PriceEvent, News)
- `confidence`: Wie stark unterstützt/widerspricht das Evidence? (0.0-1.0)

**Response:**
```json
{
  "status": "evidence_added",
  "hypothesis_id": "hyp-001",
  "evidence_count": 2,
  "contradiction_count": 0,
  "validation_pending": false
}
```

**Validation Pending Logic:**
- `validation_pending = true` wenn `evidence_count + contradiction_count >= validation_threshold`
- Default Threshold: **3 Annotationen**

**Graph Structure:**
```
(Evidence:Event)-[EVIDENCE_FOR {confidence: 0.85}]->(Hypothesis)
(Evidence:Event)-[CONTRADICTS {confidence: 0.75}]->(Hypothesis)
```

**Use Cases:**
- Agent findet News/Event, das Hypothese unterstützt → Evidence hinzufügen
- Systematische Sammlung von Pro/Contra-Argumenten
- Automatisches Triggern von Validation bei Threshold

---

### `POST /v1/kg/validate/hypothesis/{hypothesis_id}/validate`

**Beschreibung:** Führt **finale Validierung** aus (validate/invalidate/defer).

**Request Body:**
```json
{
  "hypothesis_id": "hyp-001",
  "decision": "validate",
  "reasoning": "3 supporting events + consistent price action",
  "validated_by": "agent-1",
  "create_pattern": true
}
```

**Parameter:**
- `decision`: `"validate"`, `"invalidate"`, `"defer"`
- `create_pattern`: Falls `true` und `decision = "validate"` → Pattern extrahieren

**Response (validate + create_pattern=true):**
```json
{
  "status": "validation_complete",
  "hypothesis_id": "hyp-001",
  "manifold_thought_id": "thought-456",
  "decision": "validate",
  "pattern_created": true,
  "pattern_id": "pat-002"
}
```

**Workflow:**
1. Hypothese-Status → `"validated"` / `"invalidated"`
2. Wenn `validate` + `create_pattern=true`:
   - Pattern-Node erstellen
   - `(Pattern)-[EXTRACTED_FROM]->(Hypothesis)`
   - `(Pattern)-[VALIDATES]->(Evidence:Event)` (alle Supporting Evidence)
3. Return `manifold_thought_id` → Agent aktualisiert Manifold

**Use Cases:**
- Agent hat genug Evidence gesammelt → Entscheidung treffen
- Validierte Hypothese → als Pattern speichern für Wiederverwendung
- Invalidierte Hypothese → aus Fehlern lernen

---

### `GET /v1/kg/validate/hypotheses/pending-validation`

**Beschreibung:** Listet alle Hypothesen, die bereit für Validation sind.

**Parameter:**
| Name | Type | Required | Default | Beschreibung |
|------|------|----------|---------|--------------|
| `min_annotations` | `int` | ❌ | `3` | Mindest-Anzahl Annotationen |

**Response:**
```json
{
  "status": "success",
  "count": 2,
  "hypotheses": [
    {
      "id": "hyp-001",
      "statement": "NVDA profitiert von Hyperscaler-CapEx",
      "confidence": 0.65,
      "evidence_count": 3,
      "contradiction_count": 0,
      "created_at": "2025-10-15T10:00:00",
      "created_by": "agent-1",
      "manifold_thought_id": "thought-456"
    }
  ]
}
```

**Use Cases:**
- Agent-Daily-Routine: "Welche Hypothesen muss ich heute validieren?"
- Dashboard: Zeige offene Validations an

---

### `GET /v1/kg/validate/hypotheses/{hypothesis_id}`

**Beschreibung:** Detaillierte Ansicht einer Hypothese mit allen Evidence/Contradictions.

**Response:**
```json
{
  "status": "success",
  "hypothesis": {
    "id": "hyp-001",
    "statement": "NVDA profitiert von Hyperscaler-CapEx",
    "source_entity_id": "123",
    "target_entity_id": "789",
    "relation_type": "BENEFITS_FROM",
    "confidence": 0.65,
    "status": "active",
    "evidence_count": 3,
    "contradiction_count": 0,
    "manifold_thought_id": "thought-456"
  },
  "evidence": [
    {
      "id": "ev-001",
      "source_id": "789",
      "source_type": "Event",
      "source_name": "NVDA Earnings Beat Q3",
      "evidence_type": "supporting",
      "confidence": 0.90,
      "notes": "Datacenter Revenue +94% YoY"
    }
  ],
  "contradictions": []
}
```

**Use Cases:**
- Vor Validation: Alle Evidence reviewen
- Research: "Warum wurde diese Hypothese validiert/invalidiert?"

---

## Ingest Endpoints (ETL)

**⚠️ Philosophy:** Manuelle Graph-Pflege wird bevorzugt. Automatische News-Ingestion ist **deaktiviert**, da NER/Relation Extraction zu unzuverlässig ist. Nutze stattdessen **Write Endpoints** (`/v1/kg/fact`, `/v1/kg/observation`, `/v1/kg/hypothesis`) für strukturiertes, LLM-gesteuertes Knowledge Management.

**Price Ingestion** ist weiterhin verfügbar, da technische Analyse **deterministisch und zuverlässig** ist.

---

### `POST /v1/kg/ingest/prices`

**Beschreibung:** Ingestiert Preis-Daten von Satbase → erstellt PriceEvent-Nodes (MA-Crossover, Breakouts, etc.).

**Parameter:**
| Name | Type | Required | Default | Beschreibung |
|------|------|----------|---------|--------------|
| `symbols` | `list[string]` | ✅ | - | Ticker-Symbole (z.B. `["NVDA", "AMD"]`) |
| `from_date` | `date` | ✅ | - | Start-Datum |
| `to_date` | `date` | ✅ | - | End-Datum |

**Response:**
```json
{
  "status": "started",
  "message": "Ingesting price data for 2 symbols",
  "symbols": ["NVDA", "AMD"],
  "from": "2025-09-01",
  "to": "2025-09-30"
}
```

**ETL-Pipeline:**
1. Fetch Price History von Satbase BTC Oracle
2. Technical Signal Detection:
   - MA Crossover (50/200)
   - Breakouts (52-week high/low)
   - Volatility Regime Changes (ATR)
3. Graph Write:
   - `(PriceEvent:Node)` erstellen
   - `(Company)-[HAS_PRICE_EVENT]->(PriceEvent)`

**PriceEvent Types:**
- `ma_crossover`: Golden/Death Cross
- `breakout_high` / `breakout_low`: 52-week extremes
- `volatility_spike`: ATR > 2σ

**Use Cases:**
- Technische Analyse in KG integrieren
- "Welche PriceEvents passierten nahe an Events?"
- Pattern: "MA-Crossover + Fed-Event = Signal?"

---

## Models & Schemas

### Node Types

| Label | Properties | Beschreibung |
|-------|-----------|--------------|
| `Company` | `ticker`, `name`, `sector` | Börsennotiertes Unternehmen |
| `Instrument` | `symbol`, `asset_class` | Allgemeines Finanzinstrument |
| `Event` | `name`, `category`, `occurred_at`, `source` | Weltgeschehnisse (Politik, Wirtschaft) |
| `Concept` | `name`, `category` | Abstrakte Konzepte (AI, Inflation) |
| `Location` | `name`, `country` | Geographische Orte |
| `Observation` | `text`, `confidence`, `tags`, `observed_at` | Agent-Beobachtungen |
| `PriceEvent` | `event_type`, `occurred_at`, `price`, `volume`, `metadata` | Technische Events |
| `Pattern` | `name`, `description`, `category`, `confidence`, `success_rate` | Validierte Muster |
| `Hypothesis` | `statement`, `confidence`, `status`, `evidence_count` | Zu validierende Hypothesen |
| `Regime` | `name`, `type`, `characteristics`, `start_date`, `end_date` | Markt-Regimes |
| `News` | `title`, `url`, `published_at`, `source` | News-Artikel |

### Edge Types

| Relation | Source → Target | Properties | Beschreibung |
|----------|-----------------|------------|--------------|
| `SUPPLIES_TO` | Company → Company | `valid_from`, `valid_to`, `confidence` | Supply Chain |
| `COMPETES_WITH` | Company → Company | `valid_from`, `valid_to` | Wettbewerb |
| `AFFECTS` | Event/Concept → Company | `valid_from`, `valid_to`, `confidence` | Impact-Relation |
| `CORRELATES_WITH` | Company → Company | `correlation`, `window_days`, `method` | Statistische Korrelation |
| `MENTIONS` | News → Company/Concept | `valid_from`, `confidence` | News erwähnt Entity |
| `EVIDENCE_FOR` | Event/PriceEvent → Hypothesis | `confidence`, `annotated_by`, `notes` | Supporting Evidence |
| `CONTRADICTS` | Event/PriceEvent → Hypothesis | `confidence`, `annotated_by` | Widerspruch |
| `VALIDATES` | Pattern → Event | `created_at` | Pattern validiert Event |
| `EXTRACTED_FROM` | Pattern → Hypothesis | `created_at` | Pattern aus Hypothese extrahiert |
| `HAS_PRICE_EVENT` | Company → PriceEvent | `occurred_at` | Link zu techn. Event |
| `SAME_COMMUNITY` | Node → Node | `community_id` | Graph-Cluster |

### Temporal Properties

**Alle Fakten-Edges haben:**
- `valid_from` (datetime, required): Ab wann gilt der Fakt?
- `valid_to` (datetime, optional): Bis wann gilt der Fakt? (`null` = aktuell)
- `version` (int): Auto-Inkrement bei Updates
- `ingested_at` (datetime): Wann wurde die Edge erstellt?

**Point-in-Time Queries:**
```cypher
WHERE edge.valid_from <= $as_of 
  AND (edge.valid_to IS NULL OR edge.valid_to >= $as_of)
```

---

## Error Handling

**Standard Error Response:**
```json
{
  "detail": "Human-readable error message"
}
```

**HTTP Status Codes:**
- `200`: Success
- `404`: Entity/Hypothesis not found
- `422`: Validation Error (ungültige Parameter)
- `500`: Internal Server Error (Check Logs)

**Beispiel:**
```bash
curl -X POST http://localhost:8082/v1/kg/fact \
  -H "Content-Type: application/json" \
  -d '{"source_id": "999"}' # source_id existiert nicht

# Response: 404
{
  "detail": "Source node 999 not found"
}
```

---

## Best Practices

### Agent Workflow

1. **Context abrufen** (`GET /context`) → "Was wissen wir über X?"
2. **Beobachtungen speichern** (`POST /observation`) → "Was sehe ich?"
3. **Hypothese formulieren** (`POST /hypothesis`) → "Ich vermute Y"
4. **Evidence sammeln** (`POST /validate/.../evidence`) → "Das unterstützt meine These"
5. **Validieren** (`POST /validate/.../validate`) → "These ist bestätigt"
6. **Pattern nutzen** (`GET /patterns`) → "Dieses Muster kenne ich"

### Temporal Facts

- **Immer** `valid_from` setzen (auch bei aktuellen Fakten)
- Bei Updates: Alte Edge mit `valid_to` schließen, neue Edge mit neuem `valid_from` anlegen
- Point-in-Time Queries nutzen für historische Analysen

### Hypothesis Workflow

- **Manifold-Integration:** Jede Hypothese hat `manifold_thought_id` (Pflicht)
- **Threshold:** Default 3 Annotationen → anpassen für kritische Entscheidungen
- **Pattern-Extraction:** Nur bei hoher Confidence und >2 Supporting Evidence

### Performance

- `depth` bei `/context` nicht > 3 (exponentielles Wachstum)
- `limit` sinnvoll setzen (Default 200 meist ausreichend)
- GDS-Algorithmen für große Graphen (>10k Nodes) nutzen

---

## Testing

**Smoke Test Script:**
```bash
# Health Check
curl http://localhost:8082/health

# Context Query
curl "http://localhost:8082/v1/kg/context?tickers=NVDA&depth=2"

# Timeline
curl "http://localhost:8082/v1/kg/timeline?ticker=NVDA&from_date=2025-09-01&to_date=2025-09-30"

# Similar Entities
curl "http://localhost:8082/v1/kg/similar-entities?ticker=NVDA&limit=5"
```

**Hypothesis E2E Test:**
```bash
# 1. Create Hypothesis
hyp_id=$(curl -X POST http://localhost:8082/v1/kg/hypothesis \
  -H "Content-Type: application/json" \
  -d '{
    "hypothesis": "Test Hypothesis",
    "source_label": "Company",
    "source_id": "123",
    "target_label": "Concept",
    "target_id": "456",
    "rel_type": "BENEFITS_FROM",
    "confidence": 0.7,
    "manifold_thought_id": "test-001",
    "properties": {}
  }' | jq -r '.hypothesis_id')

# 2. Add Evidence
curl -X POST "http://localhost:8082/v1/kg/validate/hypothesis/$hyp_id/evidence" \
  -H "Content-Type: application/json" \
  -d '{
    "hypothesis_id": "'$hyp_id'",
    "evidence_type": "supporting",
    "evidence_source_id": "789",
    "evidence_source_type": "Event",
    "confidence": 0.85,
    "notes": "Test Evidence",
    "annotated_by": "test-agent"
  }'

# 3. Validate
curl -X POST "http://localhost:8082/v1/kg/validate/hypothesis/$hyp_id/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "hypothesis_id": "'$hyp_id'",
    "decision": "validate",
    "reasoning": "Test Validation",
    "validated_by": "test-agent",
    "create_pattern": true
  }'
```

---

## Changelog

- **0.1.0** (2025-10-22): Initial Release
  - Read Endpoints (Context, Impact, Timeline, Similar-Entities, Patterns, Regimes)
  - Write Endpoints (Fact, Observation, Hypothesis)
  - Learn Endpoints (Correlation, Community)
  - Validate Endpoints (Evidence, Validation, Pending)
  - Ingest Endpoints (News, Prices)
  - Temporal Graph Support
  - Manifold Integration

---

**Für weitere Fragen: Siehe `/home/sascha-laptop/alpaca-bot/kg_and_memory.md` (Architektur) und `/home/sascha-laptop/alpaca-bot/plan.md` (Implementation Roadmap).**

