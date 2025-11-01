"""
Satbase Scheduler - Main entry point.
Manages all scheduled jobs with structured logging and state tracking.
"""
import asyncio
import os
from datetime import datetime
from pathlib import Path

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from libs.satbase_core.config.settings import load_settings
from libs.satbase_core.storage.scheduler_db import SchedulerDB
from scheduler_logging import log_scheduler_event

from jobs import watchlist, topics, fred, prices, gaps, tesseract


def setup_scheduler() -> AsyncIOScheduler:
    """Setup and configure the scheduler with all jobs."""
    scheduler = AsyncIOScheduler()
    s = load_settings()
    db = SchedulerDB(s.stage_dir.parent / "scheduler.db")
    
    # Job definitions
    jobs_config = [
        # Present Maintenance - Watchlist
        {
            "job_id": "watchlist_refresh",
            "name": "Refresh Watchlist (Prices + News)",
            "func": watchlist.refresh_watchlist,
            "trigger": CronTrigger(hour=7, minute=0, timezone='UTC'),
            "trigger_config": {"hour": 7, "minute": 0, "timezone": "UTC", "type": "cron"},
            "max_instances": 1,
            "enabled": True
        },
        
        # Present Maintenance - Topics
        {
            "job_id": "topics_ingest",
            "name": "Per-Topic News Ingestion",
            "func": topics.ingest_topics_job,
            "trigger": IntervalTrigger(hours=6),
            "trigger_config": {"hours": 6, "timezone": "UTC", "type": "interval"},
            "max_instances": 1,
            "enabled": True
        },
        
        # Present Maintenance - Core Indicators
        {
            "job_id": "fred_daily",
            "name": "Refresh FRED Core Indicators",
            "func": fred.refresh_fred_core,
            "trigger": CronTrigger(hour=8, minute=0, timezone='UTC'),
            "trigger_config": {"hour": 8, "minute": 0, "timezone": "UTC", "type": "cron"},
            "max_instances": 1,
            "enabled": True
        },
        
        # Price Maintenance - Watchlist Prices
        {
            "job_id": "prices_watchlist",
            "name": "Refresh Watchlist Prices",
            "func": prices.refresh_watchlist_prices,
            "trigger": CronTrigger(hour=7, minute=5, timezone='UTC'),  # 5 min after watchlist refresh
            "trigger_config": {"hour": 7, "minute": 5, "timezone": "UTC", "type": "cron"},
            "max_instances": 1,
            "enabled": True
        },
        
        # Gap Detection - Prices
        {
            "job_id": "prices_gaps",
            "name": "Detect Price Gaps",
            "func": prices.detect_price_gaps,
            "trigger": CronTrigger(hour=2, minute=0, timezone='UTC'),  # Daily 2:00 UTC
            "trigger_config": {"hour": 2, "minute": 0, "timezone": "UTC", "type": "cron"},
            "max_instances": 1,
            "enabled": True
        },
        
        # Gap Filling - Prices
        {
            "job_id": "prices_fill_gaps",
            "name": "Fill Price Gaps",
            "func": prices.fill_price_gaps,
            "trigger": CronTrigger(hour=3, minute=0, timezone='UTC'),  # Daily 3:00 UTC
            "trigger_config": {"hour": 3, "minute": 0, "timezone": "UTC", "type": "cron"},
            "max_instances": 1,
            "enabled": True
        },
        
        # Gap Detection - All Types
        {
            "job_id": "gaps_detect",
            "name": "Detect Data Gaps",
            "func": gaps.detect_gaps,
            "trigger": CronTrigger(day_of_week='sun', hour=2, minute=0, timezone='UTC'),  # Weekly Sunday 2:00 UTC
            "trigger_config": {"day_of_week": "sun", "hour": 2, "minute": 0, "timezone": "UTC", "type": "cron"},
            "max_instances": 1,
            "enabled": True
        },
        
        # Gap Filling - All Types
        {
            "job_id": "gaps_fill",
            "name": "Fill Data Gaps",
            "func": gaps.fill_gaps,
            "trigger": CronTrigger(hour=3, minute=30, timezone='UTC'),  # Daily 3:30 UTC
            "trigger_config": {"hour": 3, "minute": 30, "timezone": "UTC", "type": "cron"},
            "max_instances": 1,
            "enabled": True
        },
        
        # Tesseract Embedding - New Articles
        {
            "job_id": "tesseract_embed_new",
            "name": "Embed New Articles to Tesseract",
            "func": tesseract.embed_new_articles,
            "trigger": IntervalTrigger(minutes=30),
            "trigger_config": {"minutes": 30, "timezone": "UTC", "type": "interval"},
            "max_instances": 1,
            "enabled": True
        },
    ]
    
    # Register jobs in scheduler and database
    for job_config in jobs_config:
        job_id = job_config["job_id"]
        
        # Check if job is enabled in DB (override config if exists)
        db_job = db.get_job(job_id)
        enabled = db_job['enabled'] if db_job else job_config.get("enabled", True)
        
        if not enabled:
            log_scheduler_event("job_skipped", job_id=job_id, reason="disabled")
            continue
        
        # Add job to scheduler
        job = scheduler.add_job(
            job_config["func"],
            trigger=job_config["trigger"],
            id=job_id,
            name=job_config["name"],
            max_instances=job_config.get("max_instances", 1),
            replace_existing=True
        )
        
        # Store job config in DB (use original config from jobs_config if available)
        trigger_type = "cron" if isinstance(job_config["trigger"], CronTrigger) else "interval"
        
        # Use trigger_config from job_config if provided, otherwise extract from trigger
        if "trigger_config" in job_config:
            trigger_config = job_config["trigger_config"]
        elif isinstance(job_config["trigger"], CronTrigger):
            # Fallback: try to extract from trigger fields (if trigger_config not provided)
            trigger_config = {
                "timezone": str(job_config["trigger"].timezone),
                "type": "cron"
            }
            # Try to extract hour, minute, day_of_week from trigger fields
            if hasattr(job_config["trigger"], 'fields'):
                fields = job_config["trigger"].fields
                if len(fields) > 2 and hasattr(fields[2], 'values') and fields[2].values:
                    trigger_config["hour"] = fields[2].values[0]
                if len(fields) > 1 and hasattr(fields[1], 'values') and fields[1].values:
                    trigger_config["minute"] = fields[1].values[0]
                if len(fields) > 5 and hasattr(fields[5], 'values') and fields[5].values:
                    trigger_config["day_of_week"] = fields[5].values[0]
        elif isinstance(job_config["trigger"], IntervalTrigger):
            trigger_config = {
                "hours": job_config["trigger"].interval.total_seconds() / 3600,
                "timezone": "UTC",
                "type": "interval"
            }
        else:
            trigger_config = {"type": "unknown"}
        
        db.upsert_job(
            job_id=job_id,
            name=job_config["name"],
            trigger_type=trigger_type,
            trigger_config=trigger_config,
            job_func=f"{job_config['func'].__module__}.{job_config['func'].__name__}",
            enabled=enabled,
            max_instances=job_config.get("max_instances", 1)
        )
        
        # Log job registration
        # Note: next_run_time is only available after scheduler.start()
        log_scheduler_event("job_registered", job_id=job_id, name=job_config["name"])
    
    # Setup scheduler event listeners
    from apscheduler.events import EVENT_JOB_EXECUTED, EVENT_JOB_ERROR
    
    def job_executed(event):
        """Track job execution in database."""
        job_id = event.job_id
        try:
            job = scheduler.get_job(job_id)
            if job:
                next_run = job.next_run_time
                if next_run:
                    db.update_job_next_run(job_id, next_run)
        except Exception:
            pass  # Don't fail if update fails
    
    def job_error(event):
        """Log job errors."""
        log_scheduler_event("job_execution_error", job_id=event.job_id, exception=str(event.exception))
    
    scheduler.add_listener(job_executed, EVENT_JOB_EXECUTED)
    scheduler.add_listener(job_error, EVENT_JOB_ERROR)
    
    return scheduler


