from __future__ import annotations

from datetime import datetime, timezone, date
from typing import Any, Iterable

import feedparser

from ..models.news import NewsDoc
from urllib.parse import quote_plus
from ..utils.hashing import sha1_hex
from ..config.settings import load_settings
from ..storage.stage import write_parquet
from ..resolver.watcher import load_watchlist_symbols, match_text_to_symbols


BASE = "https://news.google.com/rss/search"


def fetch(params: dict[str, Any]) -> Iterable[dict]:
    q = params.get("query", "semiconductor OR chip")
    hl = params.get("hl", "en-US")
    gl = params.get("gl", "US")
    ceid = params.get("ceid", "US:en")
    # Google News akzeptiert + als OR; vermeide unencoded spaces
    q_enc = quote_plus(q, safe="")
    url = f"{BASE}?q={q_enc}&hl={hl}&gl={gl}&ceid={ceid}"
    feed = feedparser.parse(url)
    return feed.entries or []


def normalize(entries: Iterable[dict], topic: str | None = None) -> Iterable[NewsDoc]:
    for raw in entries:
        title = raw.get("title", "")
        link = raw.get("link", "")
        published_parsed = raw.get("published_parsed")
        if published_parsed:
            # Use naive datetime (no timezone) for consistency with other adapters
            published_at = datetime(*published_parsed[:6])
        else:
            # Use UTC but without timezone info
            published_at = datetime.utcnow()
        # ID based only on URL for stable cross-run matching with bodies
        nid = sha1_hex(link)
        
        # naive mapping: watchlist symbols in title/text
        tickers = []
        try:
            symbols = load_watchlist_symbols()
            m = match_text_to_symbols(f"{title} {raw.get('summary', '')}", symbols)
            if m:
                tickers = m
        except Exception:
            pass
        
        # Initialize topics from parameter if provided
        topics = [topic] if topic else []
        
        doc = NewsDoc(
            id=nid,
            source="google_rss",
            title=title,
            text=raw.get("summary", ""),
            url=link,
            published_at=published_at,
            tickers=tickers,  # Always list, never None
            regions=[],  # Always list, never None
            themes=[],  # Always list, never None
            topics=topics,
        )
        yield doc


def sink(models: Iterable[NewsDoc], partition_dt: date, topic: str | None = None) -> dict:
    rows = [m.model_dump() for m in models]
    if not rows:
        return {"path": None, "count": 0}
    
    # Ensure all rows have topic (in case normalize wasn't called with topic param)
    if topic:
        for row in rows:
            if "topics" not in row:
                row["topics"] = []
            if isinstance(row["topics"], list) and topic not in row["topics"]:
                row["topics"].append(topic)
    
    p = write_parquet(load_settings().stage_dir, "news_rss", partition_dt, "news_docs", rows)
    return {"path": str(p), "count": len(rows)}

