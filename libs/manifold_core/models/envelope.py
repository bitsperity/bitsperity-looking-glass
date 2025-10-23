from __future__ import annotations

from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field, field_validator
from datetime import datetime


ThoughtType = Literal[
    "observation",
    "hypothesis",
    "analysis",
    "decision",
    "reflection",
    "question",
]

StatusType = Literal["active", "validated", "invalidated", "archived"]
ConfidenceLevel = Literal["speculation", "low", "medium", "high", "certain"]


class Links(BaseModel):
    ariadne_entities: List[str] = Field(default_factory=list)
    ariadne_facts: List[str] = Field(default_factory=list)
    news_ids: List[str] = Field(default_factory=list)
    price_event_ids: List[str] = Field(default_factory=list)
    related_thoughts: List[str] = Field(default_factory=list)


class Epistemology(BaseModel):
    reasoning: Optional[str] = None
    assumptions: List[str] = Field(default_factory=list)
    evidence: List[str] = Field(default_factory=list)


class RetrievalInfo(BaseModel):
    embedding_model: Optional[str] = None
    vector_hint: Optional[Literal["text", "title"]] = None
    keywords: List[str] = Field(default_factory=list)


class Flags(BaseModel):
    promoted_to_kg: bool = False
    pinned: bool = False


# ---- Type-specific payloads ----

class HypothesisPayload(BaseModel):
    decision_deadline: Optional[datetime] = None
    validation_criteria: Optional[str] = None
    risk_to_invalid: Optional[str] = None
    expected_outcome: Optional[str] = None


class DecisionPayload(BaseModel):
    action: Literal["buy", "sell", "hold"]
    instrument: str
    size: Optional[float] = None
    price: Optional[float] = None
    rationale: Optional[str] = None
    risk: Optional[str] = None


class ReflectionPayload(BaseModel):
    target_thought_id: Optional[str] = None
    failure_reason: Optional[str] = None
    lessons: Optional[str] = None


TypePayload = HypothesisPayload | DecisionPayload | Dict[str, Any]


class ThoughtEnvelope(BaseModel):
    """Standard Manifold envelope v1."""

    id: Optional[str] = None
    type: ThoughtType
    version: int = 1
    agent_id: str = "alpaca-v1"

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    status: StatusType = "active"
    confidence_level: ConfidenceLevel = "medium"
    confidence_score: float = Field(ge=0.0, le=1.0, default=0.5)

    title: str
    content: str
    summary: Optional[str] = None

    tags: List[str] = Field(default_factory=list)
    tickers: List[str] = Field(default_factory=list)
    sectors: List[str] = Field(default_factory=list)
    timeframe: Optional[str] = None

    links: Links = Field(default_factory=Links)
    epistemology: Epistemology = Field(default_factory=Epistemology)
    retrieval: RetrievalInfo = Field(default_factory=RetrievalInfo)
    flags: Flags = Field(default_factory=Flags)

    type_payload: Optional[TypePayload] = None

    # audit/versioning
    updated_by: Optional[str] = None
    change_reason: Optional[str] = None
    deleted_at: Optional[datetime] = None
    deleted_by: Optional[str] = None
    quarantined_at: Optional[datetime] = None
    quarantine_reason: Optional[str] = None
    embedding_version: Optional[str] = None
    last_embedded_at: Optional[datetime] = None

    @field_validator("confidence_score")
    @classmethod
    def _clamp_score(cls, v: float) -> float:
        return max(0.0, min(1.0, v))


