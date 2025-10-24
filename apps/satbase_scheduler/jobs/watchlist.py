import logging

from .utils import request_with_retries

logger = logging.getLogger(__name__)


async def refresh_watchlist() -> None:
    """Refresh prices and news for all watchlist tickers."""
    # 1) Get watchlist
    resp = await request_with_retries('GET', '/v1/watchlist')
    data = resp.json()
    items = data.get('items', [])
    tickers = [it.get('symbol') for it in items if it.get('symbol')]

    if not tickers:
        logger.info("Watchlist empty; skipping refresh")
        return

    # 2) Trigger price ingestion (batch)
    await request_with_retries('POST', '/v1/ingest/prices/daily', json={'tickers': tickers})

    # 3) Trigger news ingestion (per ticker, last 24h)
    for ticker in tickers:
        await request_with_retries('POST', '/v1/ingest/news', json={'query': ticker, 'hours': 24})

    logger.info("Refreshed %d watchlist tickers", len(tickers))


