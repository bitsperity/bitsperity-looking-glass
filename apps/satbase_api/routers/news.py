from datetime import date
from pathlib import Path
import polars as pl
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from libs.satbase_core.config.settings import load_settings
from libs.satbase_core.storage.stage import scan_parquet_glob

router = APIRouter()

@router.get("/news")
def list_news(from_: str = Query(None, alias="from"), to: str | None = None, q: str | None = None, tickers: str | None = None, limit: int = 100, offset: int = 0, include_body: bool = False, has_body: bool = False):
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
    
    # Sort by published_at first (newest first)
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
        "has_body": has_body
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

