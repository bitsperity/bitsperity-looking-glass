# Satbase Storage Design: Index-Based Architecture

**Datum**: 2025-10-24  
**Ziel**: Saubere, skalierbare, querybare Parquet-Struktur

---

## 🎯 DESIGN PRINZIPIEN

### 1. **Store by Identity, not by Crawl Time**
❌ **BAD**: `data/stage/source/2025/10/24/data.parquet`  
✅ **GOOD**: `data/stage/source/[entity_type]/[entity_id]/data.parquet`

### 2. **Partition by Data Dimension, not Ingestion Time**
❌ **BAD**: All GDP data from 1947-2025 in one crawl-dated file  
✅ **GOOD**: GDP data partitioned by observation year

### 3. **Enable Efficient Point Queries**
❌ **BAD**: Scan 365 folders to find ticker NVDA  
✅ **GOOD**: Direct path to `prices/NVDA/`

### 4. **Support Incremental Updates**
✅ Append new observations to existing parquet  
✅ Deduplication by primary key  
✅ Keep latest version of each record

---

## 📁 PROPOSED STRUCTURE

```
data/stage/
├── news/                              # News articles
│   ├── gdelt/
│   │   └── articles/
│   │       └── [date]/                # Partitioned by published_at date
│   │           └── articles.parquet   # All articles from that day
│   └── rss/
│       └── articles/
│           └── [date]/
│               └── articles.parquet
│
├── news_body/                         # Full article content (separate for size)
│   └── content/
│       └── [date]/                    # Partitioned by fetched_at date
│           └── content.parquet
│
├── prices/                            # Stock prices
│   └── daily/
│       └── [ticker]/                  # One folder per ticker
│           └── [year]/                # Partitioned by year
│               └── prices.parquet     # OHLCV data for that year
│
├── fundamentals/                      # Company fundamentals
│   └── [ticker]/
│       └── fundamentals.parquet       # Latest fundamentals snapshot
│
├── macro/                             # Macroeconomic data
│   └── fred/
│       └── series/
│           └── [series_id]/           # One folder per FRED series
│               └── [year]/            # Partitioned by observation year
│                   └── obs.parquet    # Observations for that year
│
└── metadata/                          # Metadata about data sources
    ├── tickers.parquet                # All known ticker symbols + info
    ├── fred_series.parquet            # All FRED series metadata
    └── news_sources.parquet           # News source stats
```

---

## 🔬 DETAILED SPECS

### 1. News Articles

**Path**: `news/[source]/articles/[published_date]/articles.parquet`

**Why partitioned by `published_at`?**
- News queries are always time-based: "News from last 7 days"
- Efficient: Scan only relevant date folders
- Natural partitioning: ~500-2000 articles/day

**Schema**:
```python
{
    'id': str,                    # Primary key (hash of url)
    'source': str,                # 'gdelt' or 'rss'
    'title': str,
    'text': str,                  # Summary/snippet
    'url': str,
    'published_at': datetime,     # ← Partition key
    'tickers': list[str],
    'regions': list[str],
    'themes': list[str],
    'fetched_at': datetime,       # When we crawled it
}
```

**Query Examples**:
```python
# Last 7 days of news
scan_parquet_glob("news/gdelt/articles", from_date=date.today()-7, to_date=date.today())

# News about NVDA in October
df = scan_parquet_glob("news/*/articles", from_date="2025-10-01", to_date="2025-10-31")
df = df.filter(pl.col("tickers").arr.contains("NVDA"))
```

---

### 2. News Bodies (Full Content)

**Path**: `news_body/content/[fetched_date]/content.parquet`

**Why separate from articles?**
- Full HTML/text is HUGE (can be 100KB+ per article)
- Most queries don't need full content
- Keep articles.parquet small and fast

**Why partitioned by `fetched_at`?**
- Bodies are fetched AFTER articles (async background job)
- Usually fetched in batches on specific dates
- Natural grouping by ingestion

**Schema**:
```python
{
    'id': str,                    # Foreign key to articles.id
    'content_text': str,          # Full text (clean)
    'content_html': str,          # Full HTML (raw)
    'fetched_at': datetime,       # ← Partition key
    'published_at': datetime,     # Copy from article (for joins)
}
```

**Join Strategy**:
```python
# Get articles with bodies
articles = scan_parquet_glob("news/gdelt/articles", from_date, to_date)
bodies = scan_parquet_glob("news_body/content", from_date, to_date)
full = articles.join(bodies, on="id", how="left")
```

---

### 3. Stock Prices

**Path**: `prices/daily/[ticker]/[year]/prices.parquet`

**Why two-level partitioning?**
- **Level 1 (ticker)**: Direct access per ticker
- **Level 2 (year)**: Efficient time-range queries
- Example: NVDA 2020-2025 data = ~1250 rows = ~50KB parquet

**Schema**:
```python
{
    'ticker': str,                # Redundant but useful
    'date': date,                 # ← Observation date (NOT partition key!)
    'open': float,
    'high': float,
    'low': float,
    'close': float,
    'volume': int,
    'source': str,                # 'yfinance', 'stooq', etc.
    'fetched_at': datetime,
}
```

**Primary Key**: `(ticker, date, source)`  
**Deduplication**: Keep latest `fetched_at` per (ticker, date)

