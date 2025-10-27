from __future__ import annotations

from datetime import datetime, timedelta, date
from typing import Any, Iterable, List

from ..models.news import NewsDoc
from ..utils.hashing import sha1_hex
from ..config.settings import load_settings
from .http import get_json, default_headers, fetch_text_with_retry
from ..utils.logging import log
from ..resolver.watcher import load_watchlist_symbols, match_text_to_symbols


BASE = "https://api.mediastack.com/v1/news"


def _normalize(rec: dict[str, Any], topic: str | None = None) -> NewsDoc | None:
    """Normalize a Mediastack article to NewsDoc format - store ALL fields"""
    url = rec.get("url")
    if not url:
        return None
    
    # Mediastack provides published_at in ISO format: "2020-08-05T05:47:24+00:00"
    ts_str = rec.get("published_at")
    try:
        if ts_str:
            published_at = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
        else:
            published_at = datetime.utcnow()
    except Exception:
        published_at = datetime.utcnow()
    
    # ID based only on URL for stable cross-run matching
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
    
    # Extract ALL Mediastack fields
    doc = NewsDoc(
        id=nid,
        source="mediastack",
        url=url,
        title=rec.get("title") or "",
        description=rec.get("description"),
        body_text="",  # Will be filled by body crawler in sink()
        published_at=published_at,
        tickers=tickers,
        topics=topics,
        author=rec.get("author"),
        image=rec.get("image"),
        category=rec.get("category"),
        language=rec.get("language"),
        country=rec.get("country"),
        source_name=rec.get("source"),
    )
    return doc


def fetch(params: dict[str, Any]) -> Iterable[dict]:
    """
    Fetch news from Mediastack API.
    
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
    Store articles to SQLite after attempting to fetch body text.
    
    CHANGE: Always save articles even if body fetch fails.
    The body_available flag indicates if body was successfully crawled.
    Summary is still valuable for Tesseract even without body.
    """
    from ..storage.news_db import NewsDB
    
    s = load_settings()
    db_path = s.stage_dir.parent / "news.db"
    db = NewsDB(db_path)
    
    success_count = 0  # Articles with body
    summary_only_count = 0  # Articles without body but saved
    error_count = 0
    errors = []
    
    for doc in models:
        try:
            # Crawl body text from URL
            # Skip body crawling if flagged
            skip_body = False
            try:
                skip_body = db.has_no_body_crawl(doc.id)
            except Exception:
                skip_body = False
            if not skip_body:
                body_text = fetch_text_with_retry(
                    doc.url,
                    max_retries=2,
                    timeout=20
                )
            else:
                body_text = ""
            
            # Set body text if we got it
            if body_text and len(body_text.strip()) > 100:
                doc.body_text = body_text[:1000000]  # Cap at 1MB
                body_status = "success"
                success_count += 1
            else:
                # No body, but still save with summary
                doc.body_text = ""
                body_status = "no_body"
                summary_only_count += 1
            
            # Always upsert to SQLite with topic merge
            db.upsert_article(doc, topics=doc.topics, tickers=doc.tickers)
            
            # Log to audit trail
            topics_str = ",".join(doc.topics) if doc.topics else None
            db.log_audit(
                action="ingested",
                article_id=doc.id,
                article_url=doc.url,
                topic=topics_str,
                details=f"title: {doc.title[:50]} | body: {body_status}"
            )
            
        except Exception as e:
            error_count += 1
            errors.append(str(e)[:100])
            log("mediastack_sink_error", url=doc.url[:50], error=str(e)[:100])
    
    result = {
        "count": success_count,
        "summary_only": summary_only_count,
        "errors": errors if errors else [],
        "error_count": error_count,
        "total_saved": success_count + summary_only_count,
        "storage": "sqlite"
    }
    
    if errors:
        result["error_details"] = errors[:5]
    
    log("mediastack_sink", success=success_count, summary_only=summary_only_count, errors=error_count)
    
    return result
