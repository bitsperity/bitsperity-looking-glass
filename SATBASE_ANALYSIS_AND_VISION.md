# Satbase: Tiefe Analyse & Vision

**Datum**: 2025-10-24  
**Status**: Funktional, aber unvollständig

---

## 🔍 AKTUELLE PROBLEME

### 1. **FRED Macro Data - Komplett Leer**
**Problem**: Das Backend gibt IMMER leere Daten zurück
```python
# Line 60: scan_parquet_glob sucht nach Daten die NICHT EXISTIEREN
df = lf.collect().filter(pl.col("series_id") == series_id)
# ColumnNotFoundError: unable to find column "series_id"
```

**Root Cause**: 
- Keine FRED Daten wurden jemals ingested!
- Der `enqueue_macro_fred` wird nur bei "miss" gecallt (Line 64)
- Aber das liefert 202 Accepted zurück statt zu warten
- **Agent bekommt NIE die Daten!**

**Impact**: 🔴 KRITISCH
- GDP, Arbeitslosigkeit, Inflation = ALLES LEER
- Agent kann KEINE makroökonomische Analyse machen
- Kein Verständnis der Wirtschaftslage möglich

---

### 2. **Watchlist - Konzept Unklar**

**Aktueller Stand**:
```json
{
  "items": [
    {"symbol": "NVDA", "added_at": "2025-10-22", "expires_at": "2026-10-22"}
  ]
}
```

**Was fehlt**:
- ❌ Keine automatische News-Suche für Watchlist-Tickers
- ❌ Keine automatische Price-Ingestion
- ❌ Keine "Refresh All Watchlist" Funktion
- ❌ Kein Scheduler der täglich die Watchlist abarbeitet
- ❌ Kein Signal an Satbase: "Diese Ticker sind wichtig!"

**Soll-Zustand**:
```typescript
// Agent fügt Ticker hinzu
await satbase.addWatchlist({
  symbols: ['NVDA', 'AMD'],
  ingest: true,  // ← Sofort Prices + News holen
  ttl_days: 30
});

// Satbase sollte AUTOMATISCH:
// 1. Täglich neue Prices fetchen
// 2. News mit diesen Tickers priorisieren
// 3. Bei Earnings Alerts generieren
```

**Impact**: 🟡 MITTEL
- Watchlist ist aktuell nur eine "dumb list"
- Kein automatischer Workflow
- Agent muss alles manuell triggern

---

### 3. **News Topics - Rudimentär**

**Aktuell**: Nur GET/POST Endpoints, keine Integration

**Was fehlt**:
- ❌ Keine automatische News-Ingestion basierend auf Topics
- ❌ Kein "Refresh Topics" Scheduler
- ❌ Keine Topic → News Correlation

**Soll-Zustand**:
```typescript
// Agent definiert wichtige Themen
await satbase.addTopics({
  queries: ['AI chips earnings', 'Fed rate decision', 'China tariffs'],
  ingest: true,  // ← Sofort News holen
  hours: 24
});

// Satbase sollte:
// 1. Stündlich nach diesen Topics suchen
// 2. Relevante News automatisch einsammeln
// 3. Bei neuen wichtigen News: Alert
```

---

### 4. **Fehlende Helper Endpoints**

#### 4.1 **Ticker Symbol Discovery**
```
❌ FEHLT: /v1/prices/search?q=nvidia
❌ FEHLT: /v1/prices/popular (Top 100 Most Traded)
❌ FEHLT: /v1/prices/sectors (Sector Overview)
```

**Problem**: Agent weiß nicht welche Ticker existieren!

#### 4.2 **FRED Browse & Discover**
```
❌ FEHLT: /v1/macro/fred/categories (Economic Indicators by Category)
❌ FEHLT: /v1/macro/fred/popular (Most Popular Series)
❌ FEHLT: /v1/macro/fred/related/{series_id} (Related Series)
```

**Problem**: FRED Search gibt nur IDs zurück, aber Agent weiß nicht was es gibt!

#### 4.3 **News Analytics**
```
❌ FEHLT: /v1/news/trending (Most Mentioned Tickers Today)
❌ FEHLT: /v1/news/sentiment/{ticker} (Sentiment Analysis)
❌ FEHLT: /v1/news/timeline/{ticker} (News Timeline)
❌ FEHLT: /v1/news/clusters (Story Clustering)
```

**Problem**: News sind nur rohe Daten, keine Insights!

#### 4.4 **Data Quality & Freshness**
```
❌ FEHLT: /v1/status/coverage (Welche Ticker haben Daten? Wie aktuell?)
❌ FEHLT: /v1/status/gaps (Fehlende Daten identifizieren)
❌ FEHLT: /v1/status/staleness (Wie alt sind die Daten?)
```

