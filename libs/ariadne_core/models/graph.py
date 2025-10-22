"""
Core graph data models
"""

from pydantic import BaseModel, Field
from typing import Any
from datetime import datetime


class Node(BaseModel):
    """Generic graph node"""
    id: str
    label: str  # Node type (Company, Event, etc.)
    properties: dict[str, Any] = Field(default_factory=dict)


class Edge(BaseModel):
    """Generic graph edge"""
    source_id: str
    target_id: str
    rel_type: str  # Relationship type
    properties: dict[str, Any] = Field(default_factory=dict)


class Subgraph(BaseModel):
    """Subgraph with nodes and edges"""
    nodes: list[Node]
    edges: list[Edge]
    summary: str | None = None


# Specialized Node Models

class Company(BaseModel):
    """Company entity"""
    ticker: str
    name: str
    sector: str | None = None
    industry: str | None = None


class Instrument(BaseModel):
    """Trading instrument"""
    symbol: str
    exchange: str | None = None
    asset_type: str | None = None  # stock, option, crypto, etc.


class Event(BaseModel):
    """Temporal event"""
    id: str | None = None
    type: str  # earnings, merger, policy_change, etc.
    title: str
    occurred_at: datetime
    description: str | None = None
    source: str | None = None
    confidence: float = 1.0


class Concept(BaseModel):
    """Abstract concept"""
    name: str
    category: str | None = None  # supply_chain, technology, policy, etc.


class Location(BaseModel):
    """Geographic location"""
    country: str
    region: str | None = None
    city: str | None = None


class Observation(BaseModel):
    """Agent observation/journal entry"""
    id: str | None = None
    date: datetime
    content: str
    tags: list[str] = Field(default_factory=list)
    related_tickers: list[str] = Field(default_factory=list)
    confidence: float = 1.0


class PriceEvent(BaseModel):
    """Technical price event"""
    id: str | None = None
    symbol: str
    event_type: str  # ma_crossover, breakout, vol_regime_change, etc.
    occurred_at: datetime
    properties: dict[str, Any] = Field(default_factory=dict)
    source: str = "price_detector"
    confidence: float = 1.0


class Pattern(BaseModel):
    """Validated recurring pattern"""
    id: str
    name: str
    description: str
    category: str  # technical, fundamental, macro, behavioral
    confidence: float = Field(ge=0.0, le=1.0)
    validated_at: datetime
    validated_by: str  # agent_id or human_id
    manifold_source_id: str | None = None  # Link to Manifold thought
    occurrences: int = 0  # How many times observed
    success_rate: float | None = None  # If predictive pattern


class Hypothesis(BaseModel):
    """Hypothesis under evaluation"""
    id: str
    statement: str
    source_entity_id: str
    target_entity_id: str
    relation_type: str  # What relationship is hypothesized
    confidence: float = Field(ge=0.0, le=1.0)
    created_at: datetime
    created_by: str  # agent_id
    manifold_thought_id: str  # Required link to Manifold
    status: str  # active, validated, invalidated, expired
    evidence_count: int = 0
    contradiction_count: int = 0
    validation_threshold: int = 3  # N for validation trigger


class Regime(BaseModel):
    """Market regime classification"""
    id: str
    name: str  # "Bull Market Q4 2024", "Fed Tightening Cycle"
    type: str  # bull, bear, rotation, consolidation, crisis
    characteristics: list[str]  # ["low_vol", "tech_outperformance"]
    start_date: datetime
    end_date: datetime | None = None  # None if current
    confidence: float = Field(ge=0.0, le=1.0)

