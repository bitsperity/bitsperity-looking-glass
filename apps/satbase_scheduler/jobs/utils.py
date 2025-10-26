import os
import asyncio
import httpx
import logging

logger = logging.getLogger(__name__)

API_URL = os.getenv('SATBASE_API_URL', 'http://localhost:8080')


def _new_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(base_url=API_URL, timeout=30.0)


def get_api_client() -> httpx.AsyncClient:
    """Get a configured API client for long-lived operations."""
    return httpx.AsyncClient(base_url=API_URL, timeout=httpx.Timeout(60.0))


async def request_with_retries(method: str, url: str, **kwargs) -> httpx.Response:
    """HTTP request with simple exponential backoff retries."""
    retries: int = int(kwargs.pop('retries', 3))
    backoff: float = float(kwargs.pop('backoff', 0.5))
    last_exc: Exception | None = None

    for attempt in range(retries):
        try:
            async with _new_client() as client:
                resp = await client.request(method, url, **kwargs)
                resp.raise_for_status()
                return resp
        except Exception as e:  # Broad by design for robustness
            last_exc = e
            logger.warning(
                "request failed (%s %s) attempt %d/%d: %s",
                method,
                url,
                attempt + 1,
                retries,
                str(e),
            )
            await asyncio.sleep(backoff * (2 ** attempt))

    # Exhausted retries
    assert last_exc is not None
    raise last_exc


