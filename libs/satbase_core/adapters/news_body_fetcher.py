from __future__ import annotations

from datetime import date, datetime
from typing import Iterable, Any, List
from urllib.parse import urlparse

from ..models.news import NewsBody, NewsDoc
from ..config.settings import load_settings
from ..storage.stage import upsert_parquet_by_id
from .http import get_text, default_headers
from ..utils.logging import log


# Very lightweight HTML to text extraction fallback
try:
    from bs4 import BeautifulSoup  # type: ignore
except Exception:
    BeautifulSoup = None  # optional


def fetch(params: dict[str, Any]) -> List[dict]:
    # No external fetch; this adapter expects NewsDoc models passed into normalize
    return []


def normalize(docs: Iterable[NewsDoc]) -> Iterable[NewsBody]:
    s = load_settings()
    count = 0
    success = 0
    failed = 0
    
    for d in docs:
        count += 1
        try:
            html = get_text(d.url, headers=default_headers(s.user_agent_email), timeout=s.http_timeout)
            
            if not html:
                log("news_body_empty", id=d.id, url=d.url, count=count)
                failed += 1
                yield NewsBody(id=d.id, url=d.url, content_text=None, content_html=None, fetched_at=datetime.utcnow(), published_at=d.published_at)
                continue
            
            # Extract plain text from HTML
            text = None
            text_len = 0
            if BeautifulSoup is not None and html:
                soup = BeautifulSoup(html, "html.parser")
                # Remove script/style
                for tag in soup(["script", "style", "noscript"]):
                    tag.extract()
                text = soup.get_text(" ", strip=True)
                text_len = len(text) if text else 0
            
            html_len = len(html)
            success += 1
            
            # Log success with sizes
            log("news_body_success", 
                id=d.id, 
                url=d.url, 
                html_bytes=html_len, 
                text_chars=text_len,
                count=count,
                success=success,
                failed=failed)
            
            yield NewsBody(id=d.id, url=d.url, content_text=(text or None), content_html=html or None, fetched_at=datetime.utcnow(), published_at=d.published_at)
            
        except Exception as e:
            failed += 1
            error_msg = str(e)
            error_type = type(e).__name__
            
            log("news_body_error", 
                id=d.id, 
                url=d.url, 
                error=error_msg,
                error_type=error_type,
                count=count,
                success=success,
                failed=failed)
            
            yield NewsBody(id=d.id, url=d.url, content_text=None, content_html=None, fetched_at=datetime.utcnow(), published_at=d.published_at)
    
    # Final summary
    if count > 0:
        log("news_body_complete", total=count, success=success, failed=failed, success_rate=f"{success/count*100:.1f}%")


def sink(models: Iterable[NewsBody], partition_dt: date) -> dict:
    rows = [m.model_dump() for m in models]
    if not rows:
        return {"path": None, "count": 0}
    # Partition by published_at date to align with docs
    from datetime import datetime as _dt
    from datetime import timezone as _tz
    # Use the provided partition_dt for simplicity (ingest passes date.today), but rows contain published_at for later re-partitioning if needed
    p = upsert_parquet_by_id(load_settings().stage_dir, "news_body", partition_dt, "news_body", "id", rows)
    return {"path": str(p), "count": len(rows)}
