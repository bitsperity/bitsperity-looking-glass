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
from ..storage.stage import write_ticker_parquet, mark_ticker_invalid


BASE = "https://stooq.com/q/d/l/"


def _normalize_symbol(ticker: str, params: dict[str, Any]) -> str:
    """
    Normalize ticker for Stooq API.
    
    Priority:
    1. ticker_map (explicit mapping)
    2. If ticker has '.', use as-is (e.g. AFX.DE, SAP.DE)
    3. Else: add default market_suffix (default: .us)
    """
    mapping: dict[str, str] = params.get("ticker_map", {}) or {}
    if ticker in mapping:
        return mapping[ticker]
    
    # If ticker already has market suffix, use as-is
    if "." in ticker:
        return ticker.lower()
    
    # Add default suffix
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
    """Get latest date for ticker from ticker-specific parquet file"""
    try:
        ticker_file = base / "stooq" / "prices_daily" / f"{ticker.upper()}.parquet"
        if not ticker_file.exists():
            return None
        df = pl.read_parquet(ticker_file)
        if df.height == 0:
            return None
        max_date = df["date"].max()
        return max_date
    except Exception:
        return None

def fetch(params: dict[str, Any]) -> dict[str, list[DailyBar]]:
    tickers: list[str] = params.get("tickers", [])
    s = load_settings()
    base = Path(s.stage_dir)
    result: dict[str, list[DailyBar]] = {}
    invalid_tickers: list[str] = []
    
    for t in tickers:
        sym = _normalize_symbol(t, params)
        url = f"{BASE}?s={sym}&i=d"
        try:
            text = get_text(url, headers=default_headers(s.user_agent_email), timeout=s.http_timeout)
        except Exception:
            # Falls Timeout: nächster Ticker, aber vorhandene bleiben
            result[t.upper()] = []
            continue
        
        # Check if Stooq returned "No data" (invalid ticker)
        if text.strip() == "No data":
            # Mark ticker as invalid to prevent future fetch attempts
            mark_ticker_invalid(base, "stooq", "prices_daily", t.upper())
            invalid_tickers.append(t.upper())
            continue
        
        bars = _parse_csv(t, text)
        # Delta: nur neue Tage über der bisherigen Max(date)
        last_dt = _latest_date_for_ticker(base, t.upper())
        if last_dt is not None:
            bars = [b for b in bars if b.date > last_dt]
        result[t.upper()] = bars
    
    # If any tickers were invalid, raise an error
    if invalid_tickers:
        raise ValueError(f"Invalid ticker(s): {', '.join(invalid_tickers)}")
    
    return result


def normalize(raw: dict) -> Iterable[DailyBar]:
    for bars in raw.values():
        for b in bars:
            yield b


def sink(models: Iterable[DailyBar], partition_dt: date) -> dict:
    """Write ticker data to ticker-specific parquet files"""
    rows = [m.model_dump() for m in models]
    if not rows:
        return {"count": 0, "skipped": True}
    
    s = load_settings()
    base = Path(s.stage_dir)
    
    # Group rows by ticker
    ticker_groups: dict[str, list[dict]] = {}
    for row in rows:
        ticker = row["ticker"]
        if ticker not in ticker_groups:
            ticker_groups[ticker] = []
        ticker_groups[ticker].append(row)
    
    # Write each ticker to its own file
    written_files = []
    for ticker, ticker_rows in ticker_groups.items():
        path = write_ticker_parquet(base, "stooq", "prices_daily", ticker, ticker_rows)
        written_files.append(str(path))
    
    return {
        "files": written_files,
        "count": len(rows),
        "tickers": list(ticker_groups.keys())
    }

