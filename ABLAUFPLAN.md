# 📅 WÖCHENTLICHER ABLAUFPLAN — Alpaca Trading Bot

**Alle Commands, alle Rules, vollständige Übersicht**

---

## 🗓️ **WOCHENPLAN**

| Tag | Zeit | Command | Output | Rules (gelesen) |
|-----|------|---------|--------|-----------------|
| **Sonntag** | 19:30 | `/graph-insights` | Graph Analysis Report | graph_analyst |
| **Sonntag** | 20:00 | `/weekly-discovery` | Top 20 Candidates (Theme-Driven!) | crawler_theme_supply_chain, crawler_social_sentiment, crawler_earnings, crawler_insiders, crawler_volume, crawler_ipos, crawler_innovation, crawler_supply_chain, crawler_52w_high, crawler_options_flow, crawler_analyst_upgrades, extractor |
| **Sonntag** | 21:00 | `/deep-dive` | 3-5 Deep Dives (Top Scorers) | deep_dive, extractor |
| **Montag** | 08:00 | `/daily-research` | 5 Memos + Graph (inkl. Deep Dive Findings) | macro_analyst, sector_rotation, news_monitor, markets_ta, risk_officer, extractor |
| **Montag** | 08:15 | `/learn` | Learning Log | *(reflects on last execution)* |
| **Montag** | 14:00 | `/synthesize` | Tilts (inkl. neue Candidates) | synthesizer |
| **Montag** | 15:25 | `/execute-paper` | Orders | executor |
| **Di-Do** | 08:00 | `/daily-research` | Daily Flow | Same as Monday |
| **Di-Do** | 14:00 | `/synthesize` | Daily Flow | Same as Monday |
| **Di-Do** | 15:25 | `/execute-paper` | Daily Flow | Same as Monday |
| **Freitag** | 22:00 | `/post-mortem` | Weekly Review | *(manual: analyze exits)* |
| **Freitag** | 22:30 | `/btc-alpha` | BTC Performance | *(manual: calculate BTC Alpha)* |
| **Letzter Sonntag** | 23:00 | `/graph-maintenance` | Graph Cleanup Report | graph_maintainer |

---

## 📊 **COMMAND DETAILS**

---

### 🔍 **1. `/weekly-discovery`**

**Frequenz**: Sonntag 20:00  
**Dauer**: ~5-10 min (X-MCP macht es langsam)  
**Output**: Top 20 Candidates

#### **Rules (Reihenfolge der Ausführung)**:

| # | Rule File | Role | X-MCP? | Output |
|---|-----------|------|--------|--------|
| 1 | `crawler_social_sentiment.mdc` | Social Sentiment Crawler | ✅ (3 searches) | `discovery/social/sentiment-YYYYMMDD.json` |
| 2 | `crawler_earnings.mdc` | Earnings Screener | ❌ | `discovery/earnings/candidates-YYYYMMDD.json` |
| 3 | `crawler_insiders.mdc` | Insider Activity | ❌ | `discovery/insiders/candidates-YYYYMMDD.json` |
| 4 | `crawler_volume.mdc` | Unusual Volume | ❌ | `discovery/volume/candidates-YYYYMMDD.json` |
| 5 | `crawler_ipos.mdc` | IPO Pipeline | ❌ | `discovery/ipos/candidates-YYYYMMDD.json` |
| 6 | `crawler_innovation.mdc` | Innovation Signals | ✅ (3 searches) | `discovery/innovation/innovation-YYYYMMDD.json` |
| 7 | `crawler_supply_chain.mdc` | Supply Chain Signals | ❌ | `discovery/supply_chain/signals-YYYYMMDD.json` |
| 8 | `crawler_52w_high.mdc` | 52-Week High Breakouts | ❌ | `discovery/52w_high/candidates-YYYYMMDD.json` |
| 9 | `crawler_options_flow.mdc` | Unusual Options Activity | ✅ (3 searches) | `discovery/options_flow/candidates-YYYYMMDD.json` |
| 10 | `crawler_analyst_upgrades.mdc` | Analyst Upgrades | ❌ | `discovery/analyst_upgrades/candidates-YYYYMMDD.json` |
| 11 | `extractor.mdc` | Graph Enrichment | ❌ | Knowledge Graph (entities + relations) |

