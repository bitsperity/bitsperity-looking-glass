Ich recherchiere kurz Inspiration und Best Practices (Qdrant Payload/Filter, MemGPT, GraphRAG, KG+Embedding). Danach liefere ich eine präzise Spezifikation für Manifold: Dokumenttypen, Standard-Envelope, Indizes, Scoring und alle Endpoints mit Requests/Responses.

[1 tool called]

Super – wir planen Manifold jetzt strukturiert und vollständig. Unten bekommst du: ein klares Dokumentmodell (ein Standard-Envelope plus Typ-spezifische Felder), ein performantes Qdrant-Schema (Payload/Indizes/Scoring), eine präzise Query-DSL, und eine vollständige API-Spezifikation mit allen Endpoints inkl. Requests/Responses und Beispielen.

### Ziele
- Einheitliches Speicherformat für alle Agent-Gedanken (robust, erweiterbar, versioniert).
- Sehr gute Retrieval-Qualität für die wichtigsten Fragen: “Was denke ich zu TICKER X?”, “Wie hat sich meine Meinung geändert?”, “Was waren meine Top-Überzeugungen in Zeitraum Y?”, “Welche Hypothesen sind reif zur Validierung?”.
- Klare Brücke zu Ariadne (KG): Validierte Hypothesen werden promotet, Status fließt synchron zurück.

### Dokumenttypen
- Observation: knappe Beobachtung aus Daten/News.
- Hypothesis: prüfbare Aussage mit Annahmen/Evidenzpfaden.
- Analysis: längere Begründung/Modellierung.
- Decision: Aktion/Trade-Entscheidung mit Kontext.
- Reflection: Rückblick, Korrekturen, Learnings.
- Question: offene Forschungsfrage.

### Standard-Envelope (Manifold Envelope v1)
Dieser “Header” ist identisch für alle Typen; Typspezifika liegen unter `type_payload`.

```json
{
  "id": "uuid",
  "type": "observation|hypothesis|analysis|decision|reflection|question",
  "version": 1,
  "agent_id": "alpaca-v1",
  "created_at": "2025-10-23T10:00:00Z",
  "updated_at": "2025-10-23T10:05:00Z",
  "status": "active|validated|invalidated|archived",
  "confidence_level": "speculation|low|medium|high|certain",
  "confidence_score": 0.65,
  "title": "Kurz-Titel",
  "content": "Markdown-Text",
  "summary": "Ein-Satz-TL;DR",
  "tags": ["nvda", "macro", "earnings"],
  "tickers": ["NVDA", "AMD"],
  "sectors": ["Technology"],
  "timeframe": "1W|1M|...",

  "links": {
    "ariadne_entities": ["NVDA", "TSM"],           // semantische IDs (Ticker/Name) oder Ariadne elementId
    "ariadne_facts": ["rel/...", "event/..."],     // optionale Referenzen
    "news_ids": ["news:xyz123"],
    "price_event_ids": ["pe:NVDA:2025-10-21"],
    "related_thoughts": ["uuid-A", "uuid-B"]
  },

  "epistemology": {
    "reasoning": "Warum glaube ich das?",
    "assumptions": ["Fed bleibt dovish"],
    "evidence": ["news:xyz123", "pe:NVDA:..."]
  },

  "retrieval": {
    "embedding_model": "e5-large",
    "vector_hint": "text|title",        // welcher Text wurde vektorisiert
    "keywords": ["capex", "hyperscaler"]
  },

  "flags": {
    "promoted_to_kg": false,
    "pinned": false
  },

  "type_payload": { }
}
```

Typ-spezifische `type_payload` Beispiele:
- Hypothesis:
  - decision_deadline, validation_criteria, risk_to_invalid, expected_outcome
- Decision:
  - action: buy|sell|hold, instrument, size, price, rationale, risk
- Reflection:
  - target_thought_id, failure_reason, lessons

