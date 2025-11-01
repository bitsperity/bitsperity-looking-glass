"""
Topic-specific news backfill: Fill gaps per topic, working backwards from today.
Strategy: For each topic in watchlist, identify gaps and backfill chronologically backwards.
"""
import asyncio
from datetime import date, timedelta
from typing import Any, Dict, List
import httpx
from libs.satbase_core.config.settings import load_settings
from jobs.utils import get_api_client
from job_wrapper import wrap_job


@wrap_job("topics_backfill", "Backfill Historical News by Topic")
async def backfill_topics_historical() -> dict[str, Any]:
    """
    Backfill historical news for all topics in watchlist.
    
    Strategy:
    1. Get all active topics from watchlist
    2. For each topic, detect gaps in coverage (going backwards from today)
    3. Fill gaps chronologically backwards (most recent gaps first)
    4. Process max days per topic per run (configurable via job_config)
    
    Job config parameters (from scheduler_db):
    - max_days_per_run: Maximum days to backfill per topic per run (default: 30)
    - min_articles_per_day: Minimum articles per day to not be considered a gap (default: 5)
    - lookback_days: How many days to look back for gaps (default: 365)
    - max_articles_per_day: Maximum articles to fetch per day (default: 100)
    
    Returns summary of backfilled dates per topic.
    """
    s = load_settings()
    client = get_api_client()
    
    # Load job config from DB
    from libs.satbase_core.storage.scheduler_db import SchedulerDB
    db = SchedulerDB(s.stage_dir.parent / "scheduler.db")
    job_db = db.get_job("topics_backfill")
    job_config = job_db.get("job_config", {}) if job_db else {}
    
    max_days_per_run = job_config.get("max_days_per_run", 30)
    min_articles_per_day = job_config.get("min_articles_per_day", 5)
    lookback_days = job_config.get("lookback_days", 365)
    max_articles_per_day = job_config.get("max_articles_per_day", 100)
    
    # Load topics from watchlist
    try:
        wl = await _fetch_watchlist(client, s.api_url)
        topics = [it["key"] for it in wl]
    except Exception as e:
        return {
            "status": "error",
            "error": f"Failed to load watchlist: {e}",
            "topics_count": 0
        }
    
    if not topics:
        return {
            "status": "ok",
            "message": "Watchlist empty - no topics to backfill",
            "topics_count": 0,
            "backfilled": {}
        }
    
    results = {
        "status": "ok",
        "timestamp": date.today().isoformat(),
        "topics_count": len(topics),
        "topics_processed": 0,
        "dates_backfilled": 0,
        "config": {
            "max_days_per_run": max_days_per_run,
            "min_articles_per_day": min_articles_per_day,
            "lookback_days": lookback_days,
            "max_articles_per_day": max_articles_per_day
        },
        "topics": {}
    }
    
    # Process each topic
    today = date.today()
    start_date = today - timedelta(days=lookback_days)
    
    for topic_name in topics:
        try:
            topic_result = await _backfill_topic_gaps(
                client, topic_name, s.api_url,
                max_days_per_run=max_days_per_run,
                min_articles_per_day=min_articles_per_day,
                max_articles_per_day=max_articles_per_day,
                start_date=start_date,
                end_date=today
            )
            results["topics_processed"] += 1
            results["dates_backfilled"] += topic_result.get("dates_filled", 0)
            results["topics"][topic_name] = topic_result
        except Exception as e:
            results["topics"][topic_name] = {
                "status": "error",
                "error": str(e)
            }
    
    return results


async def _fetch_watchlist(client: httpx.AsyncClient, api_url: str) -> list[dict[str, Any]]:
    """Fetch active topics from watchlist API."""
    r = await client.get(
        f"{api_url}/v1/watchlist/items",
        params={"type": "topic", "active_now": "true", "enabled": "true"},
        timeout=10.0
    )
    r.raise_for_status()
    data = r.json() or {}
    items = data.get("items", [])
    # Return items with 'key' field (topic name)
    return items