**Composite Score Formula (UPDATED)**:
```
social*0.15 + earnings*0.20 + insiders*0.10 + volume*0.08 + 
ipos*0.08 + innovation*0.15 + supply_chain*0.04 +
breakout_52w*0.10 + options_flow*0.05 + analyst*0.05
```

**Expected Universe**: 50-100+ unique candidates/week (statt 8!)

**Why 3 New Crawlers**:
- **52w High**: Momentum stocks OUTSIDE MAG7 (Russell 2000, sector leaders)
- **Options Flow**: Smart money positioning (institutional $500k+ premiums)
- **Analyst Upgrades**: Wall Street validation (Bulge Bracket firms)

**Final Output**: `discovery/ranked_candidates-YYYYMMDD.json`

---

### 🔬 **2. `/deep-dive`**

**Frequenz**: Sonntag 21:00  
**Dauer**: ~10-15 min  
**Auslöser**: Score >0.70 aus `/weekly-discovery`

#### **Rules**:

| # | Rule File | Role | Input | Output |
|---|-----------|------|-------|--------|
| 1 | `deep_dive.mdc` | Deep Dive Analyst | Knowledge Graph (Discovery Signals) + yfinance + Web Search | `research/deep_dives/{TICKER}/YYYYMMDD.md` |
| 2 | `extractor.mdc` | Graph Enrichment | Deep Dive Memo | Knowledge Graph (DeepDive entities) |

**Output**: 3-5 Deep Dive Memos (Top Scored Candidates)

---

### 📰 **3. `/daily-research`**

**Frequenz**: Montag-Freitag 08:00  
**Dauer**: ~10 min  
**Output**: 5 Memos + Graph

#### **Rules (Reihenfolge der Ausführung)**:

| # | Rule File | Role | X-MCP? | Output |
|---|-----------|------|--------|--------|
| 1 | `macro_analyst.mdc` | Macro Research | ✅ (3 searches: Fed/ECB/China) + Web Search | `research/macro/YYYYMMDD-macro-memo.md` |
| 2 | `sector_rotation.mdc` | Sector Rotation | ❌ | `research/sectors/YYYYMMDD-sector-rotation.md` |
| 3 | `news_monitor.mdc` | News Monitoring | ✅ (3 searches: M&A/Regulatory/Insider) + Web Search | `research/news/YYYYMMDD-news-digest.md` |
| 4 | `markets_ta.mdc` | Markets/TA Analysis | ❌ | `research/markets/YYYYMMDD-markets-memo.md` |
| 5 | `risk_officer.mdc` | Risk Analysis | ❌ | `research/risk/YYYYMMDD-risk-report.md` |
| 6 | `extractor.mdc` | Graph Enrichment | ❌ | Knowledge Graph (entities + relations) |

**Critical Constraint**: ❌ NIEMALS Dummy-Daten (siehe Command File!)

---

### 🧠 **4. `/learn`**

**Frequenz**: Nach jedem Command (optional, empfohlen nach `/daily-research`)  
**Dauer**: ~2-3 min  
**Output**: Learning Log

#### **Rules**:

| # | Rule File | Role | Input | Output |
|---|-----------|------|-------|--------|
| - | *(keine dedizierte Rule)* | Self-Reflection | Last command execution | `learnings/session-YYYYMMDD-HHMM.md` |

**Was es macht**:
- Reflektiert über letzte Ausführung
- Identifiziert Issues (Critical/Improvement/Nice-to-Have)
- Updated betroffene Rules/Commands
- Logged Learnings im Knowledge Graph

---

### 🎯 **5. `/synthesize`**

**Frequenz**: Montag-Freitag 14:00  
**Dauer**: ~3 min  
**Output**: Portfolio Tilts

#### **Rules**:

| # | Rule File | Role | Input | Output |
|---|-----------|------|-------|--------|
| 1 | `synthesizer.mdc` | Portfolio Synthesis | Knowledge Graph + Risk Report | `decisions/tilts/YYYYMMDD-tilts.md` |

**Was es macht**:
- Queries Knowledge Graph (themes, companies, deep dives)
- Reads Risk Report
- Synthesizes conviction-based tilts
- Validates constraints (max 20% per position, turnover <10%)

