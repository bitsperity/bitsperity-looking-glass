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
    topics: list[str] = []  # Topics this article was ingested/matched against
    text_content: str | None = None  # Full article text (added by adapters during unified fetch)


class NewsBody(BaseModel):
    id: str  # References NewsDoc.id
    url: str
    content_text: str  # Required - only store if successfully fetched
    fetched_at: datetime
    published_at: datetime

