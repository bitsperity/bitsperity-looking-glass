from __future__ import annotations

import json
from datetime import date, timedelta
from pathlib import Path
from typing import Any

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

from libs.satbase_core.config.settings import load_settings
from .ingest import enqueue_prices_daily, enqueue_news
import polars as pl
from libs.satbase_core.storage.stage import scan_parquet_glob
from datetime import datetime, timedelta


router = APIRouter()


def _control_dir() -> Path:
    s = load_settings()
    base = s.stage_dir.parent / "control"
    base.mkdir(parents=True, exist_ok=True)
    return base


def _load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"items": []}
    try:
        return json.loads(path.read_text())
    except Exception:
        return {"items": []}


def _save_json(path: Path, data: dict[str, Any]) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2))


def _today_iso() -> str:
    return date.today().isoformat()


def _expires_iso(ttl_days: int | None) -> str | None:
    if not ttl_days:
        return None
    return (date.today() + timedelta(days=ttl_days)).isoformat()


def _clean_expired(items: list[dict]) -> list[dict]:
    today = date.today()
    out: list[dict] = []
    for it in items:
        exp = it.get("expires_at")
        if not exp:
            out.append(it)
            continue
        try:
            if date.fromisoformat(exp) >= today:
                out.append(it)
        except Exception:
            # Keep if invalid date to avoid accidental data loss
            out.append(it)
    return out


@router.get("/watchlist")
def get_watchlist():
    path = _control_dir() / "watchlist.json"
    data = _load_json(path)
    items = _clean_expired(data.get("items", []))
    # Normalize symbols to upper
    for it in items:
        if "symbol" in it and isinstance(it["symbol"], str):
            it["symbol"] = it["symbol"].upper()
    return {"count": len(items), "items": items}


@router.post("/watchlist")
def post_watchlist(body: dict[str, Any]):
    symbols: list[str] = [s.strip().upper() for s in body.get("symbols", []) if s and isinstance(s, str)]
    ttl_days: int | None = body.get("ttl_days")
    do_ingest: bool = bool(body.get("ingest", False))
    if not symbols:
        return {"count": 0, "added": []}

    path = _control_dir() / "watchlist.json"
    data = _load_json(path)
    existing = _clean_expired(data.get("items", []))
    known = {it.get("symbol", "").upper() for it in existing}
    added: list[dict] = []
    for s in symbols:
        if s in known:
            continue
        item = {"symbol": s, "added_at": _today_iso(), "expires_at": _expires_iso(ttl_days)}
        existing.append(item)
        added.append(item)
    _save_json(path, {"items": existing})

    if do_ingest and added:
        job_id = enqueue_prices_daily([it["symbol"] for it in added])
        return JSONResponse({"status": "accepted", "job_id": job_id, "added": added, "retry_after": 2}, status_code=status.HTTP_202_ACCEPTED)

    return {"count": len(existing), "added": added}


@router.delete("/watchlist/{symbol}")
def delete_watchlist(symbol: str):
    sym = symbol.strip().upper()
    path = _control_dir() / "watchlist.json"
    data = _load_json(path)
    existing = _clean_expired(data.get("items", []))
    kept = [it for it in existing if it.get("symbol", "").upper() != sym]
    _save_json(path, {"items": kept})
    return {"removed": symbol.upper(), "count": len(kept)}


@router.get("/news/topics")
def get_topics():
    path = _control_dir() / "topics.json"
    data = _load_json(path)
    items = _clean_expired(data.get("items", []))
    return {"count": len(items), "items": items}


@router.post("/news/topics")
def post_topics(body: dict[str, Any]):
    queries: list[str] = [q for q in body.get("queries", []) if isinstance(q, str) and q.strip()]
    ttl_days: int | None = body.get("ttl_days")
    do_ingest: bool = bool(body.get("ingest", False))
    hours: int | None = body.get("hours")
    if not queries:
        return {"count": 0, "added": []}

    path = _control_dir() / "topics.json"
    data = _load_json(path)
    existing = _clean_expired(data.get("items", []))
    known = {it.get("query", "") for it in existing}
    added: list[dict] = []
    for q in queries:
        if q in known:
            continue
        item = {"query": q, "added_at": _today_iso(), "expires_at": _expires_iso(ttl_days)}
        existing.append(item)
        added.append(item)
    _save_json(path, {"items": existing})

    if do_ingest and added:
        # Launch one job per query for transparency
        job_ids = [enqueue_news(it["query"], hours) for it in added]
        return JSONResponse({"status": "accepted", "job_ids": job_ids, "added": added, "retry_after": 2}, status_code=status.HTTP_202_ACCEPTED)

    return {"count": len(existing), "added": added}


