# Satbase MCP - Quick Reference

## Tool-Übersicht (59 Tools)

### Status & Health (2)
- `get-coverage` - Daten-Coverage-Übersicht
- `health-check` - API-Health-Check

### News (9)
- `list-news` ⭐ - Artikel abrufen (token-effizient)
- `delete-news` - Artikel löschen
- `news-heatmap` - Topic-Coverage-Heatmap
- `news-trending-tickers` - Trendende Ticker
- `news-analytics` - Trend-Analyse
- `get-news-by-id` - Einzelner Artikel
- `bulk-news` - Mehrere Artikel (token-effizient)
- `news-health` - Pipeline-Health
- `news-integrity-check` - Datenintegrität

### Macro (5)
- `fred-search` ⭐ - FRED-Serien suchen
- `fred-observations` ⭐ - FRED-Daten abrufen
- `fred-categories` - FRED-Kategorien durchsuchen
- `fred-refresh-core` - Core-Indikatoren aktualisieren
- `macro-status` - FRED-Serie-Status

### Prices (5)
- `list-prices` ⭐ - Historische Preise
- `prices-search` - Ticker suchen
- `prices-info` - Firmeninformationen
- `prices-fundamentals` - Finanzkennzahlen
- `prices-status` - Preis-Daten-Status

### BTC (3)
- `btc-oracle` - Bitcoin-Preisdaten
- `usd-to-btc` - USD→BTC Umrechnung
- `btc-to-usd` - BTC→USD Umrechnung

### Ingest (5)
- `enqueue-news` ⭐ - News-Ingestion starten
- `enqueue-news-bodies` - Bodies re-fetchen
- `enqueue-prices` - Preis-Ingestion starten
- `enqueue-macro` - FRED-Ingestion starten
- `news-backfill` - Historische News backfillen

### Jobs (7)
- `list-jobs` ⭐ - Jobs auflisten
- `get-job` ⭐ - Job-Details
- `jobs-cleanup` - Stuck Jobs bereinigen
- `jobs-cancel` - Job stornieren
- `job-retry` - Job wiederholen
- `admin-jobs` - Admin-Job-Liste
- `admin-jobs-stats` - Job-Statistiken

### Watchlist (6)
- `get-watchlist` ⭐ - Watchlist abrufen
- `add-watchlist` ⭐ - Items hinzufügen
- `remove-watchlist` - Item entfernen
- `watchlist-refresh` - Bulk-Refresh
- `watchlist-status` - Aktive Items
- `update-watchlist` - Item aktualisieren

### Topics (7)
- `get-topics` - Konfigurierte Topics
- `add-topics` - Topic hinzufügen
- `topics-all` - Alle Topics (aus DB)
- `topics-summary` - Topics-Zusammenfassung
- `topics-stats` - Topic-Statistiken
- `topics-coverage` - Topic-Coverage-Heatmap
- `delete-topic` - Topic löschen

### Admin (12)
- `news-gaps` ⭐ - Coverage-Lücken finden
- `cleanup-junk-bodies` - Junk-Bodies bereinigen
- `cleanup-quality-bodies` - Low-Quality-Bodies bereinigen
- `news-schema-info` - Schema-Info
- `get-audit-log` - Audit-Log
- `get-duplicate-articles` - Duplikate finden
- `news-metrics` ⭐ - Qualitäts-Metriken
- `audit-stats` - Audit-Statistiken
- `refetch-bodies` - Bodies re-fetchen
- `list-adapters` - Daten-Adapter auflisten
- `backfill-monitor` - Backfill-Job monitoren

⭐ = Häufig verwendete Tools

---

## Häufige Workflows

### 1. Token-effiziente News-Lektüre

```typescript
// Phase 1: Discovery (schnell, günstig)
list-news({
  from: "2025-01-20",
  to: "2025-01-24",
  tickers: "NVDA",
  include_body: false,  // ← Wichtig!
  limit: 50
})

// Phase 2: Selective Reading (token-effizient)
list-news({
  from: "2025-01-23",
  to: "2025-01-24",
  tickers: "NVDA",
  include_body: true,
  content_format: "text",  // ← 2x günstiger
  limit: 10
})
```

### 2. Watchlist-Management

```typescript
// Ticker zur Watchlist hinzufügen
add-watchlist({
  items: [{
    type: "stock",
    key: "NVDA",
    label: "NVIDIA",
    enabled: true
  }]
})

// Alle Watchlist-Items aktualisieren
watchlist-refresh({
  prices: true,
  news: true,
  news_hours: 24
})

// Jobs monitoren
list-jobs({
  status: "running"
})
```

### 3. Coverage-Lücken schließen

```typescript
// Lücken identifizieren
news-gaps({
  from: "2024-01-01",
  to: "2025-01-24",
  min_articles_per_day: 10
})

// Backfill starten
news-backfill({
  query: "AI semiconductor",
  from: "2024-06-01",
  to: "2024-06-30",
  topic: "AI",
  max_articles_per_day: 100
})

// Fortschritt monitoren
backfill-monitor({
  job_id: "..."
})
```

### 4. FRED-Makro-Daten

```typescript
// Serie suchen
fred-search({
  q: "unemployment rate",
  limit: 10
})

// Daten abrufen
fred-observations({
  series_id: "UNRATE",
  from: "2020-01-01",
  to: "2025-01-24"
})

// Status prüfen
macro-status({
  series_id: "UNRATE"
})
```

