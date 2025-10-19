from __future__ import annotations

from datetime import date
from pydantic import BaseModel


class DailyBar(BaseModel):
    ticker: str
    date: date
    open: float
    high: float
    low: float
    close: float
    volume: int | None = None
    source: str

