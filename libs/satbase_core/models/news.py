from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel


class NewsDoc(BaseModel):
    id: str
    source: str  # RSS, GDELT, mediastack - adapter name
    title: str
    text: str
    url: str
    published_at: datetime
    tickers: list[str] | None = None
    regions: list[str] | None = None
    themes: list[str] | None = None
    topics: list[str] = []  # Topics this article was ingested/matched against
    text_content: str | None = None  # Full article text (added by adapters during unified fetch)
    
    # Mediastack fields - store ALL data we get (we pay per API call!)
    author: str | None = None  # Article author
    description: str | None = None  # Short description/summary
    image: str | None = None  # Image URL
    category: str | None = None  # Category (e.g., technology, business, general)
    language: str | None = None  # ISO 639-1 (e.g., en, de, fr)
    country: str | None = None  # ISO 3166-1 alpha-2 (e.g., us, de, gb)
    source_name: str | None = None  # Source name (e.g., CNN, Reuters)


class NewsBody(BaseModel):
    id: str  # References NewsDoc.id
    url: str
    content_text: str  # Required - only store if successfully fetched
    fetched_at: datetime
    published_at: datetime

