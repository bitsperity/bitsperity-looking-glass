# 🎯 Knowledge Graph Query Guide

## Wie du JEDE Information aus dem Graph holst

**Graph**: 335 Entities, 303 Relations, 4.7MB SQLite  
**Projekt**: alpaca-bot

---

## 🔍 QUICK START

```bash
# Python
python3 -c "
import sqlite3
conn = sqlite3.connect('knowledge_graph/knowledgegraph.db')
# ... your query
"

# SQLite CLI
sqlite3 knowledge_graph/knowledgegraph.db
.mode column
.headers on
```

---

## 📊 USE CASES

### 1. High-Conviction Portfolio bauen

```sql
-- Get all companies with conviction > 0.80
SELECT 
    c.name AS company,
    json_extract(conv.observations, '$[0]') AS date,
    json_extract(conv.observations, '$[1]') AS conviction
FROM entities AS c
JOIN entities AS conv ON conv.name LIKE c.name || '_Conviction_%'
WHERE c.entity_type='company' 
  AND conv.entity_type='conviction_entry'
  AND conv.observations LIKE '%0.8%'
ORDER BY conviction DESC;
```

**Output:**
```
LRCX: 0.88
ASML: 0.87
KLAC: 0.85
CEG:  0.82
```

---

### 2. Theme Momentum Tracking

```sql
-- Get latest theme momentum
SELECT name, observations 
FROM entities 
WHERE entity_type='pipeline_metric'
  AND name LIKE 'Theme_Momentum_%'
ORDER BY name DESC 
LIMIT 1;
```

**Output:**
```
Theme_Momentum_20251007:
["date=20251007", "GLP-1 Supply Chain:0.85", "AI Power:0.80", ...]
```

**Temporal Tracking:**
```sql
-- Compare theme momentum over time
SELECT name, observations 
FROM entities 
WHERE entity_type='pipeline_metric'
  AND name LIKE 'Theme_Momentum_%'
ORDER BY name DESC;
```

---

### 3. Discovery Pipeline Performance

```sql
-- Get pipeline conversion rates
SELECT name, observations
FROM entities
WHERE entity_type='pipeline_metric'
  AND name LIKE 'Pipeline_Metrics_%'
ORDER BY name DESC;
```

**Output:**
```
Pipeline_Metrics_20251007:
["date=20251007", "total_discoveries=52", "deep_dives=2", "conversion_rate=3.8%"]
```

**Analysis:**
```python
import sqlite3
conn = sqlite3.connect('knowledge_graph/knowledgegraph.db')

metrics = conn.execute('''
    SELECT name, observations 
    FROM entities 
    WHERE entity_type='pipeline_metric'
    ORDER BY name DESC
''').fetchall()

for name, obs in metrics:
    if 'Pipeline_Metrics' in name:
        print(name, obs)
```

---

### 4. Macro Regime Tracking

```sql
-- Get current macro regime
SELECT name, observations
FROM entities
WHERE entity_type='market_regime'
ORDER BY name DESC
LIMIT 1;
```

**Output:**
```
Market_Regime_20251007:
["date=20251007", "vix=17.3", "regime=Risk-On", ...]
```

**Trend Analysis:**
```sql
-- Track VIX trend
SELECT 
    name,
    json_extract(observations, '$[1]') AS vix,
    json_extract(observations, '$[2]') AS regime
FROM entities
WHERE entity_type='market_regime'
ORDER BY name DESC;
```

---

### 5. Central Bank Policy Tracker

```sql
-- Get latest Fed/ECB rates
SELECT name, observations
FROM entities
WHERE entity_type='central_bank_policy'
ORDER BY name DESC
LIMIT 3;
```

**Output:**
```
Fed_Policy_20251007: ["date=20251007", "bank=Fed", "rate=5.25-5.50%"]
ECB_Policy_20251007: ["date=20251007", "bank=ECB", "rate=4.50%"]
```

**Policy Change Detection:**
```python
fed_policies = conn.execute('''
    SELECT name, observations 
    FROM entities 
    WHERE name LIKE 'Fed_Policy_%'
    ORDER BY name DESC
''').fetchall()

for i in range(len(fed_policies)-1):
    curr = fed_policies[i][1]
    prev = fed_policies[i+1][1]
    if curr != prev:
        print(f"RATE CHANGE: {prev} → {curr}")
```

