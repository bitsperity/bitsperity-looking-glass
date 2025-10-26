from datetime import date
from pathlib import Path
import httpx
from fastapi import APIRouter, status, Query, BackgroundTasks
from fastapi.responses import JSONResponse

from libs.satbase_core.config.settings import load_settings
from libs.satbase_core.storage.macro_db import MacroDB
from libs.satbase_core.ingest.registry import registry

router = APIRouter()


def _get_macro_db() -> MacroDB:
    """Get MacroDB instance."""
    s = load_settings()
    db_path = Path(s.stage_dir).parent / "macro.db"
    return MacroDB(db_path)


async def _fetch_fred_background(series_ids: list[str], from_date: str = None, to_date: str = None):
    """Background task: fetch FRED series."""
    try:
        reg = registry()
        fetch, normalize, sink = reg["fred"]
        
        params = {
            "series_ids": [s.upper() for s in series_ids],
        }
        if from_date:
            params["from"] = date.fromisoformat(from_date)
        if to_date:
            params["to"] = date.fromisoformat(to_date)
        
        raw = fetch(params)
        models = normalize(raw)
        sink(models)
    except Exception as e:
        print(f"FRED background fetch failed: {e}")


# FRED Categories mapping
FRED_CATEGORIES = {
    'inflation': {
        'name': 'Inflation & Prices',
        'series': ['CPIAUCSL', 'PCEPI', 'CPILFESL']
    },
    'employment': {
        'name': 'Employment & Labor',
        'series': ['UNRATE', 'PAYEMS', 'ICSA']
    },
    'gdp': {
        'name': 'GDP & Growth',
        'series': ['GDP', 'GDPC1', 'GDPPOT']
    },
    'interest_rates': {
        'name': 'Interest Rates',
        'series': ['FEDFUNDS', 'DGS10', 'DGS2', 'T10Y2Y', 'MORTGAGE30US']
    },
    'money_supply': {
        'name': 'Money Supply',
        'series': ['M1SL', 'M2SL', 'WALCL']
    },
    'markets': {
        'name': 'Markets & Sentiment',
        'series': ['VIXCLS', 'DEXUSEU', 'DTWEXBGS']
    },
    'commodities': {
        'name': 'Energy & Commodities',
        'series': ['DCOILWTICO', 'GASREGW']
    },
    'consumer': {
        'name': 'Consumer & Retail',
        'series': ['RSXFS', 'UMCSENT', 'PCE']
    },
    'manufacturing': {
        'name': 'Manufacturing & Production',
        'series': ['INDPRO', 'MANEMP', 'HOUST']
    }
}

CORE_FRED_SERIES = [
    'GDP', 'GDPC1', 'UNRATE', 'CPIAUCSL', 'FEDFUNDS',
    'DGS10', 'DGS2', 'T10Y2Y', 'DEXUSEU', 'DCOILWTICO',
    'M2SL', 'VIXCLS', 'PCEPI', 'CPILFESL', 'PAYEMS',
    'ICSA', 'GDPPOT', 'M1SL', 'WALCL', 'RSXFS',
    'UMCSENT', 'PCE', 'INDPRO', 'MANEMP', 'HOUST',
    'MORTGAGE30US', 'DTWEXBGS', 'GASREGW'
]


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


@router.get("/macro/series/{series_id}")
async def get_macro_series(
    series_id: str,
    from_: str | None = Query(None, alias="from"),
    to: str | None = None,
    sync_timeout_s: int = 2,
    background_tasks: BackgroundTasks = None
):
    """
    Get FRED series observations.
    
    Params:
    - from: ISO date (YYYY-MM-DD)
    - to: ISO date (YYYY-MM-DD)
    - sync_timeout_s: Max seconds to wait for fetch-on-miss (default: 2)
    """
    db = _get_macro_db()
    
    # Try to query database
    from_date = date.fromisoformat(from_) if from_ else None
    to_date = date.fromisoformat(to) if to else None
    
    items = db.query_series(series_id, from_date, to_date)
    
    # If no data, trigger background fetch
    if not items:
        if background_tasks:
            background_tasks.add_task(_fetch_fred_background, [series_id], from_, to)
        return JSONResponse(
            {"status": "fetch_on_miss", "series_id": series_id, "retry_after": sync_timeout_s},
            status_code=status.HTTP_202_ACCEPTED
        )
    
    return {
        "series_id": series_id,
        "from": from_,
        "to": to,
        "items": items
    }


@router.get("/macro/status/{series_id}")
async def get_macro_status(series_id: str):
    """Get status for a FRED series."""
    db = _get_macro_db()
    status_info = db.get_status(series_id)
    return status_info


@router.post("/macro/ingest")
async def ingest_macro(payload: dict, background_tasks: BackgroundTasks):
    """
    Trigger macro (FRED) ingestion.
    
    Payload:
    - series: list of series IDs
    - from: optional ISO date
    - to: optional ISO date
    """
    series = payload.get("series", [])
    if not series:
        return JSONResponse(
            {"error": "No series provided"},
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    from_date = payload.get("from")
    to_date = payload.get("to")
    
    background_tasks.add_task(_fetch_fred_background, series, from_date, to_date)
    
    return {
        "status": "queued",
        "series": series,
        "retry_after": 2,
        "message": f"Fetching {len(series)} FRED series in background"
    }


@router.post("/macro/refresh-core", status_code=status.HTTP_202_ACCEPTED)
async def refresh_fred_core(background_tasks: BackgroundTasks):
    """Refresh all 28 core FRED indicators."""
    background_tasks.add_task(_fetch_fred_background, CORE_FRED_SERIES)
    
    return JSONResponse({
        "status": "accepted",
        "series_count": len(CORE_FRED_SERIES),
        "series": CORE_FRED_SERIES,
        "retry_after": 2
    }, status_code=status.HTTP_202_ACCEPTED)


@router.get("/macro/categories")
async def get_macro_categories(category: str | None = Query(None)):
    """
    Browse FRED series organized by economic category.
    
    Returns all categories with their series and metadata,
    or just one category if specified.
    """
    db = _get_macro_db()
    
    def enrich_series(series_id: str) -> dict:
        """Get metadata for a series."""
        status_info = db.get_status(series_id)
        return {
            "id": series_id,
            "title": status_info['title'] or series_id,
            "available": status_info['observation_count'] > 0,
            "observations": status_info['observation_count'],
            "latest_value": status_info['latest_value'],
            "latest_date": status_info['latest_date'],
            "units": status_info['units'],
            "frequency": status_info['frequency']
        }
    
    # If specific category requested
    if category:
        if category not in FRED_CATEGORIES:
            return JSONResponse(
                {"error": f"Category '{category}' not found"},
                status_code=404
            )
        
        cat_info = FRED_CATEGORIES[category]
        enriched_series = [enrich_series(sid) for sid in cat_info['series']]
        
        return {
            "category": {
                "id": category,
                "name": cat_info['name'],
                "series": enriched_series,
                "series_count": len(enriched_series)
            }
        }
    
    # Return all categories
    categories = []
    for cat_id, cat_info in FRED_CATEGORIES.items():
        enriched_series = [enrich_series(sid) for sid in cat_info['series']]
        categories.append({
            "id": cat_id,
            "name": cat_info['name'],
            "series": enriched_series,
            "series_count": len(enriched_series)
        })
    
    return {
        "categories": categories,
        "total_categories": len(categories)
    }
