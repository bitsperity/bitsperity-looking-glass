# 🧠 Knowledge Graph Philosophy

## Was gehört in den Graph vs. Markdown?

### ✅ **IN DEN GRAPH (Structured Data)**

```
Queryable Facts & Relations:
├── Entities
│   ├── Companies (NVDA, LRCX, ASML)
│   ├── Themes (GLP-1 Supply Chain, AI Infrastructure)
│   ├── Convictions (LRCX_Conviction_20251007: 0.88)
│   ├── Trades (Trade_LRCX_20251007_BUY)
│   ├── Macro Snapshots (VIX: 16.29, DXY: 97.73)
│   ├── Sector Snapshots (XLK: +2.38%, XLV: +6.96%)
│   ├── News Snapshots (LRCX upgraded to $150)
│   └── Deep Dive Analyses (LRCX_DeepDive_20251007)
│
└── Relations
    ├── supplies_to (LRCX → NVDA)
    ├── conviction_for (LRCX_Conviction → LRCX)
    ├── trades (Trade_LRCX → LRCX)
    └── analyzes (LRCX_DeepDive → LRCX)
```

**Zweck**: SQL-Queries, Trend-Tracking, Portfolio-Queries

**Beispiel Query**:
```sql
SELECT name FROM entities 
WHERE entity_type='company' 
AND EXISTS (
  SELECT 1 FROM entities AS conv 
  WHERE conv.entity_type='conviction_entry' 
  AND conv.name LIKE entities.name || '_Conviction_%'
  AND json_extract(conv.observations, '$[0]') LIKE '%0.8%'
)
```

---

### ❌ **NICHT IN DEN GRAPH (Human-Readable Reports)**

```
Markdown Archives (Lesbare Berichte):
├── Graph Insights (insights/graph/)
│   └── Meta-Analyse DES Graphs selbst (circular!)
│
├── Deep Dive Reports (research/deep_dives/)
│   └── Narrativer Text, Diagramme, Mermaid Charts
│   └── FAKTEN sind extrahiert als deep_dive_analysis Entities
│
├── Daily Memos (research/)
│   ├── Macro Memo TEXT (Analyse + Empfehlungen)
│   ├── Sector Rotation TEXT (Narrative + Rationale)
│   ├── News Digest TEXT (Zusammenfassungen)
│   ├── Markets Memo TEXT (TA Analysis + Charts)
│   └── Risk Report TEXT (Assessment + Warnings)
│   └── FAKTEN sind extrahiert als *_snapshot Entities
│
├── Decisions (decisions/tilts/)
│   └── Tilt Reports TEXT (Tabellen, Rationale)
│   └── FAKTEN sind extrahiert als portfolio_decision + order_spec Entities
│
└── Learnings (learnings/)
    └── Session Notes, Backlogs, Post-Mortems
    └── Menschliche Reflexion (nicht strukturierbar)
```

**Zweck**: 
- Backup (falls Graph corrupted)
- Human-Readable (für Reviews)
- Charts/Mermaid (nicht strukturierbar)
- Narrative Context (Rationale, Empfehlungen)

---

## 🎯 **AKTUELLER STATUS (2025-10-07)**

### Graph Content (293 Entities, 296 Relations)
```
✅ Companies:         50  (LRCX, NVDA, TSLA, ...)
✅ Convictions:        7  (High-Conviction Entries)
✅ Trades:            38  (Executed Orders)
✅ Deep Dives:        12  (Analysis Summaries)
✅ Discoveries:       39  (Candidates)
✅ Themes:            28  (Investment Themes)
✅ Macro Snapshots:    3  (VIX, DXY, Gold)
✅ Sector Snapshots:   3  (11 Sector ETF Performance)
✅ News Snapshots:     3  (Earnings, M&A, Events)
```

