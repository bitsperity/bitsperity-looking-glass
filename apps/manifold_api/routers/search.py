# apps/manifold_api/routers/search.py
"""Search, timeline, stats endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from libs.manifold_core.models.requests import SearchRequest
from libs.manifold_core.models.responses import SearchResponse, StatsResponse
from libs.manifold_core.storage.qdrant_store import QdrantStore
from libs.manifold_core.embeddings.provider import EmbeddingProvider
from libs.manifold_core.scoring import compute_final_score, apply_mmr, compute_score_components
from apps.manifold_api.dependencies import get_qdrant_store, get_embedding_provider_dep
from datetime import datetime
from collections import defaultdict

router = APIRouter(prefix="/v1/memory", tags=["search"])


@router.post("/search", response_model=SearchResponse)
def search_thoughts(
    request: SearchRequest,
    store: QdrantStore = Depends(get_qdrant_store),
    embedder: EmbeddingProvider = Depends(get_embedding_provider_dep),
):
    """Semantic + filter search with facets."""
    # Embed query (only if query is not empty)
    query_vec = None
    if request.query and request.query.strip():
        query_vec = embedder.embed(request.query)
    
    # Convert filters to Qdrant payload filter
    qdrant_filter = _build_qdrant_filter(request.filters)
    
    # Query Qdrant (text vector or filter-only)
    raw_results = store.query(
        vector_name="text",
        query_vector=query_vec,
        payload_filter=qdrant_filter,
        limit=request.limit or 50,
        offset=request.offset or 0,
    )
    
    # Re-rank with boosts + explainability components
    candidates = []
    for hit in raw_results:
        payload = hit.payload
        base_sim = hit.score
        comps = compute_score_components(
            base_sim,
            payload.get("created_at", ""),
            payload.get("type", ""),
            payload.get("tickers", []),
            request.boosts.dict() if hasattr(request.boosts, 'dict') else request.boosts,
        )
        candidates.append({
            "id": hit.id,
            "score": comps["final"],
            "score_components": comps,
            "thought": payload,
        })
    
    # Sort by final score
    candidates.sort(key=lambda x: x["score"], reverse=True)
    
    # Apply MMR if requested
    if request.diversity and request.diversity.get("mmr_lambda"):
        candidates = apply_mmr(
            candidates,
            lambda_param=request.diversity["mmr_lambda"],
            k=request.limit or 50,
        )
    
    # Facets
    facets = {}
    if request.facets:
        facets = store.get_facets(request.facets, qdrant_filter)
    # facet_suggest: top keys by frequency if no facets requested
    facet_suggest = {}
    if not request.facets:
        facet_suggest = store.get_facets(["type", "status", "tickers", "sectors"], qdrant_filter)
    
    return SearchResponse(
        status="ok",
        count=len(candidates),
        facets=facets,
        facet_suggest=facet_suggest,
        results=candidates,
    )


@router.get("/timeline")
def get_timeline(
    from_dt: str | None = None,
    to_dt: str | None = None,
    type: str | None = None,
    tickers: str | None = None,
    store: QdrantStore = Depends(get_qdrant_store),
):
    """Timeline view: thoughts in date range, grouped by day."""
    must = []
    
    if type:
        must.append({"key": "type", "match": {"value": type}})
    if tickers:
        for ticker in tickers.split(","):
            must.append({"key": "tickers", "match": {"value": ticker}})
    if from_dt:
        must.append({"key": "created_at", "range": {"gte": from_dt}})
    if to_dt:
        must.append({"key": "created_at", "range": {"lte": to_dt}})
    
    filters = {"must": must} if must else None
    
    # Scan all matching using scroll (no vector search needed)
    results = store.scroll(payload_filter=filters, limit=1000)
    
    # Bucket by day
    bucketed = defaultdict(list)
    timeline = []
    for point in results:
        created = point.payload.get("created_at", "")
        day = created[:10] if created else "unknown"
        bucketed[day].append(point.payload)
        timeline.append(point.payload)
    
    return {
        "status": "ok",
        "timeline": timeline,
        "bucketed": dict(bucketed),
    }


@router.get("/stats", response_model=StatsResponse)
def get_stats(
    tickers: str | None = None,
    timeframe: str | None = None,
    store: QdrantStore = Depends(get_qdrant_store)
):
    """Aggregated stats."""
    # Build filters
    must = []
    if tickers:
        for ticker in tickers.split(","):
            must.append({"key": "tickers", "match": {"value": ticker}})
    if timeframe:
        must.append({"key": "timeframe", "match": {"value": timeframe}})
    
    filters = {"must": must} if must else None
    
    # Scan all
    all_thoughts = store.scroll(
        payload_filter=filters,
        limit=10000
    )
    
    by_type = defaultdict(int)
    by_status = defaultdict(int)
    confidence_scores = []
    promoted = 0
    
    for point in all_thoughts:
        p = point.payload
        by_type[p.get("type", "unknown")] += 1
        by_status[p.get("status", "unknown")] += 1
        if p.get("confidence_score"):
            confidence_scores.append(p["confidence_score"])
        if p.get("flags", {}).get("promoted_to_kg"):
            promoted += 1
    
    avg_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0.0
    validation_rate = promoted / len(all_thoughts) if all_thoughts else 0.0
    
    return StatsResponse(
        status="ok",
        total=len(all_thoughts),
        by_type=dict(by_type),
        by_status=dict(by_status),
        avg_confidence=avg_confidence,
        validation_rate=validation_rate,
    )


def _build_qdrant_filter(filters: dict | None) -> dict | None:
    """Convert SearchRequest.filters to Qdrant filter dict."""
    if not filters:
        return None
    
    must = []
    must_not = []
    
    # Handle Pydantic model or dict
    if hasattr(filters, 'must'):
        must_clauses = filters.must
        must_not_clauses = filters.must_not
    else:
        must_clauses = filters.get("must", [])
        must_not_clauses = filters.get("must_not", [])
    
    for clause in must_clauses:
        must.append(_parse_clause(clause))
    for clause in must_not_clauses:
        must_not.append(_parse_clause(clause))
    
    result = {}
    if must:
        result["must"] = must
    if must_not:
        result["must_not"] = must_not
    
    return result if result else None


def _parse_clause(clause: dict) -> dict:
    """Parse single filter clause."""
    # Handle Pydantic model or dict
    if hasattr(clause, 'field'):
        field = clause.field
        op = clause.op
        value = clause.value
    else:
        field = clause.get("field")
        op = clause.get("op")
        value = clause.get("value")
    
    if op == "match":
        return {"key": field, "match": {"value": value}}
    elif op == "any":
        return {"key": field, "match": {"any": value}}
    elif op == "range":
        return {"key": field, "range": value}
    else:
        return {"key": field, "match": {"value": value}}

