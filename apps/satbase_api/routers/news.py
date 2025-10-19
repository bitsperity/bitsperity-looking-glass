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
    lf = scan_parquet_glob(s.stage_dir, "gdelt", "news_docs", dfrom, dto)
    df = lf.collect()
    if q:
        for term in q.split(','):
            term = term.strip()
            if term:
                df = df.filter(pl.col("title").str.contains(term, literal=False) | pl.col("text").str.contains(term, literal=False))
    if tickers:
        # tickers currently not extracted; placeholder for future mapping
        pass
    df = df.sort("published_at", descending=True).head(limit)
    return {"items": df.to_dicts(), "from": from_, "to": to, "limit": limit}

