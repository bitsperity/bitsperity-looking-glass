from __future__ import annotations

from datetime import datetime, timedelta, date
from typing import Any, Iterable, List

from ..models.news import NewsDoc
from ..utils.hashing import sha1_hex
from ..config.settings import load_settings
from .http import get_json, default_headers
from ..storage.stage import write_parquet, upsert_parquet_by_id
from ..utils.logging import log
from ..resolver.watcher import load_watchlist_symbols, match_text_to_symbols


BASE = "https://api.mediastack.com/v1/news"


def _normalize(rec: dict[str, Any], topic: str | None = None) -> NewsDoc | None:
    """Normalize a Mediastack article to NewsDoc format"""
    url = rec.get("url")
    if not url:
        return None
    
    # Mediastack provides published_at in ISO format: "2020-08-05T05:47:24+00:00"
    ts_str = rec.get("published_at")
    try:
        if ts_str:
            # Parse ISO format
            published_at = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
        else:
            published_at = datetime.utcnow()
    except Exception:
        published_at = datetime.utcnow()
    
    # ID based only on URL for stable cross-run matching with bodies
    nid = sha1_hex(url)
    
    # Extract tickers from title + description
    tickers = []
    try:
        symbols = load_watchlist_symbols()
        title_text = f"{rec.get('title', '')} {rec.get('description', '')}"
        m = match_text_to_symbols(title_text, symbols)
        if m:
            tickers = m
    except Exception:
        pass
    
    # Initialize topics from parameter if provided
    topics = [topic] if topic else []
    
    doc = NewsDoc(
        id=nid,
        source="mediastack",
        title=rec.get("title") or "",
        text=rec.get("description") or "",
        url=url,
        published_at=published_at,
        tickers=tickers,  # Always list, never None
        regions=[],  # Always list, never None
        themes=[],  # Always list, never None
        topics=topics,
    )
    return doc


def fetch(params: dict[str, Any]) -> Iterable[dict]:
    """
    Fetch news from Mediastack API.
    
    Mediastack supports historical news on Standard plan and higher.
    Parameters:
    - query: search keywords
    - date_from: YYYY-MM-DD
    - date_to: YYYY-MM-DD
    - limit: max articles per request (default 100, max 100)
    """
    import os
    s = load_settings()
    api_key = os.getenv("MEDIASTACK_API_KEY")
    if not api_key:
        log("mediastack_error", error="MEDIASTACK_API_KEY not configured")
        return []
    
    query = params.get("query", "")
    date_from = params.get("date_from")  # YYYY-MM-DD
    date_to = params.get("date_to")      # YYYY-MM-DD
    limit = int(params.get("limit", 100))
    
    if not query:
        return []
    
    # Mediastack date format is YYYY-MM-DD
    if date_from and date_to:
        date_range = f"{date_from},{date_to}"
    else:
        # Default: last 7 days
        end_dt = datetime.utcnow().date()
        start_dt = end_dt - timedelta(days=7)
        date_range = f"{start_dt.isoformat()},{end_dt.isoformat()}"
    
    params_api = {
        "access_key": api_key,
        "keywords": query,
        "date": date_range,
        "limit": min(limit, 100),
        "sort": "published_desc",
    }
    
    try:
        data = get_json(
            BASE,
            params=params_api,
            headers=default_headers(s.user_agent_email),
            timeout=s.http_timeout,
        )
        
        articles = data.get("data", [])
        log("mediastack_fetch",
            query=query[:50],
            date_range=date_range,
            articles=len(articles))
        
        return articles
    except Exception as e:
        log("mediastack_fetch_error",
            query=query[:50],
            error=str(e)[:100])
        return []


def normalize(raw: List[dict], topic: str | None = None) -> Iterable[NewsDoc]:
    """
    Normalize Mediastack articles to NewsDoc objects.
    """
    count = 0
    for article_raw in raw:
        doc = _normalize(article_raw, topic)
        if doc:
            yield doc
            count += 1
    
    log("mediastack_normalize", count=count, topic=topic)


def sink(models: Iterable[NewsDoc], partition_dt: date, topic: str | None = None) -> dict:
    """
    Store Mediastack articles to Parquet.
    
    Dual sink pattern:
    - news_docs: metadata only
    - news_body: full text content (if available)
    """
    news_rows = []
    body_rows = []
    
    for doc in models:
        text_content = getattr(doc, 'text_content', None)
        
        # Always store metadata row
        doc_dict = doc.model_dump()
        doc_dict.pop('text_content', None)
        
        # Ensure topic is set
        if topic and (not doc_dict.get("topics") or topic not in doc_dict["topics"]):
            if "topics" not in doc_dict:
                doc_dict["topics"] = []
            if isinstance(doc_dict["topics"], list) and topic not in doc_dict["topics"]:
                doc_dict["topics"].append(topic)
        
        news_rows.append(doc_dict)
        
        if text_content:
            body_rows.append({
                'id': doc.id,
                'url': doc.url,
                'content_text': text_content,
                'fetched_at': datetime.utcnow(),
                'published_at': doc.published_at
            })
    
    if not news_rows:
        return {"path": None, "body_path": None, "count": 0, "bodies": 0, "status": "empty"}
    
    # Write news_docs (metadata)
    try:
        upsert_parquet_by_id(
            load_settings().stage_dir,
            "mediastack",
            partition_dt,
            "news_docs",
            "id",
            news_rows
        )
    except Exception as e:
        log("mediastack_sink_docs_error", error=str(e)[:100])
        return {"path": None, "count": 0, "status": "error"}
    
    # Write news_body (full content)
    if body_rows:
        try:
            upsert_parquet_by_id(
                load_settings().stage_dir,
                "news_body",
                partition_dt,
                "news_body",
                "id",
                body_rows
            )
        except Exception as e:
            log("mediastack_sink_body_error", error=str(e)[:100])
    
    return {
        "path": f"mediastack/{partition_dt.year}/{partition_dt.month:02d}/{partition_dt.day:02d}",
        "body_path": f"news_body/{partition_dt.year}/{partition_dt.month:02d}/{partition_dt.day:02d}",
        "count": len(news_rows),
        "bodies": len(body_rows),
        "status": "success"
    }
