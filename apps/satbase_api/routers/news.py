from datetime import date
from pathlib import Path
import polars as pl
from fastapi import APIRouter, Query
from libs.satbase_core.config.settings import load_settings
from libs.satbase_core.storage.stage import scan_parquet_glob

router = APIRouter()

@router.get("/news")
def list_news(from_: str = Query(None, alias="from"), to: str | None = None, q: str | None = None, tickers: str | None = None, limit: int = 100):
    s = load_settings()
    if not from_ or not to:
        return {"items": [], "from": from_, "to": to, "limit": limit}
    dfrom = date.fromisoformat(from_)
    dto = date.fromisoformat(to)
    lf_g = scan_parquet_glob(s.stage_dir, "gdelt", "news_docs", dfrom, dto)
    lf_r = scan_parquet_glob(s.stage_dir, "news_rss", "news_docs", dfrom, dto)
    # Collect with graceful fallback if a source has no files
    try:
        df_g = lf_g.collect()
    except Exception:
        df_g = pl.DataFrame(schema={
            "id": pl.Utf8,
            "source": pl.Utf8,
            "title": pl.Utf8,
            "text": pl.Utf8,
            "url": pl.Utf8,
            "published_at": pl.Datetime,
            "tickers": pl.List(pl.Utf8),
        })
    try:
        df_r = lf_r.collect()
    except Exception:
        df_r = pl.DataFrame(schema={
            "id": pl.Utf8,
            "source": pl.Utf8,
            "title": pl.Utf8,
            "text": pl.Utf8,
            "url": pl.Utf8,
            "published_at": pl.Datetime,
            "tickers": pl.List(pl.Utf8),
        })
    # Normalize published_at to string to avoid timezone dtype conflicts
    if "published_at" in df_g.columns:
        df_g = df_g.with_columns(pl.col("published_at").cast(pl.Utf8))
    if "published_at" in df_r.columns:
        df_r = df_r.with_columns(pl.col("published_at").cast(pl.Utf8))
    df = pl.concat([df_g, df_r], how="vertical_relaxed")
    # Ensure tickers column is List[Utf8] and null-safe
    if "tickers" in df.columns:
        df = df.with_columns(
            pl.when(pl.col("tickers").is_null())
            .then(pl.lit([], dtype=pl.List(pl.Utf8)))
            .otherwise(pl.col("tickers").cast(pl.List(pl.Utf8)))
            .alias("tickers")
        )
    if q:
        for term in q.split(','):
            term = term.strip()
            if term:
                df = df.filter(pl.col("title").str.contains(term, literal=False) | pl.col("text").str.contains(term, literal=False))
    # Sort first (string sort is fine for ISO-like values), then apply optional tickers filter in Python for robustness
    df = df.sort("published_at", descending=True)
    items = df.to_dicts()
    if tickers:
        tick_set = {t.strip().upper() for t in tickers.split(',') if t.strip()}
        if tick_set:
            items = [it for it in items if isinstance(it.get("tickers"), list) and any(t in tick_set for t in it.get("tickers", []))]
    items = items[: max(0, int(limit))]
    return {"items": items, "from": from_, "to": to, "limit": limit}

