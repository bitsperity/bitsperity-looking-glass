# Satbase Scheduler Strategie: Vollständige Analyse & Entscheidungen

**Datum**: 2025-01-27  
**Status**: Strategische Analyse für Scheduler-Entwicklung

---

## 📊 AKTUELLER ZUSTAND

### Architektur-Übersicht

```
┌─────────────────────────────────────────────────────────────┐
│                    Satbase System                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐         ┌──────────────────┐         │
│  │  Backend API    │         │   Scheduler      │         │
│  │  (FastAPI)      │◄────────│  (APScheduler)   │         │
│  │  Port: 8080     │         │  (Separater     │         │
│  │                 │         │   Service)        │         │
│  └─────────────────┘         └──────────────────┘         │
│         │                             │                   │
│         │ BackgroundTasks              │ HTTP Calls        │
│         │                             │                   │
│         ▼                             ▼                   │
│  ┌──────────────────────────────────────────────┐          │
│  │      Ingestion Jobs (Non-blocking)          │          │
│  │  - News (unified daily/backfill)            │          │
│  │  - Prices (stooq/yfinance)                  │          │
│  │  - Macro (FRED)                             │          │
│  └──────────────────────────────────────────────┘          │
│                                                             │
│  ┌──────────────────────────────────────────────┐          │
│  │         Storage Layer (SQLite)                │          │
│  │  - news.db (News + Bodies)                   │          │
│  │  - prices.db (OHLCV Bars)                    │          │
│  │  - control.db (Watchlist + Topics)          │          │
│  └──────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### Aktuelle Scheduler-Jobs

| Job | Trigger | Funktion | Status |
|-----|---------|----------|--------|
| `watchlist_refresh` | Daily 7:00 UTC | Refresh Watchlist (Prices + News) | ✅ Aktiv |
| `topics_ingest` | Hourly | Per-Topic News Ingestion | ✅ Aktiv |
| `fred_daily` | Daily 8:00 UTC | Refresh FRED Core Indicators | ✅ Aktiv |
| `news_bodies_fetch` | Every 15 min | Fetch Missing News Bodies | ✅ Aktiv |
| `body_update_queue` | Every 30 sec | Process Body Update Queue | ✅ Aktiv |

### Watchlist-Mechanismus

**Aktuell:**
- Watchlist Items: `{type: 'stock'|'topic'|'macro', key: ticker/topic/series, enabled: bool, expires_at: date}`
- Refresh: Gruppiert nach Type, triggert Batch-Jobs
- **Problem**: Läuft nur wenn Watchlist Items existieren
- **Problem**: Keine automatische Gap-Detection für Prices

### Price-Ingestion-Status

**Aktuell:**
- **Adapter**: Stooq (Primary) + yfinance (Fallback)
- **Storage**: SQLite (`prices.db`) mit WAL mode
- **Delta-Logik**: Nur neue Tage über `latest_date`
- **Workflow**: `enqueue_prices_daily()` → Background Task → Stooq Fetch → SQLite Upsert
- **Status-Endpoint**: `/v1/prices/status/{ticker}` zeigt `latest_date`, `bar_count`, `missing_days`

**Probleme:**
- ❌ Kein automatischer Refresh für Watchlist-Tickers
- ❌ Keine automatische Gap-Detection für fehlende Tage
- ❌ Kein Backfill-Mechanismus für historische Lücken

### News-Ingestion-Status

**Aktuell:**
- **Unified Pipeline**: Daily + Backfill nutzen gleichen Code
- **Topic-basiert**: Watchlist Symbols werden als Topics behandelt
- **Gap Detection**: `/v1/news/gaps` Endpoint vorhanden
- **Backfill**: `/v1/ingest/news/backfill` Endpoint vorhanden
- **Frontend**: Maintenance UI für Gap Detection + Backfill vorhanden

**Probleme:**
- ❌ Kein automatischer Gap-Fill-Scheduler
- ❌ Gap Detection muss manuell getriggert werden

---

## 🎯 STRATEGISCHE FRAGEN & ANTWORTEN

### Frage 1: **Sollte der Scheduler extern als eigener Dienst laufen oder innerhalb des Satbase Backends als Background Task?**

#### ✅ **EMPFEHLUNG: Extern als eigener Dienst (aktueller Zustand beibehalten)**

**Begründung:**

1. **Separation of Concerns**
   - API-Server bleibt responsive (keine CPU-intensive Jobs blockieren Requests)
   - Scheduler kann unabhängig skaliert werden
   - Crash-Resilience: API-Crash ≠ Scheduler-Crash

2. **Monitoring & Debugging**
   - Separate Logs für Scheduler vs. API
   - Separate Container/Process = einfaches Restart ohne API-Beeinträchtigung
   - Resource-Quotas getrennt (Scheduler kann mehr CPU/Memory für Batch-Jobs nutzen)

3. **Deployment-Flexibilität**
   - Scheduler kann auf anderem Server laufen (z.B. Batch-Server)
   - API kann horizontal skaliert werden ohne Scheduler-Konflikte
   - Scheduler kann während API-Updates weiterlaufen

4. **Aktueller Zustand ist gut**
   - APScheduler ist bewährt und stabil
   - HTTP-API-Calls sind sauber abstrahiert
   - Keine grundlegenden Probleme mit aktueller Architektur

**Architektur-Entscheidung:**
```
✅ BEIBEHALTEN: Separater Scheduler-Service
   - apps/satbase_scheduler/ (APScheduler)
   - Kommunikation via HTTP zu Backend API
   - Separate Container im Docker Compose