@router.delete("/news/topics/{query}")
def delete_topic(query: str):
    q = query
    path = _control_dir() / "topics.json"
    data = _load_json(path)
    existing = _clean_expired(data.get("items", []))
    kept = [it for it in existing if it.get("query", "") != q]
    _save_json(path, {"items": kept})
    return {"removed": q, "count": len(kept)}


@router.post("/watchlist/refresh", status_code=status.HTTP_202_ACCEPTED)
def refresh_watchlist(body: dict[str, Any]):
    """Bulk refresh all watchlist tickers (prices + news)."""
    include_prices = bool(body.get("prices", True))
    include_news = bool(body.get("news", True))
    news_hours: int = int(body.get("news_hours", 24))

    path = _control_dir() / "watchlist.json"
    data = _load_json(path)
    items = _clean_expired(data.get("items", []))
    tickers = [it.get("symbol", "").upper() for it in items if it.get("symbol")]

    if not tickers:
        return {"status": "noop", "message": "Watchlist empty", "tickers": []}

    jobs: list[dict[str, Any]] = []

    if include_prices:
        job_id = enqueue_prices_daily(tickers)
        jobs.append({"type": "prices", "job_id": job_id})

    if include_news:
        for t in tickers:
            job_id = enqueue_news(t, news_hours)
            jobs.append({"type": "news", "ticker": t, "job_id": job_id})

    return JSONResponse({
        "status": "accepted",
        "tickers": tickers,
        "jobs": jobs,
        "retry_after": 2
    }, status_code=status.HTTP_202_ACCEPTED)


@router.get("/watchlist/status")
def get_watchlist_status():
    """Return watchlist with simple freshness metrics (latest price date, news count 24h)."""
    path = _control_dir() / "watchlist.json"
    data = _load_json(path)
    items = _clean_expired(data.get("items", []))

    s = load_settings()
    stage_dir = Path(s.stage_dir)
    stooq_dir = stage_dir / "stooq" / "prices_daily"

    now = datetime.utcnow()
    start = (now - timedelta(hours=24)).date()
    end = now.date()

    # Preload news of last 24h (both sources)
    try:
        lf_g = scan_parquet_glob(s.stage_dir, "gdelt", "news_docs", start, end)
        df_g = lf_g.collect()
    except Exception:
        df_g = pl.DataFrame()
    try:
        lf_r = scan_parquet_glob(s.stage_dir, "news_rss", "news_docs", start, end)
        df_r = lf_r.collect()
    except Exception:
        df_r = pl.DataFrame()

    if df_g.height and "tickers" in df_g.columns:
        df_g = df_g.with_columns(pl.col("tickers").cast(pl.List(pl.Utf8)))
    if df_r.height and "tickers" in df_r.columns:
        df_r = df_r.with_columns(pl.col("tickers").cast(pl.List(pl.Utf8)))

    status_items: list[dict[str, Any]] = []

    for it in items:
        ticker = it.get("symbol", "").upper()
        prices_latest = None
        if ticker and stooq_dir.exists():
            pfile = stooq_dir / f"{ticker}.parquet"
            if pfile.exists():
                try:
                    pdf = pl.read_parquet(pfile)
                    if pdf.height and "date" in pdf.columns:
                        prices_latest = str(pdf.select(pl.col("date").max())["date"][0])
                except Exception:
                    pass

        # Count news mentions in last 24h
        news_count = 0
        try:
            if df_g.height and "tickers" in df_g.columns:
                news_count += int(df_g.select(pl.col("tickers").list.contains(ticker)).sum().to_series()[0])
        except Exception:
            pass
        try:
            if df_r.height and "tickers" in df_r.columns:
                news_count += int(df_r.select(pl.col("tickers").list.contains(ticker)).sum().to_series()[0])
        except Exception:
            pass

        status_items.append({
            **it,
            "prices_latest": prices_latest,
            "news_count_24h": news_count,
            "needs_refresh": prices_latest != date.today().isoformat() if prices_latest else True
        })

    return {"count": len(status_items), "items": status_items}