async def _backfill_topic_gaps(
    client: httpx.AsyncClient,
    topic: str,
    api_url: str,
    max_days_per_run: int = 30,
    min_articles_per_day: int = 5,
    max_articles_per_day: int = 100,
    start_date: date | None = None,
    end_date: date | None = None
) -> dict[str, Any]:
    """
    Backfill gaps for a single topic, working backwards from today.
    
    Args:
        client: HTTP client
        topic: Topic name
        api_url: Base API URL
        max_days_per_run: Maximum days to backfill per run (default: 30 = ~1 month)
        min_articles_per_day: Minimum articles per day to not be considered a gap
        max_articles_per_day: Maximum articles to fetch per day
        start_date: Start date for gap detection (default: 365 days ago)
        end_date: End date for gap detection (default: today)
    
    Returns:
        Summary of backfilled dates
    """
    if end_date is None:
        end_date = date.today()
    if start_date is None:
        start_date = end_date - timedelta(days=365)
    
    # Detect gaps for this topic
    gaps = await _detect_topic_gaps(client, api_url, topic, start_date, end_date, min_articles_per_day)
    
    if not gaps:
        return {
            "status": "ok",
            "message": f"No gaps detected for topic '{topic}'",
            "dates_filled": 0,
            "gaps_detected": 0
        }
    
    # Gaps are already sorted backwards (most recent first) from _detect_topic_gaps
    # Process up to max_days_per_run (starting with most recent gaps)
    gaps_to_fill = gaps[:max_days_per_run]
    
    filled_dates = []
    failed_dates = []
    
    for gap in gaps_to_fill:
        gap_date = date.fromisoformat(gap["date"])
        try:
            # Trigger backfill for this date and topic
            resp = await client.post(
                f"{api_url}/v1/ingest/news/backfill",
                json={
                    "query": topic,
                    "topic": topic,
                    "from": gap_date.isoformat(),
                    "to": gap_date.isoformat(),
                    "max_articles_per_day": max_articles_per_day
                },
                timeout=30.0
            )
            
            if resp.status_code == 202:
                filled_dates.append(gap_date.isoformat())
                # Small delay to avoid overwhelming API
                await asyncio.sleep(1)
            else:
                failed_dates.append(gap_date.isoformat())
        except Exception as e:
            failed_dates.append({
                "date": gap_date.isoformat(),
                "error": str(e)
            })
    
    return {
        "status": "ok",
        "topic": topic,
        "gaps_detected": len(gaps),
        "dates_filled": len(filled_dates),
        "dates_failed": len(failed_dates),
        "filled_dates": filled_dates[:10],  # Show first 10
        "failed_dates": failed_dates[:5] if failed_dates else []
    }


async def _detect_topic_gaps(
    client: httpx.AsyncClient,
    api_url: str,
    topic: str,
    from_date: date,
    to_date: date,
    min_articles_per_day: int = 5
) -> List[Dict[str, Any]]:
    """
    Detect gaps for a specific topic by checking article counts per day.
    
    Uses the heatmap API to check daily coverage for the topic.
    Works backwards from to_date to from_date (most recent gaps first).
    """
    try:
        # Use topics coverage API to get daily breakdown
        resp = await client.get(
            f"{api_url}/v1/news/topics/coverage",
            params={
                "topics": topic,
                "from": from_date.isoformat(),
                "to": to_date.isoformat(),
                "granularity": "day",
                "format": "flat"
            },
            timeout=30.0
        )
        resp.raise_for_status()
        data = resp.json()
        
        # Extract daily counts for this topic
        coverage_data = data.get("data", [])
        
        # Build map of date -> article count
        daily_counts = {}
        for item in coverage_data:
            if item.get("topic") == topic:
                period = item.get("period")  # Format: YYYY-MM-DD
                count = item.get("count", 0)
                daily_counts[period] = count
        
        # Identify gaps: dates with insufficient articles
        # Iterate backwards (most recent first) for chronological backfill
        gaps = []
        current_date = to_date
        while current_date >= from_date:
            date_str = current_date.isoformat()
            count = daily_counts.get(date_str, 0)
            
            if count < min_articles_per_day:
                gaps.append({
                    "date": date_str,
                    "article_count": count,
                    "severity": "critical" if count == 0 else "low"
                })
            
            current_date -= timedelta(days=1)
        
        return gaps
    
    except Exception as e:
        # Fallback: if API fails, return empty gaps (don't fail the whole job)
        return []

