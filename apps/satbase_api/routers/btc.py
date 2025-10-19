from datetime import date
import polars as pl
from fastapi import APIRouter
from libs.satbase_core.config.settings import load_settings
from libs.satbase_core.storage.stage import scan_parquet_glob

router = APIRouter()

@router.get("/btc/oracle")
def btc_oracle(from_: str | None = None, to: str | None = None):
    s = load_settings()
    if not from_ or not to:
        return {"from": from_, "to": to, "points": []}
    dfrom = date.fromisoformat(from_)
    dto = date.fromisoformat(to)
    lf = scan_parquet_glob(s.stage_dir, "btc", "btc_oracle", dfrom, dto)
    df = lf.collect().sort("ts", descending=True)
    return {"from": from_, "to": to, "points": df.to_dicts()}

