# Satbase MCP - Reality Check: Was existiert wirklich?

**Datum:** 2025-01-XX  
**Ziel:** Realistische Einschätzung was bereits da ist vs. was noch gebaut werden muss

---

## ✅ ERGEBNIS: Die meisten Features existieren bereits!

### Woher kommen die Daten?

#### 1. **Topic Summary** (`GET /v1/news/topics/summary`)
- **Backend:** ✅ Existiert bereits (Zeile 88-116 in `topics.py`)
- **Datenquelle:** `NewsDB.get_all_topics()` mit Default 30 Tage
- **SQL Query:** Einfaches `GROUP BY topic, COUNT(*)` aus `news_topics` Tabelle
- **Implementierung:** ⚡ **Trivial** - nur HTTP-Call wrappen

#### 2. **News Analytics** (`GET /v1/news/analytics`)
- **Backend:** ✅ Existiert bereits (Zeile 188-245 in `news.py`)
- **Datenquelle:** `NewsDB.get_daily_counts()` + einfache Trend-Berechnung
- **Berechnung:** Erste Hälfte vs. zweite Hälfte, Moving Average (7-Tage)
- **Implementierung:** ⚡ **Trivial** - nur HTTP-Call wrappen

#### 3. **Get Article by ID** (`GET /v1/news/{article_id}`)
- **Backend:** ✅ Existiert bereits (Zeile 248-259 in `news.py`)
- **Datenquelle:** `NewsDB.get_articles_by_ids([id])`
- **SQL Query:** Direkter SELECT mit JOIN für topics/tickers
- **Implementierung:** ⚡ **Trivial** - nur HTTP-Call wrappen

#### 4. **Bulk Fetch** (`POST /v1/news/bulk`)
- **Backend:** ✅ Existiert bereits (Zeile 352-401 in `news.py`)
- **Datenquelle:** `NewsDB.get_articles_by_ids(ids)` - selbe Methode wie Single Article
- **Implementierung:** ⚡ **Trivial** - nur HTTP-Call wrappen

#### 5. **Topic Stats** (`GET /v1/news/topics/stats`)
- **Backend:** ✅ Existiert bereits (Zeile 119-157 in `topics.py`)
- **Datenquelle:** `NewsDB.get_heatmap()` mit granularity (month/year)
- **Implementierung:** ⚡ **Trivial** - nur HTTP-Call wrappen

#### 6. **Prices Search** (`GET /v1/prices/search`)
- **Backend:** ✅ Existiert bereits (Zeile 91-117 in `prices.py`)
- **Datenquelle:** `yfinance.Search()` - externe API
- **Implementierung:** ⚡ **Trivial** - nur HTTP-Call wrappen

#### 7. **Prices Info/Fundamentals** (`GET /v1/prices/info/{ticker}`, `/fundamentals/{ticker}`)
- **Backend:** ✅ Existiert bereits (Zeile 180-269 in `prices.py`)
- **Datenquelle:** `yfinance.Ticker().info` - externe API
- **Implementierung:** ⚡ **Trivial** - nur HTTP-Call wrappen

---

## 📊 VOLLSTÄNDIGE ÜBERSICHT: Was existiert vs. was fehlt

### ✅ BEREITS IMPLEMENTIERT (Backend vorhanden, nur MCP-Wrapper fehlt)

