from __future__ import annotations

import uuid
import json
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

import yaml
from fastapi import APIRouter, BackgroundTasks, status
from fastapi.responses import JSONResponse

from libs.satbase_core.ingest.registry import registry, registry_with_metadata
from libs.satbase_core.utils.logging import log
from libs.satbase_core.config.settings import load_settings
from libs.satbase_core.storage.stage import scan_parquet_glob
import polars as pl


router = APIRouter()


_JOBS: dict[str, dict[str, Any]] = {}


def _jobs_log_path() -> Path:
    """Get path to jobs log file (JSONL format)"""
    s = load_settings()
    log_dir = Path(s.stage_dir).parent / "logs" / "jobs"
    log_dir.mkdir(parents=True, exist_ok=True)
    return log_dir / "jobs.jsonl"


def _persist_job(job_id: str) -> None:
    """Append job to JSONL log file"""
    if job_id not in _JOBS:
        return
    
    job_data = {"job_id": job_id, **_JOBS[job_id], "updated_at": datetime.utcnow().isoformat()}
    log_path = _jobs_log_path()
    
    try:
        with open(log_path, "a") as f:
            f.write(json.dumps(job_data) + "\n")
    except Exception as e:
        log.error(f"Failed to persist job {job_id}: {e}")


def _load_jobs_from_log(limit: int = 100) -> dict[str, dict[str, Any]]:
    """Load recent jobs from JSONL log, keeping only the latest state per job_id"""
    log_path = _jobs_log_path()
    if not log_path.exists():
        return {}
    
    jobs_dict = {}
    try:
        with open(log_path, "r") as f:
            # Read ALL lines to get all unique jobs (later lines override earlier ones)
            for line in f:
                if line.strip():
                    job = json.loads(line)
                    job_id = job.get("job_id")
                    if job_id:
                        # Later lines override earlier ones (latest status wins)
                        jobs_dict[job_id] = job
    except Exception as e:
        log.error(f"Failed to load jobs from log: {e}")
    
    return jobs_dict


def _load_cfg() -> dict[str, Any]:
    cfg_path = Path("libs/satbase_core/config/sources.yaml")
    return yaml.safe_load(cfg_path.read_text()) if cfg_path.exists() else {}


def _new_job(kind: str, payload: dict[str, Any]) -> str:
    job_id = uuid.uuid4().hex
    _JOBS[job_id] = {"status": "queued", "kind": kind, "payload": payload, "created_at": datetime.utcnow().isoformat()}
    _persist_job(job_id)
    return job_id


# Helper functions for other routers to enqueue jobs
# (These are called from prices.py, macro.py, watchlist.py)

def enqueue_prices_daily(tickers: list[str]) -> str:
    """Helper to enqueue price ingestion job"""
    import httpx
    job_id = _new_job("prices_daily", {"tickers": tickers})
    try:
        with httpx.Client(timeout=2) as client:
            client.post("http://localhost:8080/v1/ingest/prices/daily", json={"tickers": tickers})
    except Exception:
        pass  # Job still created, endpoint will handle it
    return job_id


def enqueue_macro_fred(series: list[str]) -> str:
    """Helper to enqueue FRED macro data ingestion job"""
    import httpx
    job_id = _new_job("macro_fred", {"series": series})
    try:
        with httpx.Client(timeout=2) as client:
            client.post("http://localhost:8080/v1/ingest/macro/fred", json={"series": series})
    except Exception:
        pass
    return job_id


def enqueue_news(query: str, hours: int | None = None) -> str:
    """Helper to enqueue news ingestion job"""
    import httpx
    job_id = _new_job("news", {"query": query, "hours": hours})
    try:
        with httpx.Client(timeout=2) as client:
            client.post("http://localhost:8080/v1/ingest/news", json={"query": query, "hours": hours})
    except Exception:
        pass
    return job_id


# Note: Removed _start_thread() 
# Now using FastAPI BackgroundTasks directly in endpoints for async execution


