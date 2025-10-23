# Ariadne Knowledge Graph – Demonstration Setup

## 🎯 Übersicht

Das Ariadne-System ist jetzt **vollständig einsatzbereit** mit:

1. ✅ **Clean Reset Endpoint** – Komplettes Löschen der Datenbank über API/UI
2. ✅ **Demo Graph Creator** – Realistisches, umfassendes Beispiel-Szenario
3. ✅ **Alle Features aktiv** – Temporal, Supply Chain, Events, Hypotheses, Correlations, Regimes

---

## 🚀 Quick Start

### 1. Graph zurücksetzen (optional)

**Option A: Via Frontend**
- Gehe zu: http://localhost:3000/ariadne/admin
- Scrolle zu "⚠️ Danger Zone: Reset Graph"
- Checkbox aktivieren
- "DELETE ALL DATA" Button klicken
- Zweifache Bestätigung eingeben

**Option B: Via API**
```bash
curl -X POST "http://localhost:8082/v1/kg/admin/reset?confirm=true"
```

### 2. Demo-Graph erstellen

```bash
cd /home/sascha-laptop/alpaca-bot
python scripts/create_ariadne_demo_graph.py
```

**Das erstellt:**
- 15 Companies (NVDA, TSM, ASML, AMD, etc.)
- 17 Supply Chain Beziehungen (SUPPLIES_TO)
- 5 Competition Beziehungen (COMPETES_WITH)
- 5 Major Events (Export Controls, Earthquakes, Product Launches)
- 15 Event Impacts (AFFECTS, BENEFITS_FROM)
- 3 Hypotheses (für Validation Workflow)
- 3 Observations (Agent-generierte Insights)
- 5 Correlations (CORRELATES_WITH)
- 3 Market Regimes (Bull, Correction, Recovery)
- 1 Validated Pattern (Supply Chain Disruption)

---

## 📊 Demo-Szenario

**"The AI Semiconductor Supply Chain Crisis & Recovery (2023-2025)"**

### Timeline der Events:

1. **März 2022**: NVIDIA H100 Launch → AI GPU Revolution startet
2. **März 2023**: OpenAI GPT-4 Launch → Massive AI Demand Surge
3. **August 2023**: US CHIPS Act Funding → Domestic Manufacturing Push
4. **Oktober 2023**: US Export Controls → China Market Restrictions
5. **April 2024**: Taiwan Earthquake → TSMC Production Disruption

### Supply Chain Flow:

```
ASML (Lithography)
  ↓ SUPPLIES_TO
TSMC (Foundry)
  ↓ SUPPLIES_TO
NVIDIA (GPU Design)
  ↓ SUPPLIES_TO
Microsoft/Google/Meta (Cloud AI)
```

### Temporale Beziehungen:

- Alle Beziehungen haben `valid_from` und optional `valid_to`
- Events haben `occurred_at` timestamps
- Regimes haben `start_date` und `end_date`

---

## 🔍 Was kann man damit machen?

### 1. Context Graph Explorer
```
http://localhost:3000/ariadne/context

Query: topic="AI" oder tickers=["NVDA", "TSM"]
→ Zeigt gesamtes Netzwerk mit allen Beziehungen
```

### 2. Timeline Analysis
```
http://localhost:3000/ariadne/timeline?ticker=NVDA

→ Chronologische Ansicht aller Events, die NVIDIA betreffen
→ Zeigt: Product Launches, Export Controls, Supply Disruptions
```

### 3. Impact Analysis
```
http://localhost:3000/ariadne/impact

Query: event_query="export controls"
→ Berechnet Impact Score für alle betroffenen Unternehmen
→ Zeigt direkte und indirekte Propagation
```

### 4. Similar Entities
```
http://localhost:3000/ariadne/similar?ticker=NVDA

→ Findet ähnliche Companies basierend auf:
  - Shared supply chain relationships
  - Common event exposure
  - Correlation patterns
```

### 5. Hypothesis Validation
```
http://localhost:3000/ariadne/hypotheses

→ 3 Pending Hypotheses:
  1. TSMC disruption → NVIDIA GPU shortage (2 months)
  2. Export controls → AMD market share gains
  3. ASML capacity → supply chain bottleneck

→ Add Evidence, Validate, Extract Patterns
```

### 6. Pattern Discovery
```
http://localhost:3000/ariadne/patterns

→ Validated Pattern:
  "Taiwan Event → GPU Supply Shock"
  → 85% success rate, 3 occurrences
```

### 7. Market Regimes
```
http://localhost:3000/ariadne/regimes

→ 3 Regimes:
  - AI Bull Market 2023 (+45% avg return)
  - Export Controls Correction (-12%)
  - Recovery 2024 (+28%)
```

---

## 🧪 Features demonstriert

### ✅ Temporal Graph
- `valid_from` / `valid_to` auf allen SUPPLIES_TO Beziehungen
- Historische vs. aktuelle Beziehungen
- Event-Timeline mit `occurred_at`