| Endpoint | Status Backend | Status MCP | Schwierigkeit | Zeitaufwand |
|----------|---------------|------------|---------------|-------------|
| `GET /v1/news/analytics` | ✅ | ❌ | ⚡ Trivial | 5 Min |
| `GET /v1/news/{article_id}` | ✅ | ❌ | ⚡ Trivial | 5 Min |
| `POST /v1/news/bulk` | ✅ | ❌ | ⚡ Trivial | 5 Min |
| `GET /v1/news/health` | ✅ | ❌ | ⚡ Trivial | 5 Min |
| `GET /v1/news/integrity-check` | ✅ | ❌ | ⚡ Trivial | 5 Min |
| `GET /v1/news/topics/all` | ✅ | ❌ | ⚡ Trivial | 5 Min |
| `GET /v1/news/topics/summary` | ✅ | ❌ | ⚡ Trivial | 5 Min |
| `GET /v1/news/topics/stats` | ✅ | ❌ | ⚡ Trivial | 5 Min |
| `GET /v1/news/topics/coverage` | ✅ | ❌ | ⚡ Trivial | 5 Min |
| `GET /v1/prices/search` | ✅ | ❌ | ⚡ Trivial | 5 Min |
| `GET /v1/prices/status/{ticker}` | ✅ | ❌ | ⚡ Trivial | 5 Min |
| `GET /v1/prices/info/{ticker}` | ✅ | ❌ | ⚡ Trivial | 5 Min |
| `GET /v1/prices/fundamentals/{ticker}` | ✅ | ❌ | ⚡ Trivial | 5 Min |
| `GET /v1/macro/status/{series_id}` | ✅ | ❌ | ⚡ Trivial | 5 Min |
| `POST /v1/ingest/news/backfill` | ✅ | ❌ | ⚡ Trivial | 5 Min |
| `GET /v1/admin/audit/stats` | ✅ | ❌ | ⚡ Trivial | 5 Min |
| `GET /v1/ingest/adapters` | ✅ | ❌ | ⚡ Trivial | 5 Min |

**Gesamt: 17 Endpoints = ~85 Minuten Arbeit (1.5 Stunden)**

### 🔧 ADMIN ENDPOINTS (Backend vorhanden, mit Vorsicht wrappen)

| Endpoint | Status Backend | Status MCP | Schwierigkeit | Empfehlung |
|----------|---------------|------------|---------------|------------|
| `POST /v1/admin/jobs/{job_id}/retry` | ✅ | ❌ | ⚡ Trivial | ✅ Wrappen (mit Warnung) |
| `GET /v1/admin/jobs` | ✅ | ❌ | ⚡ Trivial | ✅ Wrappen (Read-Only) |
| `GET /v1/admin/jobs/stats` | ✅ | ❌ | ⚡ Trivial | ✅ Wrappen (Read-Only) |
| `POST /v1/admin/news/refetch-bodies` | ✅ | ❌ | ⚡ Trivial | ✅ Wrappen (mit dry_run) |
| `DELETE /v1/news/topics/{topic_name}` | ✅ | ❌ | ⚡ Trivial | ⚠️ Nur mit Bestätigung |
| `PATCH /v1/watchlist/items/{item_id}` | ✅ | ❌ | ⚡ Trivial | ✅ Wrappen |

**Gesamt: 6 Endpoints = ~30 Minuten Arbeit**

### ❌ NICHT IMPLEMENTIERT (müsste gebaut werden)

| Endpoint | Status Backend | Status MCP | Schwierigkeit | Empfehlung |
|----------|---------------|------------|---------------|------------|
| `GET /v1/ingest/backfill-monitor/{job_id}` | ✅ | ❌ | ⚡ Trivial | ✅ Wrappen (existiert bereits!) |
| `GET /v1/admin/news/preview-crawl` | ✅ | ❌ | ⚡ Trivial | ⚠️ Debug-Tool, niedrige Priorität |
| `POST /v1/admin/topics/list` | ✅ | ❌ | ⚡ Trivial | ✅ Wrappen (existiert bereits!) |

**Gesamt: 3 Endpoints, alle bereits implementiert!**

---

## 🎯 FAZIT: Implementierung ist TRIVIAL

### Was bedeutet "trivial"?
- **Backend-Endpoint existiert bereits** ✅
- **Nur HTTP-Call im MCP wrappen** ⚡
- **Zod-Schema definieren** (copy-paste aus Backend)
- **Tool registrieren** (eine Zeile)
- **Keine neue Logik nötig** 🎉

### Beispiel: Topic Summary Tool

```typescript
// mcps/satbase/src/lib/tools/topics.ts (HINZUFÜGEN)

export const topicSummaryTool = {
  name: 'topic-summary',
  config: {
    title: 'Get Topics Summary',
    description: 'Get lightweight topics summary for dashboard/overview.',
    inputSchema: z.object({
      limit: z.number().int().min(1).max(100).default(10).describe('Number of topics'),
      days: z.number().int().min(1).max(365).default(30).describe('Days to look back')
    }).shape
  },
  handler: async (input: { limit?: number; days?: number }) => {
    const params = new URLSearchParams({
      limit: (input.limit || 10).toString(),
      days: (input.days || 30).toString()
    });
    
    return await callSatbase(`/v1/news/topics/summary?${params.toString()}`);
  }
};
```

