# Satbase MCP - Vollständige Backend-Analyse

**Datum:** 2025-01-XX  
**Status:** Analyse & Empfehlungen

## Zusammenfassung

- **Backend Endpoints gesamt:** ~73 Endpoints
- **MCP Tools aktuell:** 36 Tools
- **Abdeckung:** ~49% der Endpoints
- **Fehlende wichtige Endpoints:** ~15-20 für Agenten-Nutzung
- **Gefährliche Endpoints (nicht wrappen):** ~8-10 Reset/Delete-Operationen

---

## 1. VOLLSTÄNDIGE BACKEND ENDPOINT-LISTE

### Health Router (1 Endpoint)
- ✅ `GET /health` → **wrapped** (`health-check`)

### Status Router (1 Endpoint)
- ✅ `GET /v1/status/coverage` → **wrapped** (`get-coverage`)

### News Router (13 Endpoints)

| Endpoint | Methode | Status | MCP Tool | Notizen |
|----------|---------|--------|----------|---------|
| `/v1/news` | GET | ✅ | `list-news` | Wrapped |
| `/v1/news/{article_id}` | GET | ❌ | - | **FEHLT: Einzelner Artikel abrufen** |
| `/v1/news` | DELETE | ✅ | `delete-news` | Wrapped |
| `/v1/news/bulk` | POST | ❌ | - | **FEHLT: Bulk-Fetch von Artikeln** |
| `/v1/news/heatmap` | GET | ✅ | `news-heatmap` | Wrapped |
| `/v1/news/trending/tickers` | GET | ✅ | `news-trending-tickers` | Wrapped |
| `/v1/news/gaps` | GET | ✅ | `news-gaps` | Wrapped |
| `/v1/news/metrics` | GET | ✅ | `news-metrics` | Wrapped |
| `/v1/news/health` | GET | ❌ | - | **FEHLT: News-Pipeline Health Check** |
| `/v1/news/analytics` | GET | ❌ | - | **FEHLT: Trend-Analyse (days, topics)** |
| `/v1/news/integrity-check` | GET | ❌ | - | **FEHLT: Datenintegritäts-Check** |
| `/v1/news/{article_id}/update-body` | POST | ❌ | - | **FEHLT: Body-Update (Queue)** |
| `/v1/news/reset` | POST | ⚠️ | - | **GEFÄHRLICH: Nicht wrappen!** |

### News Admin Router (14 Endpoints)

| Endpoint | Methode | Status | MCP Tool | Notizen |
|----------|---------|--------|----------|---------|
| `/v1/admin/topics/list` | POST | ❌ | - | **FEHLT: Admin-Topics-Liste** |
| `/v1/admin/news/cleanup-junk` | POST | ✅ | `cleanup-junk-bodies` | Wrapped |
| `/v1/admin/news/cleanup-quality` | POST | ✅ | `cleanup-quality-bodies` | Wrapped |
| `/v1/admin/news/schema` | GET | ✅ | `news-schema-info` | Wrapped |
| `/v1/admin/articles/batch` | DELETE | ⚠️ | - | **GEFÄHRLICH: Batch-Delete (evtl. nur mit Bestätigung)** |
| `/v1/admin/articles/duplicates` | GET | ✅ | `get-duplicate-articles` | Wrapped |
| `/v1/admin/audit` | GET | ✅ | `get-audit-log` | Wrapped |
| `/v1/admin/audit/stats` | GET | ❌ | - | **FEHLT: Audit-Statistiken** |
| `/v1/admin/jobs` | GET | ❌ | - | **FEHLT: Admin-Job-Liste (vs. /ingest/jobs)** |
| `/v1/admin/jobs/stats` | GET | ❌ | - | **FEHLT: Job-Statistiken** |
| `/v1/admin/jobs/{job_id}` | GET | ❌ | - | **FEHLT: Admin-Job-Details** |
| `/v1/admin/jobs/{job_id}/retry` | POST | ❌ | - | **FEHLT: Job-Retry** |
| `/v1/admin/jobs/{job_id}` | DELETE | ⚠️ | - | **GEFÄHRLICH: Job-Löschung** |
| `/v1/admin/jobs/cleanup` | POST | ⚠️ | - | **GEFÄHRLICH: Bulk-Job-Cleanup** |
| `/v1/admin/news/reset-bodies` | POST | ⚠️ | - | **GEFÄHRLICH: Reset ALL Bodies** |
| `/v1/admin/news/refetch-bodies` | POST | ❌ | - | **FEHLT: Re-fetch Bodies (mit max_items, dry_run)** |
| `/v1/admin/news/preview-crawl` | GET | ❌ | - | **FEHLT: Preview-Crawl (Debug-Tool)** |

