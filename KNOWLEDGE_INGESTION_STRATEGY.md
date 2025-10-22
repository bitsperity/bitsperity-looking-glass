# Knowledge Ingestion Strategy

**Version:** 1.0  
**Datum:** 2025-10-22

## 🎯 Philosophie: Quality over Quantity

Ariadne ist ein **Knowledge Graph für strukturiertes, validiertes Wissen**. Wir priorisieren **Precision** und **Qualität** über automatisierte Bulk-Ingestion mit hohem Noise.

---

## ❌ Was wir NICHT tun

### Automatische News Ingestion

**Frühere Implementierung (entfernt):**
- spaCy NER: Einfache Named Entity Recognition
- Pattern-Matching: Regel-basierte Relation Extraction
- Automatisches Hinzufügen von News → Entities → Relations

**Warum entfernt?**

1. **Niedrige Precision:**
   - spaCy erkennt "Apple" als Company, aber nicht "Fed" als Concept
   - Keine Disambiguierung (Apple Inc. vs. apple fruit)
   - Keine Ticker-Resolution ohne manuelle Lookup-Tabellen

2. **Schwache Relation Extraction:**
   - Pattern-Matching: "X supplies Y" ✅ erkannt
   - Aber: "NVIDIA relies heavily on TSMC" ❌ nicht erkannt
   - Keine Kausalität, Kontext oder Negation

3. **Hoher Noise:**
   - Irrelevante Entities (False Positives)
   - Unstrukturierte Facts ohne Confidence-Berechnung
   - Keine Validierung

4. **Fehlende Temporal Logic:**
   - Wann gilt ein Fakt? (valid_from/valid_to)
   - Alte Fakten überschreiben oder versionieren?

**Ergebnis:** Graph wird mit unzuverlässigen Daten gefüllt → schadet mehr als es hilft.

---

## ✅ Was wir stattdessen tun

### LLM-Agent-gesteuerter Graph-Aufbau

**Prinzip:** Agent liest News (via Tesseract Semantic Search), versteht Kontext mit LLM-Brain, und schreibt **strukturiert** in Ariadne.

### Workflow

```
┌────────────────────────────────────────────────────────────────┐
│ 1. Agent Daily Routine: News Discovery                        │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │ Tesseract Semantic Search               │
        │ Query: "AI regulation earnings OPEC"    │
        │ → Top-10 relevante News                 │
        └─────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│ 2. Agent reads & analyzes mit LLM                             │
│                                                                │
│ News: "NVDA Q3 Earnings Beat: Datacenter Revenue +94% YoY"    │
│                                                                │
│ Agent Thought:                                                 │
│ - "NVDA mentioned → positive Event"                            │
│ - "Datacenter strength → supports Hyperscaler CapEx thesis"   │
│ - "This is EVIDENCE for hypothesis: NVDA benefits from AI"    │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│ 3. Agent schreibt strukturiert in Ariadne                     │
│                                                                │
│ Option A: High Confidence → Fakt                              │
│   POST /v1/kg/fact                                            │
│   {                                                            │
│     "source_label": "Event",                                  │
│     "source_id": "event-nvda-earnings-q3",                    │
│     "target_label": "Company",                                │
│     "target_id": "nvda-node-id",                              │
│     "rel_type": "POSITIVE_IMPACT",                            │
│     "confidence": 0.95,                                       │
│     "valid_from": "2025-11-20T00:00:00"                       │
│   }                                                            │
│                                                                │
│ Option B: Unsicher → Hypothese + Evidence sammeln             │
│   POST /v1/kg/hypothesis                                      │
│   POST /v1/kg/validate/hypothesis/{id}/evidence               │
│   ... nach N Evidence → validate                              │
└────────────────────────────────────────────────────────────────┘
```

---

## 🔧 LLM-Prompt für Strukturierte Extraction

### Beispiel: Agent analysiert News

