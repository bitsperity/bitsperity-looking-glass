from datetime import date
import polars as pl
from fastapi import APIRouter
from libs.satbase_core.config.settings import load_settings
from libs.satbase_core.storage.stage import scan_parquet_glob


router = APIRouter()


def _load_btcusd_close_on(on_dt: date) -> float | None:
    s = load_settings()
    lf = scan_parquet_glob(s.stage_dir, "stooq", "prices_daily", on_dt, on_dt)
    df = (
        lf
        .filter((pl.col("ticker") == "BTCUSD") & (pl.col("date") <= on_dt))
        .select(["date", "close"])  # use close for EOD
        .sort("date")
        .collect()
    )
    if df.height == 0:
        return None
    return float(df.tail(1)["close"][0])


@router.get("/convert/usd-to-btc")
def usd_to_btc(value: float, on: str):
    on_dt = date.fromisoformat(on)
    px = _load_btcusd_close_on(on_dt)
    if px is None or px == 0:
        return {"value_usd": value, "date": on, "btc": None}
    return {"value_usd": value, "date": on, "btc": value / px}


@router.get("/convert/btc-to-usd")
def btc_to_usd(value: float, on: str):
    on_dt = date.fromisoformat(on)
    px = _load_btcusd_close_on(on_dt)
    if px is None:
        return {"value_btc": value, "date": on, "usd": None}
    return {"value_btc": value, "date": on, "usd": value * px}