### Markdown Archives (20 Files, ~2000 lines)
```
📄 Graph Insights:        2 files  (Meta-Analysen DES Graphs)
📄 Deep Dive Reports:     8 files  (LRCX, ASML, KLAC, CEG, ...)
📄 Macro Memos:           3 files  (Oct 1, 2, 7)
📄 Sector Rotation:       3 files  (Oct 1, 2, 7)
📄 News Digests:          2 files  (Oct 2, 7)
📄 Markets Memos:         1 file   (Oct 7)
📄 Risk Reports:          3 files  (Oct 1, 2, 7)
📄 Tilt Decisions:        1 file   (Oct 7)
```

---

## 💡 **WARUM SO?**

### Graph = Structured Facts
```python
# Query: Which companies have conviction > 0.8?
convictions = db.execute('''
  SELECT name FROM entities 
  WHERE entity_type='conviction_entry'
  AND observations LIKE '%"conviction":0.8%'
''').fetchall()
```

### Markdown = Context & Narrative
```markdown
# LRCX Deep Dive

## Executive Summary
Lam Research operates a **duopoly** in Etch & Deposition equipment...

[Mermaid Diagram: Supply Chain]
[TA Chart: Price Action]
[DCF Model: Valuation]
```

**→ Graph speichert Facts, Markdown erzählt die Story!**

---

## 🚀 **QUERIES DU JETZT MACHEN KANNST**

### 1. High-Conviction Portfolio
```sql
SELECT c.name AS company, 
       json_extract(conv.observations, '$[0]') AS conviction
FROM entities AS c
JOIN entities AS conv ON conv.name LIKE c.name || '_Conviction_%'
WHERE c.entity_type='company' 
AND conv.entity_type='conviction_entry'
AND conv.observations LIKE '%0.8%'
ORDER BY conviction DESC;
```

### 2. Theme Momentum
```python
# Get all companies in GLP-1 Theme
theme = "theme_glp1_supply_chain"
relations = db.execute(
    "SELECT to_entity FROM relations WHERE from_entity=?", 
    (theme,)
).fetchall()
```

### 3. Trade History
```sql
SELECT name, observations FROM entities 
WHERE entity_type='trade_execution'
AND name LIKE 'Trade_LRCX%'
ORDER BY name DESC;
```

### 4. Macro Regime Tracking
```sql
SELECT name, observations FROM entities 
WHERE entity_type='macro_snapshot'
ORDER BY name DESC
LIMIT 5;
```

---

## 📋 **BEST PRACTICES**

### Extraction Rules

**✅ Extrahiere in Graph:**
- Zahlen (VIX: 16.29, Price: $143.10)
- Scores (Conviction: 0.88, Discovery: 0.65)
- Relations (LRCX supplies_to NVDA)
- Events (LRCX upgraded by Deutsche Bank)
- Timestamps (20251007, 2025-10-07)

**❌ Behalte in Markdown:**
- Analysen ("The market is showing...")
- Empfehlungen ("We recommend...")
- Rationale ("This is bullish because...")
- Charts (Mermaid, TA, DCF Models)
- Narrativer Context (Story, Erklärungen)

### Update Frequency

| Entity Type | Update | Retention |
|-------------|--------|-----------|
| Companies | On discovery | Permanent |
| Convictions | On deep-dive | Append (temporal) |
| Trades | On execution | Permanent |
| Snapshots | Daily | Rolling 90 days |
| Deep Dives | On completion | Permanent (summary) |

---

## 🎯 **RESULTAT**

```
Vorher:  JSON/JSONL Files everywhere, Markdown everywhere
Jetzt:   Graph = Facts, Markdown = Archive

Query Speed:  SQL (instant) vs. grep (slow)
Structure:    Relations (queryable) vs. Text (unstructured)
Redundancy:   Single source of truth (Graph) + Human backup (MD)
```

---

# ✅ **FAZIT**

**Graph ≠ Alles**

Graph = **Structured Data** für Queries
Markdown = **Human-Readable** für Context

**Beide sind wichtig!** 🎯


