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


def _group_consecutive_days(days: List[date]) -> List[Dict[str, Any]]:
    """Group consecutive dates into ranges."""
    if not days:
        return []
    
    sorted_days = sorted(days)
    groups = []
    current_start = sorted_days[0]
    current_end = sorted_days[0]
    
    for i in range(1, len(sorted_days)):
        if (sorted_days[i] - current_end).days == 1:
            current_end = sorted_days[i]
        else:
            groups.append({
                "from": current_start,
                "to": current_end,
                "days": [d for d in sorted_days if current_start <= d <= current_end]
            })
            current_start = sorted_days[i]
            current_end = sorted_days[i]
    
    # Add last group
    groups.append({
        "from": current_start,
        "to": current_end,
        "days": [d for d in sorted_days if current_start <= d <= current_end]
    })
    
    return groups


@wrap_job("prices_gaps", "Detect Price Gaps")
async def detect_price_gaps() -> dict:
    """Detect missing price days for watchlist tickers using concrete date detection."""
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
    
    # Check each ticker for gaps (last 365 days for comprehensive coverage)
    # This ensures we catch gaps anywhere in the historical data, not just recent gaps
    from_date = date.today() - timedelta(days=365)
    to_date = date.today()
    
    gaps_found = []
    gaps_stored = 0
    client = get_api_client()
    
    try:
        from libs.satbase_core.config.settings import load_settings
        from libs.satbase_core.storage.scheduler_db import SchedulerDB
        
        s = load_settings()
        db = SchedulerDB(s.stage_dir.parent / "scheduler.db")
        
        for ticker in tickers:
            try:
                # Get concrete missing days using new endpoint
                resp = await client.get(
                    f'/v1/prices/gaps/{ticker}',
                    params={'from': from_date.isoformat(), 'to': to_date.isoformat()}
                )
                if resp.status_code != 200:
                    continue
                
                gap_data = resp.json()
                missing_days_str = gap_data.get('missing_days', [])
                
                if missing_days_str:
                    # Convert to date objects
                    missing_days = [date.fromisoformat(d) for d in missing_days_str]
                    
                    # Group consecutive days into ranges
                    gap_ranges = _group_consecutive_days(missing_days)
                    
                    for gap_range in gap_ranges:
                        gap_from = gap_range['from']
                        gap_to = gap_range['to']
                        gap_days_count = len(gap_range['days'])
                        
                        # Store gap with priority based on size
                        priority = min(gap_days_count * 10, 100)
                        severity = 'high' if gap_days_count > 10 else ('medium' if gap_days_count > 5 else 'low')
                        
                        db.store_gap(
                            gap_type='prices',
                            ticker=ticker,
                            from_date=gap_from,
                            to_date=gap_to,
                            severity=severity,
                            priority=priority
                        )
                        gaps_stored += 1
                    
                    gaps_found.append({
                        "ticker": ticker,
                        "missing_days_count": len(missing_days),
                        "gap_ranges": len(gap_ranges),
                        "latest_date": gap_data.get('to_date')
                    })
            except Exception as e:
                continue
        
        return {
            "status": "ok",
            "tickers_checked": len(tickers),
            "gaps_found": len(gaps_found),
            "gaps_stored": gaps_stored,
            "gaps": gaps_found
        }
    finally:
        await client.aclose()


@wrap_job("prices_fill_gaps", "Fill Price Gaps")
async def fill_price_gaps() -> dict:
    """Fill detected price gaps using new backfill endpoint with date ranges."""
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
    filled_ranges = []
    client = get_api_client()
    
    try:
        for ticker, ticker_gaps in list(tickers_to_fill.items())[:10]:  # Max 10 tickers
            try:
                # Process each gap range separately (each gap has specific from/to dates)
                for gap in ticker_gaps:
                    gap_from = date.fromisoformat(gap['from_date'])
                    gap_to = date.fromisoformat(gap['to_date'])
                    
                    # Use new backfill endpoint with specific date range
                    resp = await client.post(
                        '/v1/ingest/prices/backfill',
                        json={
                            'tickers': [ticker],
                            'from_date': gap_from.isoformat(),
                            'to_date': gap_to.isoformat()
                        }
                    )
                    
                    if resp.status_code == 202:
                        filled_count += 1
                        filled_ranges.append({
                            "ticker": ticker,
                            "from": gap_from.isoformat(),
                            "to": gap_to.isoformat(),
                            "job_id": resp.json().get('job_id')
                        })
                        
                        # Mark gap as filled
                        db.mark_gap_filled(gap['id'])
                    else:
                        # Log error but continue with other gaps
                        pass
            except Exception as e:
                continue
        
        return {
            "status": "ok",
            "gaps_attempted": len(gaps),
            "gaps_filled": filled_count,
            "tickers_processed": len(tickers_to_fill),
            "filled_ranges": filled_ranges
        }
    finally:
        await client.aclose()

