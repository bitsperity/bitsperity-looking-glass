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
    url: str
    published_at: str
    tickers: list[str]

class SearchResponse(BaseModel):
    query: str
    count: int
    results: list[SearchResult]