def _run_prices_daily(job_id: str, tickers: list[str]) -> None:
    _JOBS[job_id]["status"] = "running"
    _persist_job(job_id)  # Persist running state
    
    reg = registry()
    fetch, normalize, sink = reg["stooq"]
    cfg = _load_cfg()
    params = dict(cfg.get("stooq", {}))
    params["tickers"] = [t.upper() for t in tickers]
    try:
        raw = fetch(params)
        models = list(normalize(raw))
        if not models:
            # No new data (delta-fetch returned empty) - this is OK, mark as done
            _JOBS[job_id].update({"status": "done", "result": {"count": 0, "message": "No new data (already up-to-date)"}})
            _persist_job(job_id)  # Persist final state
            return
        info = sink(models, date.today())
        _JOBS[job_id].update({"status": "done", "result": info})
        _persist_job(job_id)  # Persist final state
    except Exception as e:
        _JOBS[job_id].update({"status": "error", "error": str(e)})
        _persist_job(job_id)  # Persist error state


def _run_macro_fred(job_id: str, series: list[str]) -> None:
    _JOBS[job_id]["status"] = "running"
    _persist_job(job_id)
    
    reg = registry()
    fetch, normalize, sink = reg["fred"]
    cfg = _load_cfg()
    params = dict(cfg.get("fred", {}))
    params["series"] = series
    try:
        raw = fetch(params)
        models = list(normalize(raw))
        info = sink(models, date.today())
        _JOBS[job_id].update({"status": "done", "result": info})
        _persist_job(job_id)
    except Exception as e:
        _JOBS[job_id].update({"status": "error", "error": str(e)})
        _persist_job(job_id)


def _run_news(job_id: str, query: str, topic: str | None = None, hours: int | None = None) -> None:
    _JOBS[job_id]["status"] = "running"
    _persist_job(job_id)
    
    reg = registry()
    results: dict[str, Any] = {}
    try:
        # GDELT doc v2
        if "gdelt_doc_v2" in reg:
            fetch, normalize, sink = reg["gdelt_doc_v2"]
            params = {"query": query}
            if hours is not None:
                params["window_hours"] = hours
            raw = fetch(params)
            models = list(normalize(raw, topic))  # NEW: pass topic
            info = sink(models, date.today(), topic)  # NEW: pass topic
            results["gdelt_doc_v2"] = info
        # Google RSS
        if "news_google_rss" in reg:
            fetch, normalize, sink = reg["news_google_rss"]
            params = {"query": query}
            raw = fetch(params)
            models = list(normalize(raw, topic))  # NEW: pass topic
            info = sink(models, date.today(), topic)  # NEW: pass topic
            results["news_google_rss"] = info
        _JOBS[job_id].update({"status": "done", "result": results})
        _persist_job(job_id)
        
        # Note: News body fetching is now handled by satbase_scheduler background job
        # This decouples the blocking I/O from the API layer
        
    except Exception as e:
        _JOBS[job_id].update({"status": "error", "error": str(e)})
        _persist_job(job_id)