async def main() -> None:
    """Main scheduler loop."""
    log_scheduler_event("startup")
    
    scheduler = setup_scheduler()
    scheduler.start()
    
    log_scheduler_event("started", jobs_count=len(scheduler.get_jobs()))
    
    # Keep running
    try:
        await asyncio.Event().wait()
    except (KeyboardInterrupt, SystemExit):
        log_scheduler_event("shutdown")
        scheduler.shutdown()


async def main_with_reload() -> None:
    """Development mode with hot reload."""
    from watchfiles import awatch
    import importlib
    
    log_scheduler_event("startup", mode="hot_reload")
    
    scheduler_task = asyncio.create_task(main())
    watch_path = Path(__file__).parent
    
    log_scheduler_event("watch_started", path=str(watch_path))
    
    try:
        async for changes in awatch(
            watch_path,
            watch_filter=lambda path, change_type: str(path).endswith(('.py', '.yaml', '.yml'))
        ):
            log_scheduler_event("files_changed", changes=str(changes))
            log_scheduler_event("restarting")
            
            # Cancel current scheduler
            scheduler_task.cancel()
            try:
                await scheduler_task
            except asyncio.CancelledError:
                pass
            
            # Reload modules
            await asyncio.sleep(1)
            importlib.invalidate_caches()
            
            # Start new scheduler
            scheduler_task = asyncio.create_task(main())
            log_scheduler_event("restarted")
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