**Query Examples**:
```python
# NVDA prices 2024-2025
lf = pl.scan_parquet("prices/daily/NVDA/2024/*.parquet")
lf = lf.union(pl.scan_parquet("prices/daily/NVDA/2025/*.parquet"))
df = lf.filter(pl.col("date").is_between(date(2024,1,1), date(2025,12,31)))

# All watchlist tickers, last 30 days
for ticker in watchlist:
    lf = pl.scan_parquet(f"prices/daily/{ticker}/2025/*.parquet")
    df = lf.filter(pl.col("date") >= date.today()-30).collect()
```

---

### 4. FRED Macro Data

**Path**: `macro/fred/series/[series_id]/[year]/obs.parquet`

**Why partitioned by series + year?**
- Each FRED series is independent (GDP, UNRATE, etc.)
- Direct access: `macro/fred/series/GDP/`
- Year partitioning: Some series have 100+ years of data
- Small files: ~12-365 observations/year depending on frequency

**Schema**:
```python
{
    'series_id': str,             # 'GDP', 'UNRATE', etc.
    'date': date,                 # ← Observation date
    'value': float,
    'source': str,                # Always 'fred'
    'fetched_at': datetime,
}
```

**Primary Key**: `(series_id, date)`  
**Deduplication**: Keep latest `fetched_at` per (series_id, date)

**Query Examples**:
```python
# GDP 2020-2025
lf = pl.scan_parquet("macro/fred/series/GDP/202*/obs.parquet")
lf = lf.union(pl.scan_parquet("macro/fred/series/GDP/2025/obs.parquet"))
df = lf.filter(pl.col("date").is_between(date(2020,1,1), date(2025,12,31)))

# All core indicators, latest value
core_series = ['GDP', 'UNRATE', 'CPIAUCSL', 'FEDFUNDS']
for series_id in core_series:
    lf = pl.scan_parquet(f"macro/fred/series/{series_id}/**/obs.parquet")
    latest = lf.sort("date", descending=True).head(1).collect()
```

---

### 5. Fundamentals (Company Data)

**Path**: `fundamentals/[ticker]/fundamentals.parquet`

**Why no time partitioning?**
- Fundamentals change slowly (quarterly at most)
- Small dataset per ticker (~10-100 rows for historical snapshots)
- No need for complex partitioning

**Schema**:
```python
{
    'ticker': str,
    'report_date': date,          # Fiscal quarter/year
    'market_cap': float,
    'pe_ratio': float,
    'eps': float,
    'revenue': float,
    'net_income': float,
    'debt_to_equity': float,
    # ... more fundamental metrics
    'fetched_at': datetime,
}
```

**Primary Key**: `(ticker, report_date)`

---

### 6. Metadata Tables

#### `metadata/tickers.parquet`
All known ticker symbols + basic info
```python
{
    'ticker': str,                # Primary key
    'name': str,                  # Company name
    'sector': str,
    'industry': str,
    'exchange': str,
    'market_cap': float,
    'first_seen': datetime,
    'last_updated': datetime,
}
```

#### `metadata/fred_series.parquet`
All FRED series metadata
```python
{
    'series_id': str,             # Primary key
    'title': str,
    'units': str,
    'frequency': str,             # 'daily', 'monthly', 'quarterly'
    'popularity': int,
    'observation_start': date,
    'observation_end': date,
    'category': str,              # 'inflation', 'employment', etc.
    'last_updated': datetime,
}
```

---

## 🔄 MIGRATION STRATEGY

### Phase 1: Implement New Storage (Parallel)
1. Create new sink functions for each data type
2. Run both old + new sinks in parallel
3. Validate data consistency

### Phase 2: Update Routers (Read New + Fallback Old)
1. Update API routers to read from new structure
2. Fallback to old structure if new is empty
3. Test all endpoints

### Phase 3: Backfill Historical Data
1. Read from old structure
2. Transform to new structure
3. Write to new paths
4. Validate counts match

### Phase 4: Deprecate Old Structure
1. Remove old read logic
2. Remove old write logic
3. Archive/delete old files

---

## 🚀 BENEFITS

### Performance
- ✅ **10-100x faster queries**: Direct path to ticker/series
- ✅ **Smaller scans**: Only relevant partitions
- ✅ **Efficient joins**: Aligned by entity

### Scalability
- ✅ **Millions of articles**: Partitioned by date
- ✅ **Thousands of tickers**: Isolated per ticker
- ✅ **Decades of macro data**: Partitioned by year

### Maintainability
- ✅ **Clear structure**: `prices/NVDA/` = all NVDA data
- ✅ **Easy debugging**: Check specific entity folder
- ✅ **Simple backfill**: Add to entity folder

### Agent-Friendly
- ✅ **Predictable paths**: Agent knows where data lives
- ✅ **Complete coverage**: All data for an entity in one place
- ✅ **Fast lookups**: No scanning 365 date folders

---

## 💡 NEXT STEPS

1. **JETZT**: Implement new FRED storage sink
2. **HEUTE**: Backfill 28 core indicators to new structure
3. **MORGEN**: Update macro router to use new paths
4. **DIESE WOCHE**: Migrate prices, then news

**Dann haben wir CLEAN, SKALIERBARE Daten!** 🎉

