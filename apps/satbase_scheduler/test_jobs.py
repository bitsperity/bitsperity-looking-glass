import asyncio
import logging

from jobs.watchlist import refresh_watchlist
from jobs.topics import monitor_topics
from jobs.fred import refresh_fred_core


logging.basicConfig(level=logging.INFO)


async def main():
    await refresh_watchlist()
    await monitor_topics()
    await refresh_fred_core()


if __name__ == '__main__':
    asyncio.run(main())