---

### ⚡ **6. `/execute-paper`**

**Frequenz**: Montag-Freitag 15:25 (vor US Market Open)  
**Dauer**: ~3 min  
**Output**: Orders (PAPER TRADING default!)

#### **Rules**:

| # | Rule File | Role | Input | Output |
|---|-----------|------|-------|--------|
| 1 | `executor.mdc` | Order Execution | Tilts + Alpaca Portfolio | `execution/orders/YYYYMMDD-orders.json` + `execution/logs/YYYYMMDD-execution.jsonl` |

**Safety**:
- 🔴 Default: PAPER TRADING
- ⚠️ Live: Requires `CONFIRM LIVE YYYY-MM-DD`
- 🛑 NEVER executes without user confirmation

---

### 🔄 **7. `/full-pipeline`**

**Frequenz**: Täglich (kombiniert 3 + 5 + 6)  
**Dauer**: ~15-20 min  
**Output**: Research → Tilts → Orders

#### **Rules (alle aus `/daily-research`, `/synthesize`, `/execute-paper`)**:

Führt aus:
1. `/daily-research` (6 rules)
2. `/synthesize` (1 rule)
3. `/execute-paper` (1 rule)

**Total Rules**: 8 (macro_analyst, sector_rotation, news_monitor, markets_ta, risk_officer, extractor, synthesizer, executor)

---

### 📊 **8. `/post-mortem`**

**Frequenz**: Freitag 22:00 (Weekly Review)  
**Dauer**: ~5-8 min  
**Usage**: `/post-mortem TICKER EXIT_DATE`

#### **Rules**:

| # | Rule File | Role | Input | Output |
|---|-----------|------|-------|--------|
| - | *(keine dedizierte Rule)* | Trade Review | Knowledge Graph + Conviction Ledger + Execution Logs | `convictions/post_mortems/{TICKER}_{EXIT_DATE}_post-mortem.md` |

**Was es macht**:
- Analyze abgeschlossenen Trade (Entry/Exit)
- Calculate Performance (USD + BTC Alpha)
- Thesis vs. Reality
- What Worked / What Missed
- Lessons Learned → Update Criteria

---

### ₿ **9. `/btc-alpha`**

**Frequenz**: Freitag 22:30 (Weekly Review)  
**Dauer**: ~3-5 min  
**Output**: BTC Performance Report

#### **Rules**:

| # | Rule File | Role | Input | Output |
|---|-----------|------|-------|--------|
| - | *(keine dedizierte Rule)* | BTC Accounting | Alpaca Portfolio + BTC Prices + Conviction Ledger | `btc_accounting/YYYYMMDD-btc-alpha.md` |

**Was es macht**:
- Calculate BTC Alpha für alle Positionen
- Outperform vs. Bitcoin (Ziel: BTC Alpha > 0)
- Recommendations (Increase/Reduce/Hold)
- Cash → BTC Conversion?

---

### 📊 **10. `/graph-insights`**

**Frequenz**: Sonntag 19:30 (VOR Weekly Discovery!)  
**Dauer**: ~10-15 min  
**Output**: Graph Analysis Report

#### **Rules**:

| # | Rule File | Role | Input | Output |
|---|-----------|------|-------|--------|
| 1 | `graph_analyst.mdc` | Graph Analyst | Knowledge Graph | `insights/graph/YYYYMMDD-graph-insights.md` |

**Was es macht**:
- **Strukturelle Metriken**: Entities, Relations, Orphaned Nodes, Connectivity
- **Qualitätsmetriken**: Tag Coverage, Observation Density, Timeliness
- **Theme Momentum**: 7d vs prev 7d (Mermaid Chart)
- **Discovery Pipeline**: Conversion rates (Discovery → Deep Dive → Tilt)
- **Pattern Recognition**: Contradictions, Research Gaps, Missing Relations
- **Actionable Recommendations**: Prioritized (High/Medium/Low)

**Wissenschaftliche Basis**:
- Graph Theory (Connectivity, Centrality)
- KG Quality Metrics (Zaveri et al., 2016)
- Memgraph/Google Cloud Best Practices

---

### 🧹 **11. `/graph-maintenance`**

