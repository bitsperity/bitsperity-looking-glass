from datetime import date, datetime, timedelta
from pathlib import Path
import polars as pl
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from libs.satbase_core.config.settings import load_settings
from libs.satbase_core.storage.stage import scan_parquet_glob
from collections import defaultdict

router = APIRouter()

@router.get("/news")
def list_news(from_: str = Query(None, alias="from"), to: str | None = None, q: str | None = None, tickers: str | None = None, limit: int = 100, offset: int = 0, include_body: bool = False, has_body: bool = False, content_format: str | None = Query(None, description="Content format: 'text', 'html', or 'both' (default)")):
    s = load_settings()
    if not from_ or not to:
        return {"items": [], "from": from_, "to": to, "limit": limit, "offset": offset, "total": 0, "include_body": include_body, "has_body": has_body}
    dfrom = date.fromisoformat(from_)
    dto = date.fromisoformat(to)
    lf_g = scan_parquet_glob(s.stage_dir, "gdelt", "news_docs", dfrom, dto)
    lf_r = scan_parquet_glob(s.stage_dir, "news_rss", "news_docs", dfrom, dto)
    # Define complete schema for fallback empty DataFrames
    empty_schema = {
        "id": pl.Utf8,
        "source": pl.Utf8,
        "title": pl.Utf8,
        "text": pl.Utf8,
        "url": pl.Utf8,
        "published_at": pl.Utf8,  # Use Utf8 directly to avoid cast issues
        "tickers": pl.List(pl.Utf8),
        "regions": pl.List(pl.Utf8),
        "themes": pl.List(pl.Utf8),
    }
    
    # Collect with graceful fallback if a source has no files
    try:
        df_g = lf_g.collect()
    except Exception:
        df_g = pl.DataFrame(schema=empty_schema)
    try:
        df_r = lf_r.collect()
    except Exception:
        df_r = pl.DataFrame(schema=empty_schema)
    # Normalize published_at to string to avoid timezone dtype conflicts
    if "published_at" in df_g.columns:
        df_g = df_g.with_columns(pl.col("published_at").cast(pl.Utf8))
    if "published_at" in df_r.columns:
        df_r = df_r.with_columns(pl.col("published_at").cast(pl.Utf8))
    df = pl.concat([df_g, df_r], how="vertical_relaxed")
    
    # Ensure tickers column is List[Utf8] and null-safe
    if "tickers" in df.columns:
        df = df.with_columns(
            pl.when(pl.col("tickers").is_null())
            .then(pl.lit([], dtype=pl.List(pl.Utf8)))
            .otherwise(pl.col("tickers").cast(pl.List(pl.Utf8)))
            .alias("tickers")
        )
    if q:
        for term in q.split(','):
            term = term.strip()
            if term:
                df = df.filter(pl.col("title").str.contains(term, literal=False) | pl.col("text").str.contains(term, literal=False))
    
    # Sort by published_at first (newest first) - only if column exists and dataframe not empty
    if df.height > 0 and "published_at" in df.columns:
        df = df.sort("published_at", descending=True)
    
    # Then deduplicate by ID (keep first = newest)
    if df.height > 0 and "id" in df.columns:
        df = df.unique(subset=["id"], keep="first")
    # Join optional body or filter by body existence
    if include_body or has_body:
        try:
            lf_bg = scan_parquet_glob(s.stage_dir, "news_body", "news_body", dfrom, dto)
            df_b = lf_bg.collect()
        except Exception:
            df_b = pl.DataFrame(schema={"id": pl.Utf8, "content_text": pl.Utf8, "content_html": pl.Utf8, "fetched_at": pl.Datetime, "published_at": pl.Datetime})
        # Normalize fetched_at for compatibility
        if df_b.height and "fetched_at" in df_b.columns:
            df_b = df_b.with_columns(pl.col("fetched_at").cast(pl.Utf8))
        if df_b.height and "published_at" in df_b.columns:
            df_b = df_b.with_columns(pl.col("published_at").cast(pl.Utf8))
        if df_b.height and "id" in df_b.columns:
            # Deduplicate bodies first (keep first = newest based on fetched_at)
            df_b = df_b.sort("fetched_at", descending=True)
            df_b = df_b.unique(subset=["id"], keep="first")
            
            if has_body:
                # Filter to only news with non-null content_text
                df_b_filtered = df_b.filter(pl.col("content_text").is_not_null())
                valid_ids = df_b_filtered.select("id").to_series().to_list()
                df = df.filter(pl.col("id").is_in(valid_ids))
            
            if include_body:
                df = df.join(df_b, on="id", how="left")
    
    # Final deduplication after join (critical for frontend keyed each)
    if df.height > 0 and "id" in df.columns:
        df = df.unique(subset=["id"], keep="first")
    
    # Convert to dicts for Python-side tickers filter
    items = df.to_dicts()
    if tickers:
        tick_set = {t.strip().upper() for t in tickers.split(',') if t.strip()}
        if tick_set:
            items = [it for it in items if isinstance(it.get("tickers"), list) and any(t in tick_set for t in it.get("tickers", []))]
    
    # Apply content_format filter to items (only if include_body was True)
    if include_body and content_format:
        for item in items:
            if content_format == "text":
                # Remove HTML, keep only text
                item.pop("content_html", None)
            elif content_format == "html":
                # Remove text, keep only HTML
                item.pop("content_text", None)
            # else: "both" or None - keep both fields
    
    # Pagination
    total = len(items)
    start = max(0, int(offset))
    end = start + max(1, int(limit))
    items = items[start:end]
    
    return {
        "items": items, 
        "from": from_, 
        "to": to, 
        "limit": limit,
        "offset": offset,
        "total": total,
        "has_more": end < total,
        "include_body": include_body,
        "has_body": has_body,
        "content_format": content_format
    }


