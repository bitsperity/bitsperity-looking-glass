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


def scan_parquet_glob(base: Path, source: str, table: str, date_from: date, date_to: date) -> pl.LazyFrame:
    # Präzises Partition-Pruning: Tagespfade iterieren; falls keine Treffer, fallback enger auf Monats-Wildcards
    daily_paths: list[str] = []
    cur = date_from
    one = 1
    while cur <= date_to:
        p = partition_path(base, source, cur) / f"{table}.parquet"
        if p.exists():
            daily_paths.append(str(p))
        # nächster Tag (ohne datetime import hier erneut zu verwenden)
        # einfache Tages-Inkrementierung
        from datetime import timedelta  # local import to avoid top-level change
        cur = cur + timedelta(days=one)
    if daily_paths:
        return pl.scan_parquet(daily_paths)
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
    return pl.scan_parquet(month_paths)

