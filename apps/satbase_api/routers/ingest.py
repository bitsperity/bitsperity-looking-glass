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
from libs.satbase_core.storage.news_db import NewsDB


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
        log("job_persist_error", job_id=job_id, error=str(e))


def _load_jobs_from_log(limit: int = 100) -> dict[str, dict[str, Any]]:
    """Load recent jobs from JSONL log, keeping only the latest state per job_id"""
    log_path = _jobs_log_path()
    if not log_path.exists():
        return {}
    
    jobs_dict = {}
    try:
        with open(log_path, "r") as f:
            for line in f:
                if line.strip():
                    job = json.loads(line)
                    job_id = job.get("job_id")
                    if job_id:
                        jobs_dict[job_id] = job
    except Exception as e:
        log("jobs_load_error", error=str(e))
    
    return jobs_dict


def _load_cfg() -> dict[str, Any]:
    cfg_path = Path("libs/satbase_core/config/sources.yaml")
    return yaml.safe_load(cfg_path.read_text()) if cfg_path.exists() else {}


def _new_job(kind: str, payload: dict[str, Any]) -> str:
    job_id = uuid.uuid4().hex
    _JOBS[job_id] = {"status": "queued", "kind": kind, "payload": payload, "created_at": datetime.utcnow().isoformat()}
    _persist_job(job_id)
    
    # Also persist to SQLite for permanent tracking
    try:
        s = load_settings()
        db = NewsDB(s.stage_dir.parent / "news.db")
        db.create_job(job_id, kind, payload=payload)
    except Exception as e:
        log("job_sqlite_persist_error", job_id=job_id, error=str(e))
    
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
        pass
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


def enqueue_news(query: str, from_date: str | None = None, to_date: str | None = None, topic: str | None = None) -> str:
    """Helper to enqueue news ingestion job"""
    import httpx
    job_id = _new_job("news", {"query": query, "from": from_date, "to": to_date, "topic": topic})
    try:
        with httpx.Client(timeout=2) as client:
            payload = {"query": query, "topic": topic}
            if from_date:
                payload["from"] = from_date
            if to_date:
                payload["to"] = to_date
            client.post("http://localhost:8080/v1/ingest/news", json=payload)
    except Exception:
        pass
    return job_id


# Note: Removed _start_thread() 
# Now using FastAPI BackgroundTasks directly in endpoints for async execution


def _run_prices_daily(job_id: str, tickers: list[str]) -> None:
    _JOBS[job_id]["status"] = "running"
    _persist_job(job_id)
    
    reg = registry()
    fetch, normalize, sink = reg["stooq"]
    cfg = _load_cfg()
    params = dict(cfg.get("stooq", {}))
    params["tickers"] = [t.upper() for t in tickers]
    try:
        raw = fetch(params)
        models = list(normalize(raw))
        if not models:
            _JOBS[job_id].update({"status": "done", "result": {"count": 0, "message": "No new data (already up-to-date)"}})
            _persist_job(job_id)
            return
        info = sink(models, date.today())
        _JOBS[job_id].update({"status": "done", "result": info})
        _persist_job(job_id)
    except Exception as e:
        _JOBS[job_id].update({"status": "error", "error": str(e)})
        _persist_job(job_id)


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