### Macro Router (6 Endpoints)

| Endpoint | Methode | Status | MCP Tool | Notizen |
|----------|---------|--------|----------|---------|
| `/v1/macro/fred/search` | GET | ✅ | `fred-search` | Wrapped |
| `/v1/macro/series/{series_id}` | GET | ✅ | `fred-observations` | Wrapped |
| `/v1/macro/categories` | GET | ✅ | `fred-categories` | Wrapped |
| `/v1/macro/refresh-core` | POST | ✅ | `fred-refresh-core` | Wrapped |
| `/v1/macro/status/{series_id}` | GET | ❌ | - | **FEHLT: Series-Status** |
| `/v1/macro/ingest` | POST | ✅ | `enqueue-macro` | Wrapped via ingest |

### Prices Router (7 Endpoints)

| Endpoint | Methode | Status | MCP Tool | Notizen |
|----------|---------|--------|----------|---------|
| `/v1/prices/{ticker}` | GET | ✅ | `list-prices` | Wrapped |
| `/v1/prices/search` | GET | ❌ | - | **FEHLT: Ticker-Suche (yfinance)** |
| `/v1/prices/status/{ticker}` | GET | ❌ | - | **FEHLT: Price-Status (latest_date, missing_days)** |
| `/v1/prices/info/{ticker}` | GET | ❌ | - | **FEHLT: Ticker-Info (Sector, Industry, etc.)** |
| `/v1/prices/fundamentals/{ticker}` | GET | ❌ | - | **FEHLT: Fundamentals (PE, Market Cap, etc.)** |
| `/v1/prices/ingest` | POST | ✅ | `enqueue-prices` | Wrapped |
| `/v1/prices/admin/unmark-invalid/{ticker}` | POST | ⚠️ | - | **GEFÄHRLICH: Admin-Operation** |

### BTC Router (1 Endpoint)
- ✅ `GET /v1/btc/oracle` → **wrapped** (`btc-oracle`)

### Convert Router (2 Endpoints)
- ✅ `GET /v1/convert/usd-to-btc` → **wrapped** (`usd-to-btc`)
- ✅ `GET /v1/convert/btc-to-usd` → **wrapped** (`btc-to-usd`)

### Ingest Router (11 Endpoints)

| Endpoint | Methode | Status | MCP Tool | Notizen |
|----------|---------|--------|----------|---------|
| `/v1/ingest/news` | POST | ✅ | `enqueue-news` | Wrapped |
| `/v1/ingest/news/backfill` | POST | ❌ | - | **FEHLT: News-Backfill (mit from/to)** |
| `/v1/ingest/news/topics/{topic_name}` | DELETE | ⚠️ | - | **GEFÄHRLICH: Topic-Delete** |
| `/v1/ingest/prices/daily` | POST | ✅ | `enqueue-prices` | Wrapped |
| `/v1/ingest/macro/fred` | POST | ✅ | `enqueue-macro` | Wrapped |
| `/v1/ingest/jobs` | GET | ✅ | `list-jobs` | Wrapped |
| `/v1/ingest/jobs/{job_id}` | GET | ✅ | `get-job` | Wrapped |
| `/v1/ingest/jobs/{job_id}` | DELETE | ✅ | `cancel-job` | Wrapped |
| `/v1/ingest/jobs/cleanup` | POST | ✅ | `cleanup-jobs` | Wrapped |
| `/v1/ingest/jobs/reset` | POST | ⚠️ | - | **GEFÄHRLICH: Reset ALL Jobs** |
| `/v1/ingest/adapters` | GET | ❌ | - | **FEHLT: Adapter-Liste** |
| `/v1/ingest/backfill-monitor/{job_id}` | GET | ❌ | - | **FEHLT: Backfill-Monitor** |

### Watchlist Router (6 Endpoints)

