from __future__ import annotations

from datetime import date
from pydantic import BaseModel


class MacroObs(BaseModel):
    series_id: str
    date: date
    value: float
    source: str