def _run_news_backfill(job_id: str, query: str, date_from: date, date_to: date, topic: str | None = None) -> None:
    """Backfill historical news using ALL adapters that support historical queries"""
    _JOBS[job_id]["status"] = "running"
    _persist_job(job_id)
    
    registry_full = registry_with_metadata()
    results: dict[str, Any] = {}
    
    try:
        # Find all news adapters that support historical queries
        historical_adapters = {
            name: entry for name, entry in registry_full.items()
            if entry.metadata.category == "news" and entry.metadata.supports_historical
        }
        
        log("news_backfill_start", adapters=list(historical_adapters.keys()), 
            date_from=date_from.isoformat(), date_to=date_to.isoformat())
        
        # Process date range day by day to avoid huge API requests
        current_date = date_from
        while current_date <= date_to:
            next_date = current_date + timedelta(days=1)
            
            for adapter_name, entry in historical_adapters.items():
                try:
                    fetch, normalize, sink = entry.fns
                    
                    # Prepare params with date range
                    # GDELT expects startdatetime/enddatetime in YYYYMMDDHHMMSS format
                    params = {
                        "query": query,
                        "startdatetime": current_date.strftime("%Y%m%d%H%M%S"),
                        "enddatetime": next_date.strftime("%Y%m%d%H%M%S"),
                        "window_hours": 6  # Larger windows for historical backfill
                    }
                    
                    raw = fetch(params)
                    models = list(normalize(raw, topic))  # Pass topic for annotation
                    info = sink(models, current_date, topic)  # Pass topic for annotation
                    
                    if adapter_name not in results:
                        results[adapter_name] = {"days": 0, "total_count": 0, "partitions": []}
                    
                    results[adapter_name]["days"] += 1
                    results[adapter_name]["total_count"] += info.get("count", 0)
                    results[adapter_name]["partitions"].append({
                        "date": current_date.isoformat(),
                        "count": info.get("count", 0),
                        "path": info.get("path")
                    })
                    
                    log("news_backfill_day", adapter=adapter_name, date=current_date.isoformat(), 
                        count=info.get("count", 0))
                    
                except Exception as e:
                    log("news_backfill_day_error", adapter=adapter_name, 
                        date=current_date.isoformat(), error=str(e))
                    # Continue with other adapters/dates even if one fails
            
            current_date = next_date
        
        _JOBS[job_id].update({"status": "done", "result": results})
        _persist_job(job_id)
        log("news_backfill_complete", results=results)
        
        # Automatically fetch bodies for the news we just fetched
        log("news_backfill_auto_bodies", date_from=date_from.isoformat(), date_to=date_to.isoformat())
        body_job_id = _new_job("news_bodies", {"from": date_from.isoformat(), "to": date_to.isoformat(), "auto": True})
        # _start_thread(_run_news_bodies, body_job_id, date_from, date_to) # This line is removed
        # The body fetching logic is now handled by the /ingest/news/backfill endpoint
        
    except Exception as e:
        _JOBS[job_id].update({"status": "error", "error": str(e)})
        _persist_job(job_id)
        log("news_backfill_error", error=str(e))


def _run_fetch_missing_bodies(job_id: str, max_articles: int = 300, days_back: int = 3) -> None:
    _JOBS[job_id]["status"] = "running"
    _persist_job(job_id)

    try:
        s = load_settings()
        stage = Path(s.stage_dir)
        from datetime import timedelta
        import polars as pl
        from libs.satbase_core.storage.stage import partition_path, upsert_parquet_by_id, delete_by_ids
        from libs.satbase_core.adapters.http import fetch_text_with_retry

        fetched = 0
        deleted = 0
        today = date.today()
        for d_off in range(0, days_back):
            d = today - timedelta(days=d_off)
            for source in ["news_rss", "gdelt"]:
                docs_path = partition_path(stage, source, d) / "news_docs.parquet"
                if not docs_path.exists():
                    continue
                try:
                    df_docs = pl.read_parquet(docs_path)
                except Exception:
                    continue
                if "id" not in df_docs.columns:
                    continue

                bodies_path = partition_path(stage, "news_body", d) / "news_body.parquet"
                if bodies_path.exists():
                    try:
                        df_bodies = pl.read_parquet(bodies_path)
                    except Exception:
                        df_bodies = pl.DataFrame({"id": []})
                else:
                    df_bodies = pl.DataFrame({"id": []})

                have_body = set(df_bodies["id"].to_list()) if df_bodies.height > 0 else set()
                missing_df = df_docs.filter(~pl.col("id").is_in(list(have_body)))
                if missing_df.height == 0:
                    continue

                for row in missing_df.to_dicts():
                    if fetched >= max_articles:
                        break
                    url = row.get("url")
                    nid = row.get("id")
                    if not url or not nid:
                        continue
                    text = fetch_text_with_retry(url, max_retries=2, timeout=15)
                    if text and len(text) > 100:
                        upsert_parquet_by_id(stage, "news_body", d, "news_body", "id", [{
                            "id": nid,
                            "url": url,
                            "content_text": text,
                            "fetched_at": datetime.utcnow(),
                            "published_at": row.get("published_at") or datetime.utcnow()
                        }])
                        fetched += 1
                    else:
                        delete_by_ids(stage, source, d, "news_docs", "id", [nid])
                        deleted += 1

        _JOBS[job_id].update({"status": "done", "result": {"fetched": fetched, "deleted": deleted, "days": days_back}})
        _persist_job(job_id)
    except Exception as e:
        _JOBS[job_id].update({"status": "error", "error": str(e)})
        _persist_job(job_id)


