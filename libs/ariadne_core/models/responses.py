"""
API response models
"""

from pydantic import BaseModel, Field
from datetime import datetime
from .graph import Subgraph, Node, Edge, Event, PriceEvent, Pattern


class ContextResponse(BaseModel):
    """Response with contextual subgraph"""
    query: str
    subgraph: Subgraph
    as_of: datetime | None = None


class ImpactResponse(BaseModel):
    """Response with impact-ranked entities"""
    event: Event | None = None
    impacted_entities: list[dict] = Field(default_factory=list)
    # Each dict: {node: Node, impact: float, paths: int}


class TimelineResponse(BaseModel):
    """Response with timeline of events"""
    entity: Node
    events: list[Event] = Field(default_factory=list)
    price_events: list[PriceEvent] = Field(default_factory=list)
    relations: list[Edge] = Field(default_factory=list)


class SimilarEntitiesResponse(BaseModel):
    """Response with similar entities"""
    source: Node
    similar: list[dict] = Field(default_factory=list)
    # Each dict: {node: Node, similarity: float, shared_relations: int}


class FactResponse(BaseModel):
    """Response after adding/updating a fact"""
    status: str
    edge: Edge


class ObservationResponse(BaseModel):
    """Response after recording observation"""
    status: str
    observation_id: str
    linked_entities: int


class HypothesisResponse(BaseModel):
    """Response after recording hypothesis with Manifold sync info"""
    status: str
    hypothesis_id: str
    manifold_thought_id: str | None = None  # For agent to update Manifold (optional if not provided)
    evidence_count: int = 0
    contradiction_count: int = 0
    validation_pending: bool = False  # True if threshold reached


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    service: str = "ariadne"
    neo4j_connected: bool
    node_count: int | None = None
    edge_count: int | None = None


class StatsResponse(BaseModel):
    """Statistics response"""
    nodes_by_label: dict[str, int]
    edges_by_type: dict[str, int]
    total_nodes: int
    total_edges: int
    last_updated: datetime | None = None


class PatternResponse(BaseModel):
    """Pattern with provenance"""
    pattern: Pattern
    source_hypothesis_id: str | None = None
    manifold_source_id: str | None = None
    supporting_evidence: list[str] = Field(default_factory=list)  # Evidence IDs


class EvidenceResponse(BaseModel):
    """Response after adding evidence"""
    status: str
    hypothesis_id: str
    evidence_count: int
    contradiction_count: int
    validation_pending: bool


class ValidationResponse(BaseModel):
    """Response after validation decision"""
    status: str
    hypothesis_id: str
    manifold_thought_id: str  # For agent to update Manifold
    decision: str  # validate, invalidate, defer
    pattern_created: bool = False
    pattern_id: str | None = None

