from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel


class NewsDoc(BaseModel):
    id: str
    source: str
    title: str
    text: str
    url: str
    published_at: datetime
    tickers: list[str] | None = None
    regions: list[str] | None = None
    themes: list[str] | None = None

