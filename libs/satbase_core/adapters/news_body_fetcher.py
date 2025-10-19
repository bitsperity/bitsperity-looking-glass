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
    for d in docs:
        try:
            html = get_text(d.url, headers=default_headers(s.user_agent_email), timeout=s.http_timeout)
            if BeautifulSoup is not None and html:
                soup = BeautifulSoup(html, "html.parser")
                # Remove script/style
                for tag in soup(["script", "style", "noscript"]):
                    tag.extract()
                text = soup.get_text(" ")
            else:
                text = None
            yield NewsBody(id=d.id, url=d.url, content_text=(text or None), content_html=html or None, fetched_at=datetime.utcnow(), published_at=d.published_at)
        except Exception as e:
            log("news_body_error", id=d.id, url=d.url)
            yield NewsBody(id=d.id, url=d.url, content_text=None, content_html=None, fetched_at=datetime.utcnow(), published_at=d.published_at)


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
