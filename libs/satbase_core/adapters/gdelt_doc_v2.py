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
from ..resolver.watcher import load_watchlist_symbols, match_text_to_symbols


BASE = "https://api.gdeltproject.org/api/v2/doc/doc"


def _normalize(rec: dict[str, Any]) -> NewsDoc | None:
    url = rec.get("url") or rec.get("DocumentIdentifier")
    if not url:
        return None
    # GDELT liefert ISO-Format: "20251019T124500Z" oder "yyyymmddhhmmss"
    ts = rec.get("seendate") or rec.get("DATE") or rec.get("timestamp")
    try:
        if ts:
            # Try ISO format first (with T and Z): 20251019T124500Z
            if 'T' in str(ts):
                ts_clean = str(ts).replace('T', '').replace('Z', '')
                published_at = datetime.strptime(ts_clean, "%Y%m%d%H%M%S")
            else:
                # Fallback: plain format YYYYMMDDHHMMSS
                published_at = datetime.strptime(ts, "%Y%m%d%H%M%S")
        else:
            published_at = datetime.utcnow()
    except Exception:
        published_at = datetime.utcnow()
    # ID based only on URL for stable cross-run matching with bodies
    nid = sha1_hex(url)
    # naive mapping: watchlist symbols in title/text
    tickers = []
    try:
        symbols = load_watchlist_symbols()
        m = match_text_to_symbols(f"{rec.get('title', '')} {rec.get('excerpt', '')}", symbols)
        if m:
            tickers = m
    except Exception:
        pass
    
    doc = NewsDoc(
        id=nid,
        source="gdelt",
        title=rec.get("title") or rec.get("DocumentTitle") or "",
        text=rec.get("excerpt") or rec.get("snippet") or rec.get("DocumentTone") or "",
        url=url,
        published_at=published_at,
        tickers=tickers,  # Always list, never None
        regions=[],  # Always list, never None
        themes=[],  # Always list, never None
    )
    return doc


def fetch(params: dict[str, Any]) -> List[dict]:
    # Klammern und URL-encoding für zuverlässigere Server-Seite-Queries
    raw_q = params.get("query", "")
    # GDELT requires words with dashes to be quoted: C-UAS -> "C-UAS"
    # Replace dash-words with quoted versions
    import re
    if raw_q:
        # Find all words with dashes that aren't already quoted
        raw_q = re.sub(r'(?<!")(\b[\w]+-[\w-]+\b)(?!")', r'"\1"', raw_q)
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
                    "mode": "artlist",
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