### 5. Qualitätskontrolle

```typescript
// Metriken prüfen
news-metrics()

// Lücken finden
news-gaps({
  min_articles_per_day: 10
})

// Cleanup (immer mit dry_run starten!)
cleanup-junk-bodies({
  dry_run: true,  // ← Wichtig!
  max_items: 1000
})

// Nach Review: Ausführen
cleanup-junk-bodies({
  dry_run: false,
  max_items: 1000
})
```

---

## Parameter-Referenz

### Datumsformat
Alle Datumsparameter: `YYYY-MM-DD` (z.B. `"2025-01-24"`)

### Token-Effizienz: `content_format`

| Wert | Token-Kosten | Verwendung |
|------|--------------|-----------|
| `text` | Niedrig (~50% Ersparnis) | Standard-Analyse |
| `html` | Mittel | DOM-Parsing |
| `both` | Hoch | Vergleich/Fallback |
| nicht gesetzt + `include_body=false` | Minimal | Discovery |

### Job-Status

| Status | Bedeutung |
|--------|-----------|
| `queued` | In Warteschlange |
| `running` | Läuft gerade |
| `done` | Erfolgreich abgeschlossen |
| `error` | Fehlgeschlagen |

### Watchlist-Typen

| Typ | `key` Format | Beispiel |
|-----|-------------|----------|
| `stock` | Ticker-Symbol | `"NVDA"` |
| `topic` | Topic-Name | `"AI"` |
| `macro` | FRED-Series-ID | `"UNRATE"` |

---

## Best Practices

### ✅ DO

- **Immer `get-coverage` zuerst** - Verstehe verfügbare Daten
- **Token-effizient**: Phasen-Ansatz für News (`include_body=false` → `content_format=text`)
- **Watchlist verwenden** - Für kontinuierliche Überwachung
- **Jobs asynchron monitoren** - Nicht blockieren
- **`dry_run=true` zuerst** - Bei Cleanup-Operationen
- **Status prüfen** - Vor Datenabfrage (`prices-status`, `macro-status`)

### ❌ DON'T

- **Nicht `include_body=true` ohne Grund** - Teuer!
- **Nicht Jobs synchron warten** - Nutze `list-jobs` in Schleife
- **Nicht `dry_run=false` ohne Review** - Gefährlich!
- **Nicht große Date Range ohne Limit** - Langsam
- **Nicht auf Jobs ohne Monitoring warten** - Jobs laufen asynchron

---

## Fehlerbehandlung

### Job-Fehler

```typescript
// Job-Details prüfen
get-job({ job_id: "..." })

// Transienter Fehler → Retry
job-retry({ job_id: "..." })

// Stuck Job → Cleanup
jobs-cleanup()

// Permanent → Cancel
jobs-cancel({ job_id: "..." })
```

### Datenqualität

```typescript
// Metriken prüfen
news-metrics()

// Bei niedriger Qualität
cleanup-junk-bodies({ dry_run: true })
cleanup-quality-bodies({ dry_run: true })

// Bodies re-fetchen
refetch-bodies({ max_items: 100 })
```

---

## Performance-Tipps

### Schnelle Queries (< 10s)
- `health-check`
- `get-coverage`
- `get-watchlist`
- `prices-status`
- `macro-status`

### Mittlere Queries (10-30s)
- `list-news` (ohne Body)
- `fred-search`
- `prices-search`
- `list-jobs`

### Langsame Queries (30-60s)
- `list-news` (mit Body)
- `fred-observations` (große Range)
- `list-prices` (große Range)
- `enqueue-*` (Ingestion-Triggern)

### Sehr langsame Operationen (60s+)
- `news-backfill`
- `enqueue-news-bodies`
- `cleanup-*` (große `max_items`)

---

## Beispiel: Kompletter Research-Workflow

```typescript
// 1. System-Status prüfen
const coverage = await getCoverage()
const health = await healthCheck()

// 2. Topic recherchieren
const topics = await getTopics()
const topicsSummary = await topicsSummary({ limit: 10, days: 30 })

// 3. News entdecken (token-effizient)
const news = await listNews({
  from: "2025-01-20",
  to: "2025-01-24",
  q: "AI semiconductor",
  include_body: false,
  limit: 50
})

// 4. Relevante Artikel lesen
const relevantNews = await listNews({
  from: "2025-01-23",
  to: "2025-01-24",
  q: "AI semiconductor",
  include_body: true,
  content_format: "text",
  limit: 10
})

// 5. Trendende Ticker finden
const trending = await newsTrendingTickers({
  hours: 24,
  limit: 20
})

// 6. Preisdaten für relevante Ticker
const prices = await listPrices({
  ticker: "NVDA",
  from: "2025-01-01",
  to: "2025-01-24"
})

// 7. Fundamentaldaten
const fundamentals = await pricesFundamentals({
  ticker: "NVDA"
})

// 8. Makro-Kontext
const macro = await fredObservations({
  series_id: "UNRATE",
  from: "2020-01-01",
  to: "2025-01-24"
})

// 9. Analyse & Report
// ... Analyse mit allen Daten ...
```

---

**Siehe auch**: [Satbase MCP Manual](./satbase-mcp-manual.md) für detaillierte Dokumentation.