**Frequenz**: Letzter Sonntag des Monats 23:00  
**Dauer**: ~15-20 min  
**Output**: Graph Cleanup Report

#### **Rules**:

| # | Rule File | Role | Input | Output |
|---|-----------|------|-------|--------|
| 1 | `graph_maintainer.mdc` | Graph Maintainer | Knowledge Graph | `maintenance/graph/YYYYMMDD-maintenance-report.md` |

**Was es macht**:
- **Deduplication**: Exact (auto), Fuzzy (review), Semantic (high-conf auto)
- **Cleanup**: Orphaned Nodes, Incomplete Entities (<3 obs), Bloated (>20 obs), Stale (>90d)
- **Enhancement**: Missing Tags, Implied Relations, Observation Enrichment
- **Optimization**: Tag Standardization (ISO 8601, lowercase_with_underscores)

**Wissenschaftliche Basis**:
- Data Quality Framework (Zaveri et al.)
- Entity Resolution (W3C Semantic Web)
- Graph Database Best Practices (Memgraph, Neo4j, Google Cloud)

---

## 🔍 **RULES COVERAGE CHECK**

| Rule File | Verwendet von Command(s) | Abgedeckt? |
|-----------|---------------------------|------------|
| `macro_analyst.mdc` | `/daily-research`, `/full-pipeline` | ✅ |
| `sector_rotation.mdc` | `/daily-research`, `/full-pipeline` | ✅ |
| `news_monitor.mdc` | `/daily-research`, `/full-pipeline` | ✅ (X-MCP!) |
| `markets_ta.mdc` | `/daily-research`, `/full-pipeline` | ✅ |
| `risk_officer.mdc` | `/daily-research`, `/full-pipeline` | ✅ |
| `extractor.mdc` | `/daily-research`, `/weekly-discovery`, `/deep-dive`, `/full-pipeline` | ✅ |
| `synthesizer.mdc` | `/synthesize`, `/full-pipeline` | ✅ |
| `executor.mdc` | `/execute-paper`, `/full-pipeline` | ✅ |
| `deep_dive.mdc` | `/deep-dive` | ✅ |
| `crawler_social_sentiment.mdc` | `/weekly-discovery` | ✅ (X-MCP!) |
| `crawler_earnings.mdc` | `/weekly-discovery` | ✅ |
| `crawler_insiders.mdc` | `/weekly-discovery` | ✅ |
| `crawler_volume.mdc` | `/weekly-discovery` | ✅ |
| `crawler_ipos.mdc` | `/weekly-discovery` | ✅ |
| `crawler_innovation.mdc` | `/weekly-discovery` | ✅ (X-MCP!) |
| `crawler_supply_chain.mdc` | `/weekly-discovery` | ✅ |
| `crawler_52w_high.mdc` | `/weekly-discovery` | ✅ |
| `crawler_options_flow.mdc` | `/weekly-discovery` | ✅ (X-MCP!) |
| `crawler_analyst_upgrades.mdc` | `/weekly-discovery` | ✅ |
| `graph_analyst.mdc` | `/graph-insights` | ✅ |
| `graph_maintainer.mdc` | `/graph-maintenance` | ✅ |

**✅ ALLE 21 RULES SIND VON MINDESTENS EINEM COMMAND ABGEDECKT!**

---

## 🚀 **X-MCP INTEGRATION SUMMARY**

**Total X-MCP Searches pro Woche**:

| Command | Crawler/Rule | X-MCP Searches | Expected Time |
|---------|--------------|----------------|---------------|
| `/weekly-discovery` (1x) | `crawler_social_sentiment` | 3 | ~30-60s |
| `/weekly-discovery` (1x) | `crawler_innovation` | 3 | ~45-60s |
| `/weekly-discovery` (1x) | `crawler_options_flow` | 3 | ~30-45s |
| `/daily-research` (5x) | `macro_analyst` | 3 (Fed/ECB/China) | ~45-90s |
| `/daily-research` (5x) | `news_monitor` | 3 (M&A/Reg/Insider) | ~30-45s |

**Total pro Woche**: 
- Weekly Discovery: 9 searches (Social + Innovation + Options Flow)
- Daily Research: 6 searches/day × 5 days = 30 searches (Macro + News)
- **TOTAL: 39 X-MCP Searches/week**

