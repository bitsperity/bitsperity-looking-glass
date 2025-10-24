import logging

from .utils import request_with_retries

logger = logging.getLogger(__name__)


CORE_FRED_SERIES = [
    'GDP', 'GDPC1', 'UNRATE', 'CPIAUCSL', 'FEDFUNDS',
    'DGS10', 'DGS2', 'T10Y2Y', 'DEXUSEU', 'DCOILWTICO',
    'M2SL', 'VIXCLS', 'PCEPI', 'CPILFESL', 'PAYEMS',
    'ICSA', 'GDPPOT', 'M1SL', 'WALCL', 'RSXFS',
    'UMCSENT', 'PCE', 'INDPRO', 'MANEMP', 'HOUST',
    'MORTGAGE30US', 'DTWEXBGS', 'GASREGW'
]


async def refresh_fred_core() -> None:
    """Update all core FRED indicators via Satbase API."""
    await request_with_retries('POST', '/v1/ingest/macro/fred', json={'series': CORE_FRED_SERIES})
    logger.info("Triggered refresh for %d FRED series", len(CORE_FRED_SERIES))


