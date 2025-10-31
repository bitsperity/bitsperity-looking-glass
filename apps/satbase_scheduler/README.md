# Satbase Scheduler

Proaktiver Scheduler für automatische Datenpflege in Satbase.

## Features

- ✅ **Strukturiertes JSON-Logging** - Kompatibel mit satbase_core logging
- ✅ **State-Management** - SQLite-Datenbank für Job-State, Execution History, Konfiguration
- ✅ **Frontend-Integration** - Vollständige Backend-API für Control, Config, Monitoring
- ✅ **Automatisches Gap-Filling** - Erkennt und füllt Lücken in News, Prices, Macro-Daten
- ✅ **Multi-Channel Maintenance** - Watchlist, Trending, Core Indicators

## Architektur

```
┌─────────────────────────────────────────────────────────────┐
│              Satbase Scheduler Service                      │
│  (apps/satbase_scheduler/)                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  APScheduler (AsyncIOScheduler)                     │   │
│  │  - Job Registration & Execution                     │   │
│  │  - Event Listeners                                  │   │
│  └─────────────────────────────────────────────────────┘   │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Job Wrapper (@wrap_job)                            │   │
│  │  - Automatic Logging                                │   │
│  │  - Execution Tracking                               │   │
│  │  - Error Handling                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Jobs                                               │   │
│  │  - watchlist.py: Refresh Watchlist                 │   │
│  │  - topics.py: Per-Topic News Ingestion              │   │
│  │  - fred.py: Core FRED Indicators                   │   │
│  │  - prices.py: Price Maintenance                     │   │
│  │  - gaps.py: Gap Detection & Filling                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
           │
           │ HTTP Calls
           ▼
┌─────────────────────────────────────────────────────────────┐
│         Satbase Backend API (Port 8080)                    │
│  /v1/scheduler/* Endpoints                                 │
├─────────────────────────────────────────────────────────────┤
│  - GET  /v1/scheduler/jobs                                 │
│  - GET  /v1/scheduler/jobs/{job_id}                       │
│  - POST /v1/scheduler/jobs/{job_id}/enable                │
│  - POST /v1/scheduler/jobs/{job_id}/disable               │
│  - POST /v1/scheduler/jobs/{job_id}/trigger               │
│  - GET  /v1/scheduler/jobs/{job_id}/executions            │
│  - GET  /v1/scheduler/executions                           │
│  - GET  /v1/scheduler/gaps                                 │
│  - GET  /v1/scheduler/status                              │
└─────────────────────────────────────────────────────────────┘
```

## Jobs

### Present Maintenance

| Job ID | Name | Trigger | Funktion |
|--------|------|---------|----------|
| `watchlist_refresh` | Refresh Watchlist | Daily 7:00 UTC | Refresh alle aktiven Watchlist-Items (Prices + News) |
| `topics_ingest` | Per-Topic News Ingestion | Hourly | News-Ingestion für alle Watchlist-Symbols |
| `fred_daily` | Refresh FRED Core Indicators | Daily 8:00 UTC | Aktualisiere 28 Core FRED-Indikatoren |

### Price Maintenance

| Job ID | Name | Trigger | Funktion |
|--------|------|---------|----------|
| `prices_watchlist` | Refresh Watchlist Prices | Daily 7:05 UTC | Refresh Prices für alle Watchlist-Stocks |
| `prices_gaps` | Detect Price Gaps | Daily 2:00 UTC | Erkenne fehlende Price-Tage (letzte 90 Tage) |
| `prices_fill_gaps` | Fill Price Gaps | Daily 3:00 UTC | Fülle erkannte Price-Gaps (max 10 pro Run) |

### Gap Detection & Filling

| Job ID | Name | Trigger | Funktion |
|--------|------|---------|----------|
| `gaps_detect` | Detect Data Gaps | Weekly Sunday 2:00 UTC | Erkenne Lücken in News, Prices, Macro |
| `gaps_fill` | Fill Data Gaps | Daily 3:30 UTC | Fülle kritische Gaps (priorisiert) |

## Verwendung

### Scheduler starten

```bash
cd apps/satbase_scheduler
python -m main
```

### Mit Hot Reload (Development)

```bash
ENABLE_RELOAD=true python -m main
```