| Endpoint | Methode | Status | MCP Tool | Notizen |
|----------|---------|--------|----------|---------|
| `/v1/watchlist/items` | GET | ✅ | `get-watchlist` | Wrapped |
| `/v1/watchlist/active` | GET | ✅ | `watchlist-status` | Wrapped |
| `/v1/watchlist/items` | POST | ✅ | `add-watchlist` | Wrapped |
| `/v1/watchlist/items/{item_id}` | PATCH | ❌ | - | **FEHLT: Watchlist-Update** |
| `/v1/watchlist/items/{item_id}` | DELETE | ✅ | `remove-watchlist` | Wrapped |
| `/v1/watchlist/refresh` | POST | ✅ | `refresh-watchlist` | Wrapped |

### Topics Router (7 Endpoints)

| Endpoint | Methode | Status | MCP Tool | Notizen |
|----------|---------|--------|----------|---------|
| `/v1/news/topics/configured` | GET | ✅ | `get-topics` | Wrapped |
| `/v1/news/topics/add` | POST | ✅ | `add-topics` | Wrapped |
| `/v1/news/topics/{topic_name}` | DELETE | ❌ | - | **FEHLT: Topic-Löschung** |
| `/v1/news/topics/all` | GET | ❌ | - | **FEHLT: Alle Topics (aus DB)** |
| `/v1/news/topics/summary` | GET | ❌ | - | **FEHLT: Topics-Summary** |
| `/v1/news/topics/stats` | GET | ❌ | - | **FEHLT: Topics-Statistiken** |
| `/v1/news/topics/coverage` | GET | ❌ | - | **FEHLT: Topics-Coverage (Heatmap)** |

---

## 2. GEFÄHRLICHE ENDPOINTS (NICHT WRAPPEN)

Diese Endpoints sollten **NICHT** für Agenten verfügbar sein, da sie destruktive Operationen ausführen:

### 🔴 Reset-Operationen
1. `POST /v1/news/reset` - Löscht ALLE News-Daten + Datenbank
2. `POST /v1/admin/news/reset-bodies` - Setzt ALLE Bodies zurück
3. `POST /v1/ingest/jobs/reset` - Löscht ALLE Jobs

### 🔴 Batch-Delete-Operationen
4. `DELETE /v1/admin/articles/batch` - Batch-Löschung nach Topic/IDs
5. `DELETE /v1/ingest/news/topics/{topic_name}` - Löscht alle Artikel eines Topics

### 🔴 Admin-Operationen (mit Vorsicht)
6. `POST /v1/prices/admin/unmark-invalid/{ticker}` - Kann ungültige Ticker wieder aktivieren
7. `DELETE /v1/admin/jobs/{job_id}` - Löscht Job-Datensätze
8. `POST /v1/admin/jobs/cleanup` - Bulk-Job-Cleanup

**Empfehlung:** Diese Endpoints bleiben **ohne MCP-Wrapper**. Sollten nur über direktes Backend-Calling verfügbar sein (mit expliziter Authentifizierung).

---

## 3. FEHLENDE ENDPOINTS FÜR INTELLIGENTE AGENTEN

### 📊 Analytics & Insights (WICHTIG)
1. **`GET /v1/news/analytics`** - Trend-Analyse mit moving averages
   - **Warum:** Agenten können Trends erkennen, Vorhersagen treffen
   - **Use Case:** "Zeige mir den Trend für AI-News der letzten 30 Tage"

2. **`GET /v1/news/health`** - News-Pipeline Health
   - **Warum:** Agenten können Datenqualität überwachen
   - **Use Case:** "Ist die News-Pipeline aktuell gesund?"

3. **`GET /v1/news/integrity-check`** - Datenintegrität
   - **Warum:** Agenten können Datenqualität validieren
   - **Use Case:** "Sind die News-Daten konsistent?"

4. **`GET /v1/admin/audit/stats`** - Audit-Statistiken
   - **Warum:** Agenten können Operations-Statistiken analysieren
   - **Use Case:** "Wie viele Artikel wurden in den letzten 30 Tagen gelöscht?"

### 📈 Topic Management (WICHTIG)
5. **`GET /v1/news/topics/all`** - Alle Topics aus DB
   - **Warum:** Agenten können alle verfügbaren Topics entdecken
   - **Use Case:** "Welche Topics gibt es in der Datenbank?"

6. **`GET /v1/news/topics/summary`** - Topics-Summary
   - **Warum:** Dashboard-View für Agenten
   - **Use Case:** "Zeige mir die Top-10 Topics der letzten 30 Tage"

7. **`GET /v1/news/topics/stats`** - Topics-Statistiken (Time-Series)
   - **Warum:** Agenten können Topic-Trends analysieren
   - **Use Case:** "Wie hat sich das Topic 'AI' über die Zeit entwickelt?"

