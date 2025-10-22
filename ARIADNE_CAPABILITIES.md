# ARIADNE Backend - Complete Capabilities

**Version:** 1.0  
**Date:** 2025-10-22

## ✅ Vollständige Agent-Kontrolle

Das Ariadne Backend bietet **vollständige CRUD-Operationen** und **Fehlerkorrektur-Mechanismen** für den AI Agent. Der Agent hat **volle Autonomie** über den Knowledge Graph.

---

## 📖 READ Capabilities (Query & Analysis)

### 1. **Context Retrieval** (`GET /v1/kg/context`)
- Subgraph für Topic/Ticker abrufen
- Point-in-Time Queries (temporale Fakten)
- Konfigurierbare Traversierungs-Tiefe

**Agent Use Case:** "Was wissen wir über NVDA und seine Lieferkette?"

---

### 2. **Impact Analysis** (`GET /v1/kg/impact`)
- Event-Impact auf Unternehmen berechnen
- Top-K betroffene Entities
- Direct + Indirect Impact Scoring

**Agent Use Case:** "Welche Unternehmen sind von Fed-Zinserhöhung betroffen?"

---

### 3. **Timeline** (`GET /v1/kg/timeline`)
- Chronologische Events + PriceEvents
- Temporal Edge Filtering
- Entity-zentrierte Historie

**Agent Use Case:** "Was ist bei NVDA im September passiert?"

---

### 4. **Similar Entities** (`GET /v1/kg/similar-entities`)
- Weighted Jaccard Similarity
- GDS NodeSimilarity (optional)
- Sector Bonus für Peer-Vergleich

**Agent Use Case:** "Welche Unternehmen sind NVDA ähnlich?"

---

### 5. **Pattern Search** (`GET /v1/kg/patterns`)
- Validierte Patterns suchen
- Filter: Category, Confidence, Occurrences
- Pattern Occurrences Historie

**Agent Use Case:** "Welche bekannten Muster gibt es für diese Situation?"

---

### 6. **Regime Detection** (`GET /v1/kg/regimes/current`, `/similar`)
- Aktuelle Markt-Regimes
- Historische Regime-Suche via Charakteristiken
- Regime-basierte Strategie-Aktivierung

**Agent Use Case:** "Sind wir in einem High-Volatility Regime?"

---

### 7. **Hypothesis Monitoring** (`GET /v1/kg/validate/hypotheses/...`)
- Pending Validations abrufen
- Hypothesis Details mit Evidence
- Validation Status Tracking

**Agent Use Case:** "Welche Hypothesen muss ich heute validieren?"

---

### 8. **Detailed Stats** (`GET /v1/kg/admin/stats/detailed`)
- Node/Edge Counts by Type
- Temporal Coverage %
- Average Confidence
- Graph Health Metrics

**Agent Use Case:** "Wie ist die Qualität meines Graphen?"

---

## ✏️ WRITE Capabilities (Create & Update)

### 1. **Add Fact** (`POST /v1/kg/fact`)
- Temporale Fakten mit `valid_from`/`valid_to`
- Version Tracking (idempotent)
- Confidence Scoring
- Manual + Automated Sources

**Agent Use Case:** "NVDA hat 35% Marktanteil in AI-Chips (ab Q3 2025)"

---

### 2. **Add Observation** (`POST /v1/kg/observation`)
- Unstrukturierte Agent-Beobachtungen
- Tagging (technical, fundamental, macro)
- Entity-Linking

**Agent Use Case:** "NVDA zeigt bullisches Momentum trotz Makro-Headwinds"

---

### 3. **Add Hypothesis** (`POST /v1/kg/hypothesis`)
- Vermutungen formulieren
- Manifold-Integration (`manifold_thought_id`)
- Status Tracking (active/validated/invalidated)

**Agent Use Case:** "Ich vermute NVDA profitiert von Hyperscaler-CapEx"

---

### 4. **Update Node** (`PATCH /v1/kg/admin/node`)
- Properties ändern
- Fehler korrigieren (Typos, falsche Ticker)
- Confidence anpassen

**Agent Use Case:** "Korrigiere Ticker von 'NVD' auf 'NVDA'"

---

### 5. **Update Edge** (`PATCH /v1/kg/admin/edge`)
- Relation-Properties anpassen
- Confidence updaten
- Temporal Bounds korrigieren

**Agent Use Case:** "Erhöhe Confidence von SUPPLIES_TO auf 0.95"

---

