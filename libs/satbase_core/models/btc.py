from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel


class BtcObs(BaseModel):
    ts: datetime
    price_usd: float
    source: str

