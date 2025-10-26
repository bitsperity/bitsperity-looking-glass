from __future__ import annotations

import csv
import io
from datetime import date
from pathlib import Path
from typing import Any, Iterable

from ..models.price import DailyBar
from ..config.settings import load_settings
from .http import get_text, default_headers
from ..storage.prices_db import PricesDB


BASE = "https://stooq.com/q/d/l/"


def _normalize_symbol(ticker: str, params: dict[str, Any]) -> str:
    """
    Normalize ticker for Stooq API.
    
    Priority:
    1. ticker_map (explicit mapping)
    2. Crypto tickers (BTC/ETH/etc) → use as-is or map to stooq format
    3. If ticker has '.', use as-is (e.g. AFX.DE, SAP.DE)
    4. Else: add default market_suffix (default: .us)
    """
    mapping: dict[str, str] = params.get("ticker_map", {}) or {}
    if ticker in mapping:
        return mapping[ticker]
    
    # Special handling for crypto - Stooq uses specific crypto format
    # For now, let yfinance handle crypto (more reliable)
    # But if we get a crypto ticker, return it for explicit error handling
    crypto_tickers = {'BTC', 'ETH', 'DOGE', 'ADA', 'XRP'}
    if any(ticker.upper().startswith(c) for c in crypto_tickers):
        # Return uppercase to signal this should use yfinance fallback
        return ticker.upper()
    
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


def fetch(params: dict[str, Any]) -> dict[str, list[DailyBar]]:
    tickers: list[str] = params.get("tickers", [])
    s = load_settings()
    db_path = Path(s.stage_dir).parent / "prices.db"
    db = PricesDB(db_path)
    
    result: dict[str, list[DailyBar]] = {}
    invalid_tickers: list[str] = []
    
    # Crypto tickers that Stooq doesn't handle well
    crypto_tickers = {'BTC', 'ETH', 'DOGE', 'ADA', 'XRP'}
    
    for t in tickers:
        # Skip crypto tickers - let yfinance handle them
        if any(t.upper().startswith(c) for c in crypto_tickers):
            result[t.upper()] = []
            continue
        
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
            # Mark ticker as invalid in SQLite
            db.mark_invalid(t.upper(), "stooq returned no data")
            invalid_tickers.append(t.upper())
            continue
        
        bars = _parse_csv(t, text)
        # Delta: nur neue Tage über der bisherigen Max(date)
        last_dt = db.get_latest_date(t.upper())
        if last_dt is not None:
            bars = [b for b in bars if b.date > last_dt]
        result[t.upper()] = bars
    
    # If any tickers were invalid (excluding crypto which is expected), raise an error
    if invalid_tickers:
        raise ValueError(f"Invalid ticker(s): {', '.join(invalid_tickers)}")
    
    return result


def normalize(raw: dict) -> Iterable[DailyBar]:
    for bars in raw.values():
        for b in bars:
            yield b


def sink(models: Iterable[DailyBar], partition_dt: date) -> dict:
    """Write ticker data to SQLite prices.db"""
    rows = [m.model_dump() for m in models]
    if not rows:
        return {"count": 0, "skipped": True}
    
    s = load_settings()
    db_path = Path(s.stage_dir).parent / "prices.db"
    db = PricesDB(db_path)
    
    # Group rows by ticker
    ticker_groups: dict[str, list[dict]] = {}
    for row in rows:
        ticker = row["ticker"]
        if ticker not in ticker_groups:
            ticker_groups[ticker] = []
        ticker_groups[ticker].append(row)
    
    # Write each ticker to SQLite
    total_upserted = 0
    for ticker, ticker_rows in ticker_groups.items():
        # Convert dicts to format expected by upsert_daily_bars
        bars = [
            {
                'date': row['date'],
                'open': row['open'],
                'high': row['high'],
                'low': row['low'],
                'close': row['close'],
                'volume': row['volume'],
            }
            for row in ticker_rows
        ]
        count = db.upsert_daily_bars(ticker, bars, source='stooq')
        total_upserted += count
    
    return {
        "count": total_upserted,
        "tickers": list(ticker_groups.keys())
    }

