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


def extract_text_from_html(html: str) -> str | None:
    """Extract plain text from HTML using BeautifulSoup"""
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        # Fallback: return HTML if BeautifulSoup not available
        return html
    
    try:
        soup = BeautifulSoup(html, "html.parser")
        
        # Remove script, style, and noscript tags
        for tag in soup(["script", "style", "noscript"]):
            tag.extract()
        
        # Get text with spaces
        text = soup.get_text(" ", strip=True)
        
        # Clean surrogates
        if text:
            text = text.encode('utf-8', errors='surrogatepass').decode('utf-8', errors='ignore')
        
        return text if text else None
    except Exception:
        return None


def fetch_text_with_retry(
    url: str,
    max_retries: int = 2,
    timeout: int = 15
) -> str | None:
    """
    Fetch URL and extract text with retry logic.
    
    Retry on: timeouts, 5xx errors, connection errors
    Don't retry: 403, 404, 410, Cloudflare blocks
    
    Returns: Plain text or None if failed
    """
    for attempt in range(max_retries):
        try:
            # Fetch HTML
            html = get_text(url, headers=default_headers(), timeout=timeout)
            
            if not html:
                return None
            
            # Extract text from HTML
            text = extract_text_from_html(html)
            
            # Only return if we have substantial text (>100 chars)
            if text and len(text) > 100:
                return text
            else:
                return None
                
        except HTTPStatusError as e:
            # Don't retry on client errors or known blocks
            if e.status_code in [403, 404, 410]:
                return None
            
            # Retry on 5xx or 429
            if attempt < max_retries - 1 and (e.status_code == 429 or e.status_code >= 500):
                time.sleep(2 ** attempt)  # Exponential backoff
                continue
            
            return None
            
        except (TimeoutError, httpx.TimeoutException, httpx.ConnectError, httpx.NetworkError):
            # Retry on network/timeout errors
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)
                continue
            return None
            
        except Exception:
            # Unknown error - don't retry
            return None
    
    return None

