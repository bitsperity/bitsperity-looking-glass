from datetime import date
import polars as pl
from fastapi import APIRouter, status, Query
from fastapi.responses import JSONResponse
from .ingest import enqueue_macro_fred
from libs.satbase_core.config.settings import load_settings
from libs.satbase_core.storage.stage import scan_parquet_glob
import httpx

router = APIRouter()

@router.get("/macro/fred/search")
async def fred_search(q: str, limit: int = 20):
    """Search FRED series by text query"""
    s = load_settings()
    if not s.fred_api_key:
        return {"error": "FRED_API_KEY not configured", "results": []}
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                "https://api.stlouisfed.org/fred/series/search",
                params={
                    "search_text": q,
                    "api_key": s.fred_api_key,
                    "file_type": "json",
                    "limit": limit,
                    "sort_order": "desc",
                    "order_by": "popularity"
                }
            )
            resp.raise_for_status()
            data = resp.json()
            
            # Extract relevant fields
            results = []
            for series in data.get("seriess", []):
                results.append({
                    "id": series.get("id"),
                    "title": series.get("title"),
                    "units": series.get("units"),
                    "frequency": series.get("frequency"),
                    "popularity": series.get("popularity", 0),
                    "observation_start": series.get("observation_start"),
                    "observation_end": series.get("observation_end"),
                })
            
            return {"query": q, "count": len(results), "results": results}
    except Exception as e:
        return {"error": str(e), "results": []}

@router.get("/macro/fred/series/{series_id}")
def fred_series(series_id: str, from_: str | None = Query(None, alias="from"), to: str | None = None):
    s = load_settings()
    if not from_ or not to:
        return {"series_id": series_id, "from": from_, "to": to, "items": []}
    dfrom = date.fromisoformat(from_)
    dto = date.fromisoformat(to)
    lf = scan_parquet_glob(s.stage_dir, "fred", "macro_obs", dfrom, dto)
    df = lf.collect().filter(pl.col("series_id") == series_id)
    df = df.sort("date", descending=True)
    items = df.to_dicts()
    if len(items) == 0:
        job_id = enqueue_macro_fred([series_id])
        return JSONResponse({"status": "fetch_on_miss", "job_id": job_id, "retry_after": 2}, status_code=status.HTTP_202_ACCEPTED)
    return {"series_id": series_id, "from": from_, "to": to, "items": items}