**Prompt:**
```
Du bist ein Financial Intelligence Agent. Analysiere folgende News und extrahiere strukturierte Fakten für einen Knowledge Graph.

News:
---
Title: "Taiwan Semi to Expand Arizona Fab with $40B Investment"
Body: "TSMC announced plans to invest $40 billion in its Arizona semiconductor facility, marking the largest foreign investment in U.S. manufacturing history. The expansion will triple production capacity by 2026..."
---

Extrahiere:
1. **Entities:** Companies, Locations, Concepts
2. **Events:** Was ist passiert? (Name, Kategorie, Datum)
3. **Relations:** Welche Beziehungen existieren? (Source → Target, Type, Confidence)
4. **Temporal Info:** Wann gilt dieser Fakt? (valid_from, valid_to)

Output als JSON:
{
  "entities": [
    {"id": "tsmc-001", "label": "Company", "properties": {"ticker": "TSM", "name": "Taiwan Semiconductor"}},
    {"id": "arizona-001", "label": "Location", "properties": {"name": "Arizona", "country": "USA"}},
    {"id": "semis-001", "label": "Concept", "properties": {"name": "Semiconductor Manufacturing", "category": "Industry"}}
  ],
  "events": [
    {
      "id": "event-tsmc-expansion-2025",
      "name": "TSMC Arizona Fab Expansion",
      "category": "CapEx",
      "occurred_at": "2025-10-20T00:00:00",
      "confidence": 0.95
    }
  ],
  "relations": [
    {
      "source_id": "tsmc-001",
      "target_id": "arizona-001",
      "rel_type": "EXPANDS_TO",
      "confidence": 0.95,
      "valid_from": "2025-10-20T00:00:00",
      "valid_to": null,
      "evidence": "$40B investment announced"
    },
    {
      "source_id": "event-tsmc-expansion-2025",
      "target_id": "tsmc-001",
      "rel_type": "AFFECTS",
      "confidence": 0.90,
      "valid_from": "2025-10-20T00:00:00"
    }
  ]
}
```

**Agent verwendet Output für:**
- `POST /v1/kg/fact` (für jede Relation)
- Oder: `POST /v1/kg/hypothesis` (falls unsicher) + später Evidence sammeln

---

## 🤖 Automatisierung wo sinnvoll: Price Events

### Was automatisiert werden kann

**Technische Analyse ist deterministisch:**
- MA-Crossover (Golden Cross / Death Cross)
- Breakouts (52-week high/low)
- Volatility Spikes (ATR > 2σ)
- RSI Extreme Levels (>70 / <30)
- Volume Anomalies

**Warum das OK ist:**
- **Mathematisch definiert** (keine Ambiguität)
- **Keine Interpretation nötig** (RSI > 70 = overbought, objektiv)
- **Hohe Relevanz** für Timeline-Context und Pattern-Correlation

### Endpoint: `/v1/kg/ingest/prices`

**Implementiert:**
```python
PriceEventDetector.detect_all(symbol, price_data)
→ Returns: [
    {
        "event_type": "ma_crossover",
        "occurred_at": "2025-09-20T00:00:00",
        "confidence": 1.0,  # Deterministisch
        "properties": {
            "ma_short": 50,
            "ma_long": 200,
            "direction": "bullish"
        }
    }
]
```

**Graph Write:**
- `(PriceEvent:Node)` mit `event_type`, `occurred_at`, `properties`
- `(Company)-[HAS_PRICE_EVENT]->(PriceEvent)`

**Use Cases:**
- Timeline: "Welche PriceEvents gab es bei NVDA im September?"
- Pattern-Correlation: "MA-Crossover + Fed-Event = Trading Signal?"
- Regime Detection: "High Volatility Period" via ATR-Spikes

---

## 📊 Quality Metrics

### Wie messen wir Graph-Qualität?

**Metriken:**
1. **Fact Confidence:** Durchschnittliche Confidence aller Edges (Ziel: >0.80)
2. **Hypothesis Validation Rate:** % validierter Hypothesen (vs. invalidiert)
3. **Temporal Coverage:** % Edges mit `valid_from`/`valid_to` (Ziel: 100%)
4. **Version Consistency:** Keine Duplikate ohne Version-Tracking
5. **Evidence Ratio:** Hypothesen mit ≥3 Evidence vor Validation

**Dashboard (zukünftig):**
```
Graph Stats:
- Total Nodes: 1,234
- Total Edges: 5,678
- Avg Confidence: 0.87 ✅
- Temporal Edges: 98% ✅
- Pending Hypotheses: 12
- Validated Patterns: 8
```

