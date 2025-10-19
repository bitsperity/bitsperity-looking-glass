from __future__ import annotations

from datetime import datetime, timezone, date
from typing import Any, Iterable

from ..models.btc import BtcObs
from ..config.settings import load_settings
from .http import get_json, default_headers
from ..storage.stage import write_parquet


BASE = "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart"


def fetch(params: dict[str, Any]) -> list[BtcObs]:
    s = load_settings()
    days = params.get("days", "365")
    data = get_json(BASE, params={"vs_currency": "usd", "days": days, "interval": "daily"}, headers=default_headers(s.user_agent_email), timeout=s.http_timeout)
    prices = data.get("prices", [])
    out: list[BtcObs] = []
    for ts_ms, price in prices:
        ts = datetime.fromtimestamp(ts_ms / 1000.0, tz=timezone.utc)
        out.append(BtcObs(ts=ts, price_usd=float(price), source="coingecko"))
    return out


def normalize(raw: list[BtcObs]) -> Iterable[BtcObs]:
    return raw


def sink(models: Iterable[BtcObs], partition_dt: date) -> dict:
    rows = [m.model_dump() for m in models]
    if not rows:
        return {"path": None, "count": 0}
    p = write_parquet(load_settings().stage_dir, "btc", partition_dt, "btc_oracle", rows)
    return {"path": str(p), "count": len(rows)}

