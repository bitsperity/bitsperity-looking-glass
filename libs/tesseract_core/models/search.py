from pydantic import BaseModel

class SearchRequest(BaseModel):
    query: str
    filters: dict | None = None
    limit: int = 20

class SearchResult(BaseModel):
    id: str
    score: float
    title: str
    text: str
    source: str
    source_name: str | None = None
    url: str
    published_at: str
    topics: list[str] = []
    tickers: list[str] = []
    language: str | None = None
    body_available: bool = False
    news_id: str | None = None

class SearchResponse(BaseModel):
    query: str
    count: int
    results: list[SearchResult]

