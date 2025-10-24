import logging

from .utils import request_with_retries

logger = logging.getLogger(__name__)


async def monitor_topics() -> None:
    """Fetch fresh news for each active topic (last 1 hour)."""
    resp = await request_with_retries('GET', '/v1/news/topics')
    data = resp.json()
    items = data.get('items', [])

    if not items:
        logger.info("No active topics; skipping monitor")
        return

    for item in items:
        query = item.get('query')
        if not query:
            continue
        await request_with_retries('POST', '/v1/ingest/news', json={'query': query, 'hours': 1})

    logger.info("Monitored %d topics", len(items))


