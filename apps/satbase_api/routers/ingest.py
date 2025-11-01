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


def _new_job(kind: str, payload: dict[str, Any]) -> str:
    job_id = uuid.uuid4().hex
    _JOBS[job_id] = {"status": "queued", "kind": kind, "payload": payload, "created_at": datetime.utcnow().isoformat()}
    
    # Persist to SQLite (only source of truth)
    try:
        s = load_settings()
        db = NewsDB(s.stage_dir.parent / "news.db")
        db.create_job(job_id, kind, payload=payload)
    except Exception as e:
        log("job_sqlite_persist_error", job_id=job_id, error=str(e))
    
    return job_id


def _load_cfg() -> dict[str, Any]:
    """Load adapter configuration"""
    cfg_path = Path("libs/satbase_core/config/sources.yaml")
    return yaml.safe_load(cfg_path.read_text()) if cfg_path.exists() else {}


# Helper functions for other routers to enqueue jobs
# (These are called from prices.py, macro.py, watchlist.py)

def enqueue_prices_daily(tickers: list[str]) -> str:
    """Helper to enqueue price ingestion job"""
    import httpx
    job_id = _new_job("prices_daily", {"tickers": tickers})
    try:
        with httpx.Client(timeout=10) as client:
            response = client.post("http://localhost:8080/v1/ingest/prices/daily", json={"tickers": tickers}, timeout=10)
            response.raise_for_status()
    except Exception as e:
        # If HTTP request fails, log warning but keep job_id
        import logging
        logging.warning(f"Failed to trigger prices job via HTTP: {e}. Job {job_id} created but may remain queued.")
    return job_id


def enqueue_macro_fred(series: list[str]) -> str:
    """Helper to enqueue FRED macro data ingestion job"""
    import httpx
    job_id = _new_job("macro_fred", {"series": series})
    try:
        with httpx.Client(timeout=10) as client:
            response = client.post("http://localhost:8080/v1/ingest/macro/fred", json={"series": series}, timeout=10)
            response.raise_for_status()
    except Exception as e:
        # If HTTP request fails, log warning but keep job_id
        import logging
        logging.warning(f"Failed to trigger macro job via HTTP: {e}. Job {job_id} created but may remain queued.")
    return job_id


def enqueue_news(query: str, from_date: str | None = None, to_date: str | None = None, topic: str | None = None, hours: int | None = None) -> str:
    """Helper to enqueue news ingestion job"""
    import httpx
    from datetime import date, timedelta
    
    # Handle hours parameter (convert to date range)
    if hours is not None:
        date_to = date.today()
        date_from = date_to - timedelta(days=1)  # Last 24 hours ≈ 1 day
        from_date = date_from.isoformat()
        to_date = date_to.isoformat()
    
    job_id = _new_job("news", {"query": query, "from": from_date, "to": to_date, "topic": topic})
    try:
        with httpx.Client(timeout=10) as client:
            payload = {"query": query, "topic": topic}
            if from_date:
                payload["from"] = from_date
            if to_date:
                payload["to"] = to_date
            response = client.post("http://localhost:8080/v1/ingest/news", json=payload, timeout=10)
            response.raise_for_status()
    except Exception as e:
        # If HTTP request fails, log warning but keep job_id
        import logging
        logging.warning(f"Failed to trigger news job via HTTP: {e}. Job {job_id} created but may remain queued.")
    return job_id


# Note: Removed _start_thread() 
# Now using FastAPI BackgroundTasks directly in endpoints for async execution


def _run_prices_daily(job_id: str, tickers: list[str]) -> None:
    s = load_settings()
    db = NewsDB(s.stage_dir.parent / "news.db")
    db.update_job_status(job_id, "running", started_at=datetime.utcnow())
    _JOBS[job_id]["status"] = "running"
    
    reg = registry()
    fetch, normalize, sink = reg["stooq"]
    cfg = _load_cfg()
    params = dict(cfg.get("stooq", {}))
    params["tickers"] = [t.upper() for t in tickers]
    try:
        raw = fetch(params)
        models = list(normalize(raw))
        if not models:
            result = {"count": 0, "message": "No new data (already up-to-date)"}
            db.complete_job(job_id, status="done", result=result)
            _JOBS[job_id].update({"status": "done", "result": result})
            return
        info = sink(models, date.today())
        db.complete_job(job_id, status="done", result=info)
        _JOBS[job_id].update({"status": "done", "result": info})
    except Exception as e:
        db.complete_job(job_id, status="error", error=str(e))
        _JOBS[job_id].update({"status": "error", "error": str(e)})


