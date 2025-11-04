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

from jobs import watchlist, topics, topics_backfill, fred, prices, tesseract


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
        
        # Topics Historical Backfill - Fill gaps chronologically backwards
        {
            "job_id": "topics_backfill",
            "name": "Backfill Historical News by Topic",
            "func": topics_backfill.backfill_topics_historical,
            "trigger": CronTrigger(hour=2, minute=0),  # Daily at 2 AM UTC
            "trigger_config": {"hour": 2, "minute": 0, "timezone": "UTC", "type": "cron"},
            "job_config": {
                "max_days_per_run": 30,
                "min_articles_per_day": 5,
                "lookback_days": 365,
                "max_articles_per_day": 100
            },
            "max_instances": 1,
            "enabled": True
        },
    ]
    
    # Cleanup: Remove jobs from DB that are no longer in code
    db_job_ids = {job['job_id'] for job in db.list_jobs()}
    code_job_ids = {job['job_id'] for job in jobs_config}
    orphaned_job_ids = db_job_ids - code_job_ids
    
    for orphaned_job_id in orphaned_job_ids:
        log_scheduler_event("job_removed", job_id=orphaned_job_id, reason="no longer in code")
        db.delete_job(orphaned_job_id)
    
    # Register jobs in scheduler and database
    for job_config in jobs_config:
        job_id = job_config["job_id"]
        
        # Check if job config exists in DB (override with DB values if present)
        db_job = db.get_job(job_id)
        
        # Use DB config if available, otherwise use code config
        job_config_to_store = None  # Will be set based on DB or code config
        if db_job:
            enabled = db_job['enabled']
            # Load trigger from DB if trigger_config exists
            trigger_to_use = job_config["trigger"]  # Default: use code config
            
            if db_job.get('trigger_config') and db_job.get('trigger_type'):
                trigger_config = db_job['trigger_config']
                trigger_type = db_job['trigger_type']
                
                # Reconstruct trigger from DB config
                if trigger_type == 'cron':
                    cron_kwargs = {
                        'timezone': trigger_config.get('timezone', 'UTC')
                    }
                    if trigger_config.get('hour') is not None:
                        cron_kwargs['hour'] = trigger_config.get('hour')
                    if trigger_config.get('minute') is not None:
                        cron_kwargs['minute'] = trigger_config.get('minute')
                    if trigger_config.get('day_of_week'):
                        cron_kwargs['day_of_week'] = trigger_config.get('day_of_week')
                    trigger_to_use = CronTrigger(**cron_kwargs)
                elif trigger_type == 'interval':
                    # Support both hours and minutes
                    hours = trigger_config.get('hours', 0)
                    minutes = trigger_config.get('minutes', 0)
                    if minutes > 0:
                        from datetime import timedelta
                        trigger_to_use = IntervalTrigger(minutes=minutes)
                    elif hours > 0:
                        trigger_to_use = IntervalTrigger(hours=hours)
                    else:
                        # Fallback to code config
                        trigger_to_use = job_config["trigger"]
            
            # Use job_config from DB if it exists (not None), otherwise use code config
            db_job_config = db_job.get('job_config')
            if db_job_config is not None:  # Explicitly check for None (not just falsy)
                job_config_to_store = db_job_config
            else:
                job_config_to_store = job_config.get("job_config")
        else:
            enabled = job_config.get("enabled", True)
            trigger_to_use = job_config["trigger"]
            job_config_to_store = job_config.get("job_config")
        
        if not enabled:
            log_scheduler_event("job_skipped", job_id=job_id, reason="disabled")
            continue
        
        # Add job to scheduler with trigger (from DB if available, otherwise from code)
        job = scheduler.add_job(
            job_config["func"],
            trigger=trigger_to_use,
            id=job_id,
            name=job_config["name"],
            max_instances=job_config.get("max_instances", 1),
            replace_existing=True
        )
        
        # Store job config in DB (use DB values if available, otherwise extract from code)
        if db_job and db_job.get('trigger_type') and db_job.get('trigger_config'):
            # Use trigger_config and trigger_type from DB (preserve user changes)
            trigger_type = db_job['trigger_type']
            trigger_config = db_job['trigger_config']
        else:
            # Extract trigger_config and trigger_type from code config (new job or missing DB values)
            trigger_type = "cron" if isinstance(trigger_to_use, CronTrigger) else "interval"
            
            # Extract trigger_config from trigger_to_use (which may be from DB or code)
            if isinstance(trigger_to_use, CronTrigger):
                trigger_config = {
                    "timezone": str(trigger_to_use.timezone),
                    "type": "cron"
                }
                # Try to extract hour, minute, day_of_week from trigger fields
                if hasattr(trigger_to_use, 'fields'):
                    fields = trigger_to_use.fields
                    if len(fields) > 2 and hasattr(fields[2], 'values') and fields[2].values:
                        trigger_config["hour"] = fields[2].values[0]
                    if len(fields) > 1 and hasattr(fields[1], 'values') and fields[1].values:
                        trigger_config["minute"] = fields[1].values[0]
                    if len(fields) > 5 and hasattr(fields[5], 'values') and fields[5].values:
                        trigger_config["day_of_week"] = fields[5].values[0]
            elif isinstance(trigger_to_use, IntervalTrigger):
                # Extract minutes or hours from interval
                total_seconds = trigger_to_use.interval.total_seconds()
                if total_seconds % 3600 == 0:
                    trigger_config = {
                        "hours": int(total_seconds / 3600),
                        "timezone": "UTC",
                        "type": "interval"
                    }
                else:
                    trigger_config = {
                        "minutes": int(total_seconds / 60),
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
            max_instances=job_config.get("max_instances", 1),
            job_config=job_config_to_store  # Use DB config if available, otherwise code config
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
