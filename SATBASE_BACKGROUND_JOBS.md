# Satbase Background Jobs: News Body Fetching System

## Übersicht

Das **News Body Fetching System** ist eine asynchrone Lösung, die verhindert, dass Agents während des Fetchens von News-Article-Bodies blockiert werden.

### Problem (vorher):
- Agents brauchten Tool: `enqueue-news-bodies` → **30-60 Minuten blockiert**
- Während des Fetches konnten **KEINE anderen Tools** ausgeführt werden
- Timeouts (30s limit) für jeden Agent-Turn

### Lösung (jetzt):
- **Background Scheduler** läuft alle 15 Minuten (konfigurierbar)
- Agents können **sofort arbeiten** während Bodies im Hintergrund gefetched werden
- **Non-blocking, parallelisiert, robust**

---

## Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                      Satbase System                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐         ┌──────────────┐                 │
│  │   Agent     │         │ MCP Tool:    │                 │
│  │  (Orchestr.)├────────▶│enqueue-news- │                 │
│  │             │ optional│bodies (old)  │ on-demand       │
│  └─────────────┘         └──────────────┘                 │
│                                 │                          │
│  ┌──────────────────────────────▼──────────┐              │
│  │     Satbase API  (/v1/ingest/...)      │              │
│  │  Handles immediate job queuing         │              │
│  └──────────────────────────────────────────┘              │
│                                                             │
│  ┌─────────────────────────────────────────┐              │
│  │   Satbase Scheduler (APScheduler)       │              │
│  │   Runs: Every 15 minutes automatically  │              │
│  └─────────────────────────────────────────┘              │
│           │                                                │
│           ▼                                                │
│  ┌────────────────────────────────────────┐               │
│  │ News Bodies Background Job             │               │
│  │ - Fetch 100 pending articles at a time │               │
│  │ - 10 concurrent HTTP requests          │               │
│  │ - Stores results in news_body parquet  │               │
│  └────────────────────────────────────────┘               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Komponenten

### 1. Background Job: `news_bodies.py`
**Datei**: `apps/satbase_scheduler/jobs/news_bodies.py`

**Funktionen**:
- `fetch_pending_news_bodies()` - Fetcht batch von Artikeln ohne Bodies
- `_fetch_single_body()` - Fetcht HTML/Text für einzelnen Article
- `continuous_body_fetcher()` - Long-lived background task (optional)

**Konfiguration** (in `config.py`):
```python
'news_bodies': {
    'trigger': 'interval',
    'minutes': 15,          # Check alle 15 min
    'max_articles': 100     # Pro Run max 100 Artikel
}
```

### 2. Scheduler: `satbase_scheduler/main.py`
Registriert den News Bodies Job:
```python
scheduler.add_job(
    news_bodies.fetch_pending_news_bodies,
    trigger=IntervalTrigger(minutes=15),
    kwargs={'max_articles': 100, 'batch_size': 10},
    id='news_bodies_fetch',
    name='Fetch Pending News Bodies (Background)',
    max_instances=1  # Only one instance at a time
)
```

### 3. API Endpoints: `satbase_api/routers/news_body_fetch.py`

#### POST `/v1/news/{news_id}/fetch-body`
**On-demand** Fetching für einzelne Article
```bash
curl -X POST http://localhost:8080/v1/news/{article_id}/fetch-body
```

**Response**:
```json
{
  "success": true,
  "id": "article_id",
  "url": "https://...",
  "has_text": true,
  "has_html": true,
  "fetched_at": "2025-10-25T19:51:30.123456"
}
```

#### GET `/v1/news/body-stats`
**Monitoring** des Body-Fetch Status
```bash
curl http://localhost:8080/v1/news/body-stats?from=2025-10-18&to=2025-10-25
```

**Response**:
```json
{
  "period": {"from": "2025-10-18", "to": "2025-10-25"},
  "total_articles": 25902,
  "articles_with_body": 4907,
  "articles_without_body": 20995,
  "success_rate": 18.94,
  "coverage_percent": 18.94,
  "status": "ok"
}
```

---

## Workflow

### Szenario 1: Agent braucht News mit Bodies
```
Agent Call: "Gather latest news on AAPL"
  ├─ Ruft MCP Tool auf: satbase/get-news
  ├─ Returns News-IDs sofort (KEINE Blockierung!)
  ├─ Falls einige Bodies fehlen: Agent nutzt teilweise Daten
  └─ Background Job fetcht rest später
```

