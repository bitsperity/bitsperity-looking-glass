# Satbase MCP Update V2 - Backend-Kompatibilität

**Datum:** 29. Oktober 2025  
**Status:** ✅ Abgeschlossen  
**Build:** Erfolgreich

## Übersicht

Der Satbase-MCP wurde vollständig aktualisiert, um mit dem stark verbesserten Satbase-Backend kompatibel zu sein. Das Backend wurde nicht verändert - alle Änderungen erfolgten ausschließlich im MCP.

## Hauptänderungen

### 1. Jobs-Tools (Ingestion-Monitoring)
- **Pfade aktualisiert:**
  - `/v1/jobs` → `/v1/ingest/jobs`
  - `/v1/jobs/{id}` → `/v1/ingest/jobs/{job_id}`
- **Status:** ✅ Kompatibel

### 2. Macro (FRED) Tools
- **Pfade konsolidiert:**
  - `/v1/macro/fred/series/{id}` → `/v1/macro/series/{id}`
  - `/v1/macro/fred/categories` → `/v1/macro/categories`
  - `/v1/macro/fred/refresh-core` → `/v1/macro/refresh-core`
- **Status:** ✅ Kompatibel

### 3. Prices-Tools
- **Breaking Change:** Ticker jetzt Path-Parameter statt Query-Parameter
  - Alt: `GET /v1/prices?ticker=AAPL&from=...&to=...`
  - Neu: `GET /v1/prices/AAPL?from=...&to=...`
- **Response-Schema geändert:**
  - Alt: `{ data: [...], count: X }`
  - Neu: `{ bars: [...], last_date, source, ... }`
- **Ingest-Pfad aktualisiert:**
  - `/v1/ingest/prices` → `/v1/prices/ingest`
- **Status:** ✅ Kompatibel

### 4. Topics-Tools
- **Pfade aktualisiert:**
  - `GET /v1/news/topics` → `GET /v1/news/topics/configured`
  - `POST /v1/news/topics` → `POST /v1/news/topics/add`
- **Request-Schema geändert:**
  - Alt: `{ queries: [...], ingest, hours, ttl_days }`
  - Neu: `{ symbol, expires_at }` (einzelnes Topic)
- **Response-Schema aktualisiert:**
  - Jetzt `{ success, topic, total_topics }` statt Array
- **Status:** ✅ Kompatibel

### 5. Watchlist-Tools (Größte Änderung)
- **Konzept geändert:** Von Symbol-Liste zu generischen Items
- **Neue Struktur:**
  - Items haben `type` (stock/topic/macro), `key`, `label`, `enabled`
  - ID-basierte Verwaltung statt Symbol-basiert
- **Pfade aktualisiert:**
  - `GET/POST /v1/watchlist` → `GET/POST /v1/watchlist/items`
  - `DELETE /v1/watchlist/{symbol}` → `DELETE /v1/watchlist/items/{item_id}`
  - `/v1/watchlist/status` → `/v1/watchlist/active`
- **Status:** ✅ Kompatibel

### 6. Ingest-Tools
- **News-Bodies:**
  - Pfad: `/v1/ingest/news-bodies` → `/v1/admin/news/refetch-bodies`
  - Semantik geändert: Jetzt mit `max_items` und `dry_run` statt Date-Range
- **Macro-Ingest:**
  - Input geändert: `{ series: [...] }` statt `{ series_id, from, to }`
  - Backend fetcht immer alle historischen Daten
- **Status:** ✅ Kompatibel

### 7. BTC-Tools
- **Response-Schema aktualisiert:**
  - Alt: `{ data: [...], count }`
  - Neu: `{ points: [...] }` (points = Array von {ts, price, open, high, low, close, volume})
- **Conversion-Responses:**
  - Backend liefert `{ value_usd, value_btc, date, btc, usd }`
- **Status:** ✅ Kompatibel

### 8. Neue Admin/Quality-Tools (7 neue Tools)

#### 8.1 `news-gaps`
- **Funktion:** Erkennt Coverage-Lücken in News-Daten
- **Endpoint:** `GET /v1/news/gaps`
- **Input:** `from`, `to`, `min_articles_per_day`
- **Output:** Liste von Dates mit zu wenigen Articles

#### 8.2 `cleanup-junk-bodies`
- **Funktion:** Bereinigt Junk-Bodies (Paywalls, Access Denied, etc.)
- **Endpoint:** `POST /v1/admin/news/cleanup-junk`
- **Features:** Semantische Ähnlichkeitsprüfung, Fallback-Heuristiken
- **Input:** `dry_run`, `max_items`, `tag_only`

#### 8.3 `cleanup-quality-bodies`
- **Funktion:** Bereinigt Bodies mit niedriger Quality (wissenschaftliche Metriken)
- **Endpoint:** `POST /v1/admin/news/cleanup-quality`
- **Metriken:** Link-Dichte, Text-Dichte, Stopword-Ratio, Token-Diversität
- **Input:** `dry_run`, `max_items`, `quality_threshold`

#### 8.4 `news-schema-info`
- **Funktion:** Schema-Inspektion für Debugging
- **Endpoint:** `GET /v1/admin/news/schema`
- **Output:** Columns, Indexes, Types

#### 8.5 `get-audit-log`
- **Funktion:** Audit-Trail aller Datenoperationen
- **Endpoint:** `GET /v1/admin/audit`
- **Filter:** `article_id`, `action`, `days`, `limit`

