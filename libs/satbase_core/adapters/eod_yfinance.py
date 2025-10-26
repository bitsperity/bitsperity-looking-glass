from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Iterable, List

import yfinance as yf
import warnings

from ..models.price import DailyBar
from ..config.settings import load_settings
from ..storage.prices_db import PricesDB
from pathlib import Path


def fetch(params: dict[str, Any]) -> List[DailyBar]:
    tickers: list[str] = params.get("tickers", [])
    period = params.get("period", "1y")  # fallback, wenn kein last_date
    interval = params.get("interval", "1d")
    s = load_settings()
    db_path = Path(s.stage_dir).parent / "prices.db"
    db = PricesDB(db_path)
    
    out: List[DailyBar] = []
    for t in tickers:
        try:
            # Warnungen dämpfen
            warnings.filterwarnings("ignore", category=FutureWarning)
            
            last_dt = db.get_latest_date(t.upper())
            if last_dt is not None:
                start = (last_dt + timedelta(days=1)).isoformat()
                df = yf.download(t, start=start, interval=interval, progress=False, auto_adjust=False)
            else:
                df = yf.download(t, period=period, interval=interval, progress=False, auto_adjust=False)
            
            if df is None or df.empty:
                # Mark as invalid if yfinance has no data
                db.mark_invalid(t.upper(), "yfinance returned no data")
                continue
            
            for idx, row in df.iterrows():
                dt = idx.date()
                # Skalar-sicher lesen
                open_v = float(row['Open'].item()) if 'Open' in row and row['Open'] is not None else 0.0
                high_v = float(row['High'].item()) if 'High' in row and row['High'] is not None else 0.0
                low_v = float(row['Low'].item()) if 'Low' in row and row['Low'] is not None else 0.0
                close_v = float(row['Close'].item()) if 'Close' in row and row['Close'] is not None else 0.0
                vol_v = int(row['Volume'].item()) if 'Volume' in row and row['Volume'] is not None else None
                out.append(DailyBar(
                    ticker=t.upper(),
                    date=dt,
                    open=open_v,
                    high=high_v,
                    low=low_v,
                    close=close_v,
                    volume=vol_v,
                    source="yfinance",
                ))
        except Exception:
            # If yfinance fails, try switching source preference
            db.update_source_pref(t.upper(), "yfinance", increment_fail=True)
            continue
    
    return out


def normalize(raw: List[DailyBar]) -> Iterable[DailyBar]:
    return raw


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
        count = db.upsert_daily_bars(ticker, bars, source='yfinance')
        total_upserted += count
        
        # Mark as no longer invalid if we got data
        db.unmark_invalid(ticker)
    
    return {"count": total_upserted, "tickers": list(ticker_groups.keys())}