@router.delete("/news/{news_id}")
def delete_news(news_id: str):
    """Delete a news article by ID (removes from parquet files)"""
    s = load_settings()
    try:
        # We need to scan all partitions to find the news item
        # This is expensive but needed for deletes. For production, consider a metadata index.
        from datetime import timedelta
        
        # Scan last 365 days (reasonable for most use cases)
        to_date = date.today()
        from_date = to_date - timedelta(days=365)
        
        deleted = False
        sources = ["gdelt", "news_rss"]
        
        for source in sources:
            try:
                lf = scan_parquet_glob(s.stage_dir, source, "news_docs", from_date, to_date)
                df = lf.collect()
                
                if df.height == 0:
                    continue
                
                # Check if the ID exists
                if "id" in df.columns:
                    matching = df.filter(pl.col("id") == news_id)
                    if matching.height > 0:
                        # Found it - remove from dataframe and rewrite partitions
                        remaining = df.filter(pl.col("id") != news_id)
                        
                        # Group by date and rewrite affected partitions
                        if "published_at" in remaining.columns:
                            # Parse date from published_at
                            remaining = remaining.with_columns(
                                pl.col("published_at").cast(pl.Utf8).str.slice(0, 10).alias("_date")
                            )
                            
                            for partition_date_str in remaining.select("_date").unique().to_series().to_list():
                                try:
                                    partition_date = date.fromisoformat(partition_date_str)
                                    partition_df = remaining.filter(pl.col("_date") == partition_date_str).drop("_date")
                                    
                                    # Write back to parquet
                                    from libs.satbase_core.storage.stage import write_parquet
                                    rows = partition_df.to_dicts()
                                    write_parquet(s.stage_dir, source, partition_date, "news_docs", rows)
                                except Exception:
                                    pass
                        
                        deleted = True
                        break
            except Exception:
                continue
        
        # Also try to delete from news_body
        if deleted:
            try:
                lf_body = scan_parquet_glob(s.stage_dir, "news_body", "news_body", from_date, to_date)
                df_body = lf_body.collect()
                if df_body.height > 0 and "id" in df_body.columns:
                    remaining_body = df_body.filter(pl.col("id") != news_id)
                    if remaining_body.height < df_body.height:
                        # Rewrite body partitions
                        from libs.satbase_core.storage.stage import write_parquet
                        if "published_at" in remaining_body.columns:
                            remaining_body = remaining_body.with_columns(
                                pl.col("published_at").cast(pl.Utf8).str.slice(0, 10).alias("_date")
                            )
                            for partition_date_str in remaining_body.select("_date").unique().to_series().to_list():
                                try:
                                    partition_date = date.fromisoformat(partition_date_str)
                                    partition_df = remaining_body.filter(pl.col("_date") == partition_date_str).drop("_date")
                                    rows = partition_df.to_dicts()
                                    write_parquet(s.stage_dir, "news_body", partition_date, "news_body", rows)
                                except Exception:
                                    pass
            except Exception:
                pass
        
        if deleted:
            return {"success": True, "id": news_id, "message": "News article deleted"}
        else:
            return JSONResponse(
                {"success": False, "id": news_id, "message": "News article not found"},
                status_code=404
            )
    except Exception as e:
        return JSONResponse(
            {"success": False, "error": str(e)},
            status_code=500
        )


