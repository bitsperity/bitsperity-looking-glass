from __future__ import annotations

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class CreateResponse(BaseModel):
    status: str
    thought_id: str


class UpdateResponse(BaseModel):
    status: str


class DeleteResponse(BaseModel):
    status: str


class SearchResultItem(BaseModel):
    id: str
    score: float
    highlight: Optional[str] = None
    thought: Dict[str, Any]


class SearchResponse(BaseModel):
    status: str
    count: int
    results: List[SearchResultItem]
    facets: Dict[str, List[Dict[str, Any]]] = Field(default_factory=dict)


class TimelineBucket(BaseModel):
    date: str
    count: int


class TimelineResponse(BaseModel):
    status: str
    thoughts: List[Dict[str, Any]]
    bucketed: List[TimelineBucket]


class StatsResponse(BaseModel):
    status: str
    total: int
    by_type: Dict[str, int]
    by_status: Dict[str, int]
    avg_confidence: float
    validation_rate: float


class ThoughtPromoteResponse(BaseModel):
    status: str
    kg_payload: Dict[str, Any]


class AriadneSyncResponse(BaseModel):
    status: str
    thought_id: str


class HealthResponse(BaseModel):
    status: str
    qdrant_connected: bool
    collection_name: str
    embedding_model: str


class ConfigResponse(BaseModel):
    status: str
    collection_name: str
    vector_dim: int
    embedding_provider: str


class LinkResponse(BaseModel):
    status: str


class ExplainSearchResponse(BaseModel):
    candidates: List[Dict[str, Any]]
    scoring_breakdown: List[Dict[str, Any]]
    boosts: Dict[str, Any]
    highlights: List[str]