```

**NICHT tun:**
- ❌ Scheduler in FastAPI BackgroundTasks integrieren (würde API blockieren)
- ❌ Cron-Jobs auf OS-Level (weniger kontrollierbar, schlechtere Error-Handling)

---

### Frage 2: **Wie pflegt er die Gegenwart (nur via Watchlist)?**

#### ✅ **EMPFEHLUNG: Multi-Channel Approach**

**Aktuelle Lösung:**
- ✅ Watchlist-basiert (täglich 7:00 UTC)
- ✅ Topics-basiert (stündlich)

**Probleme:**
- ❌ Wenn Watchlist leer ist → keine automatische Pflege
- ❌ Topics-Job nutzt Watchlist-Symbols (redundant mit Watchlist-Refresh)
- ❌ Keine proaktive Discovery wichtiger Tickers

**Empfohlene Strategie:**

#### **Channel 1: Watchlist-Driven (Primary)**
```python
# Täglich 7:00 UTC
@cron('0 7 * * *')
async def refresh_watchlist():
    """Refresh all active watchlist items"""
    items = get_active_watchlist_items()
    
    # Group by type
    stocks = [i for i in items if i['type'] == 'stock']
    topics = [i for i in items if i['type'] == 'topic']
    macro = [i for i in items if i['type'] == 'macro']
    
    # Refresh stocks (batch)
    if stocks:
        await enqueue_prices_daily([s['key'] for s in stocks])
        # News wird über topics_channel gecrawlt
    
    # Refresh topics (per-topic)
    for topic in topics:
        await enqueue_news(query=topic['key'], hours=24, topic=topic['key'])
    
    # Refresh macro
    if macro:
        await enqueue_macro_fred([m['key'] for m in macro])
```

#### **Channel 2: Trending Tickers (Secondary)**
```python
# Alle 6 Stunden
@cron('0 */6 * * *')
async def refresh_trending_tickers():
    """Refresh tickers trending in news (auto-discovery)"""
    trending = get_trending_tickers(hours=24, limit=20)
    
    # Add to temporary watchlist (24h TTL)
    for ticker in trending:
        if not in_watchlist(ticker):
            add_watchlist_item({
                'type': 'stock',
                'key': ticker,
                'label': f'Auto-discovered: {ticker}',
                'expires_at': datetime.now() + timedelta(hours=24),
                'enabled': True
            })
    
    # Refresh prices for trending
    await enqueue_prices_daily([t['ticker'] for t in trending])