---

## 🔄 Hybrid-Ansatz (Zukünftig)

### LLM + Rules (Best of Both Worlds)

**Stufe 1: Rules für "Easy Cases"**
- "TSMC supplies to NVIDIA" → `SUPPLIES_TO` (regex)
- "Apple competes with Samsung" → `COMPETES_WITH` (pattern)
- Confidence: 0.70 (niedrig, da rule-based)

**Stufe 2: LLM für "Hard Cases"**
- Komplexe Sätze, Kausalität, Negation
- "While NVIDIA benefits from AI demand, supply chain constraints remain a risk" → 2 Relations:
  - `(AI Demand)-[BENEFITS]->(NVIDIA)` [confidence: 0.85]
  - `(Supply Chain)-[RISK_FOR]->(NVIDIA)` [confidence: 0.75]

**Stufe 3: Human-in-the-Loop**
- Kritische Fakten (Confidence < 0.80) → Agent fragt User
- "Unsicher: Soll ich 'Fed Rate Hike → Tech Selloff' als Fakt speichern?"
- User bestätigt → Confidence = 0.95

---

## 📝 Ariadne Write Endpoints (Manual Building)

### Endpoint-Übersicht

| Endpoint | Use Case | Wer nutzt? |
|----------|----------|------------|
| `POST /v1/kg/fact` | Validierter Fakt mit Temporal Bounds | Agent (nach LLM-Analysis) |
| `POST /v1/kg/observation` | Unstrukturierte Beobachtung | Agent (Daily Notes) |
| `POST /v1/kg/hypothesis` | Vermutung, die validiert werden muss | Agent (Research) |
| `POST /v1/kg/validate/.../evidence` | Evidence sammeln | Agent (liest weitere News) |
| `POST /v1/kg/validate/.../validate` | Finale Validation → Pattern | Agent (nach Threshold) |

---

## 🚀 Roadmap: Verbesserungen

### Kurzfristig (MVP)
- ✅ Manual Graph Building via Write Endpoints
- ✅ Price Events Automation
- ✅ Hypothesis Validation Workflow
- ⏳ Agent Prompt Library (standardisierte LLM-Prompts)

### Mittelfristig
- 🔄 Fine-tuned NER Model (FinBERT für Financial Entities)
- 🔄 LLM-based Relation Extraction (GPT-4 Structured Output)
- 🔄 Confidence Calibration (ML-Model für Confidence-Score)

### Langfristig
- 🔮 Graph-RAG Integration (Microsoft GraphRAG)
- 🔮 Multi-Agent Validation (Agent A erstellt, Agent B validiert)
- 🔮 Auto-Deduplication (Entity Resolution via Embeddings)

---

## 📖 Best Practices für Agents

### DO ✅

1. **Immer `valid_from` setzen** (auch bei aktuellen Fakten)
2. **Confidence realistisch schätzen:**
   - LLM-extracted: 0.70-0.85
   - Human-verified: 0.90-0.95
   - Deterministisch (Math): 1.0
3. **Unsichere Fakten → Hypothesen** (nicht direkt als Fakt)
4. **Evidence sammeln** (min. 3x) vor Validation
5. **Temporal Updates:** Alte Edge mit `valid_to` schließen, neue Edge anlegen

### DON'T ❌

1. ❌ Keine Bulk-Imports ohne LLM-Review
2. ❌ Keine Fakten ohne `valid_from`
3. ❌ Keine "guessed" Confidence-Werte (0.5 = "no idea")
4. ❌ Keine Duplikate ohne Version-Tracking
5. ❌ Keine Auto-Ingestion von unverifizierten News

---

## 📚 Referenzen

- **Ariadne API Reference:** `/ARIADNE_API_REFERENCE.md`
- **Architecture:** `/kg_and_memory.md`
- **Implementation Plan:** `/plan.md`
- **Price Event Detectors:** `/libs/ariadne_core/signals/price_detectors.py`

---

**Fazit:** Manuelle, LLM-gesteuerte Graph-Pflege > automatisierte Bulk-Ingestion. Quality over Quantity. Ariadne ist ein **Precision Tool**, kein Data Lake.

