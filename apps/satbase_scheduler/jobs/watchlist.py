import logging

from .utils import request_with_retries

logger = logging.getLogger(__name__)


async def refresh_watchlist() -> None:
    """Refresh active watchlist items (prices, news, macro)."""
    # Call the unified refresh endpoint which handles all types
    try:
        resp = await request_with_retries('POST', '/v1/watchlist/refresh', json={})
        data = resp.json()
        
        jobs = data.get('jobs', [])
        items_refreshed = data.get('items_refreshed', 0)
        
        if not jobs:
            logger.info("No active watchlist items to refresh")
            return
        
        logger.info("Triggered %d refresh jobs for %d items", len(jobs), items_refreshed)
        
        # Log jobs by type for visibility
        by_type = {}
        for job in jobs:
            t = job.get('type')
            if t not in by_type:
                by_type[t] = 0
            by_type[t] += 1
        
        for t, count in by_type.items():
            logger.info("  - %s: %d jobs", t, count)
    
    except Exception as e:
        logger.error("Failed to refresh watchlist: %s", str(e))