```

#### **Channel 3: Core Indicators (Always-On)**
```python
# Täglich 8:00 UTC
@cron('0 8 * * *')
async def refresh_core_indicators():
    """Always refresh core FRED indicators (no watchlist needed)"""
    CORE_FRED = ['GDP', 'UNRATE', 'CPIAUCSL', 'FEDFUNDS', 'DGS10', ...]
    await enqueue_macro_fred(CORE_FRED)
```

**Implementierungs-Empfehlung:**

```python
# apps/satbase_scheduler/jobs/present.py

async def maintain_present():
    """
    Multi-channel maintenance of current data:
    1. Watchlist-driven (primary, daily)
    2. Trending discovery (secondary, 6h)
    3. Core indicators (always-on, daily)
    """
    results = {
        'watchlist': None,
        'trending': None,
        'core': None
    }
    
    # Channel 1: Watchlist (must succeed)
    try:
        results['watchlist'] = await refresh_watchlist()
    except Exception as e:
        logger.error(f"Watchlist refresh failed: {e}")
    
    # Channel 2: Trending (optional, can fail)
    try:
        results['trending'] = await refresh_trending_tickers()
    except Exception as e:
        logger.warning(f"Trending refresh failed: {e}")
    
    # Channel 3: Core (must succeed)
    try:
        results['core'] = await refresh_core_indicators()
    except Exception as e:
        logger.error(f"Core indicators refresh failed: {e}")
    
    return results
```

**Neue Scheduler-Jobs:**

| Job | Trigger | Funktion |
|-----|---------|----------|
| `present_watchlist` | Daily 7:00 UTC | Watchlist Refresh (Primary) |
| `present_trending` | Every 6h | Auto-discover trending tickers |
| `present_core` | Daily 8:00 UTC | Core FRED Indicators |

---

### Frage 3: **Wie pflegt er die Vergangenheit? Wir müssen Lücken füllen**

#### ✅ **EMPFEHLUNG: Intelligent Gap Detection + Prioritized Backfill**

**Aktuelle Situation:**
- ✅ Gap Detection vorhanden (`/v1/news/gaps`)
- ✅ Backfill Endpoint vorhanden (`/v1/ingest/news/backfill`)
- ❌ Kein automatischer Scheduler für Gap Filling
- ❌ Keine Gap Detection für Prices

**Strategie:**

#### **Gap Detection (Automatisch)**

```python
# Wöchentlich Sonntag 2:00 UTC
@cron('0 2 * * 0')
async def detect_gaps():
    """
    Detect gaps in:
    1. News coverage (by date)
    2. Price data (by ticker + date)
    3. Macro data (by series + date)
    """
    gaps = {
        'news': [],
        'prices': [],
        'macro': []
    }
    
    # News gaps
    news_gaps = await detect_news_gaps(
        from_date=date.today() - timedelta(days=365),
        to_date=date.today(),
        min_articles_per_day=10
    )
    gaps['news'] = news_gaps
    
    # Price gaps (for watchlist tickers)
    watchlist_tickers = get_watchlist_tickers(type='stock')
    for ticker in watchlist_tickers:
        price_gaps = await detect_price_gaps(ticker, days=90)
        if price_gaps:
            gaps['prices'].extend(price_gaps)
    
    # Macro gaps (for core indicators)
    core_series = CORE_FRED_SERIES
    for series_id in core_series:
        macro_gaps = await detect_macro_gaps(series_id, days=180)
        if macro_gaps:
            gaps['macro'].extend(macro_gaps)
    
    # Store gaps for prioritized backfill
    store_gaps(gaps)
    
    return gaps