@router.get("/news/heatmap")
def news_heatmap(
    topics: str = Query(..., description="Comma-separated search terms (e.g., 'AI,Fed,Earnings')"),
    from_: str | None = Query(None, alias="from"),
    to: str | None = None,
    granularity: str = Query("month", description="'year' or 'month'"),
    format: str = Query("flat", description="'flat' or 'matrix'")
):
    """
    Generate heatmap of article counts by topic and time period.
    
    Topics are user-defined search terms that are matched against article titles and text.
    Returns counts grouped by time period (year or month).
    """
    s = load_settings()
    
    # Parse topics
    topic_list = [t.strip() for t in topics.split(',') if t.strip()]
    if not topic_list:
        return {"error": "No topics provided", "data": []}
    
    # Default date range: last 365 days
    if not to:
        to = date.today().isoformat()
    if not from_:
        from_ = (date.today() - timedelta(days=365)).isoformat()
    
    dfrom = date.fromisoformat(from_)
    dto = date.fromisoformat(to)
    
    # Scan news from both sources
    try:
        lf_g = scan_parquet_glob(s.stage_dir, "gdelt", "news_docs", dfrom, dto)
        df_g = lf_g.collect()
        # Normalize published_at to string to avoid timezone conflicts
        if "published_at" in df_g.columns:
            df_g = df_g.with_columns(pl.col("published_at").cast(pl.Utf8))
    except Exception:
        df_g = pl.DataFrame(schema={"id": pl.Utf8, "title": pl.Utf8, "text": pl.Utf8, "published_at": pl.Utf8})
    
    try:
        lf_r = scan_parquet_glob(s.stage_dir, "news_rss", "news_docs", dfrom, dto)
        df_r = lf_r.collect()
        # Normalize published_at to string to avoid timezone conflicts
        if "published_at" in df_r.columns:
            df_r = df_r.with_columns(pl.col("published_at").cast(pl.Utf8))
    except Exception:
        df_r = pl.DataFrame(schema={"id": pl.Utf8, "title": pl.Utf8, "text": pl.Utf8, "published_at": pl.Utf8})
    
    # Combine
    df = pl.concat([df_g, df_r], how="vertical_relaxed")
    
    if df.height == 0:
        return {
            "from": from_,
            "to": to,
            "granularity": granularity,
            "data": [],
            "topics": topic_list,
            "periods": []
        }
    
    # Ensure published_at is string
    if "published_at" in df.columns:
        df = df.with_columns(pl.col("published_at").cast(pl.Utf8))
    
    # Extract period from published_at
    if granularity == "year":
        df = df.with_columns(
            pl.col("published_at").str.slice(0, 4).alias("period")
        )
    else:  # month
        df = df.with_columns(
            pl.col("published_at").str.slice(0, 7).alias("period")
        )
    
    # Count matches per (period, topic)
    counts = defaultdict(lambda: defaultdict(int))
    periods_set = set()
    
    for row in df.to_dicts():
        period = row.get("period")
        if not period:
            continue
        
        periods_set.add(period)
        title_lower = (row.get("title") or "").lower()
        text_lower = (row.get("text") or "").lower()
        combined = f"{title_lower} {text_lower}"
        
        for topic in topic_list:
            if topic.lower() in combined:
                counts[period][topic] += 1
    
    # Sort periods
    periods = sorted(list(periods_set))
    
    # Build response
    if format == "matrix":
        # Matrix format: [[counts for topic1], [counts for topic2], ...]
        matrix = []
        for period in periods:
            row = [counts[period][topic] for topic in topic_list]
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
        # Flat format: [{period, topic, count}, ...]
        data = []
        for period in periods:
            for topic in topic_list:
                data.append({
                    "period": period,
                    "topic": topic,
                    "count": counts[period][topic]
                })
        
        return {
            "from": from_,
            "to": to,
            "granularity": granularity,
            "data": data,
            "topics": topic_list,
            "periods": periods
        }


