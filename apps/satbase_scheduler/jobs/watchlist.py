"""
Watchlist refresh job.
"""
from jobs.utils import request_with_retries
from job_wrapper import wrap_job


@wrap_job("watchlist_refresh", "Refresh Watchlist (Prices + News)")
async def refresh_watchlist() -> dict:
    """Refresh active watchlist items (prices, news, macro)."""
    resp = await request_with_retries('POST', '/v1/watchlist/refresh', json={})
    data = resp.json()
    
    jobs = data.get('jobs', [])
    items_refreshed = data.get('items_refreshed', 0)
    
    if not jobs:
        return {
            "status": "noop",
            "message": "No active watchlist items",
            "items_refreshed": 0,
            "jobs": []
        }
    
    # Count jobs by type
    by_type = {}
    for job in jobs:
        t = job.get('type')
        by_type[t] = by_type.get(t, 0) + 1
    
    return {
        "status": "ok",
        "items_refreshed": items_refreshed,
        "jobs_triggered": len(jobs),
        "jobs_by_type": by_type,
        "jobs": jobs
    }
