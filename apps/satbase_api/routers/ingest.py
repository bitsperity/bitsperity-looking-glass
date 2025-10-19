from __future__ import annotations

import threading
import uuid
import json
from datetime import date, datetime
from pathlib import Path
from typing import Any

import yaml
from fastapi import APIRouter, BackgroundTasks, status
from fastapi.responses import JSONResponse

from libs.satbase_core.ingest.registry import registry
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


def _load_jobs_from_log(limit: int = 100) -> list[dict[str, Any]]:
    """Load recent jobs from JSONL log"""
    log_path = _jobs_log_path()
    if not log_path.exists():
        return []
    
    jobs = []
    try:
        with open(log_path, "r") as f:
            lines = f.readlines()
            # Get last N lines (most recent jobs)
            for line in lines[-limit:]:
                if line.strip():
                    jobs.append(json.loads(line))
        # Reverse to get newest first
        jobs.reverse()
    except Exception as e:
        log.error(f"Failed to load jobs from log: {e}")
    
    return jobs


def _load_cfg() -> dict[str, Any]:
    cfg_path = Path("libs/satbase_core/config/sources.yaml")
    return yaml.safe_load(cfg_path.read_text()) if cfg_path.exists() else {}


def _start_thread(target, *args, **kwargs) -> None:
    t = threading.Thread(target=target, args=args, kwargs=kwargs, daemon=True)
    t.start()


def _new_job(kind: str, payload: dict[str, Any]) -> str:
    job_id = uuid.uuid4().hex
    _JOBS[job_id] = {"status": "queued", "kind": kind, "payload": payload}
    return job_id


# Public enqueue helpers for other routers (fetch-on-miss)
def enqueue_prices_daily(tickers: list[str]) -> str:
    job_id = _new_job("prices_daily", {"tickers": [t.upper() for t in tickers]})
    _start_thread(_run_prices_daily, job_id, [t.upper() for t in tickers])
    return job_id


def enqueue_macro_fred(series: list[str]) -> str:
    job_id = _new_job("macro_fred", {"series": series})
    _start_thread(_run_macro_fred, job_id, series)
    return job_id


def enqueue_news(query: str, hours: int | None = None) -> str:
    job_id = _new_job("news", {"query": query, "hours": hours})
    _start_thread(_run_news, job_id, query, hours)
    return job_id


def enqueue_news_bodies(date_from: date, date_to: date) -> str:
    job_id = _new_job("news_bodies", {"from": date_from.isoformat(), "to": date_to.isoformat()})
    _start_thread(_run_news_bodies, job_id, date_from, date_to)
    return job_id


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


def _run_news(job_id: str, query: str, hours: int | None) -> None:
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
            models = list(normalize(raw))
            info = sink(models, date.today())
            results["gdelt_doc_v2"] = info
        # Google RSS
        if "news_google_rss" in reg:
            fetch, normalize, sink = reg["news_google_rss"]
            params = {"query": query}
            raw = fetch(params)
            models = list(normalize(raw))
            info = sink(models, date.today())
            results["news_google_rss"] = info
        _JOBS[job_id].update({"status": "done", "result": results})
        _persist_job(job_id)
    except Exception as e:
        _JOBS[job_id].update({"status": "error", "error": str(e)})
        _persist_job(job_id)


