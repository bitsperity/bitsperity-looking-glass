from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any
import httpx

from fastapi import APIRouter, Query, status, BackgroundTasks
from fastapi.responses import JSONResponse

from libs.satbase_core.config.settings import load_settings
from libs.satbase_core.storage.watchlist_db import WatchlistDB
from .ingest import enqueue_prices_daily, enqueue_news


router = APIRouter()


def _get_db() -> WatchlistDB:
    """Get watchlist database instance."""
    s = load_settings()
    return WatchlistDB(s.stage_dir.parent / "control.db")


@router.get("/watchlist/items")
def list_watchlist_items(
    type: str | None = Query(None, description="Filter by type: stock, topic, or macro"),
    enabled: bool | None = Query(None, description="Filter by enabled status"),
    active_now: bool = Query(False, description="Only return currently active items"),
    include_expired: bool = Query(False, description="Include expired items"),
    q: str | None = Query(None, description="Search by key or label")
):
    """List watchlist items with optional filters."""
    db = _get_db()
    items = db.list_items(
        item_type=type,
        enabled=enabled,
        active_now=active_now,
        include_expired=include_expired,
        search=q
    )
    return {
        "count": len(items),
        "items": items
    }


@router.get("/watchlist/active")
def get_active_watchlist():
    """Get all currently active items (for scheduler)."""
    db = _get_db()
    items = db.get_active_items()
    return {
        "count": len(items),
        "items": items
    }


@router.post("/watchlist/items")
def add_watchlist_items(body: dict[str, Any]):
    """Add one or more watchlist items (stocks, topics, or macro)."""
    items = body.get("items", [])
    if not items:
        return {"count": 0, "added": []}
    
    db = _get_db()
    added = db.add_items(items)
    
    return {
        "count": len(added),
        "added": added
    }


@router.patch("/watchlist/items/{item_id}")
def update_watchlist_item(item_id: int, body: dict[str, Any]):
    """Update a watchlist item (partial update)."""
    db = _get_db()
    
    if db.update_item(item_id, body):
        # Fetch updated item
        items = db.list_items(include_expired=True)
        updated = next((i for i in items if i['id'] == item_id), None)
        return {
            "status": "updated",
            "item": updated
        }
    
    return JSONResponse(
        {"error": "Item not found or no changes made"},
        status_code=404
    )


@router.delete("/watchlist/items/{item_id}")
def delete_watchlist_item(item_id: int):
    """Soft delete a watchlist item."""
    db = _get_db()
    
    if db.delete_item(item_id):
        return {
            "status": "deleted",
            "item_id": item_id
        }
    
    return JSONResponse(
        {"error": "Item not found"},
        status_code=404
    )


@router.post("/watchlist/refresh", status_code=status.HTTP_202_ACCEPTED)
async def refresh_watchlist(body: dict[str, Any] = None, background_tasks: BackgroundTasks = None):
    """Trigger refresh for active watchlist items (prices, news, macro)."""
    body = body or {}
    
    db = _get_db()
    items = db.get_active_items()
    
    if not items:
        return {
            "status": "noop",
            "message": "No active watchlist items",
            "jobs": []
        }
    
    jobs: list[dict] = []
    
    # Group by type
    by_type = {}
    for item in items:
        t = item['type']
        if t not in by_type:
            by_type[t] = []
        by_type[t].append(item)
    
    # Refresh stocks (batch)
    if 'stock' in by_type:
        stocks = [item['key'] for item in by_type['stock']]
        job_id = enqueue_prices_daily(stocks)
        jobs.append({
            "type": "prices",
            "job_id": job_id,
            "count": len(stocks)
        })
    
    # Refresh topics (per-item)
    if 'topic' in by_type:
        for item in by_type['topic']:
            job_id = enqueue_news(item['key'], hours=24)
            jobs.append({
                "type": "news",
                "topic": item['key'],
                "job_id": job_id
            })
    
    # Refresh macro (via new macro ingest endpoint)
    if 'macro' in by_type:
        macro_series = [item['key'] for item in by_type['macro']]
        if background_tasks and macro_series:
            # Trigger async macro ingestion via local call
            payload = {"series": macro_series}
            async with httpx.AsyncClient(timeout=5.0) as client:
                try:
                    resp = await client.post(
                        "http://127.0.0.1:8080/v1/macro/ingest",
                        json=payload
                    )
                    if resp.status_code in (202, 200):
                        jobs.append({
                            "type": "macro",
                            "series_count": len(macro_series),
                            "series": macro_series
                        })
                except Exception as e:
                    print(f"Failed to trigger macro refresh: {e}")
    
    return JSONResponse({
        "status": "accepted",
        "items_refreshed": len(items),
        "jobs": jobs,
        "retry_after": 2
    }, status_code=status.HTTP_202_ACCEPTED)