**Problem**: Agent weiß nicht ob Daten vollständig/aktuell sind!

---

## 🎯 VISION: SATBASE ALS CRAWLER ENGINE

### Core Philosophie
> **"Satbase ist das Google für Trading Signals"**
> - Automatisch crawlen was wichtig ist
> - Intelligent priorisieren
> - Agents signalisieren: "Hier ist was Neues!"

---

### 1. **Intelligente Watchlist (Phase 1)**

#### Feature: Auto-Refresh
```python
# Satbase Backend: Neuer Scheduler
@cron('0 7 * * *')  # Täglich 7:00 UTC
async def refresh_watchlist():
    watchlist = get_active_watchlist()
    
    for ticker in watchlist:
        # 1. Latest prices
        await ingest_prices(ticker, days=1)
        
        # 2. Latest news
        await ingest_news(query=ticker, hours=24)
        
        # 3. Check earnings calendar
        if is_earnings_week(ticker):
            await ingest_news(query=f"{ticker} earnings", hours=72)
```

#### Feature: Smart Expiration
```python
# Tickers mit wenig Activity → Auto-Remove
if ticker.last_news_count < 5 and days_since_added > 7:
    logger.info(f"Removing quiet ticker: {ticker}")
    remove_from_watchlist(ticker)
```

#### New Endpoints
```
POST /v1/watchlist/refresh         # Trigger manual refresh
GET  /v1/watchlist/status          # Show coverage stats
POST /v1/watchlist/bulk            # Add from file/list
```

---

### 2. **Topic Monitoring System (Phase 1)**

#### Feature: Continuous Monitoring
```python
@cron('0 * * * *')  # Jede Stunde
async def monitor_topics():
    topics = get_active_topics()
    
    for topic in topics:
        # Latest news für dieses Topic
        news = await search_news(topic.query, hours=1)
        
        if len(news) > 0:
            logger.info(f"New articles for topic '{topic.query}': {len(news)}")
            
            # Wenn wichtiges Event (z.B. viele News auf einmal)
            if len(news) > 10:
                await create_alert(topic, news)
```

#### New Endpoints
```
POST /v1/news/topics/refresh       # Trigger manual refresh
GET  /v1/news/topics/alerts        # Get recent alerts
POST /v1/news/topics/smart         # AI-suggested topics based on trending news
```

---

### 3. **FRED Macro Intelligence (Phase 2)**

#### Feature: Pre-Populated Core Indicators
```python
# Satbase sollte DIESE automatisch haben (jeden Tag aktualisieren):
CORE_FRED_SERIES = [
    'GDP',       # Gross Domestic Product
    'GDPC1',     # Real GDP
    'UNRATE',    # Unemployment Rate
    'CPIAUCSL',  # CPI (Inflation)
    'FEDFUNDS',  # Federal Funds Rate
    'DGS10',     # 10-Year Treasury
    'DGS2',      # 2-Year Treasury
    'T10Y2Y',    # 10Y-2Y Spread (Recession Indicator)
    'DEXUSEU',   # USD/EUR
    'DCOILWTICO', # WTI Oil Price
    'M2SL',      # Money Supply M2
    'VIXCLS',    # VIX (Fear Index)
]

@cron('0 8 * * *')  # Täglich 8:00 UTC
async def refresh_core_indicators():
    for series_id in CORE_FRED_SERIES:
        await ingest_fred(series_id, days=7)  # Last week's data
```

#### Feature: FRED Categories & Browse
```python
# /v1/macro/fred/categories
FRED_CATEGORIES = {
    'inflation': ['CPIAUCSL', 'PCEPI', 'CPILFESL'],
    'employment': ['UNRATE', 'PAYEMS', 'ICSA'],
    'gdp': ['GDP', 'GDPC1', 'GDPPOT'],
    'interest_rates': ['FEDFUNDS', 'DGS10', 'DGS2', 'MORTGAGE30US'],
    'money_supply': ['M1SL', 'M2SL', 'WALCL'],
    'consumer': ['RSXFS', 'UMCSENT', 'PCE'],
    'manufacturing': ['INDPRO', 'MANEMP', 'ISM'],
}
```

#### New Endpoints
```
GET /v1/macro/fred/categories                    # List all categories
GET /v1/macro/fred/categories/{category}         # Get series in category
GET /v1/macro/fred/dashboard                     # Core indicators overview
GET /v1/macro/fred/series/{id}/metadata          # Full metadata
POST /v1/macro/fred/bulk                         # Fetch multiple series
GET /v1/macro/fred/compare?series=GDP,GDPC1      # Compare series
```

---

### 4. **News Intelligence (Phase 2)**