def _run_macro_fred(job_id: str, series: list[str]) -> None:
    s = load_settings()
    db = NewsDB(s.stage_dir.parent / "news.db")
    db.update_job_status(job_id, "running", started_at=datetime.utcnow())
    _JOBS[job_id]["status"] = "running"
    
    reg = registry()
    fetch, normalize, sink = reg["fred"]
    cfg = _load_cfg()
    params = dict(cfg.get("fred", {}))
    params["series"] = series
    try:
        raw = fetch(params)
        models = list(normalize(raw))
        info = sink(models, date.today())
        db.complete_job(job_id, status="done", result=info)
        _JOBS[job_id].update({"status": "done", "result": info})
    except Exception as e:
        db.complete_job(job_id, status="error", error=str(e))
        _JOBS[job_id].update({"status": "error", "error": str(e)})


def _run_news_unified(
    job_id: str,
    query: str,
    date_from: date | None = None,
    date_to: date | None = None,
    topic: str | None = None,
    max_articles_per_day: int = 100
) -> None:
    """
    Unified news ingestion: daily or backfill (same code path).
    If date_from/date_to not provided: fetch today's news.
    """
    s = load_settings()
    db = NewsDB(s.stage_dir.parent / "news.db")
    
    # Update job status to running
    db.update_job_status(job_id, "running", started_at=datetime.utcnow())
    _JOBS[job_id]["status"] = "running"
    
    # Default: today if not provided
    if not date_from or not date_to:
        date_to = date.today()
        date_from = date_to
    
    reg = registry()
    if "mediastack" not in reg:
        error_msg = "Mediastack adapter not available"
        db.complete_job(job_id, status="error", error=error_msg)
        _JOBS[job_id]["status"] = "error"
        _JOBS[job_id]["error"] = error_msg
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
                _JOBS[job_id]["progress_current"] = day_count
                _JOBS[job_id]["progress_total"] = results["total_days"]
                
                params = {
                    "query": query,
                    "date_from": current_date.isoformat(),
                    "date_to": next_date.isoformat(),
                    "limit": max_articles_per_day
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
        _JOBS[job_id]["status"] = "done"
        _JOBS[job_id]["result"] = results
        log("news_unified_complete",
            total_days=results["total_days"],
            stored=results["articles_stored"],
            discarded=results["articles_discarded"],
            topic=topic)
    
    except Exception as e:
        db.complete_job(job_id, status="error", error=str(e))
        _JOBS[job_id]["status"] = "error"
        _JOBS[job_id]["error"] = str(e)
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
    max_articles_per_day = body.get("max_articles_per_day", 100)
    
    if not query:
        return JSONResponse({"error": "query required"}, status_code=400)
    
    # Parse dates if provided
    try:
        date_from = date.fromisoformat(from_str) if from_str else None
        date_to = date.fromisoformat(to_str) if to_str else None
    except ValueError:
        return JSONResponse({"error": "Invalid date format (use YYYY-MM-DD)"}, status_code=400)
    
    job_id = _new_job("news", {"query": query, "topic": topic, "from": from_str, "to": to_str, "max_articles_per_day": max_articles_per_day})
    background_tasks.add_task(_run_news_unified, job_id, query, date_from, date_to, topic, max_articles_per_day)
    
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
    max_articles_per_day = body.get("max_articles_per_day", 100)
    
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
        "topic": topic,
        "max_articles_per_day": max_articles_per_day
    })
    background_tasks.add_task(_run_news_unified, job_id, query, date_from, date_to, topic, max_articles_per_day)
    
    return JSONResponse({
        "job_id": job_id,
        "status": "accepted",
        "message": f"Backfilling {days} days (max {max_articles_per_day} articles/day, unified SQLite pipeline with body crawling)",
    }, status_code=status.HTTP_202_ACCEPTED)


@router.get("/ingest/jobs")
def list_all_jobs(limit: int = 100, offset: int = 0, status_filter: str | None = None):
    """List all jobs with optional status filter and pagination"""
    s = load_settings()
    db = NewsDB(s.stage_dir.parent / "news.db")
    
    jobs_data = db.get_jobs(limit=limit, status_filter=status_filter, offset=offset)
    
    # Get total count for pagination
    total_count = db.get_job_stats()["total_jobs"]
    
    return {
        "count": len(jobs_data),
        "total": total_count,
        "limit": limit,
        "offset": offset,
        "has_more": offset + limit < total_count,
        "jobs": jobs_data
    }


@router.get("/ingest/jobs/{job_id}")
def ingest_job_status(job_id: str):
    s = load_settings()
    db = NewsDB(s.stage_dir.parent / "news.db")
    
    job = db.get_job_by_id(job_id)
    if not job:
        return {"job_id": job_id, "status": "not_found"}
    return {"job_id": job_id, **job}