---

### 6. Geopolitical Risk Monitor

```sql
-- Check Taiwan/Middle East status
SELECT name, observations
FROM entities
WHERE entity_type='geopolitical_event'
ORDER BY name DESC;
```

**Output:**
```
Taiwan_Status_20251007: ["date=20251007", "region=Taiwan", "Routine (keine Spannungen)"]
MiddleEast_Status_20251007: ["date=20251007", "region=Middle East", "Kein Eskalation, Öl stabil"]
```

---

### 7. Commodity Price Trends

```sql
-- Track Gold/Oil prices
SELECT 
    name,
    json_extract(observations, '$[1]') AS commodity,
    json_extract(observations, '$[2]') AS price
FROM entities
WHERE entity_type='commodity_price'
ORDER BY name DESC;
```

**Output:**
```
Gold_Price_20251007: Gold, $3990
Oil_Price_20251007:  Oil,  $61.5
Gold_Price_20251002: Gold, $3892
```

**Price Change:**
```python
gold_prices = conn.execute('''
    SELECT name, observations 
    FROM entities 
    WHERE name LIKE 'Gold_Price_%'
    ORDER BY name DESC
''').fetchall()

import re
prices = []
for name, obs in gold_prices:
    match = re.search(r'\$?([\d,]+)', obs)
    if match:
        prices.append(int(match.group(1).replace(',', '')))

print(f"Gold Δ: ${prices[0]} - ${prices[-1]} = ${prices[0] - prices[-1]}")
```

---

### 8. Investment Thesis Retrieval

```sql
-- Get thesis for specific ticker
SELECT name, observations
FROM entities
WHERE entity_type='investment_thesis'
  AND name LIKE 'LRCX_Thesis_%'
ORDER BY name DESC
LIMIT 1;
```

**Output:**
```
LRCX_Thesis_20251007:
["ticker=LRCX", "date=20251007", "Duopoly in Etch & Deposition..."]
```

**All Theses:**
```sql
SELECT name, json_extract(observations, '$[0]') AS ticker
FROM entities
WHERE entity_type='investment_thesis'
ORDER BY name DESC;
```

---

### 9. TAM Sizing Database

```sql
-- Get all TAM estimates
SELECT 
    name,
    json_extract(observations, '$[0]') AS ticker,
    json_extract(observations, '$[2]') AS tam
FROM entities
WHERE entity_type='market_sizing'
ORDER BY name DESC;
```

**Output:**
```
NVDA_TAM_20251002: ticker=NVDA, tam=$1.2T
PLTR_TAM_20251001: ticker=PLTR, tam=$119B
APP_TAM_20251001:  ticker=APP,  tam=$15B
```

---

### 10. Portfolio Alerts & Losses

```sql
-- Get recent portfolio alerts
SELECT name, observations
FROM entities
WHERE entity_type='portfolio_alert'
ORDER BY name DESC;
```

**Output:**
```
Alert_ **APP (AppLovin)**_20251007: ["date=20251007", "ticker=APP", "performance=-11.49%"]
Alert_ **Sector Rotation**_20251007: ["date=20251007", "Consumer Disc -2.0%"]
```

---

### 11. Trade Execution History

```sql
-- Get all trades for a ticker
SELECT name, observations
FROM entities
WHERE entity_type='trade_execution'
  AND name LIKE 'Trade_LRCX_%'
ORDER BY name DESC;
```

**All Trades by Date:**
```sql
SELECT 
    name,
    json_extract(observations, '$[0]') AS ticker,
    json_extract(observations, '$[1]') AS side,
    json_extract(observations, '$[2]') AS qty
FROM entities
WHERE entity_type='trade_execution'
ORDER BY name DESC;
```

---

### 12. Supply Chain Analysis

```sql
-- Get all supply_to relations
SELECT from_entity, to_entity
FROM relations
WHERE relation_type='supplier_to';
```

**Reverse Lookup (Who supplies NVDA?):**
```sql
SELECT from_entity AS supplier
FROM relations
WHERE to_entity='NVDA' 
  AND relation_type IN ('supplier_to', 'supplies_to', 'enables_manufacturing_for');
```

---

### 13. Sector Rotation Signals

```sql
-- Get latest sector snapshots
SELECT name, observations
FROM entities
WHERE entity_type='sector_snapshot'
ORDER BY name DESC
LIMIT 1;
```

