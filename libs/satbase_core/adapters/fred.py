from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Iterable, List
import httpx
import time

from ..models.price import DailyBar  # Reuse DailyBar for FRED observations
from ..config.settings import load_settings
from ..storage.macro_db import MacroDB
from pathlib import Path


FRED_API_BASE = "https://api.stlouisfed.org/fred"


def fetch(params: dict[str, Any]) -> dict[str, list[dict]]:
    """
    Fetch FRED series observations.
    
    Args:
        params: {
            'series_ids': list[str],  # e.g., ['GDP', 'UNRATE']
            'from': optional date,
            'to': optional date
        }
    
    Returns:
        {series_id: [observations]}
    """
    s = load_settings()
    if not s.fred_api_key:
        raise ValueError("FRED_API_KEY not configured")
    
    series_ids = params.get('series_ids', [])
    from_date = params.get('from', date(1900, 1, 1))
    to_date = params.get('to', date.today())
    
    result: dict[str, list[dict]] = {}
    
    for series_id in series_ids:
        try:
            observations = _fetch_series(
                series_id, 
                s.fred_api_key, 
                from_date, 
                to_date,
                s.http_timeout
            )
            result[series_id] = observations
        except Exception as e:
            print(f"Failed to fetch {series_id}: {e}")
            result[series_id] = []
    
    return result


def _fetch_series(series_id: str, api_key: str, from_date: date, to_date: date, 
                  timeout: int = 10) -> list[dict]:
    """Fetch observations for a single FRED series with pagination."""
    observations = []
    limit = 100000  # FRED's max per request
    offset = 0
    
    while True:
        try:
            # Fetch observations
            obs_resp = httpx.get(
                f"{FRED_API_BASE}/series/observations",
                params={
                    'series_id': series_id,
                    'api_key': api_key,
                    'file_type': 'json',
                    'limit': limit,
                    'offset': offset,
                    'observation_start': from_date.isoformat(),
                    'observation_end': to_date.isoformat(),
                    'sort_order': 'asc'
                },
                timeout=timeout
            )
            obs_resp.raise_for_status()
            obs_data = obs_resp.json()
            
            obs_list = obs_data.get('observations', [])
            if not obs_list:
                break
            
            for obs in obs_list:
                # Skip missing values (FRED uses '.' for missing)
                if obs.get('value') == '.':
                    continue
                try:
                    observations.append({
                        'series_id': series_id,
                        'date': date.fromisoformat(obs['date']),
                        'value': float(obs['value'])
                    })
                except (ValueError, KeyError):
                    pass
            
            # Check if more pages
            if len(obs_list) < limit:
                break
            
            offset += limit
            time.sleep(0.1)  # Small delay between requests
        
        except Exception as e:
            print(f"Error fetching observations for {series_id}: {e}")
            break
    
    # Fetch series metadata
    if observations:
        try:
            meta_resp = httpx.get(
                f"{FRED_API_BASE}/series",
                params={
                    'series_id': series_id,
                    'api_key': api_key,
                    'file_type': 'json'
                },
                timeout=timeout
            )
            meta_resp.raise_for_status()
            meta_data = meta_resp.json().get('seriess', [{}])[0]
            
            # Store metadata with observations
            for obs in observations:
                obs['title'] = meta_data.get('title')
                obs['units'] = meta_data.get('units')
                obs['frequency'] = meta_data.get('frequency')
                obs['observation_start'] = meta_data.get('observation_start')
                obs['observation_end'] = meta_data.get('observation_end')
        except Exception as e:
            print(f"Error fetching metadata for {series_id}: {e}")
    
    return observations


def normalize(raw: dict[str, list[dict]]) -> Iterable[dict]:
    """Normalize raw FRED observations."""
    for series_id, observations in raw.items():
        for obs in observations:
            yield obs


def sink(models: Iterable[dict], partition_dt: date = None) -> dict:
    """Write FRED observations to MacroDB."""
    s = load_settings()
    db_path = Path(s.stage_dir).parent / "macro.db"
    db = MacroDB(db_path)
    
    rows_by_series: dict[str, list[dict]] = {}
    meta_by_series: dict[str, dict] = {}
    
    for model in models:
        series_id = model.get('series_id')
        if not series_id:
            continue
        
        if series_id not in rows_by_series:
            rows_by_series[series_id] = []
            meta_by_series[series_id] = {
                'title': model.get('title'),
                'units': model.get('units'),
                'frequency': model.get('frequency'),
                'observation_start': model.get('observation_start'),
                'observation_end': model.get('observation_end')
            }
        
        rows_by_series[series_id].append({
            'date': model['date'],
            'value': model['value']
        })
    
    # Upsert all series
    total_inserted = 0
    for series_id, points in rows_by_series.items():
        inserted = db.upsert_series_points(series_id, points, source='fred')
        total_inserted += inserted
        
        # Upsert metadata
        db.upsert_meta(series_id, meta_by_series[series_id])
    
    return {
        "count": total_inserted,
        "series_count": len(rows_by_series),
        "series_ids": list(rows_by_series.keys())
    }