### Qdrant-Schema
- Collection: `manifold_thoughts`
- Vektoren: Cosine, size=1024 (z. B. e5)
- Named vectors:
  - text: Volltext-Embedding (`content`)
  - title: Kurz-Embedding (`title`)
- Payload (Indexfelder):
  - Strings/Keywords: `type`, `status`, `agent_id`, `tags[]`, `tickers[]`, `sectors[]`, `timeframe`
  - Datetime: `created_at`, `updated_at`
  - Floats: `confidence_score`
- Indizes:
  - payload index: `type`, `status`, `tags`, `tickers`, `sectors`, `created_at`
- HNSW (Richtwerte):
  - m=16, ef_construction=128, ef_search=64 (konfigurierbar)
- Relevanz-Scoring (Server-seitig im Search-Endpoint):
  - base = max(sim_text, sim_title)
  - score = 0.6*base + 0.2*recency_boost + 0.1*type_boost + 0.1*ticker_boost
  - MMR Diversität optional

### Query-DSL (Filter/Ranking)
- Filter
  - match: equals/in auf Keywords
  - range: gte/lte für Zeit/Score
  - any/all für Arrays (tags/tickers)
- Ranking
  - vector: text|title
  - boosts: { recency: 0..1, type: {"hypothesis":+0.1}, tickers: {"NVDA":+0.1} }
  - diversity: mmr_lambda (0..1)
- Facets
  - counts nach `type`, `status`, `tickers`, `tags`

Beispiel Query-Body:
```json
{
  "query": "NVDA resilience despite hawkish Fed",
  "vector": "text",
  "filters": {
    "must": [
      {"key": "tickers", "match": {"any": ["NVDA"]}},
      {"key": "status", "match": {"any": ["active", "validated"]}},
      {"key": "created_at", "range": {"gte": "2025-09-01T00:00:00Z"}}
    ],
    "must_not": [
      {"key": "type", "match": {"any": ["decision"]}}
    ]
  },
  "boosts": {
    "recency": 0.2,
    "type": {"hypothesis": 0.05, "analysis": 0.05},
    "tickers": {"NVDA": 0.05}
  },
  "facets": ["type", "status", "tickers"],
  "limit": 20,
  "offset": 0,
  "diversity": {"mmr_lambda": 0.3}
}
```

### API-Spezifikation (alle Endpoints)

- Basis: `/v1/memory`

Dokumente
- POST `/thought`
  - Zweck: Neues Thought speichern (Server generiert `id`, Embedding)
  - Body: Manifold Envelope v1 (ohne `id`)
  - Response:
    ```json
    {"status":"created","thought_id":"uuid"}
    ```
- GET `/thought/{id}`
  - Response: vollständiges Thought-Dokument
- PATCH `/thought/{id}`
  - Zweck: Teil-Update (z. B. `status`, `confidence_score`, `links.related_thoughts`)
  - Body:
    ```json
    {"status":"validated","reason":"Strong confirmation","confidence_score":0.8}
    ```
  - Response: `{"status":"updated"}`
- DELETE `/thought/{id}`
  - Response: `{"status":"deleted"}`

Suche und Analytics
- POST `/search`
  - Zweck: Semantic + Filter + Facets + Diversität
  - Body: Query-DSL (s. o.)
  - Response:
    ```json
    {
      "status":"ok",
      "count": 20,
      "facets": {
        "type": [{"value":"hypothesis","count":7}],
        "tickers": [{"value":"NVDA","count":12}]
      },
      "results": [
        {"id":"uuid","score":0.83,"highlight": "...", "thought":{...}}
      ]
    }
    ```
- GET `/timeline?from=...&to=...&type=...&tickers=...`
  - Zweck: Chronologischer Verlauf
  - Response:
    ```json
    {"status":"ok","thoughts":[{...}],"bucketed":[{"date":"2025-10-20","count":12}]}
    ```
