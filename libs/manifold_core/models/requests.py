from __future__ import annotations

from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


class MatchFilter(BaseModel):
    key: str
    match: Dict[str, Any]


class RangeFilter(BaseModel):
    key: str
    range: Dict[str, Any]


class Filters(BaseModel):
    must: List[MatchFilter | RangeFilter] = Field(default_factory=list)
    must_not: List[MatchFilter | RangeFilter] = Field(default_factory=list)


class Diversity(BaseModel):
    mmr_lambda: Optional[float] = None


class Boosts(BaseModel):
    recency: Optional[float] = None
    type: Dict[str, float] = Field(default_factory=dict)
    tickers: Dict[str, float] = Field(default_factory=dict)


class SearchRequest(BaseModel):
    query: Optional[str] = None
    vector: Literal["text", "title"] = "text"
    filters: Filters = Field(default_factory=Filters)
    boosts: Boosts = Field(default_factory=Boosts)
    facets: List[str] = Field(default_factory=list)
    limit: int = 20
    offset: int = 0
    diversity: Optional[Diversity] = None


class RelatedLinkRequest(BaseModel):
    related_id: str
    relation_type: Literal["supports", "contradicts", "followup", "duplicate"]
    weight: Optional[float] = None


class ThoughtPromoteRequest(BaseModel):
    """Prepare payload for Ariadne promotion."""
    auto_mark: bool = False
    relation_type: Optional[str] = None
    source_entity_id: Optional[str] = None
    target_entity_id: Optional[str] = None


class AriadneSyncRequest(BaseModel):
    thought_id: str
    status: Optional[Literal["validated", "invalidated"]] = None
    ariadne_fact_id: Optional[str] = None
    ariadne_entity_ids: List[str] = Field(default_factory=list)


class ReembedRequest(BaseModel):
    vectors: List[Literal["text", "title"]] = Field(default_factory=lambda: ["text"]) \
        # noqa: E501
    force: bool = False


class ReindexRequest(BaseModel):
    filters: Filters = Field(default_factory=Filters)
    vectors: List[Literal["text", "title"]] = Field(default_factory=lambda: ["text"]) \
        # noqa: E501
    dry_run: bool = True


class DedupeRequest(BaseModel):
    filters: Filters = Field(default_factory=Filters)
    strategy: Literal["semantic", "hash"] = "semantic"
    threshold: float = 0.85


class MergeRequest(BaseModel):
    source_id: str
    target_id: str
    policy: Literal["prefer_new", "prefer_old", "manual"] = "prefer_new"
    move_links: bool = True


