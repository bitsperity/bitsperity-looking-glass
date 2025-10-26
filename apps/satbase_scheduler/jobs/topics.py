"""
Per-topic news ingestion job for Satbase scheduler.

Fetches news for each configured topic individually, ensuring proper topic annotation.
Implements throttling, logging, and retry logic.
"""
import asyncio
import json
from datetime import datetime
from pathlib import Path
from typing import Any
import httpx
from libs.satbase_core.config.settings import load_settings
from .utils import get_api_client


async def ingest_topics_job() -> dict[str, Any]:
    """
    Main job: iterate through topics, ingest news for each individually.
    
    Returns:
    - Summary: total topics, successful, failed, articles ingested
    """
    s = load_settings()
    
    # Load topics from control file
    topics_file = Path(s.stage_dir).parent / "control" / "topics.json"
    topics = []
    
    try:
        if topics_file.exists():
            with open(topics_file, "r") as f:
                data = json.load(f)
                topics = data.get("topics", [])
    except Exception as e:
        return {
            "status": "error",
            "error": f"Failed to load topics: {str(e)}",
            "topics_count": 0
        }
    
    if not topics:
        return {
            "status": "ok",
            "error": "No topics configured",
            "topics_count": 0
        }
    
    # Ingest news for each topic
    results = {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "topics_count": len(topics),
        "successful": 0,
        "failed": 0,
        "articles_ingested": 0,
        "topics": []
    }
    
    client = get_api_client()
    
    for topic_config in topics:
        topic_name = topic_config.get("symbol") if isinstance(topic_config, dict) else topic_config
        if not topic_name:
            continue
        
        try:
            # Ingest news for this specific topic
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


async def _ingest_topic(client: httpx.AsyncClient, topic: str, max_retries: int = 3) -> dict[str, Any]:
    """
    Ingest news for a single topic with retry logic.
    
    Args:
        client: httpx async client
        topic: Topic name
        max_retries: Max retry attempts on failure
    
    Returns:
        Result dict with articles_count
    """
    s = load_settings()
    api_url = f"{s.api_url}/v1/ingest/news"
    
    payload = {
        "query": topic,
        "topic": topic,  # Tag this ingestion run with the topic
        "hours": 24  # Last 24 hours by default
    }
    
    attempt = 0
    last_error = None
    
    while attempt < max_retries:
        try:
            response = await client.post(api_url, json=payload, timeout=30.0)
            
            if response.status_code == 202:
                # Job accepted
                data = response.json()
                job_id = data.get("job_id")
                
                # Poll for job completion (with timeout)
                return await _poll_job(client, job_id, topic)
            
            elif response.status_code >= 400:
                raise Exception(f"API error: {response.status_code}")
            
            else:
                data = response.json()
                return {"articles_count": data.get("result", {}).get("gdelt_doc_v2", {}).get("count", 0)}
        
        except Exception as e:
            last_error = e
            attempt += 1
            if attempt < max_retries:
                await asyncio.sleep(2 ** attempt)  # Exponential backoff
    
    raise last_error or Exception(f"Failed to ingest topic '{topic}' after {max_retries} attempts")


async def _poll_job(client: httpx.AsyncClient, job_id: str, topic: str, timeout_seconds: int = 120) -> dict[str, Any]:
    """
    Poll a background job until completion.
    
    Args:
        client: httpx async client
        job_id: Job ID to poll
        topic: Topic name for logging
        timeout_seconds: Max time to wait
    
    Returns:
        Result with articles count
    """
    s = load_settings()
    api_url = f"{s.api_url}/v1/ingest/jobs/{job_id}"
    
    start_time = datetime.utcnow()
    poll_count = 0
    
    while (datetime.utcnow() - start_time).total_seconds() < timeout_seconds:
        try:
            response = await client.get(api_url, timeout=10.0)
            
            if response.status_code == 200:
                data = response.json()
                status = data.get("status")
                
                if status == "done":
                    result = data.get("result", {})
                    # Sum articles from all sources
                    count = 0
                    for source_result in result.values():
                        if isinstance(source_result, dict):
                            count += source_result.get("count", 0)
                    return {"articles_count": count}
                
                elif status == "error":
                    raise Exception(data.get("error", "Job failed"))
                
                # Still running, wait a bit
                poll_count += 1
                await asyncio.sleep(2 + (poll_count * 0.5))  # Gradual backoff
        
        except Exception as e:
            # Retry on network errors
            await asyncio.sleep(3)
    
    raise Exception(f"Job '{job_id}' for topic '{topic}' timed out after {timeout_seconds}s")