- GET `/stats`
  - Zweck: Überblick
  - Response:
    ```json
    {
      "total_thoughts": 1234,
      "by_type": {"hypothesis": 321, "analysis": 200, ...},
      "by_status": {"active": 800, "validated": 100, "invalidated": 50, "archived": 284},
      "avg_confidence": 0.62,
      "validation_rate": 0.11
    }
    ```

Relationen/Links
- POST `/thought/{id}/related`
  - Body:
    ```json
    {"related_id":"uuid2","relation_type":"supports|contradicts|followup|duplicate","weight":0.7}
    ```
  - Response: `{"status":"linked"}`
- GET `/thought/{id}/related?depth=2`
  - Response:
    ```json
    {"status":"ok","thoughts":[...],"relationships":[{"source":"uuid","target":"uuid2","type":"supports"}]}
    ```

Promotion / Ariadne-Sync
- POST `/thought/{id}/promote`
  - Zweck: Validierten Hypothesis/Pattern-Kandidat für Ariadne aufbereiten
  - Response (Payload analog Ariadne’s `ManifoldSync`):
    ```json
    {
      "status": "prepared",
      "kg_payload": {
        "relation_type": "AFFECTS",
        "source_entity_id": "NVDA",
        "target_entity_id": "AMD",
        "confidence": 0.75,
        "evidence_ids": ["news:xyz","pe:..."]
      }
    }
    ```
- POST `/sync/ariadne`
  - Zweck: Ariadne schickt Ergebnis zurück (validate/ invalidate)
  - Body:
    ```json
    {"thought_id":"uuid","status":"validated|invalidated","ariadne_fact_id":"h:..."}
    ```
  - Response: `{"status":"updated"}`

Bulk/Import/Export
- POST `/bulk`
  - Zweck: Bulk Upsert
  - Body: `{"items":[<envelopes>]}` → Response: `{"status":"ok","inserted":N,"updated":M}`
- GET `/export?format=jsonl&from=...&to=...`
  - Zweck: Backup/Analyse
  - Response: stream mit JSONL
- POST `/import?mode=upsert`
  - Body: JSONL upload → `{"status":"ok","ingested":N}`

Hilfsendpoints
- GET `/health` → `{"status":"ok"}`
- GET `/config` → gibt aktuelle Collection/Index/Scoring-Konfiguration zurück

### Vorstrukturierung für “wichtige Queries”
- “Was denke ich aktuell zu X?”: Indexe auf `tickers`, `type in [hypothesis, analysis]`, `status in [active, validated]`, Recency-Boost.
- “Welche Hypothesen sind reif zur Validierung?”: Filter `type=hypothesis`, `status=active`, `created_at < now - window`, `confidence_score in [0.55..0.8]`, vorhandenem `evidence`-Count im Payload (oder via Ariadne Sync).
- “Wie hat sich meine Meinung geändert?”: `related_thoughts` mit `relation_type=followup|contradicts`, Timeline-View.
- “Top-Überzeugungen der Woche”: Filter `created_at in week`, sort by `confidence_score` desc, facets by `tickers`.

### Datenfluss und Prozesse
- Ingest-Pipeline:
  - POST /thought → embed(title/content) → upsert Qdrant → store payload
- Background:
  - Auto-Tagging (NER/Keywords), Auto-Links (dupe/similar), Recency-decay Felder
- Ariadne-Hook:
  - Validated Hypothesis → Ariadne Pattern/Fact; Rücksync aktualisiert Thought-Status

### Fehler- und Statuscodes
- 400: Schema-Validierung, unbekannte `type`
- 404: Thought/Relation nicht gefunden
- 409: Duplicate (optional bei idempotentem create)
- 422: Ungültige Filter/DSL
- 500: Embedding/Storage Fehler

### Versionierung & Migration
- `version` im Envelope; migrationsfreundlicher `type_payload`
- `/config` liefert `schema_version`, `vector_model`, `hnsw`-Parameter

Wenn du willst, erstelle ich direkt die Pydantic-Modelle (Envelope + Requests/Responses) und die exakten JSON-Schemas sowie ein Test-Set an “Top-Queries” als Curl-Skripte.