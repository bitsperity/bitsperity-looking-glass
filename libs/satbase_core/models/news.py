from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel


class NewsDoc(BaseModel):
    id: str
    source: str = "mediastack"  # Only mediastack now
    url: str
    title: str
    description: str | None = None
    body_text: str  # Required! Crawled text content
    published_at: datetime
    
    # Extracted metadata
    tickers: list[str] = []
    topics: list[str] = []
    
    # Mediastack fields - store ALL data we get
    author: str | None = None
    image: str | None = None
    category: str | None = None
    language: str | None = None
    country: str | None = None
    source_name: str | None = None


class NewsBody(BaseModel):
    """Deprecated: Body is now stored directly in NewsDoc.body_text"""
    id: str
    url: str
    content_text: str
    fetched_at: datetime
    published_at: datetime