def _run_news_bodies(job_id: str, date_from: date, date_to: date) -> None:
    _JOBS[job_id]["status"] = "running"
    _persist_job(job_id)
    
    reg = registry()
    try:
        s = load_settings()
        # Load news_docs for range
        lf_g = scan_parquet_glob(s.stage_dir, "gdelt", "news_docs", date_from, date_to)
        lf_r = scan_parquet_glob(s.stage_dir, "news_rss", "news_docs", date_from, date_to)
        try:
            df_g = lf_g.collect()
        except Exception:
            df_g = pl.DataFrame()
        try:
            df_r = lf_r.collect()
        except Exception:
            df_r = pl.DataFrame()
        # Align published_at dtype to avoid tz conflicts (let Pydantic parse ISO later)
        if df_g.height and "published_at" in df_g.columns:
            df_g = df_g.with_columns(pl.col("published_at").cast(pl.Utf8))
        if df_r.height and "published_at" in df_r.columns:
            df_r = df_r.with_columns(pl.col("published_at").cast(pl.Utf8))
        # Build NewsDoc list without polars concat to avoid tz dtype conflicts
        from libs.satbase_core.models.news import NewsDoc
        rows: list[dict[str, Any]] = []
        if df_g.height:
            g_rows = df_g.with_columns(
                pl.col("published_at").cast(pl.Utf8)
            ).to_dicts()
            rows.extend(g_rows)
        if df_r.height:
            r_rows = df_r.with_columns(
                pl.col("published_at").cast(pl.Utf8)
            ).to_dicts()
            rows.extend(r_rows)
        docs = [NewsDoc(**row) for row in rows] if rows else []
        # Run body fetcher
        fetch, normalize, sink = reg["news_body_fetcher"]
        models = list(normalize(docs))
        info = sink(models, date.today())
        _JOBS[job_id].update({"status": "done", "result": info})
        _persist_job(job_id)
    except Exception as e:
        _JOBS[job_id].update({"status": "error", "error": str(e)})
        _persist_job(job_id)


@router.post("/ingest/prices/daily", status_code=status.HTTP_202_ACCEPTED)
def ingest_prices_daily(body: dict[str, Any]):
    tickers = body.get("tickers", [])
    job_id = _new_job("prices_daily", {"tickers": tickers})
    _start_thread(_run_prices_daily, job_id, tickers)
    return JSONResponse({"job_id": job_id, "status": "accepted", "retry_after": 2}, status_code=status.HTTP_202_ACCEPTED)


@router.post("/ingest/macro/fred", status_code=status.HTTP_202_ACCEPTED)
def ingest_macro_fred(body: dict[str, Any]):
    series = body.get("series", [])
    job_id = _new_job("macro_fred", {"series": series})
    _start_thread(_run_macro_fred, job_id, series)
    return JSONResponse({"job_id": job_id, "status": "accepted", "retry_after": 2}, status_code=status.HTTP_202_ACCEPTED)


@router.post("/ingest/news", status_code=status.HTTP_202_ACCEPTED)
def ingest_news(body: dict[str, Any]):
    query: str = body.get("query", "")
    hours: int | None = body.get("hours")
    job_id = _new_job("news", {"query": query, "hours": hours})
    _start_thread(_run_news, job_id, query, hours)
    return JSONResponse({"job_id": job_id, "status": "accepted", "retry_after": 2}, status_code=status.HTTP_202_ACCEPTED)


@router.post("/ingest/news/bodies", status_code=status.HTTP_202_ACCEPTED)
def ingest_news_bodies(body: dict[str, Any]):
    from_str = body.get("from")
    to_str = body.get("to")
    if not from_str or not to_str:
        return JSONResponse({"error": "from/to required"}, status_code=400)
    dfrom = date.fromisoformat(from_str)
    dto = date.fromisoformat(to_str)
    job_id = _new_job("news_bodies", {"from": from_str, "to": to_str})
    _start_thread(_run_news_bodies, job_id, dfrom, dto)
    return JSONResponse({"job_id": job_id, "status": "accepted", "retry_after": 2}, status_code=status.HTTP_202_ACCEPTED)


@router.get("/ingest/jobs")
def list_all_jobs(limit: int = 100, status_filter: str | None = None):
    """List all jobs with optional status filter and limit (from persistent log + in-memory)"""
    # Merge in-memory jobs with persisted jobs
    jobs_dict = {}
    
    # Load from persistent log first
    persisted_jobs = _load_jobs_from_log(limit=1000)  # Load more, then filter
    for job in persisted_jobs:
        jobs_dict[job["job_id"]] = job
    
    # Override/add with in-memory jobs (most recent state)
    for job_id, job_data in _JOBS.items():
        jobs_dict[job_id] = {"job_id": job_id, **job_data}
    
    # Convert to list and filter
    jobs = []
    for job in jobs_dict.values():
        if status_filter and job.get("status") != status_filter:
            continue
        jobs.append(job)
    
    # Sort by job_id (UUID hex) - newer UUIDs are lexicographically later
    jobs = sorted(jobs, key=lambda x: x.get("job_id", ""), reverse=True)
    
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