### Szenario 2: Massive News-Ingestion (12 Monate)
```
Admin: "Importiere News von 2024"
  ├─ Ruft MCP Tool auf: enqueue-news-bodies
  ├─ Triggers `POST /v1/ingest/news-bodies`
  ├─ Returns sofort (Job im Queue)
  ├─ Background Worker fetcht 100er Batches
  ├─ Alle 10 Sekunden Pause zwischen Batches
  └─ Scheduler läuft parallel: 
     - Agents können in der Zwischenzeit arbeiten
     - Andere Jobs (Watchlist, FRED) laufen normal
```

---

## Konfiguration

### Scheduler Interval ändern
**Datei**: `apps/satbase_scheduler/config.py`
```python
'news_bodies': {
    'minutes': 5,  # Alle 5 Minuten statt 15
    'max_articles': 200  # Max 200 statt 100
}
```

### Batch Size ändern
**Datei**: `apps/satbase_scheduler/main.py`
```python
scheduler.add_job(
    news_bodies.fetch_pending_news_bodies,
    kwargs={'max_articles': 100, 'batch_size': 20},  # 20 concurrent
    ...
)
```

---

## Monitoring & Debugging

### Scheduler Logs
```bash
docker logs alpaca-bot-satbase-scheduler-1 -f | grep "news_bodies"
```

**Expected Output**:
```
INFO: Running job "Fetch Pending News Bodies (Background)"
INFO: Fetching pending news bodies (max=100, batch=10)
INFO: Found 87 articles needing bodies
INFO: Body fetch cycle completed: 42 fetched, 2 errors
```

### API Monitoring
```bash
# Check Status
curl http://localhost:8080/v1/news/body-stats

# Check einzelnen Article
curl -X POST http://localhost:8080/v1/news/{id}/fetch-body

# Wie viele ohne Bodies?
curl "http://localhost:8080/v1/news?from=2025-10-18&has_body=false&limit=1"
```

### Performance Metrics
```python
# In logs sehen Sie:
# - Wie lange Bodies von 100 Articles dauert
# - Error Rate
# - Success Rate pro Batch
```

---

## Error Handling

### 403 Forbidden (häufig)
Website blockiert HTTP-Requests → **Erwartet** bei vielen News-Sites
- System ignoriert diese
- Counts als Error
- Nächster Run retries (darf auch fehlschlagen)

### Network Timeout
System hat 60s Timeout pro Batch → **Backoff-Logik**

### Datetime Type Errors
Wenn unterschiedliche Polars Datetime-Types: 
- System nutzt `.select(["id"])` um nur IDs zu laden
- Vermeidet Timezone-Konflikte
- Returns Safe Default wenn fehlgeschlagen

---

## Best Practices

### ✅ Agents nutzen sofort arbeiten
Agents sollten NICHT warten bis Bodies gefetched sind
```python
# Gut:
news = get_news()  # Returns sofort mit oder ohne Bodies
process_headlines(news)  # Work mit was vorhanden ist

# Schlecht:
news = enqueue_bodies_and_wait()  # BLOCKIERT!
```

### ✅ Monitoring einrichten
Regelmäßig `/news/body-stats` checken um Coverage zu tracken

### ✅ Batch Size tunen
- **Viele kleine Requests**: Batch-Size ↑ = schneller
- **Server-Last hoch**: Batch-Size ↓ = freundlicher

### ✅ Interval anpassen
- **Viele neue Articles/Tag**: Interval ↓ (z.B. 5 min)
- **Wenig neue Articles**: Interval ↑ (z.B. 30 min)

---

## Container Management

### Neu starten
```bash
docker compose restart satbase-scheduler satbase-api
```

### Logs anschauen
```bash
docker logs alpaca-bot-satbase-scheduler-1 -f
docker logs alpaca-bot-satbase-api-1 -f
```

### In Container exec
```bash
# Check ob Jobs laufen
docker exec alpaca-bot-satbase-scheduler-1 ps aux | grep news

# Check configuration
docker exec alpaca-bot-satbase-scheduler-1 cat /app/config.py
```

---

## Troubleshooting

| Problem | Lösung |
|---------|--------|
| Job läuft nicht | Check `docker ps` ob Container running |
| Zu langsame Fetches | ↑ `batch_size` oder ↓ `interval_minutes` |
| Zu viele Errors | ↓ `batch_size` (weniger concurrent) |
| Zu viel Server-Last | ↑ `interval_minutes` oder add delay |
| Coverage nicht steigt | Checken ob News-Ingestion läuft |

---

## Zukunft: Weitere Optimierungen

- [ ] Retry-Logik mit exponential backoff
- [ ] Dead Letter Queue für persistente Fehler
- [ ] Webhook Notifications auf body-fetch-complete
- [ ] Parallel Job Workers (mehrere Scheduler)
- [ ] Redis Job Queue für Skalierung
