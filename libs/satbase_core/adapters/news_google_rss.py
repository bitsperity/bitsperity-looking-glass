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
    Fetch RSS metadata + text content in one pass.
    Only yields NewsDoc if text content successfully fetched.
    """
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
        
        # UNIFIED FETCH: Attempt to fetch text content inline
        text_content = fetch_text_with_retry(link, max_retries=2, timeout=15)
        
        # Only yield if text successfully extracted
        if text_content and len(text_content) > 100:
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
            # Attach text_content for body storage
            doc.text_content = text_content  # type: ignore
            yield doc
        else:
            # Skip entirely - broken URL or no text
            log("news_fetch_skipped", id=nid, url=link, reason="no_text")


def sink(models: Iterable[NewsDoc], partition_dt: date, topic: str | None = None) -> dict:
    """
    DUAL SINK: Store metadata + bodies separately.
    
    news_docs: metadata only (id, title, url, tickers, topics)
    news_body: full text content (id, url, content_text, fetched_at)
    """
    news_rows = []
    body_rows = []
    
    for doc in models:
        # Extract text_content for body table (attached by normalize)
        text_content = getattr(doc, 'text_content', None)
        
        if text_content:
            # Store metadata (exclude text_content)
            doc_dict = doc.model_dump()
            doc_dict.pop('text_content', None)  # Remove if present
            
            # Ensure topics is set
            if topic and (not doc_dict.get("topics") or topic not in doc_dict["topics"]):
                if "topics" not in doc_dict:
                    doc_dict["topics"] = []
                if isinstance(doc_dict["topics"], list) and topic not in doc_dict["topics"]:
                    doc_dict["topics"].append(topic)
            
            news_rows.append(doc_dict)
            
            # Store body separately
            body_rows.append({
                'id': doc.id,
                'url': doc.url,
                'content_text': text_content,
                'fetched_at': datetime.utcnow(),
                'published_at': doc.published_at
            })
    
    if not news_rows:
        return {"path": None, "body_path": None, "count": 0, "bodies": 0}
    
    # Write news_docs (metadata)
    s = load_settings()
    news_path = write_parquet(s.stage_dir, "news_rss", partition_dt, "news_docs", news_rows)
    
    # Write news_body (separate source for queryability)
    body_path = upsert_parquet_by_id(s.stage_dir, "news_body", partition_dt, "news_body", "id", body_rows)
    
    log("news_sink_complete", news_count=len(news_rows), bodies_count=len(body_rows), 
        news_path=str(news_path), body_path=str(body_path))
    
    return {
        "path": str(news_path),
        "body_path": str(body_path),
        "count": len(news_rows),
        "bodies": len(body_rows)
    }

