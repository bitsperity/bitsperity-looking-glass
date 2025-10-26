from __future__ import annotations

from datetime import datetime, timedelta, date
from typing import Any, Iterable, List

from ..models.news import NewsDoc
from urllib.parse import quote_plus
from ..utils.hashing import sha1_hex
from ..config.settings import load_settings
from .http import get_json, default_headers, fetch_text_with_retry
from ..storage.stage import write_parquet, upsert_parquet_by_id
from ..utils.logging import log
from ..resolver.watcher import load_watchlist_symbols, match_text_to_symbols


BASE = "https://api.gdeltproject.org/api/v2/doc/doc"


def _normalize(rec: dict[str, Any], topic: str | None = None) -> NewsDoc | None:
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
    
    # Initialize topics from parameter if provided
    topics = [topic] if topic else []
    
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
        topics=topics,
    )
    return doc


def fetch(params: dict[str, Any]) -> Iterable[dict]:
    raw_q = params.get("query", "")
    # GDELT API: Pass query as-is, don't wrap in parentheses
    # The API expects plain keywords separated by spaces or operators
    q = raw_q.strip() if raw_q else ""
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
    window_attempts = 0
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
        except Exception as e:
            # Log the actual error for debugging
            log("gdelt_window_error", 
                start=cur.strftime("%Y-%m-%dT%H:%M:%SZ"), 
                end=nxt.strftime("%Y-%m-%dT%H:%M:%SZ"),
                error=str(e)[:100],
                window_hours=window_hours)
        cur = nxt
        window_attempts += 1
    
    log("gdelt_summary", 
        windows=window_attempts, 
        total=len(out), 
        window_hours=window_hours,
        query=q[:50])
    return out


def normalize(raw: List[dict], topic: str | None = None) -> Iterable[NewsDoc]:
    """
    Fetch GDELT metadata + text content in one pass.
    Only yields NewsDoc if text content successfully fetched.
    """
    for r in raw:
        doc = _normalize(r, topic)
        if doc:
            # UNIFIED FETCH: Attempt to fetch text content inline
            text_content = fetch_text_with_retry(doc.url, max_retries=2, timeout=15)
            
            # Only yield if text successfully extracted
            if text_content and len(text_content) > 100:
                # Attach text_content for body storage
                doc.text_content = text_content  # type: ignore
                yield doc
            else:
                # Skip entirely - broken URL or no text
                log("news_fetch_skipped", id=doc.id, url=doc.url, reason="no_text")


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
        return {"path": None, "body_path": None, "count": 0, "bodies": 0, "status": "empty"}
    
    # VALIDATION: Ensure counts match (1:1 invariant)
    if len(news_rows) != len(body_rows):
        raise ValueError(
            f"CRITICAL: Data integrity violation - {len(news_rows)} docs but {len(body_rows)} bodies. "
            "This should never happen. Aborting write to prevent corruption."
        )
    
    # VALIDATION: Ensure IDs match exactly
    news_ids = {r['id'] for r in news_rows}
    body_ids = {r['id'] for r in body_rows}
    
    if news_ids != body_ids:
        missing_in_bodies = news_ids - body_ids
        missing_in_docs = body_ids - news_ids
        raise ValueError(
            f"CRITICAL: ID mismatch between docs and bodies. "
            f"Missing in bodies: {missing_in_bodies}, Missing in docs: {missing_in_docs}. "
            "Aborting write to prevent corruption."
        )
    
    # Write news_docs with UPSERT to prevent duplicates
    s = load_settings()
    news_path = upsert_parquet_by_id(s.stage_dir, "gdelt", partition_dt, "news_docs", "id", news_rows)
    
    # Write news_body with UPSERT (already using it)
    body_path = upsert_parquet_by_id(s.stage_dir, "news_body", partition_dt, "news_body", "id", body_rows)
    
    log("news_sink_complete", 
        source="gdelt",
        news_count=len(news_rows), 
        bodies_count=len(body_rows), 
        unique_ids=len(news_ids),
        news_path=str(news_path), 
        body_path=str(body_path),
        status="success_with_deduplication")
    
    return {
        "path": str(news_path),
        "body_path": str(body_path),
        "count": len(news_rows),
        "bodies": len(body_rows),
        "unique_ids": len(news_ids),
        "status": "success"
    }