## 🗑️ DELETE Capabilities (Error Correction)

### 1. **Delete Node** (`DELETE /v1/kg/admin/node/{node_id}`)
- Safe Mode: Fails bei Connections
- Force Mode: DETACH DELETE (löscht auch Edges)
- Safety Check vor Löschung

**Agent Use Case:** "Lösche fälschlich erstellte Company 'NVDIAA'"

---

### 2. **Delete Edge** (`DELETE /v1/kg/admin/edge`)
- Spezifische Version löschen (temporal)
- Alle Edges zwischen zwei Nodes löschen
- Relation-Type Filter

**Agent Use Case:** "Entferne falsche COMPETES_WITH Beziehung"

---

### 3. **Retract Hypothesis** (`POST /v1/kg/admin/hypothesis/{id}/retract`)
- Hypothese zurückziehen (vor Validation)
- Status → `retracted`
- Audit Trail erhalten (nicht löschen)

**Agent Use Case:** "Ich lag falsch, diese Hypothese macht keinen Sinn"

---

### 4. **Delete Pattern** (`DELETE /v1/kg/admin/pattern/{id}`)
- Ungültige Patterns entfernen
- Source Hypothesis bleibt erhalten (Audit)
- Reasoning erforderlich

**Agent Use Case:** "Dieses Pattern gilt nicht mehr, entfernen"

---

### 5. **Cleanup Orphaned Nodes** (`POST /v1/kg/admin/cleanup/orphaned-nodes`)
- Dry-Run Mode (nur zählen)
- Automatisches Löschen isolierter Nodes
- Schutz für Pattern/Regime Nodes

**Agent Use Case:** "Räume auf: Lösche isolierte Entities"

---

## 🔬 LEARN Capabilities (Analytics & Discovery)

### 1. **Correlation Analysis** (`POST /v1/kg/learn/correlation`)
- Preis-Korrelationen berechnen (Spearman/Pearson)
- Automatische `CORRELATES_WITH` Edges
- Configurable Window (Tage)
- Significance Threshold

**Agent Use Case:** "Berechne Korrelationen zwischen Semis (90-Tage-Fenster)"

---

### 2. **Community Detection** (`POST /v1/kg/learn/community`)
- Graph Clustering (Louvain)
- `SAME_COMMUNITY` Edges
- Sektor-Erkennung
- Thematische Groupierung

**Agent Use Case:** "Finde Cluster im Graph (AI-Ecosystem, Energy Transition)"

---

## ✔️ VALIDATE Capabilities (Hypothesis Workflow)

### 1. **Add Evidence** (`POST /v1/kg/validate/hypothesis/{id}/evidence`)
- Supporting Evidence
- Contradicting Evidence
- Confidence per Evidence
- Automatic Threshold Check

**Agent Use Case:** "Diese Earnings unterstützen meine Hypothese"

---

### 2. **Validate Hypothesis** (`POST /v1/kg/validate/hypothesis/{id}/validate`)
- Validate / Invalidate / Defer
- Pattern Extraction (optional)
- Manifold Sync (return `manifold_thought_id`)
- Audit Reasoning

**Agent Use Case:** "Hypothese validiert → extrahiere als Pattern"

---

### 3. **Get Pending Validations** (`GET /v1/kg/validate/hypotheses/pending-validation`)
- Filter by Annotation Threshold
- Sortierung by Evidence Count
- Dashboard-Ready

**Agent Use Case:** "Zeige alle Hypothesen mit ≥3 Annotationen"

---

## 🤖 INGEST Capabilities (Automated Pipelines)

### 1. **Price Events** (`POST /v1/kg/ingest/prices`)
- MA-Crossover (Golden/Death Cross)
- Breakouts (52-week high/low)
- Volatility Spikes (ATR)
- Deterministische Technical Signals

**Agent Use Case:** "Importiere PriceEvents für NVDA (Sept 2025)"

---

### 2. **~~News Ingestion~~** (DEAKTIVIERT)
- Zu unzuverlässig (spaCy NER, Pattern-Matching)
- **Manuelle Graph-Pflege bevorzugt**
- Agent nutzt stattdessen Write Endpoints

---

## 🎯 Agent Autonomy - Complete Control

### ✅ Agent kann:

1. **Lesen & Analysieren:**
   - Context, Impact, Timeline, Similarity
   - Patterns, Regimes, Hypotheses
   - Detailed Stats für Graph Health

