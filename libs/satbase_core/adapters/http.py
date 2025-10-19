from __future__ import annotations

import time
from typing import Any

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential_jitter, retry_if_exception


def default_headers(user_agent_email: str | None = None) -> dict[str, str]:
    ua = "satbase/0.1 (+https://example.local)"
    if user_agent_email:
        ua = f"satbase/0.1 ({user_agent_email})"
    return {"User-Agent": ua, "Accept": "application/json"}


def _retry_on_status_error(e: Exception) -> bool:
    # httpx.HTTPStatusError abfangen: bei 429/5xx retry, bei 4xx außer 429 nicht
    if isinstance(e, httpx.HTTPStatusError):
        status = e.response.status_code
        return status == 429 or 500 <= status < 600
    return False


@retry(wait=wait_exponential_jitter(initial=0.5, max=8), stop=stop_after_attempt(5), retry=retry_if_exception(_retry_on_status_error))
def get_json(url: str, params: dict[str, Any] | None = None, headers: dict[str, str] | None = None, timeout: float = 20.0) -> Any:
    with httpx.Client(timeout=timeout, follow_redirects=True, headers=headers) as client:
        resp = client.get(url, params=params)
        resp.raise_for_status()
        return resp.json()


@retry(wait=wait_exponential_jitter(initial=0.5, max=8), stop=stop_after_attempt(5), retry=retry_if_exception(_retry_on_status_error))
def get_text(url: str, params: dict[str, Any] | None = None, headers: dict[str, str] | None = None, timeout: float = 20.0) -> str:
    with httpx.Client(timeout=timeout, follow_redirects=True, headers=headers) as client:
        resp = client.get(url, params=params)
        resp.raise_for_status()
        return resp.text