**Zeitaufwand:** 5 Minuten pro Tool!

---

## 📋 PRIORISIERTE IMPLEMENTIERUNGS-LISTE

### 🔥 Sprint 1: Hoch-Priorität (2 Stunden)
1. ✅ `GET /v1/news/analytics` - Trend-Analyse
2. ✅ `GET /v1/news/{article_id}` - Einzelner Artikel
3. ✅ `POST /v1/news/bulk` - Bulk-Fetch
4. ✅ `GET /v1/prices/search` - Ticker-Suche
5. ✅ `GET /v1/prices/info/{ticker}` - Company-Info
6. ✅ `GET /v1/prices/fundamentals/{ticker}` - Fundamentals
7. ✅ `GET /v1/news/topics/all` - Alle Topics
8. ✅ `GET /v1/news/topics/summary` - Topics-Summary

### 🟡 Sprint 2: Mittel-Priorität (1 Stunde)
9. ✅ `GET /v1/news/health` - Pipeline Health
10. ✅ `GET /v1/news/integrity-check` - Datenintegrität
11. ✅ `GET /v1/macro/status/{series_id}` - Series-Status
12. ✅ `GET /v1/prices/status/{ticker}` - Price-Status
13. ✅ `GET /v1/news/topics/stats` - Topics-Statistiken
14. ✅ `GET /v1/news/topics/coverage` - Topics-Coverage
15. ✅ `POST /v1/ingest/news/backfill` - News-Backfill
16. ✅ `POST /v1/admin/jobs/{job_id}/retry` - Job-Retry

### 🟢 Sprint 3: Nice-to-Have (30 Minuten)
17. ✅ `GET /v1/admin/audit/stats` - Audit-Statistiken
18. ✅ `GET /v1/admin/jobs` - Admin-Job-Liste
19. ✅ `GET /v1/admin/jobs/stats` - Job-Statistiken
20. ✅ `GET /v1/ingest/adapters` - Adapter-Liste
21. ✅ `PATCH /v1/watchlist/items/{item_id}` - Watchlist-Update
22. ✅ `DELETE /v1/news/topics/{topic_name}` - Topic-Löschung (mit Warnung)

---

## 💡 TECHNISCHE NOTIZEN

### Datenquellen-Übersicht

| Feature | Datenquelle | Komplexität |
|---------|-------------|-------------|
| Topic Summary | SQLite `news_topics` JOIN `news_articles` | Einfach |
| News Analytics | SQLite `news_articles` GROUP BY DATE | Einfach |
| Article by ID | SQLite `news_articles` + JOIN topics/tickers | Einfach |
| Bulk Fetch | Gleiche Methode wie Single Article | Einfach |
| Prices Search | yfinance.Search() - externe API | Einfach |
| Prices Info | yfinance.Ticker().info - externe API | Einfach |
| Macro Status | SQLite `macro.db` Status-Tabelle | Einfach |

### Warum ist alles so einfach?

1. **Backend ist bereits vollständig implementiert** ✅
2. **Datenbank-Methoden existieren bereits** ✅
3. **Keine neue Business-Logik nötig** ✅
4. **Nur HTTP-Calls wrappen** ⚡

### MCP-Wrapper Pattern

Jedes Tool folgt demselben Pattern:

```typescript
export const newTool = {
  name: 'tool-name',
  config: {
    title: 'Tool Title',
    description: 'Tool description',
    inputSchema: z.object({
      // Zod schema based on backend query params
    }).shape
  },
  handler: async (input) => {
    const params = new URLSearchParams();
    // Build params from input
    return await callSatbase(`/v1/endpoint?${params.toString()}`);
  }
};
```

**Komplexität:** Minimal - nur Parameter-Mapping!

---

## ✅ ZUSAMMENFASSUNG

- **Backend-Abdeckung:** ~95% der Features existieren bereits
- **MCP-Abdeckung:** ~49% (36 von 73 Endpoints)
- **Fehlende Tools:** ~26 Tools
- **Schwierigkeit:** ⚡ **TRIVIAL** - alles nur HTTP-Call Wrapping
- **Zeitaufwand:** ~3-4 Stunden für alle fehlenden Tools

**Fazit:** Die Analyse war korrekt - alle Features existieren bereits im Backend. Es ist nur eine Frage des Wrappens im MCP! 🎉

