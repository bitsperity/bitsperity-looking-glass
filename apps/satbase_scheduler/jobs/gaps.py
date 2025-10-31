"""
Gap detection and filling jobs for news, prices, and macro data.
"""
from datetime import date, timedelta
from typing import List, Dict, Any

from jobs.utils import request_with_retries, get_api_client
from job_wrapper import wrap_job


@wrap_job("gaps_detect", "Detect Data Gaps")
async def detect_gaps() -> dict:
    """Detect gaps in news, prices, and macro data."""
    from libs.satbase_core.config.settings import load_settings
    from libs.satbase_core.storage.scheduler_db import SchedulerDB
    
    s = load_settings()
    db = SchedulerDB(s.stage_dir.parent / "scheduler.db")
    
    gaps = {
        "news": [],
        "prices": [],
        "macro": []
    }
    
    # News gaps
    try:
        resp = await request_with_retries(
            'GET',
            '/v1/news/gaps',
            params={
                'from': (date.today() - timedelta(days=365)).isoformat(),
                'to': date.today().isoformat(),
                'min_articles_per_day': 10
            }
        )
        news_gaps_data = resp.json()
        news_gaps = news_gaps_data.get('gaps', [])
        
        for gap in news_gaps:
            gap_date = date.fromisoformat(gap['date'])
            severity = 'critical' if gap['article_count'] == 0 else 'low'
            priority = 100 if gap['article_count'] == 0 else 10
            
            gap_id = db.store_gap(
                gap_type='news',
                from_date=gap_date,
                to_date=gap_date,
                severity=severity,
                priority=priority
            )
            gaps['news'].append({
                "id": gap_id,
                "date": gap['date'],
                "article_count": gap['article_count'],
                "severity": severity
            })
    except Exception as e:
        gaps['news'] = {"error": str(e)}
    
    # Price gaps (handled by prices.py detect_price_gaps)
    # Macro gaps (can be added later)
    
    return {
        "status": "ok",
        "gaps_detected": {
            "news": len(gaps['news']) if isinstance(gaps['news'], list) else 0,
            "prices": 0,  # Handled separately
            "macro": 0
        },
        "gaps": gaps
    }


@wrap_job("gaps_fill", "Fill Data Gaps")
async def fill_gaps() -> dict:
    """Fill detected gaps (prioritized)."""
    from libs.satbase_core.config.settings import load_settings
    from libs.satbase_core.storage.scheduler_db import SchedulerDB
    
    s = load_settings()
    db = SchedulerDB(s.stage_dir.parent / "scheduler.db")
    
    results = {
        "news": {"filled": 0, "attempted": 0},
        "prices": {"filled": 0, "attempted": 0},
        "macro": {"filled": 0, "attempted": 0}
    }
    
    # Fill critical news gaps (max 5 per run)
    critical_news_gaps = db.get_unfilled_gaps(
        gap_type='news',
        severity='critical',
        limit=5
    )
    
    client = get_api_client()
    
    try:
        for gap in critical_news_gaps:
            try:
                gap_date = date.fromisoformat(gap['from_date'])
                
                # Trigger backfill for this date
                resp = await client.post(
                    '/v1/ingest/news/backfill',
                    json={
                        'query': 'semiconductor OR chip OR AI OR technology',
                        'from': gap_date.isoformat(),
                        'to': gap_date.isoformat(),
                        'max_articles_per_day': 100
                    }
                )
                
                if resp.status_code == 202:
                    results['news']['filled'] += 1
                    db.mark_gap_filled(gap['id'])
                
                results['news']['attempted'] += 1
            except Exception:
                continue
        
        return {
            "status": "ok",
            "results": results
        }
    finally:
        await client.aclose()