```

#### **Prioritized Backfill (Automatisch)**

```python
# Täglich 3:00 UTC (low-traffic time)
@cron('0 3 * * *')
async def fill_gaps():
    """
    Fill gaps in priority order:
    1. Critical gaps (0 articles/days)
    2. Watchlist ticker gaps
    3. Core indicator gaps
    4. Low-severity gaps
    """
    gaps = load_stored_gaps()
    
    # Priority 1: Critical news gaps (0 articles)
    critical_news = [g for g in gaps['news'] if g['article_count'] == 0]
    for gap in critical_news[:5]:  # Max 5 per run
        await backfill_news(
            query='semiconductor OR chip OR AI',  # Default query
            from_date=gap['date'],
            to_date=gap['date'],
            max_articles_per_day=100
        )
    
    # Priority 2: Watchlist price gaps
    watchlist_price_gaps = [g for g in gaps['prices'] if g['in_watchlist']]
    for gap in watchlist_price_gaps[:10]:  # Max 10 per run
        await backfill_prices(
            ticker=gap['ticker'],
            from_date=gap['from_date'],
            to_date=gap['to_date']
        )
    
    # Priority 3: Core macro gaps
    core_macro_gaps = [g for g in gaps['macro'] if g['is_core']]
    for gap in core_macro_gaps[:5]:
        await backfill_macro(
            series_id=gap['series_id'],
            from_date=gap['from_date'],
            to_date=gap['to_date']
        )
```

**Neue Endpoints benötigt:**

```python
# GET /v1/prices/gaps/{ticker}?from=YYYY-MM-DD&to=YYYY-MM-DD
def detect_price_gaps(ticker: str, from_date: date, to_date: date):
    """Detect missing price days for a ticker"""
    db = PricesDB(...)
    existing_dates = set(db.get_dates(ticker, from_date, to_date))
    
    # Generate all trading days in range
    trading_days = get_trading_days(from_date, to_date)
    missing_days = [d for d in trading_days if d not in existing_dates]
    
    return {
        'ticker': ticker,
        'from': from_date,
        'to': to_date,
        'missing_days': missing_days,
        'total_days': len(trading_days),
        'covered_days': len(existing_dates),
        'coverage_percent': len(existing_dates) / len(trading_days) * 100
    }

# POST /v1/ingest/prices/backfill
async def backfill_prices(ticker: str, from_date: date, to_date: date):
    """Backfill historical price data"""
    # Use stooq/yfinance with historical range
    # Delta-logic: only fetch missing days
```

**Implementierungs-Plan:**

1. **Phase 1**: Price Gap Detection Endpoint
2. **Phase 2**: Automatic Gap Detection Scheduler (weekly)
3. **Phase 3**: Automatic Gap Filling Scheduler (daily, prioritized)
4. **Phase 4**: Frontend UI für Gap Monitoring

---

### Frage 4: **Wie pflegt er Price-Daten?**

#### ✅ **EMPFEHLUNG: Multi-Tier Price Maintenance**

**Aktuelle Situation:**
- ✅ Delta-basierte Ingestion (nur neue Tage)
- ✅ Status-Endpoint zeigt `latest_date`, `missing_days`
- ❌ Kein automatischer Refresh
- ❌ Kein automatischer Gap-Fill

**Strategie:**

#### **Tier 1: Watchlist Tickers (High Priority)**
```python
# Täglich 7:00 UTC (mit Watchlist-Refresh)
async def refresh_watchlist_prices():
    """Refresh prices for all watchlist tickers"""
    stocks = get_watchlist_items(type='stock', enabled=True)
    tickers = [s['key'] for s in stocks]
    
    if tickers:
        await enqueue_prices_daily(tickers)