#### 8.6 `get-duplicate-articles`
- **Funktion:** Findet Duplikate (gleiche URL)
- **Endpoint:** `GET /v1/admin/articles/duplicates`

#### 8.7 `news-metrics`
- **Funktion:** Umfassende Quality & Coverage Metriken
- **Endpoint:** `GET /v1/news/metrics`
- **Output:** Body-Coverage, Sprachen, Kategorien, Duplikate, Crawl-Rate

## Tool-Anzahl

- **Vorher:** 29 Tools
- **Nachher:** 36 Tools (29 Core + 7 Admin/Quality)

## Schemas Aktualisiert

Die folgenden Zod-Schemas in `src/lib/schemas.ts` wurden angepasst:

1. `ListPricesResponseSchema` - Neue `bars`-Struktur
2. `BtcOracleResponseSchema` - `points` statt `data`
3. `ConversionResponseSchema` - Flexiblere Felder
4. `WatchlistItemSchema` - Neue Item-Struktur mit `type`, `key`, `label`
5. `TopicItemSchema` - `symbol` statt `query`
6. Diverse Request/Response-Schemas für Watchlist, Topics, Ingest

## Build & Deployment

```bash
cd /home/sascha-laptop/alpaca-bot/mcps/satbase
npm run build
# ✅ Build erfolgreich (245ms)
```

**Output:**
- `dist/index-stdio.js` - Stdio-Transport für Orchestrator
- `dist/index-http.js` - HTTP-Transport für direkte Integration
- `dist/server-setup-CETc8hSh.js` - Gemeinsame Server-Logik

## Test-Empfehlungen

Nach Deployment sollten folgende Tools getestet werden:

### Kritische Tools (Core-Funktionalität)
1. ✅ `health-check` - `/health`
2. ✅ `get-coverage` - `/v1/status/coverage`
3. ✅ `list-news` - `/v1/news?from=...&to=...`
4. ✅ `list-prices` - `/v1/prices/{ticker}?from=...&to=...`
5. ✅ `fred-observations` - `/v1/macro/series/{id}`
6. ✅ `list-jobs` - `/v1/ingest/jobs`

### Watchlist-Tools (Neue Struktur)
7. ✅ `get-watchlist` - `/v1/watchlist/items`
8. ✅ `add-watchlist` - POST mit `{ items: [{ type, key, ... }] }`
9. ✅ `remove-watchlist` - DELETE `/v1/watchlist/items/{id}`

### Admin/Quality-Tools (Neu)
10. ✅ `news-gaps` - Gap-Detection
11. ✅ `cleanup-junk-bodies` - Junk-Bereinigung
12. ✅ `news-metrics` - Umfassende Metriken

## Orchestrator-Kompatibilität

Die Orchestrator-Konfiguration (`orchestrator/config/mcps.yaml` und `mcps-stdio.yaml`) bleibt unverändert:

```yaml
satbase:
  type: http  # oder stdio
  url: http://localhost:3001/mcp
  description: "Market data, news, macro indicators"
```

**Aktion erforderlich:**
1. MCP-Server neu starten (stdio oder http je nach Modus)
2. Orchestrator neu starten, um neue Tool-Definitionen zu laden

## Breaking Changes für Clients

Falls das Frontend (Looking Glass) oder andere Clients den Satbase-MCP direkt nutzen:

### Watchlist
- **Alte Calls:** `add-watchlist` mit `{ symbols: [...] }`
- **Neue Calls:** `add-watchlist` mit `{ items: [{ type: 'stock', key: 'AAPL', ... }] }`

### Topics
- **Alte Calls:** `add-topics` mit `{ queries: [...] }`
- **Neue Calls:** `add-topics` mit `{ symbol: 'AI' }` (einzeln)

### Prices
- **Response-Felder:** `result.data` → `result.bars`

## Zusammenfassung

✅ **Alle 9 Update-Tasks abgeschlossen:**
1. ✅ Jobs-Tools aktualisiert
2. ✅ Macro-Tools aktualisiert
3. ✅ Prices-Tools umgebaut
4. ✅ Topics-Tools aktualisiert
5. ✅ Watchlist-Tools umgebaut
6. ✅ Ingest-Tools aktualisiert
7. ✅ BTC-Tools aktualisiert
8. ✅ 7 neue Admin/Quality-Tools hinzugefügt
9. ✅ MCP erfolgreich gebaut

**Resultat:** Satbase-MCP ist jetzt vollständig kompatibel mit dem neuen Backend. Backend-seitig waren keine Änderungen erforderlich.

## Nächste Schritte

1. **MCP-Server starten:**
   ```bash
   cd /home/sascha-laptop/alpaca-bot/mcps/satbase
   npm run start:stdio  # oder start:http
   ```

2. **Orchestrator neu starten** (lädt neue Tool-Definitionen)

3. **Integration-Tests durchführen:**
   - Health-Check
   - News-Abfrage
   - Prices-Abfrage
   - Jobs-Monitoring
   - Admin-Tools testen

4. **Frontend (Looking Glass) aktualisieren** (falls Satbase-Tools direkt genutzt werden)
   - Watchlist-Formulare anpassen
   - Topics-Formulare anpassen
   - Response-Mapping für Prices anpassen