8. **`GET /v1/news/topics/coverage`** - Topics-Coverage Heatmap
   - **Warum:** Alternative zu `/news/heatmap` mit Topic-Filter
   - **Use Case:** "Zeige mir die Coverage für AI und Semiconductor"

9. **`DELETE /v1/news/topics/{topic_name}`** - Topic löschen
   - **Warum:** Agenten können Topics verwalten (mit Vorsicht!)
   - **Use Case:** "Lösche das Topic 'Test-Topic'"

### 📰 News Operations (MITTLERE PRIORITÄT)
10. **`GET /v1/news/{article_id}`** - Einzelner Artikel
    - **Warum:** Agenten können spezifische Artikel abrufen
    - **Use Case:** "Zeige mir Artikel XYZ123"

11. **`POST /v1/news/bulk`** - Bulk-Fetch
    - **Warum:** Token-effizienter als mehrere einzelne Calls
    - **Use Case:** "Lade 50 Artikel auf einmal"

12. **`POST /v1/news/{article_id}/update-body`** - Body-Update
    - **Warum:** Agenten können fehlerhafte Bodies korrigieren
    - **Use Case:** "Update den Body für Artikel XYZ123"

13. **`POST /v1/admin/news/refetch-bodies`** - Re-fetch Bodies
    - **Warum:** Agenten können fehlende Bodies nachholen
    - **Use Case:** "Re-fetch Bodies für die letzten 100 Artikel"

### 💰 Prices & Fundamentals (WICHTIG)
14. **`GET /v1/prices/search`** - Ticker-Suche
    - **Warum:** Agenten können Ticker finden
    - **Use Case:** "Suche nach 'Apple' oder 'AAPL'"

15. **`GET /v1/prices/status/{ticker}`** - Price-Status
    - **Warum:** Agenten können Datenqualität prüfen
    - **Use Case:** "Wie aktuell sind die Daten für AAPL?"

16. **`GET /v1/prices/info/{ticker}`** - Ticker-Info
    - **Warum:** Agenten können Company-Informationen abrufen
    - **Use Case:** "Zeige mir Infos zu AAPL (Sector, Industry)"

17. **`GET /v1/prices/fundamentals/{ticker}`** - Fundamentals
    - **Warum:** Agenten können fundamentale Analyse durchführen
    - **Use Case:** "Zeige mir PE-Ratio, Market Cap für AAPL"

### 📊 Macro Status (MITTLERE PRIORITÄT)
18. **`GET /v1/macro/status/{series_id}`** - Series-Status
    - **Warum:** Agenten können FRED-Datenqualität prüfen
    - **Use Case:** "Wie aktuell sind die Daten für UNRATE?"

### 🔧 Jobs & Monitoring (MITTLERE PRIORITÄT)
19. **`GET /v1/admin/jobs`** - Admin-Job-Liste
    - **Warum:** Alternative zu `/ingest/jobs` mit erweiterten Filtern
    - **Use Case:** "Zeige mir alle Jobs mit Status 'error'"

20. **`GET /v1/admin/jobs/stats`** - Job-Statistiken
    - **Warum:** Agenten können Job-Performance analysieren
    - **Use Case:** "Wie ist die Success-Rate der Jobs?"

21. **`GET /v1/admin/jobs/{job_id}`** - Admin-Job-Details
    - **Warum:** Erweiterte Job-Informationen
    - **Use Case:** "Zeige mir Details zu Job XYZ"

22. **`POST /v1/admin/jobs/{job_id}/retry`** - Job-Retry
    - **Warum:** Agenten können fehlgeschlagene Jobs wiederholen
    - **Use Case:** "Retry Job XYZ"

23. **`GET /v1/ingest/adapters`** - Adapter-Liste
    - **Warum:** Agenten können verfügbare Datenquellen entdecken
    - **Use Case:** "Welche Adapter sind verfügbar?"

24. **`GET /v1/ingest/backfill-monitor/{job_id}`** - Backfill-Monitor
    - **Warum:** Live-Progress für Backfill-Jobs
    - **Use Case:** "Zeige mir den Progress von Backfill-Job XYZ"

25. **`POST /v1/ingest/news/backfill`** - News-Backfill
    - **Warum:** Agenten können historische Daten nachholen
    - **Use Case:** "Backfill News für 'AI' vom 2024-01-01 bis 2024-12-31"