@router.get("/news/trending/tickers")
def trending_tickers(
    hours: int = Query(24, ge=1, le=720, description="Lookback window in hours (1-720)"),
    limit: int = Query(50, ge=1, le=100, description="Max results to return (1-100)"),
    min_mentions: int = Query(1, ge=1, description="Minimum mentions to include (>=1)"),
    only_known_tickers: bool = Query(False, description="Filter to known price-universe tickers (reduce false positives)")
):
    """
    Get trending tickers from recent news.
    
    Returns tickers ranked by mention count with sample headlines.
    
    Note: If tickers column is empty (no watchlist-based extraction at crawl time),
    this will scan titles/text for ticker-like patterns.
    """
    s = load_settings()
    
    # Calculate date range
    now = datetime.utcnow()
    start = now - timedelta(hours=hours)
    
    from_date = start.date()
    to_date = now.date()
    
    # Scan news
    try:
        lf_g = scan_parquet_glob(s.stage_dir, "gdelt", "news_docs", from_date, to_date)
        df_g = lf_g.collect()
        # Normalize published_at to string to avoid timezone conflicts
        if "published_at" in df_g.columns:
            df_g = df_g.with_columns(pl.col("published_at").cast(pl.Utf8))
    except Exception:
        df_g = pl.DataFrame(schema={"tickers": pl.List(pl.Utf8), "title": pl.Utf8, "text": pl.Utf8, "published_at": pl.Utf8})
    
    try:
        lf_r = scan_parquet_glob(s.stage_dir, "news_rss", "news_docs", from_date, to_date)
        df_r = lf_r.collect()
        # Normalize published_at to string to avoid timezone conflicts
        if "published_at" in df_r.columns:
            df_r = df_r.with_columns(pl.col("published_at").cast(pl.Utf8))
    except Exception:
        df_r = pl.DataFrame(schema={"tickers": pl.List(pl.Utf8), "title": pl.Utf8, "text": pl.Utf8, "published_at": pl.Utf8})
    
    # Combine
    df = pl.concat([df_g, df_r], how="vertical_relaxed")
    
    if df.height == 0:
        return {
            "period": {"from": start.isoformat(), "to": now.isoformat()},
            "tickers": [],
            "total_tickers": 0,
            "total_articles": 0,
            "note": "No articles found in date range"
        }
    
    total_articles = len(df)
    
    # Strategy 1: Use pre-extracted tickers if available
    if "tickers" in df.columns:
        df_with_tickers = df.filter(pl.col("tickers").list.len() > 0)
        
        if len(df_with_tickers) > 0:
            # Explode and count
            df_exploded = df_with_tickers.select(["tickers", "title"]).explode("tickers")
            df_exploded = df_exploded.filter(pl.col("tickers").is_not_null())
            
            if len(df_exploded) > 0:
                # Count mentions per ticker
                ticker_counts = df_exploded.group_by("tickers").agg([
                    pl.count().alias("mentions")
                ]).sort("mentions", descending=True)
                
                # Filter by min_mentions
                ticker_counts = ticker_counts.filter(pl.col("mentions") >= min_mentions)
                
                # Limit results
                ticker_counts = ticker_counts.head(limit)

                # Build response with sample headlines
                result_tickers = []
                price_universe = set()
                if only_known_tickers:
                    stooq_dir = Path(s.stage_dir) / "stooq" / "prices_daily"
                    if stooq_dir.exists():
                        price_universe = {p.stem.upper() for p in stooq_dir.glob("*.parquet")}

                for row in ticker_counts.to_dicts():
                    ticker = row["tickers"]
                    if only_known_tickers and ticker.upper() not in price_universe:
                        continue
                    mentions = row["mentions"]
                    
                    # Get sample headlines for this ticker
                    sample_articles = df_with_tickers.filter(pl.col("tickers").list.contains(ticker))
                    sample_headlines = sample_articles.select("title").head(3)["title"].to_list()
                    
                    # Count unique articles
                    article_count = len(sample_articles)
                    
                    result_tickers.append({
                        "ticker": ticker,
                        "mentions": mentions,
                        "articles": article_count,
                        "sample_headlines": sample_headlines
                    })

                return {
                    "period": {"from": start.isoformat(), "to": now.isoformat()},
                    "tickers": result_tickers,
                    "total_tickers": len(result_tickers),
                    "total_articles": total_articles,
                    "method": "pre_extracted"
                }
    
    # Strategy 2: Fallback - Extract ticker mentions
    import re
    ticker_mentions = defaultdict(lambda: {'count': 0, 'headlines': []})

    # If only_known_tickers: match against price universe (case-insensitive), else use conservative UPPERCASE regex
    price_universe = set()
    price_universe_lower = set()
    if only_known_tickers:
        stooq_dir = Path(s.stage_dir) / "stooq" / "prices_daily"
        if stooq_dir.exists():
            price_universe = {p.stem for p in stooq_dir.glob("*.parquet")}
            price_universe_lower = {t.lower() for t in price_universe}

    if only_known_tickers and price_universe:
        # Pre-build regex patterns for alphabetic tickers (word boundaries); non-alpha tickers use simple substring
        alpha_patterns: dict[str, re.Pattern] = {}
        for t in price_universe:
            if t.isalpha() and 2 <= len(t) <= 6:
                alpha_patterns[t] = re.compile(rf"\b{re.escape(t)}\b", re.IGNORECASE)

        for row in df.to_dicts():
            title = row.get("title") or ""
            text = row.get("text") or ""
            combined = f"{title} {text}"
            combined_lower = combined.lower()

            # Check alpha tickers via word-boundary regex
            for t, pat in alpha_patterns.items():
                if pat.search(combined):
                    tm = ticker_mentions[t]
                    tm['count'] += 1
                    if len(tm['headlines']) < 3:
                        tm['headlines'].append(title)

            # Check remaining tickers (non-alpha or long) via case-insensitive substring
            for t in price_universe:
                if t in alpha_patterns:  # already handled
                    continue
                if t.lower() in combined_lower:
                    tm = ticker_mentions[t]
                    tm['count'] += 1
                    if len(tm['headlines']) < 3:
                        tm['headlines'].append(title)
    else:
        # Generic conservative UPPERCASE token regex (2-5 chars), exclude common stopwords
        token_pattern = re.compile(r"\b([A-Z]{2,5})\b")
        exclude_words = {
            'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER',
            'WAS', 'ONE', 'OUR', 'OUT', 'DAY', 'GET', 'HAS', 'HIM', 'HIS', 'HOW',
            'ITS', 'MAY', 'NEW', 'NOW', 'OLD', 'SEE', 'TWO', 'WAY', 'WHO', 'BOY',
            'DID', 'CAR', 'LET', 'PUT', 'SAY', 'SHE', 'TOO', 'USE', 'DAD', 'MOM',
            'USA', 'CEO', 'CFO', 'CTO', 'IPO', 'ETF', 'GDP', 'CPI', 'API', 'APP',
            'EUR', 'USD', 'GBP', 'JPY', 'CNY', 'RSS', 'PDF', 'CSV', 'XML', 'SQL',
            'NYC', 'LAX', 'SFO', 'JFK', 'FBI', 'CIA', 'NSA', 'FDA', 'SEC', 'IRS'
        }
        for row in df.to_dicts():
            title = row.get("title") or ""
            text = row.get("text") or ""
            combined = f"{title} {text}"
            for match in token_pattern.findall(combined):
                if match not in exclude_words:
                    tm = ticker_mentions[match]
                    tm['count'] += 1
                    if len(tm['headlines']) < 3:
                        tm['headlines'].append(title)
    
    # Sort by count
    sorted_tickers = sorted(ticker_mentions.items(), key=lambda x: x[1]['count'], reverse=True)

    # Filter by min_mentions and limit
    result_tickers = []
    for ticker, data in sorted_tickers:
        if only_known_tickers and price_universe and ticker.upper() not in {t.upper() for t in price_universe}:
            continue
        if data['count'] >= min_mentions:
            result_tickers.append({
                "ticker": ticker,
                "mentions": data['count'],
                "articles": data['count'],  # Approximate for pattern-based
                "sample_headlines": data['headlines'][:3]
            })
        
        if len(result_tickers) >= limit:
            break
    
    return {
        "period": {"from": start.isoformat(), "to": now.isoformat()},
        "tickers": result_tickers,
        "total_tickers": len(result_tickers),
        "total_articles": total_articles,
        "method": "pattern_extraction",
        "note": "Tickers extracted from titles using pattern matching. May include false positives."
    }

