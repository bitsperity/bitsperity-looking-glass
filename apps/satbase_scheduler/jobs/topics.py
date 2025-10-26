"""
Per-topic news ingestion job for Satbase scheduler.

Fetches news for each topic derived from WATCHLIST (symbols), ensuring proper topic annotation.
Implements throttling, logging, and retry logic.
"""
import asyncio
from datetime import datetime
from typing import Any
import httpx
from libs.satbase_core.config.settings import load_settings
from .utils import get_api_client


async def ingest_topics_job() -> dict[str, Any]:
    """
    Main job: iterate through watchlist symbols and ingest news for each individually.
    Returns summary with counts.
    """
    s = load_settings()

    client = get_api_client()

    # Load topics from WATCHLIST (symbols)
    try:
        wl = await _fetch_watchlist(client, s.api_url)
        topics = [it["symbol"] for it in wl]
    except Exception as e:
        return {"status": "error", "error": f"Failed to load watchlist: {e}", "topics_count": 0}

    if not topics:
        return {"status": "ok", "message": "Watchlist empty", "topics_count": 0}

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
            results["topics"].append({"name": topic_name, "status": "error", "error": str(e)})

    return results


async def _fetch_watchlist(client: httpx.AsyncClient, api_url: str) -> list[dict[str, Any]]:
    """Fetch watchlist symbols from API and return a list of items with 'symbol'."""
    r = await client.get(f"{api_url}/v1/watchlist", timeout=10.0)
    r.raise_for_status()
    data = r.json() or {}
    items = data.get("items", [])
    # normalize symbols
    out = []
    for it in items:
        sym = (it.get("symbol") or "").strip().upper()
        if sym:
            out.append({"symbol": sym})
    return out


async def _ingest_topic(client: httpx.AsyncClient, topic: str, max_retries: int = 3) -> dict[str, Any]:
    s = load_settings()
    api_url = f"{s.api_url}/v1/ingest/news"

    payload = {"query": topic, "topic": topic, "hours": 24}
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
                data = response.json(); return {"articles_count": data.get("result", {}).get("gdelt_doc_v2", {}).get("count", 0)}
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


# Hot reload test
