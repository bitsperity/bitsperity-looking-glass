from __future__ import annotations

from datetime import datetime, date
from typing import Any, Iterable

from ..models.news import NewsDoc
from ..utils.hashing import sha1_hex
from ..config.settings import load_settings
from .http import get_json, default_headers
from ..storage.stage import write_parquet


BASE = "https://api.gdeltproject.org/api/v2/doc/doc"


def _normalize_record(rec: dict[str, Any]) -> NewsDoc:
    url = rec.get("url") or ""
    pub = rec.get("seendate") or rec.get("timestamp")
    published_at = datetime.strptime(pub, "%Y%m%d%H%M%S") if isinstance(pub, str) and len(pub) == 14 else datetime.utcnow()
    nid = sha1_hex(f"{url}|{published_at.isoformat()}")
    return NewsDoc(
        id=nid,
        source="gdelt",
        title=rec.get("title") or "",
        text=rec.get("excerpt") or rec.get("snippet") or "",
        url=url,
        published_at=published_at,
        tickers=None,
        regions=None,
        themes=None,
    )


def fetch(params: dict[str, Any]) -> Iterable[dict]:
    q = params.get("query", "")
    timespan = params.get("timespan", "1d")
    s = load_settings()
    try:
        data = get_json(BASE, params={"query": q, "timespan": timespan, "format": "json", "maxrecords": 250}, headers=default_headers(s.user_agent_email), timeout=s.http_timeout)
        return data.get("articles", []) or data.get("documents", []) or []
    except Exception:
        # Fallback: empty if API format changed or rate limited
        return []


def normalize(raw: dict) -> NewsDoc:
    return _normalize_record(raw)


def sink(models: Iterable[NewsDoc], partition_dt: date) -> dict:
    rows = [m.model_dump() for m in models]
    if not rows:
        return {"path": None, "count": 0}
    p = write_parquet(load_settings().stage_dir, "gdelt", partition_dt, "news_docs", rows)
    return {"path": str(p), "count": len(rows)}