@router.post("/ingest/prices/daily", status_code=status.HTTP_202_ACCEPTED)
async def ingest_prices_daily(body: dict[str, Any], background_tasks: BackgroundTasks):
    """Non-blocking async price ingestion"""
    tickers = body.get("tickers", [])
    job_id = _new_job("prices_daily", {"tickers": tickers})
    background_tasks.add_task(_run_prices_daily, job_id, tickers)
    return JSONResponse({
        "job_id": job_id, 
        "status": "accepted", 
        "message": "Price ingestion started in background"
    }, status_code=status.HTTP_202_ACCEPTED)


@router.post("/ingest/macro/fred", status_code=status.HTTP_202_ACCEPTED)
async def ingest_macro_fred(body: dict[str, Any], background_tasks: BackgroundTasks):
    """Non-blocking async FRED macro data ingestion"""
    series = body.get("series", [])
    job_id = _new_job("macro_fred", {"series": series})
    background_tasks.add_task(_run_macro_fred, job_id, series)
    return JSONResponse({
        "job_id": job_id, 
        "status": "accepted", 
        "message": "Macro data ingestion started in background"
    }, status_code=status.HTTP_202_ACCEPTED)


@router.post("/ingest/news", status_code=status.HTTP_202_ACCEPTED)
async def ingest_news(body: dict[str, Any], background_tasks: BackgroundTasks):
    """Non-blocking async news ingestion with unified fetch (metadata + text content)"""
    query: str = body.get("query", "")
    topic: str | None = body.get("topic")
    hours: int | None = body.get("hours")
    job_id = _new_job("news", {"query": query, "topic": topic, "hours": hours})
    background_tasks.add_task(_run_news, job_id, query, topic, hours)
    return JSONResponse({
        "job_id": job_id, 
        "status": "accepted", 
        "message": "News ingestion started in background (unified fetch: metadata + text)"
    }, status_code=status.HTTP_202_ACCEPTED)


@router.post("/ingest/news/bodies", status_code=status.HTTP_202_ACCEPTED)
async def ingest_news_bodies(body: dict[str, Any]):
    """
    DEPRECATED: News body fetching now happens inline during news ingestion.
    This endpoint returns immediately - unified fetch already handles bodies.
    """
    return JSONResponse({
        "status": "deprecated", 
        "message": "News body fetching is now unified with news ingestion. Bodies are fetched inline during /ingest/news."
    }, status_code=status.HTTP_202_ACCEPTED)


@router.post("/ingest/news/backfill", status_code=status.HTTP_202_ACCEPTED)
async def ingest_news_backfill(body: dict[str, Any], background_tasks: BackgroundTasks):
    """Backfill historical news data using all adapters that support historical queries"""
    query = body.get("query", "semiconductor OR chip OR foundry")
    from_str = body.get("from")
    to_str = body.get("to")
    topic = body.get("topic")  # NEW: optional topic for annotation
    
    if not from_str or not to_str:
        return JSONResponse({"error": "from/to date range required"}, status_code=400)
    
    dfrom = date.fromisoformat(from_str)
    dto = date.fromisoformat(to_str)
    
    # Check that date range is reasonable (not too large)
    days = (dto - dfrom).days
    if days > 365:
        return JSONResponse(
            {"error": f"Date range too large ({days} days). Maximum 365 days per backfill job."},
            status_code=400
        )
    
    job_id = _new_job("news_backfill", {"query": query, "from": from_str, "to": to_str, "topic": topic})
    background_tasks.add_task(_run_news_backfill, job_id, query, dfrom, dto, topic)
    
    return JSONResponse({
        "job_id": job_id,
        "status": "accepted",
        "retry_after": 5,
        "message": f"Backfilling news for {days} days using all capable adapters",
        "adapters": [name for name, entry in registry_with_metadata().items() 
                     if entry.metadata.category == "news" and entry.metadata.supports_historical]
    }, status_code=status.HTTP_202_ACCEPTED)


@router.post("/ingest/news/fetch-missing-bodies")
async def fetch_missing_bodies(body: dict[str, Any] | None = None, background_tasks: BackgroundTasks = None):
    params = body or {}
    max_articles: int = params.get("max_articles", 300)
    days_back: int = params.get("days", 3)
    job_id = _new_job("news_bodies", {"max_articles": max_articles, "days": days_back})
    background_tasks.add_task(_run_fetch_missing_bodies, job_id, max_articles, days_back)
    return JSONResponse({"job_id": job_id, "status": "accepted"}, status_code=status.HTTP_202_ACCEPTED)


