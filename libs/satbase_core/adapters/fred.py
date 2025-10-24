from __future__ import annotations

from datetime import datetime, date
from typing import Any, Iterable
from pathlib import Path
import polars as pl

from ..models.macro import MacroObs
from ..config.settings import load_settings
from .http import get_json, default_headers


BASE = "https://api.stlouisfed.org/fred/series/observations"


def _normalize(series_id: str, obs: dict[str, Any]) -> MacroObs | None:
    v = obs.get("value")
    d = obs.get("date")
    if v in (".", None) or not d:
        return None
    y, m, dd = d.split("-")
    return MacroObs(series_id=series_id, date=date(int(y), int(m), int(dd)), value=float(v), source="fred")


def fetch(params: dict[str, Any]) -> dict[str, list[MacroObs]]:
    series: list[str] = params.get("series", [])
    s = load_settings()
    key = s.fred_api_key
    result: dict[str, list[MacroObs]] = {}
    for sid in series:
        data = get_json(BASE, params={"series_id": sid, "api_key": key, "file_type": "json"}, headers=default_headers(s.user_agent_email), timeout=s.http_timeout)
        obss = data.get("observations", [])
        out: list[MacroObs] = []
        for ob in obss:
            mo = _normalize(sid, ob)
            if mo:
                out.append(mo)
        result[sid] = out
    return result


def normalize(raw: dict[str, list[MacroObs]]) -> Iterable[MacroObs]:
    for obss in raw.values():
        for ob in obss:
            yield ob


def sink(models: Iterable[MacroObs], partition_dt: date) -> dict:
    """
    Store FRED data indexed by series_id (like Stooq does for tickers).
    
    Structure: data/stage/macro/fred/[series_id].parquet
    
    This allows direct access to any FRED series without scanning date folders.
    Deduplicates by (series_id, date) keeping the latest fetched_at.
    """
    s = load_settings()
    base_dir = Path(s.stage_dir) / "macro" / "fred"
    base_dir.mkdir(parents=True, exist_ok=True)
    
    # Group models by series_id
    by_series: dict[str, list[MacroObs]] = {}
    for m in models:
        if m.series_id not in by_series:
            by_series[m.series_id] = []
        by_series[m.series_id].append(m)
    
    if not by_series:
        return {"path": None, "count": 0, "series_count": 0}
    
    total_count = 0
    paths = []
    fetched_at = datetime.utcnow()
    
    for series_id, obs_list in by_series.items():
        file_path = base_dir / f"{series_id}.parquet"
        
        # Convert new data to DataFrame
        new_rows = [m.model_dump() for m in obs_list]
        for row in new_rows:
            row['fetched_at'] = fetched_at
        new_df = pl.DataFrame(new_rows)
        
        # If file exists, load and merge (deduplicate)
        if file_path.exists():
            try:
                existing_df = pl.read_parquet(file_path)
                
                # Combine old + new
                combined = pl.concat([existing_df, new_df], how="vertical_relaxed")
                
                # Deduplicate: Keep latest fetched_at per (series_id, date)
                combined = combined.sort("fetched_at", descending=True)
                combined = combined.unique(subset=["series_id", "date"], keep="first")
                combined = combined.sort("date")
                
                df_to_write = combined
            except Exception as e:
                # If read fails, just write new data
                print(f"Warning: Could not read existing {file_path}: {e}. Overwriting.")
                df_to_write = new_df
        else:
            df_to_write = new_df
        
        # Write parquet
        df_to_write.write_parquet(file_path)
        
        paths.append(str(file_path))
        total_count += len(df_to_write)
    
    return {
        "paths": paths,
        "count": total_count,
        "series_count": len(by_series)
    }
