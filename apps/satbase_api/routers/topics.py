"""
Topic analytics and management endpoints for Satbase.
Provides insights into topic coverage, frequency, and trends.
"""
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any
import polars as pl
from fastapi import APIRouter, Query
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
