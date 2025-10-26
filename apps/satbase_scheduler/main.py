import asyncio
import logging
import sys
import os

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from config import SATBASE_SCHEDULE
from jobs import watchlist, topics, fred


logging.basicConfig(
    stream=sys.stdout,
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(name)s: %(message)s',
)
logger = logging.getLogger("satbase_scheduler")


def setup_scheduler() -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler()

    # Watchlist (daily 7:00 UTC)
    wl = SATBASE_SCHEDULE['watchlist_refresh']
    scheduler.add_job(
        watchlist.refresh_watchlist,
        trigger=CronTrigger(hour=wl.get('hour', 7), minute=wl.get('minute', 0), timezone=wl.get('timezone', 'UTC')),
        id='watchlist_refresh',
        name='Refresh Watchlist (Prices + News)'
    )

    # Topics (hourly) - per-topic ingestion with proper annotation
    tm = SATBASE_SCHEDULE['topics_monitor']
    scheduler.add_job(
        topics.ingest_topics_job,
        trigger=IntervalTrigger(hours=tm.get('hours', 1)),
        id='topics_ingest',
        name='Per-Topic News Ingestion',
        max_instances=1  # Only one instance running at a time
    )

    # FRED (daily 8:00 UTC)
    fr = SATBASE_SCHEDULE['fred_daily']
    scheduler.add_job(
        fred.refresh_fred_core,
        trigger=CronTrigger(hour=fr.get('hour', 8), minute=fr.get('minute', 0), timezone=fr.get('timezone', 'UTC')),
        id='fred_daily',
        name='Refresh FRED Core Indicators'
    )

    # Bodies fetcher (every 15 minutes) - trigger-only via API
    async def trigger_bodies():
        import httpx
        from libs.satbase_core.config.settings import load_settings
        s = load_settings()
        url = f"{s.api_url}/v1/ingest/news/fetch-missing-bodies"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                await client.post(url, json={"max_articles": 300, "days": 3})
        except Exception:
            pass

    scheduler.add_job(
        trigger_bodies,
        trigger=IntervalTrigger(minutes=15),
        id='news_bodies_fetch',
        name='Trigger: Fetch Missing News Bodies (API)',
        max_instances=1
    )

    # Note: News body fetching removed - now unified with news ingestion
    # Bodies are fetched inline during news ingestion (see unified fetch in adapters)
    
    # Body update queue processor (every 30 seconds)
    async def process_body_update_queue():
        """Process queued body updates from API to avoid DB locking."""
        import json
        from pathlib import Path
        from libs.satbase_core.config.settings import load_settings
        from libs.satbase_core.storage.news_db import NewsDB
        
        s = load_settings()
        queue_file = s.stage_dir.parent / ".body_update_queue.jsonl"
        db = NewsDB(s.stage_dir.parent / "news.db")
        
        if not queue_file.exists():
            return
        
        try:
            # Read queue file
            updates = []
            with open(queue_file, "r") as f:
                for line in f:
                    if line.strip():
                        updates.append(json.loads(line))
            
            # Process updates
            for update in updates:
                try:
                    article_id = update.get("article_id")
                    body_text = update.get("body_text")
                    
                    with db.conn() as conn:
                        conn.execute(
                            "UPDATE news_articles SET body_text = ?, body_available = 1, fetched_at = CURRENT_TIMESTAMP WHERE id = ?",
                            (body_text, article_id)
                        )
                        db.log_audit(
                            action="body_updated_queued",
                            article_id=article_id,
                            details=f"Queued body update: {len(body_text)} chars"
                        )
                except Exception as e:
                    logger.warning(f"Failed to update article {article_id}: {e}")
            
            # Clear queue after processing
            queue_file.unlink(missing_ok=True)
        except Exception as e:
            logger.warning(f"Body update queue processing failed: {e}")
    
    scheduler.add_job(
        process_body_update_queue,
        trigger=IntervalTrigger(seconds=30),
        id='body_update_queue',
        name='Process Body Update Queue',
        max_instances=1
    )
    
    return scheduler


async def main() -> None:
    logger.info("Starting Satbase Scheduler")
    scheduler = setup_scheduler()
    scheduler.start()

    # Keep running
    try:
        await asyncio.Event().wait()
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown()


async def main_with_reload() -> None:
    """Development mode with hot reload"""
    from watchfiles import awatch
    from pathlib import Path
    
    logger.info("Starting Satbase Scheduler (HOT RELOAD MODE)")
    
    scheduler_task = asyncio.create_task(main())
    watch_path = Path(__file__).parent
    
    logger.info(f"Watching {watch_path} for changes...")
    
    try:
        async for changes in awatch(watch_path, watch_filter=lambda path, change_type: str(path).endswith(('.py', '.yaml', '.yml'))):
            logger.warning(f"Files changed: {changes}")
            logger.warning("Restarting scheduler...")
            
            # Cancel current scheduler
            scheduler_task.cancel()
            try:
                await scheduler_task
            except asyncio.CancelledError:
                pass
            
            # Give brief pause before restart
            await asyncio.sleep(1)
            
            # Reload modules
            import importlib
            importlib.invalidate_caches()
            
            # Start new scheduler
            scheduler_task = asyncio.create_task(main())
            logger.warning("Scheduler restarted")
    except KeyboardInterrupt:
        scheduler_task.cancel()
        try:
            await scheduler_task
        except asyncio.CancelledError:
            pass


if __name__ == '__main__':
    # Enable hot reload if ENV var is set
    if os.getenv("ENABLE_RELOAD") == "true":
        asyncio.run(main_with_reload())
    else:
        asyncio.run(main())


