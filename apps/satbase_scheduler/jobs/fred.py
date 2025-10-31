"""
FRED macro data refresh job.
"""
from jobs.utils import request_with_retries
from job_wrapper import wrap_job


CORE_FRED_SERIES = [
    'GDP', 'GDPC1', 'UNRATE', 'CPIAUCSL', 'FEDFUNDS',
    'DGS10', 'DGS2', 'T10Y2Y', 'DEXUSEU', 'DCOILWTICO',
    'M2SL', 'VIXCLS', 'PCEPI', 'CPILFESL', 'PAYEMS',
    'ICSA', 'GDPPOT', 'M1SL', 'WALCL', 'RSXFS',
    'UMCSENT', 'PCE', 'INDPRO', 'MANEMP', 'HOUST',
    'MORTGAGE30US', 'DTWEXBGS', 'GASREGW'
]


@wrap_job("fred_daily", "Refresh FRED Core Indicators")
async def refresh_fred_core() -> dict:
    """Update all core FRED indicators via Satbase API."""
    resp = await request_with_retries('POST', '/v1/ingest/macro/fred', json={'series': CORE_FRED_SERIES})
    data = resp.json()
    
    return {
        "status": "ok",
        "series_count": len(CORE_FRED_SERIES),
        "job_id": data.get('job_id'),
        "message": f"Triggered refresh for {len(CORE_FRED_SERIES)} FRED series"
    }