### ✅ Multi-Hop Impact Propagation
```
ASML capacity constraint
  → affects TSMC production
    → affects NVIDIA GPU supply
      → affects Microsoft AI services
```

### ✅ Hypothesis Workflow
1. Create Hypothesis
2. Add Evidence (supporting/contradicting)
3. Reach Threshold (e.g. 3 pieces of evidence)
4. Validate/Invalidate
5. Extract Pattern (if validated)

### ✅ Correlation Networks
- Spearman correlations zwischen Stock Prices
- Community Detection möglich via Louvain
- Sector-based clustering

### ✅ Observations
- Agent-generated insights
- Linked to specific companies/events
- Confidence scores

### ✅ Regimes
- Market phase classification
- Characteristics tagging
- Historical similarity search

---

## 📈 Graph Metriken (nach Demo-Erstellung)

**Nodes:**
- Company: 15
- Event: 5
- Hypothesis: 3
- Observation: 3
- Regime: 3
- Pattern: 1

**Relationships:**
- SUPPLIES_TO: 17
- COMPETES_WITH: 5
- AFFECTS: 11
- BENEFITS_FROM: 4
- CORRELATES_WITH: 5
- OBSERVES: 3
- PROPOSED_RELATION: 6

**Total: ~30 Nodes, ~51 Relationships**

---

## 🎨 Graph Visualisierung Tipps

1. **Farbcodierung im Frontend:**
   - Companies: Blau
   - Events: Rot
   - Hypotheses: Lila
   - Patterns: Pink
   - Regimes: Türkis

2. **Edge-Styles:**
   - SUPPLIES_TO: Blau (Supply Chain)
   - AFFECTS: Orange (Negative Impact)
   - BENEFITS_FROM: Grün (Positive Impact)
   - CORRELATES_WITH: Lila (Statistical)

3. **Interaktionen:**
   - Click: Node Info anzeigen
   - Double-Click: Timeline öffnen
   - Hover Edge: Relationship Details

---

## 🔧 Erweiterte Nutzung

### Custom Queries via Cypher
```cypher
// Finde alle Unternehmen, die von Export Controls betroffen sind
MATCH (e:Event {event_id: 'us_export_controls_2023'})
      -[:AFFECTS]->(c:Company)
RETURN c.name, c.ticker, c.sector

// Finde Supply Chain Pfade
MATCH path = (a:Company {ticker: 'ASML'})
             -[:SUPPLIES_TO*1..3]->(b:Company {ticker: 'NVDA'})
RETURN path

// Temporal Query: Aktive Beziehungen zu einem Zeitpunkt
MATCH (a)-[r:SUPPLIES_TO]->(b)
WHERE r.valid_from <= datetime('2024-01-01')
  AND (r.valid_to IS NULL OR r.valid_to >= datetime('2024-01-01'))
RETURN a.ticker, b.ticker, r.description
```

### Trigger Learn Jobs
```bash
# Correlation Analysis
curl -X POST "http://localhost:8082/v1/kg/learn/correlations" \
  -H "Content-Type: application/json" \
  -d '{"symbols": ["NVDA", "AMD", "TSM", "ASML"], "window_days": 90}'

# Community Detection
curl -X POST "http://localhost:8082/v1/kg/learn/communities"
```

---

## 💡 Was zeigt das Szenario?

### 1. **Realitätsnähe**
- Echte Events (Export Controls, Earthquakes)
- Echte Companies (NVIDIA, TSMC, ASML)
- Realistische Beziehungen

### 2. **Komplexität**
- Multi-Layer Supply Chain
- Temporal Dependencies
- Geopolitische Faktoren
- Technologische Disruptions

### 3. **Ariadne's Power**
- **Impact Propagation**: Ein Event in Taiwan → Globale Auswirkungen
- **Temporal Reasoning**: "Was war der Status im Oktober 2023?"
- **Hypothesis Testing**: Systematische Validierung von Annahmen
- **Pattern Recognition**: Wiederkehrende Supply Chain Muster
- **Multi-Dimensional**: Technologie + Geopolitik + Finanzen

---

## 📝 Nächste Schritte

1. **Graph Exploration**: Nutze Frontend zum Visualisieren
2. **Timeline Analysis**: Schaue dir Event-Sequenzen an
3. **Impact Propagation**: Teste verschiedene Event-Queries
4. **Hypothesis Workflow**: Füge Evidence hinzu, validiere
5. **Pattern Discovery**: Schaue welche Muster entstehen
6. **Custom Cypher**: Schreibe eigene komplexe Queries

---

## 🎯 Fazit

Ariadne demonstriert ein **vollständiges, produktionsreifes Knowledge Graph System**:

- ✅ Temporal reasoning (Vergangenheit & Gegenwart)
- ✅ Multi-hop impact propagation
- ✅ Structured hypothesis validation
- ✅ Pattern extraction & reuse
- ✅ Market regime classification
- ✅ Agent-generated observations
- ✅ Statistical correlations
- ✅ Community detection ready

**Das ist nicht nur ein Demo – es ist ein funktionierendes System für Real-World Financial Intelligence!** 🚀

