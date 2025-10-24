import asyncio
import logging
import sys

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

    # Topics (hourly)
    tm = SATBASE_SCHEDULE['topics_monitor']
    scheduler.add_job(
        topics.monitor_topics,
        trigger=IntervalTrigger(hours=tm.get('hours', 1)),
        id='topics_monitor',
        name='Monitor Topics'
    )

    # FRED (daily 8:00 UTC)
    fr = SATBASE_SCHEDULE['fred_daily']
    scheduler.add_job(
        fred.refresh_fred_core,
        trigger=CronTrigger(hour=fr.get('hour', 8), minute=fr.get('minute', 0), timezone=fr.get('timezone', 'UTC')),
        id='fred_daily',
        name='Refresh FRED Core Indicators'
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


if __name__ == '__main__':
    asyncio.run(main())