2. **Schreiben & Strukturieren:**
   - Facts (temporal, versioned)
   - Observations (unstructured notes)
   - Hypotheses (testbare Vermutungen)

3. **Fehler beheben:**
   - Node/Edge Properties korrigieren
   - Falsche Entities/Relations löschen
   - Hypothesen zurückziehen
   - Patterns invalidieren

4. **Lernen & Entdecken:**
   - Korrelationen automatisch berechnen
   - Communities detektieren
   - Patterns aus validierten Hypothesen extrahieren

5. **Validieren & Verifizieren:**
   - Evidence sammeln
   - Hypothesen systematisch validieren
   - Patterns für Wiederverwendung speichern

6. **Aufräumen & Optimieren:**
   - Orphaned Nodes löschen
   - Graph-Qualität monitoren
   - Temporal Coverage sicherstellen

---

## 🔒 Safety Features

### 1. **Idempotenz**
- Facts: Version-Tracking bei Updates
- Merge-Logik für Nodes/Edges

### 2. **Audit Trail**
- Retracted Hypotheses bleiben erhalten
- Deleted Patterns → Source Hypothesis bleibt
- `updated_at`, `ingested_at` Timestamps

### 3. **Safety Checks**
- Node Delete: Fails bei Connections (ohne `force=true`)
- Hypothesis Retract: Nur wenn nicht validated/invalidated
- Temporal Validation: `valid_from` Pflichtfeld

### 4. **Confidence Tracking**
- Alle Facts haben Confidence Score
- Average Confidence Metric verfügbar
- Agent kann niedrige Confidence filtern

---

## 📊 Quality Metrics

**Aktuelle Graph Stats:**
```
Nodes: 44 (Company: 13, Concept: 6, Event: 6, etc.)
Edges: 45 (AFFECTS: 17, CORRELATED_WITH: 8, etc.)
Temporal Coverage: 2.22% (verbesserbar!)
Avg Confidence: 0.723
```

**Empfohlene Targets:**
- ✅ Temporal Coverage: >95%
- ✅ Avg Confidence: >0.80
- ✅ Hypothesis Validation Rate: >70%
- ✅ Keine Duplikate ohne Version-Tracking

---

## 🚀 Agent Workflow (Complete Cycle)

```
1. DISCOVER (Tesseract Semantic Search)
   ↓
2. READ (Context, Timeline, Similar-Entities)
   ↓
3. ANALYZE (LLM Brain versteht Kontext)
   ↓
4. WRITE (Fact/Observation/Hypothesis)
   ↓
5. VALIDATE (Evidence sammeln, Threshold erreichen)
   ↓
6. LEARN (Patterns extrahieren, Korrelationen finden)
   ↓
7. CORRECT (Fehler beheben, Nodes/Edges updaten/löschen)
   ↓
8. MONITOR (Stats prüfen, Graph Health)
```

---

## ✅ Vollständigkeit Checklist

- ✅ **CREATE**: Facts, Observations, Hypotheses
- ✅ **READ**: Context, Impact, Timeline, Similarity, Patterns, Regimes
- ✅ **UPDATE**: Node Properties, Edge Properties
- ✅ **DELETE**: Nodes (safe/force), Edges, Hypotheses (retract), Patterns
- ✅ **VALIDATE**: Evidence, Validation, Pattern Extraction
- ✅ **LEARN**: Correlation, Community Detection
- ✅ **ADMIN**: Stats, Cleanup, Health Monitoring
- ✅ **TEMPORAL**: Point-in-Time Queries, Version Tracking
- ✅ **MANIFOLD**: Hypothesis ↔ Thought Sync
- ✅ **SAFETY**: Idempotenz, Audit Trail, Confidence Tracking

---

## 🎯 Fazit

**Das Ariadne Backend ist vollständig.**

Der Agent hat:
- ✅ **Volle Lese-Rechte** (Context, Impact, Timeline, etc.)
- ✅ **Volle Schreib-Rechte** (Facts, Observations, Hypotheses)
- ✅ **Volle Fehlerkorrektur** (Update, Delete, Retract)
- ✅ **Volle Analyse-Fähigkeiten** (Learn, Validate)
- ✅ **Volle Autonomie** (keine Human-Intervention nötig)

**Nächster Schritt:** Manifold planen (Agent Memory System).

---

**Referenzen:**
- API Documentation: `/ARIADNE_API_REFERENCE.md`
- Ingestion Strategy: `/KNOWLEDGE_INGESTION_STRATEGY.md`
- Architecture: `/kg_and_memory.md`

