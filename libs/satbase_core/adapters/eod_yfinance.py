from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Iterable, List

import yfinance as yf
import warnings
import polars as pl
from pathlib import Path

from ..models.price import DailyBar
from ..config.settings import load_settings
from ..storage.stage import write_parquet


def _latest_date_for_ticker(base: Path, ticker: str) -> date | None:
    try:
        import datetime as _dt
        now = _dt.date.today()
        paths = [
            str(base / "yfinance" / f"{now.year:04d}" / "*" / "*" / "prices_daily.parquet"),
            str(base / "yfinance" / f"{now.year-1:04d}" / "*" / "*" / "prices_daily.parquet"),
        ]
        lf = pl.scan_parquet(paths)
        df = (
            lf.filter(pl.col("ticker") == ticker)
              .select(["date"]).max().collect()
        )
        if df.height == 0 or df["date"][0] is None:
            return None
        return df["date"][0]
    except Exception:
        return None


def fetch(params: dict[str, Any]) -> List[DailyBar]:
    tickers: list[str] = params.get("tickers", [])
    period = params.get("period", "1y")  # fallback, wenn kein last_date
    interval = params.get("interval", "1d")
    out: List[DailyBar] = []
    for t in tickers:
        try:
            # Warnungen dämpfen
            warnings.filterwarnings("ignore", category=FutureWarning)
            s = load_settings()
            last_dt = _latest_date_for_ticker(Path(s.stage_dir), t.upper())
            if last_dt is not None:
                start = (last_dt + timedelta(days=1)).isoformat()
                df = yf.download(t, start=start, interval=interval, progress=False, auto_adjust=False)
            else:
                df = yf.download(t, period=period, interval=interval, progress=False, auto_adjust=False)
            if df is None or df.empty:
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
            continue
    return out


def normalize(raw: List[DailyBar]) -> Iterable[DailyBar]:
    return raw


def sink(models: Iterable[DailyBar], partition_dt: date) -> dict:
    rows = [m.model_dump() for m in models]
    if not rows:
        return {"count": 0, "skipped": True}
    p = write_parquet(load_settings().stage_dir, "yfinance", partition_dt, "prices_daily", rows)
    return {"path": str(p), "count": len(rows)}

