from __future__ import annotations

import csv
import io
from datetime import date
from pathlib import Path
from typing import Any, Iterable

from ..models.price import DailyBar
import polars as pl
from ..config.settings import load_settings
from .http import get_text, default_headers
from ..storage.stage import write_parquet


BASE = "https://stooq.com/q/d/l/"


def _normalize_symbol(ticker: str, params: dict[str, Any]) -> str:
    mapping: dict[str, str] = params.get("ticker_map", {}) or {}
    if ticker in mapping:
        return mapping[ticker]
    suffix: str = params.get("market_suffix", "us")
    return f"{ticker.lower()}.{suffix}"


def _parse_csv(ticker: str, text: str) -> list[DailyBar]:
    buf = io.StringIO(text)
    reader = csv.DictReader(buf)
    out: list[DailyBar] = []
    for row in reader:
        if not row.get("Date"):
            continue
        y, m, d = row["Date"].split("-")
        dt = date(int(y), int(m), int(d))
        out.append(
            DailyBar(
                ticker=ticker.upper(),
                date=dt,
                open=float(row["Open"]) if row["Open"] not in ("-", "") else 0.0,
                high=float(row["High"]) if row["High"] not in ("-", "") else 0.0,
                low=float(row["Low"]) if row["Low"] not in ("-", "") else 0.0,
                close=float(row["Close"]) if row["Close"] not in ("-", "") else 0.0,
                volume=_parse_int(row.get("Volume")),
                source="stooq",
            )
        )
    return out


def _parse_int(v: str | None) -> int | None:
    if v in (None, "", "-"):
        return None
    try:
        # Einige Stooq-Formate liefern Float-Strings -> int sicher casten
        return int(float(v))
    except Exception:
        return None


def _latest_date_for_ticker(base: Path, ticker: str) -> date | None:
    # Suche die jüngste vorhandene Zeile für den Ticker in stooq/prices_daily
    try:
        # Scanne nur dieses Jahr und das Vorjahr für Schnelligkeit
        import datetime as _dt
        now = _dt.date.today()
        paths = [
            str(base / "stooq" / f"{now.year:04d}" / "*" / "*" / "prices_daily.parquet"),
            str(base / "stooq" / f"{now.year-1:04d}" / "*" / "*" / "prices_daily.parquet"),
        ]
        lf = pl.scan_parquet(paths)
        df = (
            lf.filter(pl.col("ticker") == ticker)
              .select(["date"]) 
              .max() 
              .collect()
        )
        if df.height == 0 or df["date"][0] is None:
            return None
        return df["date"][0]
    except Exception:
        return None

def fetch(params: dict[str, Any]) -> dict[str, list[DailyBar]]:
    tickers: list[str] = params.get("tickers", [])
    s = load_settings()
    result: dict[str, list[DailyBar]] = {}
    for t in tickers:
        sym = _normalize_symbol(t, params)
        url = f"{BASE}?s={sym}&i=d"
        try:
            text = get_text(url, headers=default_headers(s.user_agent_email), timeout=s.http_timeout)
        except Exception:
            # Falls Timeout: nächster Ticker, aber vorhandene bleiben
            result[t.upper()] = []
            continue
        bars = _parse_csv(t, text)
        # Delta: nur neue Tage über der bisherigen Max(date)
        last_dt = _latest_date_for_ticker(Path(s.stage_dir), t.upper())
        if last_dt is not None:
            bars = [b for b in bars if b.date > last_dt]
        result[t.upper()] = bars
    return result


def normalize(raw: dict) -> Iterable[DailyBar]:
    for bars in raw.values():
        for b in bars:
            yield b


def sink(models: Iterable[DailyBar], partition_dt: date) -> dict:
    rows = [m.model_dump() for m in models]
    if not rows:
        return {"count": 0, "skipped": True}
    p = write_parquet(load_settings().stage_dir, "stooq", partition_dt, "prices_daily", rows)
    return {"path": str(p), "count": len(rows)}