```

#### **Tier 2: Trending Tickers (Medium Priority)**
```python
# Alle 6 Stunden
async def refresh_trending_prices():
    """Refresh prices for trending tickers"""
    trending = get_trending_tickers(hours=24, limit=20)
    tickers = [t['ticker'] for t in trending]
    
    if tickers:
        await enqueue_prices_daily(tickers)
```

#### **Tier 3: Gap Detection & Fill (Maintenance)**
```python
# Täglich 3:00 UTC
async def maintain_price_gaps():
    """Detect and fill price gaps for watchlist tickers"""
    stocks = get_watchlist_items(type='stock', enabled=True)
    
    for stock in stocks:
        ticker = stock['key']
        
        # Check last 90 days
        gaps = await detect_price_gaps(ticker, days=90)
        
        if gaps['missing_days']:
            # Fill gaps (max 30 days per run)
            missing = gaps['missing_days'][:30]
            if missing:
                await backfill_prices(
                    ticker=ticker,
                    from_date=min(missing),
                    to_date=max(missing)
                )
```

#### **Tier 4: Freshness Check (Alerting)**
```python
# Täglich 9:00 UTC (nach Market Open)
async def check_price_freshness():
    """Check if prices are fresh (updated within last 2 days)"""
    stocks = get_watchlist_items(type='stock', enabled=True)
    
    stale_tickers = []
    for stock in stocks:
        ticker = stock['key']
        status = await get_price_status(ticker)
        
        if status['latest_date']:
            days_old = (date.today() - status['latest_date']).days
            if days_old > 2:
                stale_tickers.append({
                    'ticker': ticker,
                    'latest_date': status['latest_date'],
                    'days_old': days_old
                })
    
    if stale_tickers:
        logger.warning(f"Stale prices detected: {stale_tickers}")
        # Optional: Trigger re-fetch
        await enqueue_prices_daily([t['ticker'] for t in stale_tickers])
```

**Price Maintenance Jobs:**

| Job | Trigger | Funktion | Priority |
|-----|---------|----------|----------|
| `prices_watchlist` | Daily 7:00 UTC | Refresh Watchlist Tickers | High |
| `prices_trending` | Every 6h | Refresh Trending Tickers | Medium |
| `prices_gaps` | Daily 3:00 UTC | Fill Price Gaps | Maintenance |
| `prices_freshness` | Daily 9:00 UTC | Check Freshness | Alerting |

**Neue Endpoints benötigt:**

```python
# GET /v1/prices/gaps/{ticker}?days=90
def get_price_gaps(ticker: str, days: int = 90):
    """Detect missing price days"""
    # Implementation siehe Frage 3

# POST /v1/ingest/prices/backfill
async def backfill_prices(ticker: str, from_date: date, to_date: date):
    """Backfill historical prices"""
    # Use stooq/yfinance with date range
    # Delta-logic: only fetch missing days