### 🔍 Watchlist Updates (NIEDRIGE PRIORITÄT)
26. **`PATCH /v1/watchlist/items/{item_id}`** - Watchlist-Update
    - **Warum:** Agenten können Watchlist-Items bearbeiten
    - **Use Case:** "Update Watchlist-Item #5 (enable/disable)"

### 🐛 Debug Tools (NIEDRIGE PRIORITÄT)
27. **`GET /v1/admin/news/preview-crawl`** - Preview-Crawl
    - **Warum:** Debug-Tool für Body-Extraction
    - **Use Case:** "Teste Crawl für URL XYZ"

28. **`POST /v1/admin/topics/list`** - Admin-Topics-Liste
    - **Warum:** Alternative Topics-Liste (mit Artikel-Counts)
    - **Use Case:** "Zeige mir alle Topics mit Artikel-Anzahl"

---

## 4. PRIORITÄTEN FÜR IMPLEMENTIERUNG

### 🔥 Hoch-Priorität (Sofort implementieren)
1. `GET /v1/news/analytics` - Trend-Analyse
2. `GET /v1/prices/search` - Ticker-Suche
3. `GET /v1/prices/info/{ticker}` - Ticker-Info
4. `GET /v1/prices/fundamentals/{ticker}` - Fundamentals
5. `GET /v1/news/topics/all` - Alle Topics
6. `GET /v1/news/topics/summary` - Topics-Summary
7. `GET /v1/news/{article_id}` - Einzelner Artikel
8. `POST /v1/news/bulk` - Bulk-Fetch

### 🟡 Mittel-Priorität (Balanced)
9. `GET /v1/news/health` - Pipeline Health
10. `GET /v1/news/integrity-check` - Datenintegrität
11. `GET /v1/macro/status/{series_id}` - Series-Status
12. `GET /v1/prices/status/{ticker}` - Price-Status
13. `GET /v1/news/topics/stats` - Topics-Statistiken
14. `GET /v1/news/topics/coverage` - Topics-Coverage
15. `POST /v1/ingest/news/backfill` - News-Backfill
16. `POST /v1/admin/jobs/{job_id}/retry` - Job-Retry

### 🟢 Niedrig-Priorität (Nice-to-Have)
17. `GET /v1/admin/audit/stats` - Audit-Statistiken
18. `GET /v1/admin/jobs` - Admin-Job-Liste
19. `GET /v1/admin/jobs/stats` - Job-Statistiken
20. `GET /v1/ingest/adapters` - Adapter-Liste
21. `PATCH /v1/watchlist/items/{item_id}` - Watchlist-Update
22. `DELETE /v1/news/topics/{topic_name}` - Topic-Löschung

---

## 5. EMPFEHLUNGEN

### ✅ Was zu tun ist:
1. **Hoch-Priorität Endpoints wrappen** (8 Tools)
2. **Analytics-Tools hinzufügen** für intelligente Agenten
3. **Prices-Fundamentals Tools** für fundamentale Analyse
4. **Topics-Management erweitern** für bessere Topic-Verwaltung

### ❌ Was NICHT zu tun ist:
1. **Reset-Endpoints wrappen** - Zu gefährlich für Agenten
2. **Batch-Delete ohne Bestätigung** - Destruktiv
3. **Admin-Operationen ohne Schutz** - Nur mit expliziter Authentifizierung

### 🎯 Ziel:
**Von 36 Tools auf ~50 Tools** erweitern, um intelligente Agenten zu unterstützen, während gefährliche Operationen ausgeschlossen bleiben.

---

## 6. TECHNISCHE NOTIZEN

### Token-Effizienz
- `POST /v1/news/bulk` spart Tokens vs. multiple `GET /v1/news/{id}` Calls
- `GET /v1/news/topics/summary` ist kompakter als `GET /v1/news/topics/all`

### Error Handling
- Alle neuen Tools sollten `dry_run` Parameter unterstützen wo möglich
- Timeouts für lange Operationen (cleanup, backfill) erhöhen

### Schemas
- Zod-Schemas für alle neuen Tools definieren
- Response-Schemas für strukturierte Daten validieren

---

**Nächste Schritte:**
1. ✅ Analyse abgeschlossen
2. ⏳ Prioritäten finalisieren
3. ⏳ Implementierung starten (Hoch-Priorität zuerst)

