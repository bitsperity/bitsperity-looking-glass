from __future__ import annotations

import threading
import uuid
from datetime import date
from pathlib import Path
from typing import Any

import yaml
from fastapi import APIRouter, BackgroundTasks, status
from fastapi.responses import JSONResponse

from libs.satbase_core.ingest.registry import registry
from libs.satbase_core.utils.logging import log


router = APIRouter()


_JOBS: dict[str, dict[str, Any]] = {}


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


def _run_prices_daily(job_id: str, tickers: list[str]) -> None:
    _JOBS[job_id]["status"] = "running"
    reg = registry()
    fetch, normalize, sink = reg["stooq"]
    cfg = _load_cfg()
    params = dict(cfg.get("stooq", {}))
    params["tickers"] = [t.upper() for t in tickers]
    try:
        raw = fetch(params)
        models = list(normalize(raw))
        info = sink(models, date.today())
        _JOBS[job_id].update({"status": "done", "result": info})
    except Exception as e:
        _JOBS[job_id].update({"status": "error", "error": str(e)})


def _run_macro_fred(job_id: str, series: list[str]) -> None:
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
        _JOBS[job_id].update({"status": "done", "result": info})
    except Exception as e:
        _JOBS[job_id].update({"status": "error", "error": str(e)})


def _run_news(job_id: str, query: str, hours: int | None) -> None:
    _JOBS[job_id]["status"] = "running"
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
    except Exception as e:
        _JOBS[job_id].update({"status": "error", "error": str(e)})


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


@router.get("/ingest/jobs/{job_id}")
def ingest_job_status(job_id: str):
    job = _JOBS.get(job_id)
    if not job:
        return {"job_id": job_id, "status": "not_found"}
    return {"job_id": job_id, **job}


