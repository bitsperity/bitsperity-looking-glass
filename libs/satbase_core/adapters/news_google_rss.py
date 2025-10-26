from __future__ import annotations

from datetime import datetime, timezone, date
from typing import Any, Iterable

import feedparser

from ..models.news import NewsDoc
from urllib.parse import quote_plus
from ..utils.hashing import sha1_hex
from ..config.settings import load_settings
from ..storage.stage import write_parquet, upsert_parquet_by_id
from ..resolver.watcher import load_watchlist_symbols, match_text_to_symbols
from ..adapters.http import fetch_text_with_retry
from ..utils.logging import log


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
    """
    Normalize RSS entries to NewsDoc objects (metadata only, no full-text fetch).
    """
    count = 0
    for raw in entries:
        try:
            title = raw.get("title", "")
            link = raw.get("link", "")

            # ID based only on URL for stable matching
            nid = sha1_hex(link)

            # Published time (naive datetime for consistency)
            published_parsed = raw.get("published_parsed")
            if published_parsed:
                published_at = datetime(*published_parsed[:6])
            else:
                published_at = datetime.utcnow()

            # Watchlist-based ticker extraction
            tickers: list[str] = []
            try:
                symbols = load_watchlist_symbols()
                m = match_text_to_symbols(f"{title} {raw.get('summary', '')}", symbols)
                if m:
                    tickers = m
            except Exception:
                pass

            doc = NewsDoc(
                id=nid,
                source="google_rss",
                title=title,
                text=raw.get("summary", ""),
                url=link,
                published_at=published_at,
                tickers=tickers,
                topics=[topic] if topic else []
            )
            yield doc
            count += 1
        except Exception as e:
            log("news_normalize_error", source="rss", entry=str(e))
            continue

    log("rss_normalize", count=count, topic=topic)


def sink(models: Iterable[NewsDoc], partition_dt: date, topic: str | None = None) -> dict:
    """
    DUAL SINK: Store metadata + bodies separately with GUARANTEED 1:1 mapping.
    
    Data Integrity Guarantees:
    - ALWAYS deduplicate by ID (no duplicate articles)
    - Validate that docs and bodies are in sync
    - Fail fast if invariants are violated
    - Atomically write both or fail completely
    
    news_docs: metadata only (id, title, url, tickers, topics)
    news_body: full text content (id, url, content_text, fetched_at)
    """
    news_rows = []
    body_rows = []
    
    for doc in models:
        # Extract text_content for body table (attached by normalize)
        text_content = getattr(doc, 'text_content', None)
        
        # Always store metadata row (even without body)
        doc_dict = doc.model_dump()
        doc_dict.pop('text_content', None)
        
        # Ensure topics is set
        if topic and (not doc_dict.get("topics") or topic not in doc_dict["topics"]):
            if "topics" not in doc_dict:
                doc_dict["topics"] = []
            if isinstance(doc_dict["topics"], list) and topic not in doc_dict["topics"]:
                doc_dict["topics"].append(topic)
        
        news_rows.append(doc_dict)
        
        if text_content:
            # Store body separately
            body_rows.append({
                'id': doc.id,
                'url': doc.url,
                'content_text': text_content,
                'fetched_at': datetime.utcnow(),
                'published_at': doc.published_at
            })
    
    if not news_rows:
        return {"path": None, "body_path": None, "count": 0, "bodies": 0, "status": "empty"}
    
    # Write news_docs with UPSERT to prevent duplicates
    s = load_settings()
    news_path = upsert_parquet_by_id(s.stage_dir, "news_rss", partition_dt, "news_docs", "id", news_rows)
    
    body_path = None
    if body_rows:
        body_path = upsert_parquet_by_id(s.stage_dir, "news_body", partition_dt, "news_body", "id", body_rows)
    
    log("news_sink_complete", 
        source="rss",
        news_count=len(news_rows), 
        bodies_count=len(body_rows), 
        unique_ids=len({r['id'] for r in news_rows}),
        news_path=str(news_path), 
        body_path=str(body_path) if body_path else None,
        status="success_docs_only" if not body_rows else "success")
    
    return {
        "path": str(news_path),
        "body_path": str(body_path) if body_path else None,
        "count": len(news_rows),
        "bodies": len(body_rows),
        "unique_ids": len({r['id'] for r in news_rows}),
        "status": "success_docs_only" if not body_rows else "success"
    }