def _run_news_unified(
    job_id: str,
    query: str,
    date_from: date | None = None,
    date_to: date | None = None,
    topic: str | None = None
) -> None:
    """
    Unified news ingestion: daily or backfill (same code path).
    If date_from/date_to not provided: fetch today's news.
    """
    s = load_settings()
    db = NewsDB(s.stage_dir.parent / "news.db")
    
    # Update job status to running
    db.update_job_status(job_id, "running", started_at=datetime.utcnow())
    
    # Default: today if not provided
    if not date_from or not date_to:
        date_to = date.today()
        date_from = date_to
    
    reg = registry()
    if "mediastack" not in reg:
        error_msg = "Mediastack adapter not available"
        db.complete_job(job_id, status="error", error=error_msg)
        log("news_unified_error", error=error_msg)
        return
    
    fetch, normalize, sink = reg["mediastack"]
    
    results = {
        "total_days": (date_to - date_from).days + 1,
        "articles_stored": 0,
        "articles_discarded": 0,
        "errors": []
    }
    
    try:
        current_date = date_from
        day_count = 0
        while current_date <= date_to:
            day_count += 1
            try:
                next_date = current_date + timedelta(days=1)
                
                # Update progress
                db.update_job_progress(job_id, current=day_count, total=results["total_days"])
                
                params = {
                    "query": query,
                    "date_from": current_date.isoformat(),
                    "date_to": next_date.isoformat(),
                    "limit": 100
                }
                
                # Fetch from Mediastack
                raw = fetch(params)
                models = list(normalize(raw, topic))
                
                # Sink (crawl bodies + upsert to SQLite)
                info = sink(models, current_date, topic)
                
                results["articles_stored"] += info.get("count", 0)
                results["articles_discarded"] += info.get("discarded", 0)
                
                # Update progress with items processed
                db.update_job_progress(
                    job_id,
                    current=day_count,
                    items_processed=results["articles_stored"],
                    items_failed=results["articles_discarded"]
                )
                
                if "errors" in info:
                    results["errors"].extend(info["errors"])
                
                log("news_unified_day",
                    date=current_date.isoformat(),
                    stored=info.get("count", 0),
                    discarded=info.get("discarded", 0),
                    topic=topic)
                
                current_date = next_date
            
            except Exception as e:
                error_msg = f"{current_date.isoformat()}: {str(e)}"
                results["errors"].append(error_msg)
                log("news_unified_day_error", date=current_date.isoformat(), error=str(e), topic=topic)
                current_date += timedelta(days=1)
        
        db.complete_job(job_id, status="done", result=results)
        log("news_unified_complete",
            total_days=results["total_days"],
            stored=results["articles_stored"],
            discarded=results["articles_discarded"],
            topic=topic)
    
    except Exception as e:
        db.complete_job(job_id, status="error", error=str(e))
        log("news_unified_error", error=str(e), topic=topic)


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
    """
    Unified news ingestion (daily fetch).
    Fetches today's news or specified date range if from/to provided.
    """
    query: str = body.get("query", "")
    topic: str | None = body.get("topic")
    from_str: str | None = body.get("from")
    to_str: str | None = body.get("to")
    
    if not query:
        return JSONResponse({"error": "query required"}, status_code=400)
    
    # Parse dates if provided
    try:
        date_from = date.fromisoformat(from_str) if from_str else None
        date_to = date.fromisoformat(to_str) if to_str else None
    except ValueError:
        return JSONResponse({"error": "Invalid date format (use YYYY-MM-DD)"}, status_code=400)
    
    job_id = _new_job("news", {"query": query, "topic": topic, "from": from_str, "to": to_str})
    background_tasks.add_task(_run_news_unified, job_id, query, date_from, date_to, topic)
    
    return JSONResponse({
        "job_id": job_id, 
        "status": "accepted", 
        "message": "News ingestion started in background (SQLite storage with body crawling)"
    }, status_code=status.HTTP_202_ACCEPTED)


@router.post("/ingest/news/backfill", status_code=status.HTTP_202_ACCEPTED)
async def ingest_news_backfill(body: dict[str, Any], background_tasks: BackgroundTasks):
    """
    Backfill historical news data.
    Uses same logic as daily fetch (unified pipeline).
    """
    query = body.get("query", "")
    from_str = body.get("from")
    to_str = body.get("to")
    topic = body.get("topic")
    
    if not from_str or not to_str:
        return JSONResponse({"error": "from/to date range required"}, status_code=400)
    
    try:
        date_from = date.fromisoformat(from_str)
        date_to = date.fromisoformat(to_str)
    except ValueError:
        return JSONResponse({"error": "Invalid date format (use YYYY-MM-DD)"}, status_code=400)
    
    # Check that date range is reasonable
    days = (date_to - date_from).days
    if days > 365:
        return JSONResponse(
            {"error": f"Date range too large ({days} days). Maximum 365 days per backfill job."},
            status_code=400
        )
    
    job_id = _new_job("news_backfill", {
        "query": query, 
        "from": from_str, 
        "to": to_str, 
        "topic": topic
    })
    background_tasks.add_task(_run_news_unified, job_id, query, date_from, date_to, topic)
    
    return JSONResponse({
        "job_id": job_id,
        "status": "accepted",
        "message": f"Backfilling {days} days (unified SQLite pipeline with body crawling)",
    }, status_code=status.HTTP_202_ACCEPTED)


