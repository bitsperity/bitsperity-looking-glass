"""
Price maintenance jobs: refresh, gap detection, gap filling.
"""
from datetime import date, timedelta
from typing import List, Dict, Any

from jobs.utils import request_with_retries, get_api_client
from job_wrapper import wrap_job


@wrap_job("prices_watchlist", "Refresh Watchlist Prices")
async def refresh_watchlist_prices() -> dict:
    """Refresh prices for all watchlist tickers."""
    # Get active watchlist stocks
    resp = await request_with_retries('GET', '/v1/watchlist/items?type=stock&enabled=true&active_now=true')
    data = resp.json()
    
    stocks = data.get('items', [])
    if not stocks:
        return {
            "status": "noop",
            "message": "No active watchlist stocks",
            "tickers": []
        }
    
    tickers = [s['key'] for s in stocks]
    
    # Trigger price ingestion
    client = get_api_client()
    try:
        resp = await client.post('/v1/ingest/prices/daily', json={'tickers': tickers})
        resp.raise_for_status()
        result = resp.json()
        
        return {
            "status": "ok",
            "tickers_count": len(tickers),
            "tickers": tickers,
            "job_id": result.get('job_id')
        }
    finally:
        await client.aclose()


@wrap_job("prices_gaps", "Detect Price Gaps")
async def detect_price_gaps() -> dict:
    """Detect missing price days for watchlist tickers."""
    # Get active watchlist stocks
    resp = await request_with_retries('GET', '/v1/watchlist/items?type=stock&enabled=true&active_now=true')
    data = resp.json()
    
    stocks = data.get('items', [])
    if not stocks:
        return {
            "status": "noop",
            "message": "No active watchlist stocks",
            "gaps": []
        }
    
    tickers = [s['key'] for s in stocks]
    
    # Check each ticker for gaps (last 90 days)
    from_date = date.today() - timedelta(days=90)
    to_date = date.today()
    
    gaps_found = []
    client = get_api_client()
    
    try:
        for ticker in tickers:
            try:
                # Get price status
                resp = await client.get(f'/v1/prices/status/{ticker}')
                if resp.status_code != 200:
                    continue
                
                status = resp.json()
                missing_days = status.get('missing_days', [])
                
                if missing_days:
                    gaps_found.append({
                        "ticker": ticker,
                        "missing_days": len(missing_days),
                        "latest_date": status.get('latest_date'),
                        "bar_count": status.get('bar_count', 0)
                    })
            except Exception:
                continue
        
        # Store gaps in scheduler DB
        if gaps_found:
            from libs.satbase_core.config.settings import load_settings
            from libs.satbase_core.storage.scheduler_db import SchedulerDB
            
            s = load_settings()
            db = SchedulerDB(s.stage_dir.parent / "scheduler.db")
            
            for gap in gaps_found:
                # Store gap (priority based on missing days count)
                priority = min(gap['missing_days'] * 10, 100)
                db.store_gap(
                    gap_type='prices',
                    ticker=gap['ticker'],
                    from_date=from_date,
                    to_date=to_date,
                    severity='high' if gap['missing_days'] > 10 else 'medium',
                    priority=priority
                )
        
        return {
            "status": "ok",
            "tickers_checked": len(tickers),
            "gaps_found": len(gaps_found),
            "gaps": gaps_found
        }
    finally:
        await client.aclose()


@wrap_job("prices_fill_gaps", "Fill Price Gaps")
async def fill_price_gaps() -> dict:
    """Fill detected price gaps (max 10 per run)."""
    from libs.satbase_core.config.settings import load_settings
    from libs.satbase_core.storage.scheduler_db import SchedulerDB
    
    s = load_settings()
    db = SchedulerDB(s.stage_dir.parent / "scheduler.db")
    
    # Get unfilled price gaps (priority order)
    gaps = db.get_unfilled_gaps(gap_type='prices', limit=10)
    
    if not gaps:
        return {
            "status": "noop",
            "message": "No price gaps to fill",
            "filled": 0
        }
    
    # Fill gaps by ticker (group gaps by ticker)
    tickers_to_fill = {}
    for gap in gaps:
        ticker = gap['ticker']
        if ticker not in tickers_to_fill:
            tickers_to_fill[ticker] = []
        tickers_to_fill[ticker].append(gap)
    
    filled_count = 0
    client = get_api_client()
    
    try:
        for ticker, ticker_gaps in list(tickers_to_fill.items())[:10]:  # Max 10 tickers
            try:
                # Determine date range for this ticker
                from_dates = [date.fromisoformat(g['from_date']) for g in ticker_gaps]
                to_dates = [date.fromisoformat(g['to_date']) for g in ticker_gaps]
                
                from_date = min(from_dates)
                to_date = max(to_dates)
                
                # Trigger backfill (using regular price ingestion endpoint)
                resp = await client.post('/v1/ingest/prices/daily', json={'tickers': [ticker]})
                if resp.status_code == 202:
                    filled_count += len(ticker_gaps)
                    
                    # Mark gaps as filled
                    for gap in ticker_gaps:
                        db.mark_gap_filled(gap['id'])
            except Exception:
                continue
        
        return {
            "status": "ok",
            "gaps_attempted": len(gaps),
            "gaps_filled": filled_count,
            "tickers_processed": len(tickers_to_fill)
        }
    finally:
        await client.aclose()

