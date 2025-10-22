"""
API request models
"""

from pydantic import BaseModel, Field
from datetime import datetime


class ContextRequest(BaseModel):
    """Request for contextual subgraph"""
    topic: str | None = None
    tickers: list[str] = Field(default_factory=list)
    as_of: datetime | None = None
    depth: int = 2
    limit: int = 200


class ImpactRequest(BaseModel):
    """Request for impact analysis"""
    event_id: str | None = None
    event_query: str | None = None
    k: int = 10
    as_of: datetime | None = None


class TimelineRequest(BaseModel):
    """Request for entity timeline"""
    entity_id: str | None = None
    ticker: str | None = None
    from_date: datetime | None = None
    to_date: datetime | None = None


class SimilarEntitiesRequest(BaseModel):
    """Request for similar entities"""
    ticker: str
    method: str = "node_similarity"
    limit: int = 10


class FactRequest(BaseModel):
    """Request to add/update a fact (edge)"""
    source_id: str
    source_label: str
    target_id: str
    target_label: str
    rel_type: str
    properties: dict = Field(default_factory=dict)
    source: str  # news_id, url, or algo name
    confidence: float = Field(ge=0.0, le=1.0, default=1.0)
    method: str | None = None  # rule, llm, stat
    valid_from: datetime | None = None
    valid_to: datetime | None = None


class ObservationRequest(BaseModel):
    """Request to record an agent observation"""
    date: datetime
    content: str
    tags: list[str] = Field(default_factory=list)
    related_tickers: list[str] = Field(default_factory=list)
    related_events: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0, default=1.0)


class HypothesisRequest(BaseModel):
    """Request to record a hypothesis"""
    source_id: str
    source_label: str
    target_id: str
    target_label: str
    hypothesis: str
    confidence: float = Field(ge=0.0, le=1.0)
    expires_at: datetime | None = None
    properties: dict = Field(default_factory=dict)


class CorrelationRequest(BaseModel):
    """Request to compute correlations"""
    symbols: list[str]
    window: int = 30  # days
    from_date: datetime | None = None
    to_date: datetime | None = None
    method: str = "spearman"  # pearson, spearman


class EvidenceRequest(BaseModel):
    """Annotate hypothesis with supporting evidence"""
    hypothesis_id: str
    evidence_type: str  # "supporting" or "contradicting"
    evidence_source_id: str  # event_id, news_id, or price_event_id
    evidence_source_type: str  # Event, News, PriceEvent
    confidence: float = Field(ge=0.0, le=1.0)
    notes: str | None = None
    annotated_by: str  # agent_id or human_id


class ValidationRequest(BaseModel):
    """Trigger final validation of hypothesis"""
    hypothesis_id: str
    decision: str  # "validate", "invalidate", "defer"
    reasoning: str
    validated_by: str  # agent_id
    create_pattern: bool = False  # If validated, extract as pattern?