#### Feature: Ticker Mention Tracking
```python
# Automatisch tracken: Welche Tickers werden oft erwähnt?
@cron('0 */6 * * *')  # Alle 6 Stunden
async def analyze_news_trends():
    news_last_24h = get_news(hours=24)
    
    # Count ticker mentions
    ticker_counts = {}
    for article in news_last_24h:
        for ticker in article.tickers:
            ticker_counts[ticker] = ticker_counts.get(ticker, 0) + 1
    
    # Store trending tickers
    trending = sorted(ticker_counts.items(), key=lambda x: x[1], reverse=True)[:50]
    save_trending_tickers(trending)
```

#### Feature: Story Clustering
```python
# Gruppe ähnliche News zu "Stories"
# "NVDA Earnings Beat" → 15 articles
# "Fed Rate Decision" → 8 articles
# "China Tariffs" → 23 articles

async def cluster_news_stories(hours=24):
    news = get_news(hours=hours)
    embeddings = [embed(article.title + ' ' + article.text[:500]) for article in news]
    clusters = dbscan_clustering(embeddings, eps=0.3)
    
    stories = []
    for cluster_id, articles in clusters.items():
        story = {
            'title': extract_common_theme(articles),
            'article_count': len(articles),
            'tickers': list(set([t for a in articles for t in a.tickers])),
            'articles': articles
        }
        stories.append(story)
    
    return sorted(stories, key=lambda x: x['article_count'], reverse=True)
```

#### New Endpoints
```
GET /v1/news/trending/tickers                    # Top mentioned tickers (24h)
GET /v1/news/trending/topics                     # Top topics (24h)
GET /v1/news/stories                             # Clustered news stories
GET /v1/news/timeline/{ticker}?days=30           # News timeline
GET /v1/news/sentiment/{ticker}?days=7           # Sentiment over time
GET /v1/news/impact/{ticker}                     # News impact on price
GET /v1/news/peers/{ticker}                      # Co-mentioned tickers
```

---

### 5. **Data Quality & Coverage (Phase 3)**

#### Feature: Coverage Dashboard
```python
# Agent fragt: "Habe ich alle Daten?"
GET /v1/status/coverage
{
    "news": {
        "total_articles": 156789,
        "date_range": {"from": "2024-01-01", "to": "2025-10-24"},
        "tickers_covered": 4521,
        "gaps": [
            {"date": "2025-09-15", "reason": "Satbase downtime"}
        ]
    },
    "prices": {
        "tickers_with_data": 5231,
        "last_update": "2025-10-24 09:30:00",
        "stale_tickers": ["OBSCURE_PENNY_STOCK"]  # No update > 7 days
    },
    "macro": {
        "fred_series_count": 89,
        "last_update": "2025-10-23",
        "missing_core_indicators": ["T10Y2Y"]  # Should have but don't
    }
}
```

#### Feature: Smart Backfill
```python
# Automatisch Lücken füllen
@cron('0 2 * * 0')  # Jeden Sonntag 2:00 UTC
async def smart_backfill():
    gaps = identify_data_gaps()
    
    for gap in gaps:
        if gap.type == 'news' and gap.ticker_important:
            await backfill_news(gap.ticker, gap.from_date, gap.to_date)
        elif gap.type == 'prices' and gap.in_watchlist:
            await backfill_prices(gap.ticker, gap.from_date, gap.to_date)
```

#### New Endpoints
```
GET /v1/status/coverage                          # Complete data coverage
GET /v1/status/freshness                         # How fresh is data?
GET /v1/status/gaps                              # Missing data
POST /v1/status/backfill                         # Trigger smart backfill
GET /v1/status/health/detailed                   # Extended health check
```

---

### 6. **Smart Scheduler & Automation (Phase 3)**

#### Konzept: Zero-Config für Agents
```python
# Agent macht nur:
satbase.addWatchlist(['NVDA'])
satbase.addTopics(['AI regulation'])

# Satbase macht automatisch:
# - Täglich: Prices, News
# - Wöchentlich: Earnings Check
# - Monatlich: Fundamentals
# - Bei Events: Extra News Crawl
```

#### Scheduler Overview
```python
SATBASE_SCHEDULE = {
    'daily_07:00': [
        'refresh_watchlist_prices',
        'refresh_watchlist_news',
        'refresh_core_fred_indicators',
    ],
    'hourly': [
        'monitor_topics',
        'check_earnings_calendar',
    ],
    'every_6h': [
        'analyze_news_trends',
        'update_ticker_sentiment',
    ],
    'weekly_sunday_02:00': [
        'smart_backfill',
        'cleanup_expired_watchlist',
        'cleanup_expired_topics',
    ],
    'on_event': {
        'earnings_detected': 'fetch_extra_news_72h',
        'market_crash_detected': 'fetch_all_news',
        'fed_announcement': 'fetch_macro_commentary',
    }
}
```

