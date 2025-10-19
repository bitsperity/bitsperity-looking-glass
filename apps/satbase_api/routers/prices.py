from datetime import date
import polars as pl
from fastapi import APIRouter, Query, status
from fastapi.responses import JSONResponse
from .ingest import enqueue_prices_daily
from libs.satbase_core.config.settings import load_settings
from libs.satbase_core.storage.stage import scan_parquet_glob

router = APIRouter()

@router.get("/prices/daily/{ticker}")
def prices_daily(ticker: str, from_: str | None = Query(None, alias="from"), to: str | None = None, btc_view: bool = False):
    s = load_settings()
    if not from_ or not to:
        return {"ticker": ticker.upper(), "from": from_, "to": to, "btc_view": btc_view, "bars": []}
    dfrom = date.fromisoformat(from_)
    dto = date.fromisoformat(to)
    lf = scan_parquet_glob(s.stage_dir, "stooq", "prices_daily", dfrom, dto)
    l_t = lf.filter(pl.col("ticker") == ticker.upper())
    if btc_view:
        # Check if ticker has data
        df_t = l_t.unique(subset=["ticker","date"]).collect()
        if df_t.height == 0:
            job_id = enqueue_prices_daily([ticker, "BTCUSD"])
            return JSONResponse({"status": "fetch_on_miss", "job_id": job_id, "retry_after": 2}, status_code=status.HTTP_202_ACCEPTED)
        
        # Check if BTCUSD has data for the date range
        l_btc = (
            lf.filter(pl.col("ticker") == "BTCUSD")
              .select(["date", "close"])  # EOD-Schlusskurs
              .rename({"close": "btc_close"})
        )
        df_btc = l_btc.collect()
        if df_btc.height == 0:
            job_id = enqueue_prices_daily(["BTCUSD"])
            return JSONResponse({"status": "fetch_on_miss", "job_id": job_id, "retry_after": 2}, status_code=status.HTTP_202_ACCEPTED)
        
        # Now join and convert
        l_joined = l_t.join(l_btc, on="date", how="inner")
        df = (
            l_joined
            .with_columns([
                (pl.col("open") / pl.col("btc_close")).alias("open"),
                (pl.col("high") / pl.col("btc_close")).alias("high"),
                (pl.col("low") / pl.col("btc_close")).alias("low"),
                (pl.col("close") / pl.col("btc_close")).alias("close"),
            ])
            .drop(["btc_close"])  # Volume bleibt unverändert (Stückzahl)
            .unique(subset=["ticker","date"])  # Dedupe mehrfacher Tages-Scans
            .sort("date", descending=True)
            .collect()
        )
        records = df.to_dicts()
        return {"ticker": ticker.upper(), "from": from_, "to": to, "btc_view": True, "bars": records}
    else:
        df = l_t.unique(subset=["ticker","date"]).sort("date", descending=True).collect()
        records = df.to_dicts()
        if len(records) == 0:
            job_id = enqueue_prices_daily([ticker])
            return JSONResponse({"status": "fetch_on_miss", "job_id": job_id, "retry_after": 2}, status_code=status.HTTP_202_ACCEPTED)
        return {"ticker": ticker.upper(), "from": from_, "to": to, "btc_view": False, "bars": records}


@router.get("/prices/daily")
def prices_daily_multi(tickers: str, from_: str | None = Query(None, alias="from"), to: str | None = None, btc_view: bool = False):
    s = load_settings()
    if not from_ or not to:
        return {"tickers": [], "from": from_, "to": to, "btc_view": btc_view, "series": {}}
    dfrom = date.fromisoformat(from_)
    dto = date.fromisoformat(to)
    tick_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not tick_list:
        return {"tickers": [], "from": from_, "to": to, "btc_view": btc_view, "series": {}}
    lf = scan_parquet_glob(s.stage_dir, "stooq", "prices_daily", dfrom, dto)
    l_all = lf.filter(pl.col("ticker").is_in(tick_list))
    if btc_view:
        l_btc = (
            lf.filter(pl.col("ticker") == "BTCUSD")
              .select(["date", "close"])  # EOD-Schlusskurs
              .rename({"close": "btc_close"})
        )
        l_joined = l_all.join(l_btc, on="date", how="inner")
        df = (
            l_joined
            .with_columns([
                (pl.col("open") / pl.col("btc_close")).alias("open"),
                (pl.col("high") / pl.col("btc_close")).alias("high"),
                (pl.col("low") / pl.col("btc_close")).alias("low"),
                (pl.col("close") / pl.col("btc_close")).alias("close"),
            ])
            .drop(["btc_close"])  # Volume bleibt unverändert
            .unique(subset=["ticker","date"])  # Dedupe
            .sort(["ticker","date"], descending=[False, True])
            .collect()
        )
    else:
        df = (
            l_all
            .unique(subset=["ticker","date"])  # Dedupe
            .sort(["ticker","date"], descending=[False, True])
            .collect()
        )
    out: dict[str, list[dict]] = {}
    for t in tick_list:
        out[t] = df.filter(pl.col("ticker") == t).to_dicts()
    # If every requested series is empty → enqueue fetch-on-miss
    if all(len(v) == 0 for v in out.values()):
        job_id = enqueue_prices_daily(tick_list)
        return JSONResponse({"status": "fetch_on_miss", "job_id": job_id, "retry_after": 2}, status_code=status.HTTP_202_ACCEPTED)
    return {"tickers": tick_list, "from": from_, "to": to, "btc_view": btc_view, "series": out}