def enqueue_news_bodies(max_articles: int = 300, days: int = 3) -> str:
    import httpx
    job_id = _new_job("news_bodies", {"max_articles": max_articles, "days": days})
    try:
        with httpx.Client(timeout=2) as client:
            client.post("http://localhost:8080/v1/ingest/news/fetch-missing-bodies", json={"max_articles": max_articles, "days": days})
    except Exception:
        pass
    return job_id


@router.get("/ingest/jobs")
def list_all_jobs(limit: int = 100, status_filter: str | None = None):
    """List all jobs with optional status filter and limit (from persistent log + in-memory)"""
    # Load from persistent log first (returns dict with latest state per job_id)
    jobs_dict = _load_jobs_from_log(limit=limit)
    
    # Override with in-memory jobs (most recent state) - they take precedence
    for job_id, job_data in _JOBS.items():
        jobs_dict[job_id] = {"job_id": job_id, **job_data}
    
    # Convert to list and filter
    jobs = []
    for job in jobs_dict.values():
        if status_filter and job.get("status") != status_filter:
            continue
        jobs.append(job)
    
    # Sort by updated_at or job_id (newest first)
    jobs = sorted(jobs, key=lambda x: x.get("updated_at", x.get("job_id", "")), reverse=True)
    
    return {
        "count": len(jobs),
        "jobs": jobs[:limit]
    }


@router.get("/ingest/jobs/{job_id}")
def ingest_job_status(job_id: str):
    job = _JOBS.get(job_id)
    if not job:
        return {"job_id": job_id, "status": "not_found"}
    return {"job_id": job_id, **job}


@router.delete("/ingest/jobs/{job_id}")
def cancel_job(job_id: str):
    """Cancel/delete a job (useful for stuck jobs after server restart)"""
    if job_id in _JOBS:
        _JOBS[job_id]["status"] = "cancelled"
        _persist_job(job_id)
        del _JOBS[job_id]
        return {"job_id": job_id, "status": "cancelled", "message": "Job cancelled"}
    return JSONResponse(
        {"job_id": job_id, "status": "not_found", "message": "Job not found"},
        status_code=404
    )


@router.post("/ingest/jobs/cleanup")
def cleanup_stale_jobs():
    """Clean up jobs that are stuck in 'running' state (e.g. after server restart)"""
    from datetime import datetime, timedelta
    
    cleaned = []
    log_path = _jobs_log_path()
    
    if not log_path.exists():
        return {"cleaned": 0, "jobs": []}
    
    # Read all jobs from log
    all_jobs = {}
    try:
        with open(log_path, "r") as f:
            for line in f:
                if line.strip():
                    job = json.loads(line)
                    job_id = job.get("job_id")
                    if job_id:
                        all_jobs[job_id] = job
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
    
    # Find jobs stuck in 'running' that are not in memory
    now = datetime.utcnow()
    for job_id, job_data in all_jobs.items():
        if job_data.get("status") == "running" and job_id not in _JOBS:
            # Job is stuck - mark as timeout and persist
            _JOBS[job_id] = {
                "status": "timeout",
                "kind": job_data.get("kind"),
                "payload": job_data.get("payload"),
                "error": "Job interrupted (likely server restart)"
            }
            _persist_job(job_id)
            del _JOBS[job_id]
            cleaned.append(job_id)
    
    return {
        "cleaned": len(cleaned),
        "jobs": cleaned,
        "message": f"Cleaned {len(cleaned)} stale jobs"
    }


@router.get("/ingest/adapters")
def list_adapters(category: str | None = None):
    """List all available adapters with their capabilities"""
    registry_full = registry_with_metadata()
    
    adapters = []
    for name, entry in registry_full.items():
        if category and entry.metadata.category != category:
            continue
        
        adapters.append({
            "name": entry.metadata.name,
            "category": entry.metadata.category,
            "supports_historical": entry.metadata.supports_historical,
            "description": entry.metadata.description
        })
    
    return {
        "count": len(adapters),
        "adapters": adapters
    }