---

## 📊 PRIORITÄTEN

### Phase 1: Foundations (1-2 Wochen)
1. ✅ **Fix FRED Ingestion** - Daten müssen ankommen!
2. ✅ **Core FRED Auto-Ingest** - 12 wichtigste Indicators täglich
3. ✅ **Watchlist Auto-Refresh** - Täglich Prices + News
4. ✅ **Topics Monitoring** - Stündlich neue News
5. ✅ **Coverage Endpoint** - Agent sieht Datenlücken

**Impact**: Agent hat ENDLICH Daten zum arbeiten!

### Phase 2: Intelligence (2-3 Wochen)
1. 🔄 **News Trending** - Was ist gerade wichtig?
2. 🔄 **Story Clustering** - News gruppieren
3. 🔄 **Ticker Co-mention** - Welche Stocks bewegen sich zusammen?
4. 🔄 **FRED Categories** - Browse Macro Data
5. 🔄 **Sentiment Tracking** - Positive/Negative News

**Impact**: Agent versteht KONTEXT, nicht nur rohe Daten!

### Phase 3: Autonomy (3-4 Wochen)
1. 🔮 **Event Detection** - Earnings, Fed Meetings auto-detected
2. 🔮 **Smart Backfill** - Lücken automatisch füllen
3. 🔮 **Alert System** - "Hey, wichtige News über NVDA!"
4. 🔮 **Peer Analysis** - "NVDA bewegt sich mit AMD, TSM"
5. 🔮 **Impact Calculation** - "Diese News bewegte NVDA +5%"

**Impact**: Agent ist PROAKTIV statt reaktiv!

---

## 🎯 SUCCESS METRICS

### Aktuell (Broken)
- ❌ FRED Data: 0% Coverage
- ❌ Watchlist: Passive List
- ❌ Topics: Passive List
- ❌ News: Raw Dump
- ❌ Agent: Muss alles manuell triggern

### Nach Phase 1
- ✅ FRED Data: 100% Core Indicators
- ✅ Watchlist: Auto-refreshed daily
- ✅ Topics: Monitored hourly
- ✅ News: Structured + Filtered
- ✅ Agent: Can trust the data exists

### Nach Phase 2
- 🚀 Agent: Understands trends
- 🚀 Agent: Sees correlations
- 🚀 Agent: Browses categories
- 🚀 Agent: Has context for decisions

### Nach Phase 3
- 🎯 Agent: Gets proactive alerts
- 🎯 Agent: Never misses events
- 🎯 Agent: Has complete world model
- 🎯 Agent: Makes data-driven decisions

---

## 💡 QUICK WINS (Heute starten!)

### 1. Fix FRED (30 min)
```python
# apps/satbase_api/routers/macro.py Line 60
# Problem: scan_parquet_glob findet keine Daten

# Quick Fix: Trigger ingestion ON EVERY MISS
if len(items) == 0:
    # WAIT for data instead of returning 202!
    await enqueue_and_wait_macro_fred(series_id, from_, to)
    df = lf.collect().filter(pl.col("series_id") == series_id)
    items = df.to_dicts()
```

### 2. Pre-populate Core FRED (1 hour)
```bash
# Script: Hole die 12 wichtigsten FRED Series
python -m scripts.ingest_core_fred
```

### 3. Watchlist Auto-Refresh (2 hours)
```python
# libs/satbase_core/scheduler.py
async def refresh_watchlist_job():
    watchlist = get_watchlist()
    for ticker in watchlist:
        await ingest_prices(ticker, days=1)
        await ingest_news(query=ticker, hours=24)
```

---

## 🔥 VISION STATEMENT

> **Satbase soll die Google Search Engine für Trading Signals sein:**
> 
> - **Proaktiv**: Holt Daten BEVOR der Agent fragt
> - **Intelligent**: Versteht was wichtig ist
> - **Vollständig**: Keine Lücken, keine Überraschungen
> - **Kontextual**: Liefert Insights, nicht nur Rohdaten
> - **Zuverlässig**: Agent kann darauf bauen
> 
> **Agents sollten Satbase vertrauen wie wir Google vertrauen:**
> "Wenn ich frage, bekomme ich die Antwort. Sofort. Vollständig. Relevant."

---

## 📋 NEXT STEPS

1. **JETZT**: Fix FRED Ingestion
2. **HEUTE**: Pre-populate Core FRED
3. **MORGEN**: Watchlist Auto-Refresh
4. **DIESE WOCHE**: Topics Monitoring + Coverage Endpoint
5. **NÄCHSTE WOCHE**: News Intelligence (Trending, Clustering)

**Dann haben wir ein MÄCHTIGES Satbase!** 🚀

