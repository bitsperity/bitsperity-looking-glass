"""
Topic analytics and management endpoints for Satbase.
Provides insights into topic coverage, frequency, and trends.
"""
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any
import polars as pl
import json
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import JSONResponse
from libs.satbase_core.config.settings import load_settings
from libs.satbase_core.storage.stage import scan_parquet_glob
from collections import defaultdict

router = APIRouter()


@router.get("/news/topics/all")
def get_all_topics(from_: str | None = Query(None, alias="from"), to: str | None = None):
    """
    Get all topics mentioned in articles, with global counts.
    
    Returns:
    - All topics from articles (extracted from topics field)
    - Count of articles per topic
    - Topics are deduplicated across all articles
    """
    s = load_settings()
    
    # Default to last 365 days
    if not to:
        to = date.today().isoformat()
    if not from_:
        from_ = (date.today() - timedelta(days=365)).isoformat()
    
    dfrom = date.fromisoformat(from_)
    dto = date.fromisoformat(to)
    
    topic_counts = defaultdict(int)
    
    # Scan both news sources
    for source in ["gdelt", "news_rss"]:
        try:
            lf = scan_parquet_glob(s.stage_dir, source, "news_docs", dfrom, dto)
            df = lf.collect()
            
            if df.height == 0:
                continue
            
            # Ensure topics column exists and is list
            if "topics" in df.columns:
                for row in df.to_dicts():
                    topics_list = row.get("topics") or []
                    if isinstance(topics_list, list):
                        for topic in topics_list:
                            if topic:
                                topic_counts[topic] += 1
        except Exception:
            continue
    
    # Sort by count descending
    sorted_topics = sorted(topic_counts.items(), key=lambda x: x[1], reverse=True)
    
    return {
        "period": {"from": from_, "to": to},
        "topics": [
            {"name": topic, "count": count}
            for topic, count in sorted_topics
        ],
        "total_unique_topics": len(topic_counts),
        "total_articles_with_topics": sum(topic_counts.values())
    }


@router.get("/news/topics/stats")
def get_topic_stats(
    from_: str | None = Query(None, alias="from"),
    to: str | None = None,
    granularity: str = Query("month", description="'month' or 'year'")
):
    """
    Get time-series counts of articles per topic.
    
    Returns:
    - Topic counts grouped by time period (month or year)
    - Useful for trending and pattern analysis
    """
    s = load_settings()
    
    # Default to last 365 days
    if not to:
        to = date.today().isoformat()
    if not from_:
        from_ = (date.today() - timedelta(days=365)).isoformat()
    
    dfrom = date.fromisoformat(from_)
    dto = date.fromisoformat(to)
    
    # Collect all articles with topics and dates
    period_topic_counts = defaultdict(lambda: defaultdict(int))
    all_periods = set()
    
    for source in ["gdelt", "news_rss"]:
        try:
            lf = scan_parquet_glob(s.stage_dir, source, "news_docs", dfrom, dto)
            df = lf.collect()
            
            if df.height == 0:
                continue
            
            if "topics" in df.columns and "published_at" in df.columns:
                # Normalize published_at to string
                df = df.with_columns(pl.col("published_at").cast(pl.Utf8))
                
                # Extract period from published_at
                if granularity == "year":
                    df = df.with_columns(pl.col("published_at").str.slice(0, 4).alias("period"))
                else:  # month
                    df = df.with_columns(pl.col("published_at").str.slice(0, 7).alias("period"))
                
                for row in df.to_dicts():
                    period = row.get("period")
                    topics_list = row.get("topics") or []
                    
                    if period and isinstance(topics_list, list):
                        all_periods.add(period)
                        for topic in topics_list:
                            if topic:
                                period_topic_counts[period][topic] += 1
        except Exception:
            continue
    
    # Sort periods
    periods = sorted(list(all_periods))
    
    # Collect all unique topics
    all_topics = set()
    for period_dict in period_topic_counts.values():
        all_topics.update(period_dict.keys())
    all_topics = sorted(list(all_topics))
    
    # Build response: time series format
    data = []
    for period in periods:
        for topic in all_topics:
            count = period_topic_counts[period].get(topic, 0)
            data.append({
                "period": period,
                "topic": topic,
                "count": count
            })
    
    return {
        "period": {"from": from_, "to": to},
        "granularity": granularity,
        "topics": all_topics,
        "periods": periods,
        "data": data
    }


