from __future__ import annotations

import time
from typing import Any

import httpx
from tenacity import retry, stop_after_attempt, wait_random_exponential, retry_if_exception


class HTTPStatusError(Exception):
    def __init__(self, status_code: int, message: str = ""):
        super().__init__(f"HTTP {status_code}: {message}")
        self.status_code = status_code


def default_headers(user_agent_email: str | None = None) -> dict[str, str]:
    ua = f"satbase/0.1 (+{user_agent_email})" if user_agent_email else "satbase/0.1"
    return {"User-Agent": ua}


def _retry_on_status_error(e: BaseException) -> bool:
    if isinstance(e, HTTPStatusError):
        return e.status_code == 429 or 500 <= e.status_code < 600
    return False


@retry(stop=stop_after_attempt(3), wait=wait_random_exponential(multiplier=0.5, max=5), retry=retry_if_exception(_retry_on_status_error))
def get_json(url: str, params: dict[str, Any] | None = None, headers: dict[str, str] | None = None, timeout: float | None = None) -> dict[str, Any]:
    with httpx.Client(timeout=timeout) as client:
        resp = client.get(url, params=params, headers=headers)
        if resp.status_code >= 400:
            raise HTTPStatusError(resp.status_code, resp.text[:200])
        if not resp.text:
            return {}
        try:
            return resp.json()
        except Exception:
            # Fallback, treat as empty
            return {}


@retry(stop=stop_after_attempt(3), wait=wait_random_exponential(multiplier=0.5, max=5), retry=retry_if_exception(_retry_on_status_error))
def get_text(url: str, headers: dict[str, str] | None = None, timeout: float | None = None) -> str:
    with httpx.Client(timeout=timeout, follow_redirects=True) as client:
        resp = client.get(url, headers=headers)
        if resp.status_code >= 400:
            raise HTTPStatusError(resp.status_code, resp.text[:200])
        text = resp.text or ""
        # Remove surrogate characters that can't be encoded in UTF-8
        # This fixes: 'utf-8' codec can't encode characters: surrogates not allowed
        if text:
            text = text.encode('utf-8', errors='surrogatepass').decode('utf-8', errors='ignore')
        return text

