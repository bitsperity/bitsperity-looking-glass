"""
Topics news ingestion job.
"""
import asyncio
from datetime import datetime
from typing import Any
import httpx
from libs.satbase_core.config.settings import load_settings
from jobs.utils import get_api_client
from job_wrapper import wrap_job


@wrap_job("topics_ingest", "Per-Topic News Ingestion")
async def ingest_topics_job() -> dict[str, Any]:
    """
    Main job: iterate through watchlist symbols and ingest news for each individually.
    Returns summary with counts.
    """
    s = load_settings()
    client = get_api_client()

    # Load topics from WATCHLIST (dynamic - agents can change watchlist daily)
    try:
        wl = await _fetch_watchlist(client, s.api_url)
        topics = [it["symbol"] for it in wl]
    except Exception as e:
        return {
            "status": "error",
            "error": f"Failed to load watchlist: {e}",
            "topics_count": 0
        }

    if not topics:
        return {
            "status": "ok",
            "message": "Watchlist empty - no topics to ingest",
            "topics_count": 0,
            "articles_ingested": 0
        }

    results = {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "topics_count": len(topics),
        "successful": 0,
        "failed": 0,
        "articles_ingested": 0,
        "topics": []
    }

    for topic_name in topics:
        try:
            result = await _ingest_topic(client, topic_name)
            results["successful"] += 1
            results["articles_ingested"] += result.get("articles_count", 0)
            results["topics"].append({
                "name": topic_name,
                "status": "ok",
                "articles_count": result.get("articles_count", 0)
            })
        except Exception as e:
            results["failed"] += 1
            results["topics"].append({
                "name": topic_name,
                "status": "error",
                "error": str(e)
            })

    return results


async def _fetch_watchlist(client: httpx.AsyncClient, api_url: str) -> list[dict[str, Any]]:
    """Fetch active topics from watchlist API."""
    # Use correct endpoint: /v1/watchlist/items with type=topic filter
    r = await client.get(
        f"{api_url}/v1/watchlist/items",
        params={"type": "topic", "active_now": "true", "enabled": "true"},
        timeout=10.0
    )
    r.raise_for_status()
    data = r.json() or {}
    items = data.get("items", [])
    # Extract 'key' field (which is the topic name) and normalize
    out = []
    for it in items:
        key = it.get("key", "").strip().upper()
        if key:
            out.append({"symbol": key})
    return out


async def _ingest_topic(client: httpx.AsyncClient, topic: str, max_retries: int = 3) -> dict[str, Any]:
    """
    Ingest news for a single topic.
    
    Strategy: Since Mediastack only supports date-based queries (not hour-based),
    and this job runs hourly, we fetch only today's news to minimize API call waste.
    Articles are deduplicated by URL in the database, so duplicates are harmless.
    """
    s = load_settings()
    api_url = f"{s.api_url}/v1/ingest/news"
    
    # Fetch only today's news (since job runs hourly, this minimizes overlap)
    # Mediastack uses date format YYYY-MM-DD, so we can't do hour-based queries
    from datetime import date
    today = date.today().isoformat()
    
    payload = {"query": topic, "topic": topic, "from": today, "to": today}
    attempt = 0
    last_error = None

    while attempt < max_retries:
        try:
            response = await client.post(api_url, json=payload, timeout=30.0)
            if response.status_code == 202:
                data = response.json(); job_id = data.get("job_id")
                return await _poll_job(client, f"{s.api_url}/v1/ingest/jobs/{job_id}")
            elif response.status_code >= 400:
                raise Exception(f"API error: {response.status_code}")
            else:
                data = response.json(); return {"articles_count": data.get("result", {}).get("mediastack", {}).get("count", 0)}
        except Exception as e:
            last_error = e; attempt += 1
            if attempt < max_retries:
                await asyncio.sleep(2 ** attempt)
    raise last_error or Exception(f"Failed to ingest topic '{topic}' after {max_retries} attempts")


async def _poll_job(client: httpx.AsyncClient, job_url: str, timeout_seconds: int = 120) -> dict[str, Any]:
    start = datetime.utcnow(); polls = 0
    while (datetime.utcnow() - start).total_seconds() < timeout_seconds:
        try:
            r = await client.get(job_url, timeout=10.0)
            if r.status_code == 200:
                data = r.json(); status = data.get("status")
                if status == "done":
                    count = 0
                    for source_result in (data.get("result", {}) or {}).values():
                        if isinstance(source_result, dict):
                            count += source_result.get("count", 0)
                    return {"articles_count": count}
                if status == "error":
                    raise Exception(data.get("error", "Job failed"))
                polls += 1; await asyncio.sleep(2 + polls * 0.5)
        except Exception:
            await asyncio.sleep(3)
    raise Exception("Job poll timeout")