@router.get("/ingest/jobs")
def list_all_jobs(limit: int = 100, status_filter: str | None = None):
    """List all jobs with optional status filter"""
    jobs_dict = _load_jobs_from_log(limit=limit)
    
    for job_id, job_data in _JOBS.items():
        jobs_dict[job_id] = {"job_id": job_id, **job_data}
    
    jobs = []
    for job in jobs_dict.values():
        if status_filter and job.get("status") != status_filter:
            continue
        jobs.append(job)
    
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
    """Cancel/delete a job"""
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
    """Clean up jobs stuck in 'running' state"""
    cleaned = []
    log_path = _jobs_log_path()
    
    if not log_path.exists():
        return {"cleaned": 0, "jobs": []}
    
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
    
    now = datetime.utcnow()
    for job_id, job_data in all_jobs.items():
        if job_data.get("status") == "running" and job_id not in _JOBS:
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
    """List all available adapters"""
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


@router.get("/ingest/backfill-monitor/{job_id}")
def backfill_monitor(job_id: str):
    """Get live progress of a backfill job"""
    job = _JOBS.get(job_id)
    if not job:
        return JSONResponse({"error": "Job not found"}, status_code=404)
    
    return {
        "job_id": job_id,
        "status": job.get("status", "unknown"),
        "progress": job.get("progress", {}),
        "kind": job.get("kind"),
        "payload": job.get("payload"),
        "created_at": job.get("created_at"),
        "result": job.get("result")
    }


@router.delete("/ingest/news/topics/{topic_name}", status_code=status.HTTP_200_OK)
async def delete_articles_by_topic(topic_name: str, background_tasks: BackgroundTasks):
    """
    Delete all articles with a specific topic from news_docs.
    
    DESTRUCTIVE: This removes articles by filtering out a topic name.
    Use this to clean up mis-annotated topics (e.g., "Bitcoin-Positive" → "Bitcoin").
    
    Parameters:
    - topic_name: Topic name to delete (e.g., "Bitcoin-Positive")
    
    Returns:
    - Job ID for monitoring deletion progress
    """
    job_id = _new_job("delete_topic", {"topic_name": topic_name})
    background_tasks.add_task(_run_delete_topic, job_id, topic_name)
    
    return JSONResponse({
        "job_id": job_id,
        "status": "accepted",
        "message": f"Deleting all articles with topic '{topic_name}'",
        "destructive": True
    }, status_code=status.HTTP_202_ACCEPTED)


def _run_delete_topic(job_id: str, topic_name: str) -> None:
    """Delete all articles with a specific topic"""
    _JOBS[job_id]["status"] = "running"
    _persist_job(job_id)
    
    s = load_settings()
    deleted_count = 0
    
    try:
        # Scan all news_docs across all sources and dates
        for source in ["mediastack"]:  # Mediastack only
            source_dir = Path(s.stage_dir) / source
            if not source_dir.exists():
                continue
            
            # Find all news_docs.parquet files
            for parquet_file in source_dir.rglob("news_docs.parquet"):
                try:
                    df = pl.read_parquet(parquet_file)
                    
                    if "topics" not in df.columns:
                        continue
                    
                    # Filter out articles with this topic
                    # Use native Polars list.contains() for efficiency
                    original_height = df.height
                    df_filtered = df.filter(
                        ~pl.col("topics").list.contains(topic_name)
                    )
                    
                    deleted_in_file = original_height - df_filtered.height
                    
                    if deleted_in_file > 0:
                        # Overwrite file with filtered data
                        df_filtered.write_parquet(parquet_file)
                        deleted_count += deleted_in_file
                        log("delete_topic_file", 
                            source=source,
                            file=str(parquet_file.relative_to(Path(s.stage_dir))),
                            deleted=deleted_in_file,
                            topic=topic_name)
                    
                except Exception as e:
                    log("delete_topic_file_error", 
                        file=str(parquet_file),
                        error=str(e),
                        topic=topic_name)
                    continue
        
        _JOBS[job_id]["status"] = "done"
        _JOBS[job_id]["result"] = {
            "topic": topic_name,
            "deleted_articles": deleted_count,
            "status": "success"
        }
        _persist_job(job_id)
        log("delete_topic_complete", topic=topic_name, deleted_count=deleted_count)
        
    except Exception as e:
        _JOBS[job_id]["status"] = "error"
        _JOBS[job_id]["error"] = str(e)
        _persist_job(job_id)
        log("delete_topic_error", error=str(e), topic=topic_name)