### Docker

```bash
docker compose up satbase-scheduler
```

## Backend API

### Jobs auflisten

```bash
curl http://localhost:8080/v1/scheduler/jobs
```

### Job-Status abfragen

```bash
curl http://localhost:8080/v1/scheduler/jobs/watchlist_refresh
```

### Job aktivieren/deaktivieren

```bash
# Deaktivieren
curl -X POST http://localhost:8080/v1/scheduler/jobs/watchlist_refresh/disable

# Aktivieren
curl -X POST http://localhost:8080/v1/scheduler/jobs/watchlist_refresh/enable
```

### Execution History

```bash
# Alle Executions eines Jobs
curl http://localhost:8080/v1/scheduler/jobs/watchlist_refresh/executions?limit=50

# Alle Executions (filterbar)
curl http://localhost:8080/v1/scheduler/executions?status=error&limit=100
```

### Gaps abfragen

```bash
# Unfilled Gaps
curl http://localhost:8080/v1/scheduler/gaps?filled=false&limit=50

# Gaps nach Type
curl http://localhost:8080/v1/scheduler/gaps?gap_type=news&severity=critical
```

### Scheduler-Status

```bash
curl http://localhost:8080/v1/scheduler/status
```

## Logging

Der Scheduler nutzt strukturiertes JSON-Logging:

```json
{"ts":"2025-01-27T10:00:00Z","event":"job_started","component":"scheduler","job_id":"watchlist_refresh","job_name":"Refresh Watchlist"}
{"ts":"2025-01-27T10:00:05Z","event":"job_success","component":"scheduler","job_id":"watchlist_refresh","job_name":"Refresh Watchlist","duration_ms":5234,"result_summary":{"items_refreshed":5,"jobs_triggered":3}}
```

## Datenbank

State wird in `scheduler.db` gespeichert:

- `scheduler_jobs`: Job-Konfigurationen und Status
- `scheduler_executions`: Execution History
- `scheduler_gaps`: Erkannte Datenlücken
- `scheduler_config`: Konfiguration

## Frontend-Integration

Die Backend-API ist vollständig für Frontend-Integration vorbereitet:

- **Control**: Jobs aktivieren/deaktivieren, manuell triggern
- **Config**: Job-Konfigurationen ändern (später erweiterbar)
- **Monitoring**: Execution History, Status, Gaps

## Entwicklung

### Neuen Job hinzufügen

1. Job-Funktion in `jobs/` erstellen:

```python
from ..job_wrapper import wrap_job

@wrap_job("my_job_id", "My Job Name")
async def my_job() -> dict:
    # Job-Logik
    return {"status": "ok", "result": "..."}
```

2. Job in `main.py` registrieren:

```python
{
    "job_id": "my_job_id",
    "name": "My Job Name",
    "func": my_module.my_job,
    "trigger": CronTrigger(hour=9, minute=0, timezone='UTC'),
    "max_instances": 1,
    "enabled": True
}
```

3. Job in `jobs/__init__.py` exportieren

### Job testen

```python
# In Python shell
from apps.satbase_scheduler.jobs import watchlist
import asyncio

result = asyncio.run(watchlist.refresh_watchlist())
print(result)
```

## Troubleshooting

### Job läuft nicht

1. Check ob Job enabled ist:
```bash
curl http://localhost:8080/v1/scheduler/jobs/my_job_id
```

2. Check Execution History:
```bash
curl http://localhost:8080/v1/scheduler/jobs/my_job_id/executions
```

3. Check Logs:
```bash
docker logs alpaca-bot-satbase-scheduler-1 -f | grep "my_job_id"
```

### Job schlägt fehl

1. Check Execution History für Error-Message:
```bash
curl http://localhost:8080/v1/scheduler/executions?status=error&limit=10
```

2. Check Backend API Logs:
```bash
docker logs alpaca-bot-satbase-api-1 -f
```

## Zukunft

- [ ] HTTP-Trigger für manuelle Job-Ausführung
- [ ] Job-Konfiguration via API ändern
- [ ] Webhook-Notifications bei Job-Fehlern
- [ ] Retry-Logik mit exponential backoff
- [ ] Job-Dependencies (Job B läuft nach Job A)