@router.get("/news/topics/coverage")
def get_topic_coverage(
    topics: str = Query(..., description="Comma-separated topic names (e.g., 'AI,semiconductor')"),
    from_: str | None = Query(None, alias="from"),
    to: str | None = None,
    granularity: str = Query("month", description="'month' or 'year'"),
    format: str = Query("flat", description="'flat' or 'matrix'")
):
    """
    Get heatmap-compatible topic coverage data.
    
    Similar to news_heatmap but works with actual topics field instead of text matching.
    Returns counts of articles per topic per time period.
    """
    s = load_settings()
    
    # Parse topics
    topic_list = [t.strip() for t in topics.split(',') if t.strip()]
    if not topic_list:
        return {"error": "No topics provided", "data": []}
    
    # Default to last 365 days
    if not to:
        to = date.today().isoformat()
    if not from_:
        from_ = (date.today() - timedelta(days=365)).isoformat()
    
    dfrom = date.fromisoformat(from_)
    dto = date.fromisoformat(to)
    
    # Collect counts
    period_topic_counts = defaultdict(lambda: defaultdict(int))
    all_periods = set()
    
    for source in ["gdelt", "news_rss"]:
        try:
            lf = scan_parquet_glob(s.stage_dir, source, "news_docs", dfrom, dto)
            df = lf.collect()
            
            if df.height == 0:
                continue
            
            if "topics" in df.columns and "published_at" in df.columns:
                # Normalize published_at
                df = df.with_columns(pl.col("published_at").cast(pl.Utf8))
                
                # Extract period
                if granularity == "year":
                    df = df.with_columns(pl.col("published_at").str.slice(0, 4).alias("period"))
                else:  # month
                    df = df.with_columns(pl.col("published_at").str.slice(0, 7).alias("period"))
                
                for row in df.to_dicts():
                    period = row.get("period")
                    topics_list = row.get("topics") or []
                    
                    if period and isinstance(topics_list, list):
                        all_periods.add(period)
                        for topic in topics_list:
                            if topic in topic_list:
                                period_topic_counts[period][topic] += 1
        except Exception:
            continue
    
    periods = sorted(list(all_periods))
    
    # Build response
    if format == "matrix":
        # Matrix format
        matrix = []
        for period in periods:
            row = [period_topic_counts[period].get(topic, 0) for topic in topic_list]
            matrix.append(row)
        
        return {
            "from": from_,
            "to": to,
            "granularity": granularity,
            "topics": topic_list,
            "periods": periods,
            "matrix": matrix
        }
    else:
        # Flat format
        data = []
        for period in periods:
            for topic in topic_list:
                data.append({
                    "period": period,
                    "topic": topic,
                    "count": period_topic_counts[period].get(topic, 0)
                })
        
        return {
            "from": from_,
            "to": to,
            "granularity": granularity,
            "data": data,
            "topics": topic_list,
            "periods": periods
        }


@router.post("/news/topics/add")
def add_topic(body: dict[str, Any]):
    """
    Add a new topic to the configured topics list.
    
    Request body:
    - symbol: topic name (e.g., "AI", "semiconductor")
    - expires_at: optional expiration date (defaults to 1 year from now)
    
    Returns:
    - success: bool
    - topic: added topic object
    - error: error message if failed
    """
    s = load_settings()
    topic_name = body.get("symbol", "").strip().upper()
    
    if not topic_name:
        raise HTTPException(status_code=400, detail="Topic name (symbol) is required")
    
    # Load topics file
    topics_file = Path(s.stage_dir).parent / "control" / "topics.json"
    topics_file.parent.mkdir(parents=True, exist_ok=True)
    
    try:
        if topics_file.exists():
            with open(topics_file, "r") as f:
                data = json.load(f)
                topics_list = data.get("topics", [])
        else:
            topics_list = []
            data = {"topics": topics_list}
        
        # Check if topic already exists
        if any(t.get("symbol") == topic_name for t in topics_list):
            raise HTTPException(status_code=409, detail=f"Topic '{topic_name}' already exists")
        
        # Add new topic
        today = date.today().isoformat()
        expires_at = body.get("expires_at", (date.today() + timedelta(days=365)).isoformat())
        
        new_topic = {
            "symbol": topic_name,
            "added_at": today,
            "expires_at": expires_at
        }
        
        topics_list.append(new_topic)
        
        # Save to file
        with open(topics_file, "w") as f:
            json.dump({"topics": topics_list}, f, indent=2)
        
        return {
            "success": True,
            "topic": new_topic,
            "total_topics": len(topics_list)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add topic: {str(e)}")


@router.delete("/news/topics/{topic_name}")
def delete_topic(topic_name: str):
    """
    Remove a topic from the configured topics list.
    
    Note: This does NOT delete articles with this topic;
    it only removes it from the scheduled ingestion list.
    
    Returns:
    - success: bool
    - topic_removed: topic name
    - remaining_count: number of topics left
    """
    topic_name = topic_name.strip().upper()
    
    s = load_settings()
    topics_file = Path(s.stage_dir).parent / "control" / "topics.json"
    
    if not topics_file.exists():
        raise HTTPException(status_code=404, detail="Topics file not found")
    
    try:
        with open(topics_file, "r") as f:
            data = json.load(f)
            topics_list = data.get("topics", [])
        
        # Find and remove topic
        original_count = len(topics_list)
        topics_list = [t for t in topics_list if t.get("symbol") != topic_name]
        
        if len(topics_list) == original_count:
            raise HTTPException(status_code=404, detail=f"Topic '{topic_name}' not found")
        
        # Save to file
        with open(topics_file, "w") as f:
            json.dump({"topics": topics_list}, f, indent=2)
        
        return {
            "success": True,
            "topic_removed": topic_name,
            "remaining_count": len(topics_list)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete topic: {str(e)}")