**Total Zeit**: ~10-18 min/week (verteilt über Woche)  
**Information Density**: SEHR HOCH (Early signals, Sentiment, Historical context)

---

## 📁 **OUTPUT FILE STRUCTURE**

```
alpaca-bot/
├── research/
│   ├── macro/YYYYMMDD-macro-memo.md
│   ├── sectors/YYYYMMDD-sector-rotation.md
│   ├── news/YYYYMMDD-news-digest.md
│   ├── markets/YYYYMMDD-markets-memo.md
│   ├── risk/YYYYMMDD-risk-report.md
│   └── deep_dives/{TICKER}/YYYYMMDD.md
├── discovery/
│   ├── social/sentiment-YYYYMMDD.json
│   ├── earnings/candidates-YYYYMMDD.json
│   ├── insiders/candidates-YYYYMMDD.json
│   ├── volume/candidates-YYYYMMDD.json
│   ├── ipos/candidates-YYYYMMDD.json
│   ├── innovation/innovation-YYYYMMDD.json
│   ├── supply_chain/signals-YYYYMMDD.json
│   └── ranked_candidates-YYYYMMDD.json
├── decisions/
│   └── tilts/YYYYMMDD-tilts.md
├── execution/
│   ├── orders/YYYYMMDD-orders.json
│   └── logs/YYYYMMDD-execution.jsonl
├── convictions/
│   ├── {TICKER}_ledger.jsonl
│   └── post_mortems/{TICKER}_{EXIT_DATE}_post-mortem.md
├── btc_accounting/
│   ├── YYYYMMDD-btc-alpha.md
│   ├── positions_btc.json
│   └── alpha_tracking.jsonl
├── insights/
│   └── graph/YYYYMMDD-graph-insights.md
├── maintenance/
│   └── graph/YYYYMMDD-maintenance-report.md
└── learnings/
    ├── session-YYYYMMDD-HHMM.md
    └── backlog.md
```

---

## ⚙️ **TOKEN BUDGET (Weekly)**

| Command | Frequency | Tokens/Run | Total/Week |
|---------|-----------|------------|------------|
| `/graph-insights` | 1x | ~10k | 10k |
| `/weekly-discovery` | 1x | ~15k | 15k |
| `/deep-dive` | 1x (3-5 tickers) | ~25k | 25k |
| `/daily-research` | 5x | ~30k | 150k |
| `/synthesize` | 5x | ~12k | 60k |
| `/execute-paper` | 5x | ~10k | 50k |
| `/learn` | 5x | ~3k | 15k |
| `/post-mortem` | 1x | ~8k | 8k |
| `/btc-alpha` | 1x | ~5k | 5k |
| `/graph-maintenance` | 0.25x (monatlich) | ~12k | 3k |
| **TOTAL** | - | - | **341k/week** |

**Cost (Claude 3.5 Sonnet)**:
- Input: $3/M tokens
- Output: $15/M tokens
- **~$1.00 - $5.00/week** (je nach Input/Output Ratio)

---

## 🎯 **ERFOLGS-KRITERIEN**

Nach 1 Woche Betrieb:

✅ **Discovery**:
- Min 10 Candidates/week
- Min 2 Deep Dives (Score >0.70)

✅ **Research**:
- 5 Daily Memos (Montag-Freitag)
- Knowledge Graph: +50 entities/week

✅ **Execution**:
- Min 3 Trades/week (Paper Trading)
- All trades logged (execution/logs/*.jsonl)

✅ **Learning**:
- Min 1 `/learn` session/week
- Min 1 Post-Mortem/exit
- BTC Alpha tracked weekly

✅ **X-MCP**:
- Social Sentiment: Min 5 tickers discovered/week
- Innovation: Min 3 product launches tracked/week
- News Monitor: Breaking M&A 6-24h früher als traditional news

---

## 🔧 **NÄCHSTE SCHRITTE**

1. ✅ **JETZT**: `/weekly-discovery` ausführen (testet X-MCP Integration)
2. ⏳ **Danach**: Evaluiere Qualität (Graph + Discovery Files)
3. 🚀 **Dann**: Full Week Trial (Montag-Freitag Daily Flow)

**Bereit für `/weekly-discovery`?** 🎯

