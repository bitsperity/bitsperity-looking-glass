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


def normalize(entries: Iterable[dict]) -> Iterable[NewsDoc]:
    for raw in entries:
        title = raw.get("title", "")
        link = raw.get("link", "")
        published_parsed = raw.get("published_parsed")
        if published_parsed:
            published_at = datetime(*published_parsed[:6], tzinfo=timezone.utc)
        else:
            published_at = datetime.now(tz=timezone.utc)
        nid = sha1_hex(f"{link}|{published_at.isoformat()}")
        doc = NewsDoc(
            id=nid,
            source="google_rss",
            title=title,
            text=raw.get("summary", ""),
            url=link,
            published_at=published_at,
            tickers=None,
            regions=None,
            themes=None,
        )
        try:
            symbols = load_watchlist_symbols()
            m = match_text_to_symbols(f"{doc.title} {doc.text}", symbols)
            if m:
                doc.tickers = m
        except Exception:
            pass
        yield doc


def sink(models: Iterable[NewsDoc], partition_dt: date) -> dict:
    rows = [m.model_dump() for m in models]
    if not rows:
        return {"path": None, "count": 0}
    p = write_parquet(load_settings().stage_dir, "news_rss", partition_dt, "news_docs", rows)
    return {"path": str(p), "count": len(rows)}

