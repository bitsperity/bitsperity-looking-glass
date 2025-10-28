from __future__ import annotations

from typing import Any, Dict, List, Optional
from qdrant_client import QdrantClient
from qdrant_client.http import models as qm
from pydantic import BaseModel
from datetime import datetime


class QdrantConfig(BaseModel):
    url: str = "http://localhost:6333"
    collection: str = "manifold_thoughts"
    vector_dim: int = 1024
    vector_names: List[str] = ["text", "title", "summary"]
    cosine: bool = True


class QdrantStore:
    def __init__(self, qdrant_url: str, collection_name: str, vector_dim: int = 1024):
        self.collection_name = collection_name
        self.vector_dim = vector_dim
        self.client = QdrantClient(url=qdrant_url)

    def initialize_collection(self) -> None:
        """Initialize collection with named vectors (text, title, summary)."""
        vectors_config = {
            "text": qm.VectorParams(size=self.vector_dim, distance=qm.Distance.COSINE),
            "title": qm.VectorParams(size=self.vector_dim, distance=qm.Distance.COSINE),
            "summary": qm.VectorParams(size=self.vector_dim, distance=qm.Distance.COSINE),
        }
        try:
            self.client.get_collection(self.collection_name)
        except Exception:
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=vectors_config,
            )
            # Create payload indexes
            self.client.create_payload_index(
                self.collection_name,
                "type",
                field_schema=qm.PayloadSchemaType.KEYWORD,
            )
            self.client.create_payload_index(
                self.collection_name,
                "status",
                field_schema=qm.PayloadSchemaType.KEYWORD,
            )
            self.client.create_payload_index(
                self.collection_name,
                "tickers",
                field_schema=qm.PayloadSchemaType.KEYWORD,
            )
            self.client.create_payload_index(
                self.collection_name,
                "created_at",
                field_schema=qm.PayloadSchemaType.DATETIME,
            )
            # NEW: Session/Workspace/Tree indexes
            self.client.create_payload_index(
                self.collection_name,
                "session_id",
                field_schema=qm.PayloadSchemaType.KEYWORD,
            )
            self.client.create_payload_index(
                self.collection_name,
                "workspace_id",
                field_schema=qm.PayloadSchemaType.KEYWORD,
            )
            self.client.create_payload_index(
                self.collection_name,
                "parent_id",
                field_schema=qm.PayloadSchemaType.KEYWORD,
            )
            self.client.create_payload_index(
                self.collection_name,
                "ordinal",
                field_schema=qm.PayloadSchemaType.INTEGER,
            )
            self.client.create_payload_index(
                self.collection_name,
                "section",
                field_schema=qm.PayloadSchemaType.KEYWORD,
            )

    def upsert_point(self, point_id: str, payload: Dict[str, Any], vectors: Dict[str, List[float]]):
        """Upsert single point with named vectors (text, title, summary)."""
        self.client.upsert(
            collection_name=self.collection_name,
            points=[qm.PointStruct(id=point_id, payload=payload, vector=vectors)],
        )

    def get_by_id(self, point_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve payload by ID."""
        try:
            res = self.client.retrieve(self.collection_name, ids=[point_id])
            return res[0].payload if res else None
        except:
            return None

    def delete_point(self, point_id: str):
        """Delete point by ID."""
        self.client.delete(
            self.collection_name,
            points_selector=qm.PointIdsList(points=[point_id]),
        )

    def query(
        self,
        vector_name: str,
        query_vector: Optional[List[float]],
        payload_filter: Optional[Dict] = None,
        limit: int = 50,
        offset: int = 0,
    ):
        """Query with optional vector search and filters."""
        if query_vector:
            return self.client.search(
                collection_name=self.collection_name,
                query_vector=qm.NamedVector(name=vector_name, vector=query_vector),
                limit=limit,
                offset=offset,
                query_filter=self._build_filter(payload_filter) if payload_filter else None,
                with_payload=True,
            )
        else:
            # Scroll without vector (filter-only)
            result = self.client.scroll(
                self.collection_name,
                scroll_filter=self._build_filter(payload_filter) if payload_filter else None,
                limit=limit,
                with_payload=True,
            )
            # Handle tuple return (points, next_page_offset)
            if isinstance(result, tuple):
                points, _ = result
            else:
                points = result
            # Fake ScoredPoint structure
            from collections import namedtuple
            ScoredPoint = namedtuple("ScoredPoint", ["id", "score", "payload"])
            return [ScoredPoint(p.id, 1.0, p.payload) for p in (points or [])]

    def scroll(self, payload_filter: Optional[Dict] = None, limit: int = 1000):
        """Scroll through all points matching filter (no vector search)."""
        try:
            result = self.client.scroll(
                self.collection_name,
                scroll_filter=self._build_filter(payload_filter) if payload_filter else None,
                limit=limit,
                with_payload=True,
            )
            
            # Handle tuple return (points, next_page_offset)
            if isinstance(result, tuple):
                points, _ = result
            else:
                points = result
            
            return points if points else []
        except Exception:
            return []

    def get_facets(self, facet_keys: List[str], payload_filter: Optional[Dict] = None) -> Dict[str, Any]:
        """Get facet counts (simple aggregation via scroll)."""
        try:
            result = self.client.scroll(
                self.collection_name,
                scroll_filter=self._build_filter(payload_filter) if payload_filter else None,
                limit=10000,
                with_payload=True,
            )
            
            # Handle both tuple and single return value
            if isinstance(result, tuple):
                points, _ = result
            else:
                points = result
            
            # Ensure points is a list
            if not points:
                points = []
        except Exception as e:
            # If scroll fails, return empty facets
            points = []
        
        facets = {}
        for key in facet_keys:
            counts = {}
            for p in points:
                value = p.payload.get(key)
                if isinstance(value, list):
                    for v in value:
                        counts[v] = counts.get(v, 0) + 1
                elif value:
                    counts[value] = counts.get(value, 0) + 1
            facets[key] = [{"value": k, "count": v} for k, v in counts.items()]
        
        return facets

    def _build_filter(self, filters: Optional[Dict]) -> Optional[qm.Filter]:
        """Convert dict filter to Qdrant Filter."""
        if not filters:
            return None
        
        conditions = []
        for clause in filters.get("must", []):
            conditions.append(self._parse_condition(clause))
        
        return qm.Filter(must=conditions) if conditions else None

    def _parse_condition(self, clause: Dict) -> qm.Condition:
        """Parse single condition."""
        key = clause.get("key")
        if "match" in clause:
            return qm.FieldCondition(key=key, match=qm.MatchValue(value=clause["match"]["value"]))
        elif "range" in clause:
            return qm.FieldCondition(key=key, range=qm.Range(**clause["range"]))
        else:
            return qm.FieldCondition(key=key, match=qm.MatchValue(value=clause.get("value")))


