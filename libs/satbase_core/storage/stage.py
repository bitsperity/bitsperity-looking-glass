from __future__ import annotations

from datetime import date
from pathlib import Path
from typing import Iterable

import polars as pl


def partition_path(base: Path, source: str, dt: date) -> Path:
    return base / source / f"{dt.year:04d}" / f"{dt.month:02d}" / f"{dt.day:02d}"


def write_parquet(base: Path, source: str, dt: date, table: str, rows: Iterable[dict]) -> Path:
    p = partition_path(base, source, dt)
    p.mkdir(parents=True, exist_ok=True)
    df = pl.from_dicts(list(rows)) if not isinstance(rows, pl.DataFrame) else rows
    out = p / f"{table}.parquet"
    df.write_parquet(out)
    return out


def upsert_parquet_by_id(base: Path, source: str, dt: date, table: str, id_field: str, new_rows: Iterable[dict]) -> Path:
    """Write rows into a daily-partitioned parquet file, de-duplicated by id_field.

    If the destination file exists, it will be loaded, concatenated with new_rows,
    unique rows will be kept based on id_field, and the file will be overwritten.
    
    For news articles (table='news_docs'), topics lists are merged (union).
    """
    p = partition_path(base, source, dt)
    p.mkdir(parents=True, exist_ok=True)
    out = p / f"{table}.parquet"
    new_df = pl.from_dicts(list(new_rows)) if not isinstance(new_rows, pl.DataFrame) else new_rows
    
    if out.exists():
        try:
            existing = pl.read_parquet(out)
            combined = pl.concat([existing, new_df], how="vertical_relaxed")
            
            if id_field in combined.columns:
                # For news_docs, merge topics when deduplicating
                if table == "news_docs" and "topics" in combined.columns:
                    # Group by id, merge topics lists, keep last for other fields
                    def merge_topics(group):
                        # Collect all unique topics across rows with same ID
                        all_topics = set()
                        for topics_list in group["topics"]:
                            if isinstance(topics_list, list):
                                all_topics.update(topics_list)
                        # Keep last row, update topics
                        result = group[-1:].clone()
                        result["topics"] = [list(all_topics)]
                        return result
                    
                    combined = combined.group_by(id_field).map_groups(merge_topics)
                else:
                    combined = combined.unique(subset=[id_field], keep="last")
            
            combined.write_parquet(out)
            return out
        except Exception:
            # If reading existing fails, fall back to writing only new rows
            new_df.write_parquet(out)
            return out
    else:
        new_df.write_parquet(out)
        return out


def scan_ticker_parquet(base: Path, source: str, table: str, ticker: str) -> pl.LazyFrame | None:
    """
    Load all historical data for a single ticker.
    Ticker-based partitioning: /source/table/TICKER.parquet
    
    Returns:
    - LazyFrame if data exists
    - None if ticker is marked as invalid
    - Empty LazyFrame if no data yet (fetch-on-miss)
    """
    ticker_dir = base / source / table
    invalid_file = ticker_dir / f"{ticker.upper()}.invalid"
    
    # Check if ticker is marked as invalid
    if invalid_file.exists():
        return None  # Signal: Don't fetch, ticker is invalid
    
    ticker_file = ticker_dir / f"{ticker.upper()}.parquet"
    if ticker_file.exists():
        try:
            return pl.scan_parquet(str(ticker_file))
        except Exception:
            return pl.LazyFrame()
    return pl.LazyFrame()  # No data yet, trigger fetch-on-miss


def write_ticker_parquet(base: Path, source: str, table: str, ticker: str, rows: Iterable[dict]) -> Path:
    """
    Write/update ticker data to ticker-specific parquet file.
    Uses upsert by 'date' column.
    """
    ticker_dir = base / source / table
    ticker_dir.mkdir(parents=True, exist_ok=True)
    ticker_file = ticker_dir / f"{ticker.upper()}.parquet"
    
    new_df = pl.from_dicts(list(rows)) if not isinstance(rows, pl.DataFrame) else rows
    
    if ticker_file.exists():
        try:
            existing = pl.read_parquet(ticker_file)
            # Combine and deduplicate by date (keep latest)
            combined = pl.concat([existing, new_df], how="vertical_relaxed")
            if "date" in combined.columns:
                combined = combined.unique(subset=["date"], keep="last")
            combined = combined.sort("date")
            combined.write_parquet(ticker_file)
            return ticker_file
        except Exception:
            # If reading existing fails, fall back to writing only new rows
            new_df.write_parquet(ticker_file)
            return ticker_file
    else:
        new_df.write_parquet(ticker_file)
        return ticker_file


def mark_ticker_invalid(base: Path, source: str, table: str, ticker: str) -> Path:
    """
    Mark ticker as invalid to prevent endless fetch-on-miss loops.
    Creates an empty .invalid file.
    """
    ticker_dir = base / source / table
    ticker_dir.mkdir(parents=True, exist_ok=True)
    invalid_file = ticker_dir / f"{ticker.upper()}.invalid"
    invalid_file.touch()
    return invalid_file


def scan_parquet_glob(base: Path, source: str, table: str, date_from: date, date_to: date) -> pl.LazyFrame:
    # Präzises Partition-Pruning: Tagespfade iterieren; falls keine Treffer, fallback enger auf Monats-Wildcards
    from datetime import timedelta
    
    daily_paths: list[str] = []
    cur = date_from
    one = 1
    while cur <= date_to:
        p = partition_path(base, source, cur) / f"{table}.parquet"
        if p.exists():
            daily_paths.append(str(p))
        cur = cur + timedelta(days=one)
    
    if daily_paths:
        # Load each file individually and concat with vertical_relaxed to handle schema mismatches
        try:
            dfs = []
            for path in daily_paths:
                try:
                    df = pl.scan_parquet(path).collect()
                    dfs.append(df)
                except Exception:
                    # Skip files that fail to load
                    continue
            if dfs:
                combined = pl.concat(dfs, how="vertical_relaxed")
                # Deduplicate by 'id' column if it exists (critical after vertical_relaxed merge)
                if combined.height > 0 and "id" in combined.columns:
                    combined = combined.unique(subset=["id"], keep="first")
                return combined.lazy()
        except Exception:
            # If concat fails, fall back to scan_parquet with first file only
            return pl.scan_parquet(daily_paths[0:1])
    
    # Fallback: Monats-Wildcards zwischen from/to
    month_paths: list[str] = []
    y, m = date_from.year, date_from.month
    end_y, end_m = date_to.year, date_to.month
    while (y < end_y) or (y == end_y and m <= end_m):
        pattern = str(base / source / f"{y:04d}" / f"{m:02d}" / "*" / f"{table}.parquet")
        month_paths.append(pattern)
        # next month
        if m == 12:
            y += 1
            m = 1
        else:
            m += 1
    
    # Same treatment for wildcard patterns
    try:
        dfs = []
        for pattern in month_paths:
            try:
                df = pl.scan_parquet(pattern).collect()
                dfs.append(df)
            except Exception:
                continue
        if dfs:
            combined = pl.concat(dfs, how="vertical_relaxed")
            # Deduplicate by 'id' column if it exists
            if combined.height > 0 and "id" in combined.columns:
                combined = combined.unique(subset=["id"], keep="first")
            return combined.lazy()
    except Exception:
        pass
    
    # Final fallback: empty lazyframe
    return pl.LazyFrame()