```

---

## 📋 IMPLEMENTIERUNGS-PLAN

### Phase 1: Price Gap Detection & Backfill (1-2 Tage)

**Tasks:**
1. ✅ Implementiere `GET /v1/prices/gaps/{ticker}` Endpoint
2. ✅ Implementiere `POST /v1/ingest/prices/backfill` Endpoint
3. ✅ Teste Gap Detection mit Watchlist-Tickers
4. ✅ Teste Backfill mit historischen Daten

**Files:**
- `apps/satbase_api/routers/prices.py` (neue Endpoints)
- `libs/satbase_core/storage/prices_db.py` (Gap Detection Logic)

### Phase 2: Automated Gap Detection Scheduler (1 Tag)

**Tasks:**
1. ✅ Neue Job: `detect_gaps()` (weekly Sunday 2:00 UTC)
2. ✅ Detect News Gaps (bestehend)
3. ✅ Detect Price Gaps (neu)
4. ✅ Detect Macro Gaps (neu)
5. ✅ Store gaps in SQLite für prioritierte Backfill

**Files:**
- `apps/satbase_scheduler/jobs/gaps.py` (neu)
- `apps/satbase_scheduler/main.py` (Job registrieren)

### Phase 3: Automated Gap Filling Scheduler (1 Tag)

**Tasks:**
1. ✅ Neue Job: `fill_gaps()` (daily 3:00 UTC)
2. ✅ Prioritized Backfill Logic
3. ✅ Rate Limiting (max N gaps per run)
4. ✅ Error Handling & Retry Logic

**Files:**
- `apps/satbase_scheduler/jobs/gaps.py` (erweitern)
- `apps/satbase_scheduler/main.py` (Job registrieren)

### Phase 4: Price Maintenance Enhancement (1 Tag)

**Tasks:**
1. ✅ Erweitere `refresh_watchlist()` um Price Refresh
2. ✅ Neue Job: `refresh_trending_prices()` (every 6h)
3. ✅ Neue Job: `maintain_price_gaps()` (daily 3:00 UTC)
4. ✅ Neue Job: `check_price_freshness()` (daily 9:00 UTC)

**Files:**
- `apps/satbase_scheduler/jobs/prices.py` (neu)
- `apps/satbase_scheduler/jobs/watchlist.py` (erweitern)
- `apps/satbase_scheduler/main.py` (Jobs registrieren)

### Phase 5: Multi-Channel Present Maintenance (1 Tag)

**Tasks:**
1. ✅ Erweitere `refresh_watchlist()` (bestehend)
2. ✅ Neue Job: `refresh_trending_tickers()` (every 6h)
3. ✅ Erweitere `refresh_core_indicators()` (bestehend)
4. ✅ Unified `maintain_present()` Job orchestriert alle Channels

**Files:**
- `apps/satbase_scheduler/jobs/present.py` (neu)
- `apps/satbase_scheduler/jobs/watchlist.py` (erweitern)
- `apps/satbase_scheduler/jobs/fred.py` (erweitern)
- `apps/satbase_scheduler/main.py` (Jobs registrieren)

---

## 🎯 ZUSAMMENFASSUNG DER ENTSCHEIDUNGEN

### ✅ Frage 1: Scheduler Architektur
**Antwort**: **Extern als eigener Dienst (beibehalten)**
- Separation of Concerns
- Besseres Monitoring & Debugging
- Deployment-Flexibilität
- Aktueller Zustand ist gut

### ✅ Frage 2: Gegenwart pflegen
**Antwort**: **Multi-Channel Approach**
- **Channel 1**: Watchlist-Driven (Primary, täglich 7:00 UTC)
- **Channel 2**: Trending Discovery (Secondary, alle 6h)
- **Channel 3**: Core Indicators (Always-On, täglich 8:00 UTC)

### ✅ Frage 3: Vergangenheit pflegen
**Antwort**: **Intelligent Gap Detection + Prioritized Backfill**
- **Gap Detection**: Wöchentlich Sonntag 2:00 UTC
- **Gap Filling**: Täglich 3:00 UTC (prioritized)
- **Prioritäten**: Critical → Watchlist → Core → Low

### ✅ Frage 4: Price-Daten pflegen
**Antwort**: **Multi-Tier Price Maintenance**
- **Tier 1**: Watchlist Tickers (täglich 7:00 UTC)
- **Tier 2**: Trending Tickers (alle 6h)
- **Tier 3**: Gap Detection & Fill (täglich 3:00 UTC)
- **Tier 4**: Freshness Check (täglich 9:00 UTC)

---

## 🚀 NÄCHSTE SCHRITTE

1. **Sofort**: Implementiere Price Gap Detection & Backfill Endpoints
2. **Diese Woche**: Automatische Gap Detection & Filling Scheduler
3. **Nächste Woche**: Multi-Channel Present Maintenance
4. **Monitoring**: Frontend UI für Gap Monitoring erweitern

**Ergebnis**: Satbase wird proaktiv statt reaktiv! 🎉

