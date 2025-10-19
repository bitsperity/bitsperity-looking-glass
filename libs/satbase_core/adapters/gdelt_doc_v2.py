from __future__ import annotations

from datetime import datetime, timedelta, date
from typing import Any, Iterable, List

from ..models.news import NewsDoc
from urllib.parse import quote_plus
from ..utils.hashing import sha1_hex
from ..config.settings import load_settings
from .http import get_json, default_headers
from ..storage.stage import write_parquet
from ..utils.logging import log


BASE = "https://api.gdeltproject.org/api/v2/doc/doc"


def _normalize(rec: dict[str, Any]) -> NewsDoc | None:
    url = rec.get("url") or rec.get("DocumentIdentifier")
    if not url:
        return None
    # GDELT liefert oft yyyymmddhhmmss in fields wie "DATE"/"seendate"
    ts = rec.get("seendate") or rec.get("DATE") or rec.get("timestamp")
    try:
        published_at = datetime.strptime(ts, "%Y%m%d%H%M%S") if ts else datetime.utcnow()
    except Exception:
        published_at = datetime.utcnow()
    nid = sha1_hex(f"{url}|{published_at.isoformat()}")
    return NewsDoc(
        id=nid,
        source="gdelt",
        title=rec.get("title") or rec.get("DocumentTitle") or "",
        text=rec.get("excerpt") or rec.get("snippet") or rec.get("DocumentTone") or "",
        url=url,
        published_at=published_at,
        tickers=None,
        regions=None,
        themes=None,
    )


def fetch(params: dict[str, Any]) -> List[dict]:
    # Klammern und URL-encoding für zuverlässigere Server-Seite-Queries
    raw_q = params.get("query", "")
    q = f"({raw_q})" if raw_q else ""
    start = params.get("startdatetime")
    end = params.get("enddatetime")
    window_hours = int(params.get("window_hours", 1))
    s = load_settings()

    # wenn keine Start/Ende übergeben: letzte 24h in 1h Fenstern
    now = datetime.utcnow()
    if not start or not end:
        # Für schnelle Debug-Runden kleinere Spanne
        end_dt = now
        start_dt = now - timedelta(hours=3)
    else:
        start_dt = datetime.strptime(start, "%Y%m%d%H%M%S")
        end_dt = datetime.strptime(end, "%Y%m%d%H%M%S")

    out: List[dict] = []
    cur = start_dt
    while cur < end_dt:
        nxt = min(cur + timedelta(hours=window_hours), end_dt)
        try:
            data = get_json(
                BASE,
                params={
                    "query": q,
                    "startdatetime": cur.strftime("%Y%m%d%H%M%S"),
                    "enddatetime": nxt.strftime("%Y%m%d%H%M%S"),
                    "format": "json",
                    "maxrecords": 250,
                },
                headers=default_headers(s.user_agent_email),
                timeout=s.http_timeout,
            )
            docs = data.get("articles", []) or data.get("documents", []) or []
            out.extend(docs)
            log("gdelt_window", start=cur.strftime("%Y-%m-%dT%H:%M:%SZ"), end=nxt.strftime("%Y-%m-%dT%H:%M:%SZ"), hits=len(docs))
        except Exception:
            # Fenster überspringen, weiter
            log("gdelt_window_error", start=cur.strftime("%Y-%m-%dT%H:%M:%SZ"), end=nxt.strftime("%Y-%m-%dT%H:%M:%SZ"))
        cur = nxt
    log("gdelt_summary", windows=(((end_dt - start_dt).total_seconds()) // (window_hours * 3600) + 1), total=len(out))
    return out


def normalize(raw: List[dict]) -> Iterable[NewsDoc]:
    for r in raw:
        doc = _normalize(r)
        if doc:
            yield doc


def sink(models: Iterable[NewsDoc], partition_dt: date) -> dict:
    rows = [m.model_dump() for m in models]
    if not rows:
        return {"path": None, "count": 0}
    p = write_parquet(load_settings().stage_dir, "gdelt", partition_dt, "news_docs", rows)
    return {"path": str(p), "count": len(rows)}