**Sector Performance:**
```python
sector_snap = conn.execute('''
    SELECT observations 
    FROM entities 
    WHERE name LIKE 'Sector_Snapshot_%'
    ORDER BY name DESC 
    LIMIT 1
''').fetchone()

import json
obs = json.loads(sector_snap[0])
for line in obs:
    if 'XL' in line:  # Sector ETFs
        print(line)
```

---

### 14. M&A Activity Monitor

```sql
-- Get M&A activity by date
SELECT name, observations
FROM entities
WHERE entity_type='market_event'
  AND name LIKE 'MA_Activity_%'
ORDER BY name DESC;
```

---

### 15. Full Graph Export (for Analysis)

```python
import sqlite3
import json

conn = sqlite3.connect('knowledge_graph/knowledgegraph.db')

# Get all entities
entities = conn.execute('''
    SELECT name, entity_type, observations, tags
    FROM entities
    WHERE project='alpaca-bot'
''').fetchall()

# Get all relations
relations = conn.execute('''
    SELECT from_entity, to_entity, relation_type
    FROM relations
    WHERE project='alpaca-bot'
''').fetchall()

print(f"Entities: {len(entities)}")
print(f"Relations: {len(relations)}")

# Export to JSON
data = {
    "entities": [
        {
            "name": e[0],
            "type": e[1],
            "observations": json.loads(e[2]),
            "tags": json.loads(e[3])
        }
        for e in entities
    ],
    "relations": [
        {"from": r[0], "to": r[1], "type": r[2]}
        for r in relations
    ]
}

with open('graph_export.json', 'w') as f:
    json.dump(data, f, indent=2)
```

---

## 🚀 ADVANCED QUERIES

### Conviction Trend Analysis

```python
import sqlite3
import json
import re

conn = sqlite3.connect('knowledge_graph/knowledgegraph.db')

# Get all convictions for a ticker
convictions = conn.execute('''
    SELECT name, observations
    FROM entities
    WHERE entity_type='conviction_entry'
    AND name LIKE 'LRCX_Conviction_%'
    ORDER BY name ASC
''').fetchall()

for name, obs in convictions:
    date = re.search(r'(\d{8})', name).group(1)
    obs_list = json.loads(obs)
    conviction = [o for o in obs_list if 'conviction' in o.lower()][0]
    print(f"{date}: {conviction}")
```

### Theme → Companies → Trades Pipeline

```python
# Find all companies in a theme, then their trades
theme = 'theme_glp1_supply_chain'

# Get companies in theme
companies = conn.execute('''
    SELECT to_entity
    FROM relations
    WHERE from_entity = ? AND relation_type IN ('implements', 'follows')
''', (theme,)).fetchall()

print(f"Companies in {theme}:")
for company in companies:
    ticker = company[0]
    
    # Get trades for company
    trades = conn.execute('''
        SELECT name FROM entities
        WHERE entity_type='trade_execution'
        AND name LIKE 'Trade_' || ? || '_%'
    ''', (ticker,)).fetchall()
    
    print(f"  {ticker}: {len(trades)} trades")
```

---

## 📝 BEST PRACTICES

### 1. Always filter by project
```sql
WHERE project='alpaca-bot'
```

### 2. Use LIKE for temporal entities
```sql
WHERE name LIKE 'Fed_Policy_%'  -- All Fed policies
WHERE name LIKE '%_20251007'    -- All from 2025-10-07
```

### 3. Parse JSON observations in Python
```python
import json
obs_list = json.loads(observations_string)
```

### 4. Order by name DESC for latest
```sql
ORDER BY name DESC  -- Newest first (YYYYMMDD format)
```

### 5. Use entity_type for fast filtering
```sql
WHERE entity_type='company'  -- Indexed, fast
```

---

## 🎯 FAZIT

**Der Graph enthält ALLES:**
- ✅ Companies, Themes, Convictions
- ✅ Trades, Orders, Portfolio Decisions
- ✅ Central Bank Policies, Geopolitics
- ✅ Commodity Prices, Market Regime
- ✅ Investment Theses, TAM Sizing
- ✅ Pipeline Metrics, Theme Momentum

**Keine Markdown-Files mehr nötig!**

**Query it all with SQL!** 🚀