@router.delete("/ingest/jobs/{job_id}")
def cancel_job(job_id: str):
    """Cancel/delete a job"""
    s = load_settings()
    db = NewsDB(s.stage_dir.parent / "news.db")
    
    # Check if job exists
    job = db.get_job_by_id(job_id)
    if not job:
        return JSONResponse(
            {"job_id": job_id, "status": "not_found", "message": "Job not found"},
            status_code=404
        )
    
    # Delete from database
    if db.delete_job(job_id):
        # Remove from in-memory cache if exists (don't fail if not present)
        _JOBS.pop(job_id, None)
        return {"job_id": job_id, "status": "deleted", "message": "Job deleted"}
    
    return JSONResponse(
        {"job_id": job_id, "status": "error", "message": "Failed to delete job"},
        status_code=500
    )


@router.post("/ingest/jobs/{job_id}/stop")
def stop_job(job_id: str):
    """Stop a queued job (mark as cancelled)"""
    s = load_settings()
    db = NewsDB(s.stage_dir.parent / "news.db")
    
    job = db.get_job_by_id(job_id)
    if not job:
        return JSONResponse(
            {"job_id": job_id, "status": "not_found", "message": "Job not found"},
            status_code=404
        )
    
    current_status = job.get("status", "").lower()
    if current_status not in ["queued"]:
        return JSONResponse(
            {"job_id": job_id, "status": current_status, "message": f"Cannot stop job with status '{current_status}'. Only queued jobs can be stopped."},
            status_code=400
        )
    
    # Mark as cancelled
    db.complete_job(job_id, status="cancelled", error="Stopped by user")
    if job_id in _JOBS:
        _JOBS[job_id]["status"] = "cancelled"
        _JOBS[job_id]["error"] = "Stopped by user"
    
    return {"job_id": job_id, "status": "cancelled", "message": "Job stopped"}


@router.delete("/ingest/jobs")
def delete_all_jobs():
    """Delete all jobs - DESTRUCTIVE OPERATION"""
    s = load_settings()
    db = NewsDB(s.stage_dir.parent / "news.db")
    
    try:
        with db.conn() as conn:
            result = conn.execute("DELETE FROM job_tracking")
            deleted_count = result.rowcount
            
        # Clear in-memory cache
        _JOBS.clear()
        
        return {
            "deleted": deleted_count,
            "message": f"Deleted {deleted_count} jobs",
            "warning": "All job history has been cleared"
        }
    except Exception as e:
        log("delete_all_jobs_error", error=str(e))
        return JSONResponse(
            {"error": str(e), "message": "Failed to delete all jobs"},
            status_code=500
        )


@router.post("/ingest/jobs/cleanup")
def cleanup_stale_jobs():
    """Clean up jobs stuck in 'running' state"""
    s = load_settings()
    db = NewsDB(s.stage_dir.parent / "news.db")
    
    cleaned_job_ids = db.cleanup_stale_jobs()
    
    return {
        "cleaned": len(cleaned_job_ids),
        "jobs": cleaned_job_ids,
        "message": f"Cleaned {len(cleaned_job_ids)} stale jobs"
    }


@router.post("/ingest/jobs/reset")
def reset_all_jobs():
    """Reset all jobs - DESTRUCTIVE OPERATION"""
    s = load_settings()
    db = NewsDB(s.stage_dir.parent / "news.db")
    
    try:
        with db.conn() as conn:
            result = conn.execute("DELETE FROM job_tracking")
            deleted_count = result.rowcount
            
        return {
            "deleted": deleted_count,
            "message": f"Reset {deleted_count} jobs from database",
            "warning": "All job history has been cleared"
        }
    except Exception as e:
        log("reset_jobs_error", error=str(e))
        return JSONResponse(
            {"error": str(e), "message": "Failed to reset jobs"},
            status_code=500
        )


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
    s = load_settings()
    db = NewsDB(s.stage_dir.parent / "news.db")
    
    job = db.get_job_by_id(job_id)
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
    
    s = load_settings()
    db = NewsDB(s.stage_dir.parent / "news.db")
    
    try:
        deleted_count = db.delete_articles_by_topic(topic_name)
        
        _JOBS[job_id]["status"] = "done"
        _JOBS[job_id]["result"] = {
            "topic": topic_name,
            "deleted_articles": deleted_count,
            "status": "success"
        }
        log("delete_topic_complete", topic=topic_name, deleted_count=deleted_count)
        
    except Exception as e:
        _JOBS[job_id]["status"] = "error"
        _JOBS[job_id]["error"] = str(e)
        log("delete_topic_error", error=str(e), topic=topic_name)


