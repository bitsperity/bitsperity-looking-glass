from datetime import date
from pathlib import Path
import polars as pl
from fastapi import APIRouter, status, Query
from fastapi.responses import JSONResponse
from .ingest import enqueue_macro_fred
from libs.satbase_core.config.settings import load_settings
import httpx

router = APIRouter()

# FRED Categories (from Vision doc)
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
    """
    Get FRED series observations.
    
    Now reads from: data/stage/macro/fred/{series_id}.parquet
    
    This is MUCH faster than scanning date folders!
    """
    s = load_settings()
    
    # Direct path to series file (like Stooq does for tickers!)
    series_file = Path(s.stage_dir) / "macro" / "fred" / f"{series_id}.parquet"
    
    # If file doesn't exist, trigger ingestion
    if not series_file.exists():
        job_id = enqueue_macro_fred([series_id])
        return JSONResponse(
            {"status": "fetch_on_miss", "job_id": job_id, "series_id": series_id, "retry_after": 2}, 
            status_code=status.HTTP_202_ACCEPTED
        )
    
    # Read the parquet file
    try:
        df = pl.read_parquet(series_file)
        
        # Apply date filters if provided
        if from_ and to:
            dfrom = date.fromisoformat(from_)
            dto = date.fromisoformat(to)
            df = df.filter(pl.col("date").is_between(dfrom, dto))
        elif from_:
            dfrom = date.fromisoformat(from_)
            df = df.filter(pl.col("date") >= dfrom)
        elif to:
            dto = date.fromisoformat(to)
            df = df.filter(pl.col("date") <= dto)
        
        # Sort by date descending (newest first)
        df = df.sort("date", descending=True)
        
        items = df.to_dicts()
        
        return {
            "series_id": series_id,
            "from": from_,
            "to": to,
            "items": items
        }
    except Exception as e:
        return JSONResponse(
            {"error": f"Failed to read series {series_id}: {str(e)}"}, 
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@router.get("/macro/fred/categories")
def fred_categories(category: str | None = Query(None, description="Optional: filter by category (e.g., 'inflation')")):
    """
    Browse FRED series organized by economic category.
    
    Returns all categories with their series and metadata,
    or just one category if specified.
    """
    s = load_settings()
    fred_dir = Path(s.stage_dir) / "macro" / "fred"
    
    def enrich_series(series_id: str) -> dict:
        """Get metadata for a series"""
        series_file = fred_dir / f"{series_id}.parquet"
        
        result = {
            "id": series_id,
            "title": series_id,  # Default to ID
            "available": False,
            "observations": 0,
            "latest_value": None,
            "latest_date": None
        }
        
        if series_file.exists():
            try:
                df = pl.read_parquet(series_file)
                result["available"] = True
                result["observations"] = len(df)
                
                if len(df) > 0 and "date" in df.columns and "value" in df.columns:
                    # Get latest observation
                    latest = df.sort("date", descending=True).head(1)
                    result["latest_value"] = float(latest["value"][0])
                    result["latest_date"] = str(latest["date"][0])
            except Exception:
                pass
        
        return result
    
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


CORE_FRED_SERIES = [
    'GDP', 'GDPC1', 'UNRATE', 'CPIAUCSL', 'FEDFUNDS',
    'DGS10', 'DGS2', 'T10Y2Y', 'DEXUSEU', 'DCOILWTICO',
    'M2SL', 'VIXCLS', 'PCEPI', 'CPILFESL', 'PAYEMS',
    'ICSA', 'GDPPOT', 'M1SL', 'WALCL', 'RSXFS',
    'UMCSENT', 'PCE', 'INDPRO', 'MANEMP', 'HOUST',
    'MORTGAGE30US', 'DTWEXBGS', 'GASREGW'
]


@router.post("/macro/fred/refresh-core", status_code=status.HTTP_202_ACCEPTED)
def refresh_fred_core():
    """Refresh all 28 core FRED indicators."""
    job_id = enqueue_macro_fred(CORE_FRED_SERIES)
    return JSONResponse({
        "status": "accepted",
        "job_id": job_id,
        "series_count": len(CORE_FRED_SERIES),
        "series": CORE_FRED_SERIES,
        "retry_after": 2
    }, status_code=status.HTTP_202_ACCEPTED)
