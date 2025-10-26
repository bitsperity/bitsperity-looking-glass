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
        # Mediastack ONLY (daily ingestion)
        if "mediastack" in reg:
            fetch, normalize, sink = reg["mediastack"]
            params = {"query": query}
            if hours is not None:
                # Mediastack uses days, convert hours to days
                params["days"] = max(1, hours // 24)
            raw = fetch(params)
            models = list(normalize(raw, topic))
            info = sink(models, date.today(), topic)
            results["mediastack"] = info
        
        _JOBS[job_id].update({"status": "done", "result": results})
        _persist_job(job_id)
        
    except Exception as e:
        _JOBS[job_id].update({"status": "error", "error": str(e)})
        _persist_job(job_id)


def _run_news_backfill(
    job_id: str, 
    query: str, 
    date_from: date, 
    date_to: date, 
    topic: str | None = None,
    max_articles_per_day: int = 50,
    tone_filter: str = "all",
    sort_order: str = "relevance"
) -> None:
    """Backfill historical news with intelligent filtering per day"""
    _JOBS[job_id]["status"] = "running"
    _JOBS[job_id]["progress"] = {
        "total_days": (date_to - date_from).days + 1,
        "processed_days": 0,
        "current_date": None,
        "total_articles": 0,
        "articles_kept": 0,  # NEW: track how many we keep after filtering
        "current_articles": 0,
        "errors": [],
        "filters": {
            "max_per_day": max_articles_per_day,
            "tone": tone_filter,
            "sort": sort_order
        }
    }
    _persist_job(job_id)
    
    registry_full = registry_with_metadata()
    results: dict[str, Any] = {}
    
    try:
        # Find Mediastack adapter (ONLY source for backfill)
        historical_adapters = {
            name: entry for name, entry in registry_full.items()
            if entry.metadata.category == "news" and entry.metadata.supports_historical
            and name == "mediastack"
        }
        
        if not historical_adapters:
            log("news_backfill_error", error="Mediastack adapter not available or MEDIASTACK_API_KEY not configured")
            _JOBS[job_id].update({"status": "error", "error": "Mediastack adapter required for backfill. Set MEDIASTACK_API_KEY env var."})
            _persist_job(job_id)
            return
        
        log("news_backfill_start", 
            adapters=list(historical_adapters.keys()), 
            date_from=date_from.isoformat(), 
            date_to=date_to.isoformat(),
            topic=topic,
            max_per_day=max_articles_per_day,
            tone_filter=tone_filter,
            sort_order=sort_order)
        
        # Process date range day by day
        current_date = date_from
        day_count = 0
        
        while current_date <= date_to:
            day_count += 1
            next_date = current_date + timedelta(days=1)
            
            # Update progress: current date
            _JOBS[job_id]["progress"]["current_date"] = current_date.isoformat()
            _JOBS[job_id]["progress"]["processed_days"] = day_count
            _JOBS[job_id]["progress"]["current_articles"] = 0
            _persist_job(job_id)
            
            for adapter_name, entry in historical_adapters.items():
                try:
                    fetch, normalize, sink = entry.fns
                    
                    # Build query with tone filters
                    filtered_query = query + tone_query_suffix
                    
                    # Prepare params for Mediastack (BACKFILL: ONLY MEDIASTACK)
                    params = {
                        "query": filtered_query,
                        "date_from": current_date.strftime("%Y-%m-%d"),
                        "date_to": next_date.strftime("%Y-%m-%d"),
                        "limit": min(max_articles_per_day, 100),  # Max 100 per request
                    }
                    
                    raw = fetch(params)
                    models = list(normalize(raw, topic))
                    
                    # Filter to keep only top N by relevance (already sorted by fetch)
                    filtered_models = models[:max_articles_per_day]
                    
                    # GROUP ARTICLES BY THEIR ACTUAL published_at DATE
                    # This is critical for proper data organization!
                    from datetime import datetime as dt
                    articles_by_date: dict[date, list] = {}
                    
                    for article in filtered_models:
                        # Extract date from published_at
                        if hasattr(article, 'published_at') and article.published_at:
                            # published_at is a datetime object
                            article_date = article.published_at.date() if hasattr(article.published_at, 'date') else article.published_at
                            if article_date not in articles_by_date:
                                articles_by_date[article_date] = []
                            articles_by_date[article_date].append(article)
                    
                    # Save articles by their REAL published_at date
                    for article_date, articles in articles_by_date.items():
                        info = sink(articles, article_date, topic)
                        
                        article_count = info.get("count", 0)
                        
                        if adapter_name not in results:
                            results[adapter_name] = {
                                "days": 0, 
                                "total_fetched": 0,
                                "total_kept": 0,
                                "partitions": []
                            }
                        
                        results[adapter_name]["days"] += 1
                        results[adapter_name]["total_fetched"] += len(filtered_models)
                        results[adapter_name]["total_kept"] += article_count
                        results[adapter_name]["partitions"].append({
                            "date": article_date.isoformat(),  # Use REAL article date
                            "fetched": len(filtered_models),
                            "kept": article_count,
                            "path": info.get("path")
                        })
                        
                        # Update progress
                        _JOBS[job_id]["progress"]["current_articles"] += article_count
                        _JOBS[job_id]["progress"]["total_articles"] += len(filtered_models)
                        _JOBS[job_id]["progress"]["articles_kept"] += article_count
                        _persist_job(job_id)
                        
                        log("news_backfill_day", 
                            adapter=adapter_name, 
                            date=article_date.isoformat(),  # Use REAL article date in logs
                            fetched=len(filtered_models),
                            kept=article_count,
                            topic=topic,
                            tone_filter=tone_filter)
                    
                except Exception as e:
                    error_msg = f"{adapter_name} on {current_date.isoformat()}: {str(e)}"
                    _JOBS[job_id]["progress"]["errors"].append(error_msg)
                    _persist_job(job_id)
                    
                    log("news_backfill_day_error", 
                        adapter=adapter_name, 
                        date=current_date.isoformat(), 
                        error=str(e), 
                        topic=topic)
            
            current_date = next_date
        
        _JOBS[job_id].update({"status": "done", "result": results, "progress": _JOBS[job_id]["progress"]})
        _persist_job(job_id)
        
        log("news_backfill_complete", 
            results=results, 
            total_fetched=_JOBS[job_id]["progress"]["total_articles"],
            total_kept=_JOBS[job_id]["progress"]["articles_kept"],
            topic=topic,
            tone_filter=tone_filter)
        
    except Exception as e:
        _JOBS[job_id].update({"status": "error", "error": str(e), "progress": _JOBS[job_id]["progress"]})
        _persist_job(job_id)
        log("news_backfill_error", error=str(e), topic=topic)


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
            for source in ["mediastack"]:  # Mediastack only
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
    """
    Backfill historical news data with intelligent filtering and relevance ranking.
    
    Parameters:
    - query: Search query (required)
    - from: Start date YYYY-MM-DD (required)
    - to: End date YYYY-MM-DD (required)
    - topic: Topic annotation for the articles (optional)
    - max_articles_per_day: Max articles to keep per day, sorted by relevance (default: 50)
    - tone_filter: Filter by tone - "positive" (>5), "negative" (<-5), "neutral" (-1 to 1), or "all" (default: "all")
    - sort_order: "relevance" (default), "newest", "oldest", "most_positive", "most_negative"
    """
    query = body.get("query", "semiconductor OR chip OR foundry")
    from_str = body.get("from")
    to_str = body.get("to")
    topic = body.get("topic")
    
    # New filter parameters
    max_articles_per_day = int(body.get("max_articles_per_day", 50))
    tone_filter = body.get("tone_filter", "all")  # positive, negative, neutral, all
    sort_order = body.get("sort_order", "relevance")  # relevance, newest, oldest, most_positive, most_negative
    
    if not from_str or not to_str:
        return JSONResponse({"error": "from/to date range required"}, status_code=400)
    
    if max_articles_per_day < 1 or max_articles_per_day > 250:
        return JSONResponse(
            {"error": "max_articles_per_day must be between 1 and 250"},
            status_code=400
        )
    
    if tone_filter not in ["positive", "negative", "neutral", "all"]:
        return JSONResponse(
            {"error": f"tone_filter must be: positive, negative, neutral, or all"},
            status_code=400
        )
    
    if sort_order not in ["relevance", "newest", "oldest", "most_positive", "most_negative"]:
        return JSONResponse(
            {"error": f"sort_order must be: relevance, newest, oldest, most_positive, most_negative"},
            status_code=400
        )
    
    dfrom = date.fromisoformat(from_str)
    dto = date.fromisoformat(to_str)
    
    # Check that date range is reasonable (not too large)
    days = (dto - dfrom).days
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
        "max_articles_per_day": max_articles_per_day,
        "tone_filter": tone_filter,
        "sort_order": sort_order
    })
    background_tasks.add_task(
        _run_news_backfill, 
        job_id, 
        query, 
        dfrom, 
        dto, 
        topic,
        max_articles_per_day,
        tone_filter,
        sort_order
    )
    
    return JSONResponse({
        "job_id": job_id,
        "status": "accepted",
        "retry_after": 5,
        "message": f"Backfilling {days} days with {max_articles_per_day} articles/day (tone: {tone_filter}, sort: {sort_order})",
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


