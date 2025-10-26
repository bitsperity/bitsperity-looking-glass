import os

SATBASE_API_URL = os.getenv("SATBASE_API_URL", "http://localhost:8080")

SATBASE_SCHEDULE = {
    'watchlist_refresh': {
        'trigger': 'cron',
        'hour': 7,
        'minute': 0,
        'timezone': 'UTC'
    },
    'topics_monitor': {
        'trigger': 'interval',
        'hours': 1
    },
    'fred_daily': {
        'trigger': 'cron',
        'hour': 8,
        'minute': 0,
        'timezone': 'UTC'
    }
    # news_bodies: REMOVED - unified fetch handles this inline during news ingestion
}

