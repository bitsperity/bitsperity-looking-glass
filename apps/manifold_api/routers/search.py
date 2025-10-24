# apps/manifold_api/routers/search.py
"""Search, timeline, stats endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from libs.manifold_core.models.requests import SearchRequest
from libs.manifold_core.models.responses import SearchResponse, StatsResponse
from libs.manifold_core.storage.qdrant_store import QdrantStore
from libs.manifold_core.embeddings.provider import EmbeddingProvider
from libs.manifold_core.scoring import compute_final_score, apply_mmr, compute_score_components
from apps.manifold_api.dependencies import get_qdrant_store, get_embedding_provider_dep
from datetime import datetime, timedelta
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
    days: int | None = 30,
    bucket: str | None = "day",
    limit: int = 1000,
    store: QdrantStore = Depends(get_qdrant_store),
):
    """Timeline view: thoughts in date range, grouped by day or week.

    - Filters: type (exact), tickers (OR across list), created_at range (from_dt/to_dt or last `days`).
    - Bucketing: `bucket=day` (default) or `bucket=week`.
    - Robustness: If created_at range filtering yields no results (e.g., index type mismatch),
      fallback to filter by type/tickers only and apply the date filter in-app.
    """

    # Determine effective date range
    eff_from = from_dt
    eff_to = to_dt
    if not eff_from and not eff_to and days and days > 0:
        now = datetime.utcnow()
        eff_from = (now - timedelta(days=days)).isoformat() + "Z"
        eff_to = now.isoformat() + "Z"

    # Build base MUST conditions (type + tickers)
    must_base = []
    if type:
        must_base.append({"key": "type", "match": {"value": type}})
    if tickers:
        for ticker in tickers.split(","):
            t = ticker.strip()
            if t:
                must_base.append({"key": "tickers", "match": {"value": t}})

    # First attempt: include created_at range at the storage level
    must_q = list(must_base)
    if eff_from:
        must_q.append({"key": "created_at", "range": {"gte": eff_from}})
    if eff_to:
        must_q.append({"key": "created_at", "range": {"lte": eff_to}})

    filters_q = {"must": must_q} if must_q else None
    results = store.scroll(payload_filter=filters_q, limit=limit)

    # Fallback: if empty and a date filter is intended, scroll without date range and filter in-app
    intends_date_filter = bool(eff_from or eff_to)
    if intends_date_filter and not results:
        filters_base = {"must": must_base} if must_base else None
        fallback_limit = min(limit * 5, 5000)
        results = store.scroll(payload_filter=filters_base, limit=fallback_limit)

        def _in_range(created_str: str) -> bool:
            try:
                if not created_str:
                    return False
                created_dt = datetime.fromisoformat(created_str.replace("Z", "+00:00"))
                if eff_from:
                    from_dt_parsed = datetime.fromisoformat(eff_from.replace("Z", "+00:00"))
                    if created_dt < from_dt_parsed:
                        return False
                if eff_to:
                    to_dt_parsed = datetime.fromisoformat(eff_to.replace("Z", "+00:00"))
                    if created_dt > to_dt_parsed:
                        return False
                return True
            except Exception:
                return False

        results = [p for p in results if _in_range(p.payload.get("created_at", ""))]

    # Bucket
    bucket = (bucket or "day").lower()
    bucketed = defaultdict(list)
    timeline = []

    for point in results:
        payload = point.payload
        created = payload.get("created_at", "")
        key = "unknown"
        if created:
            try:
                dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
                if bucket == "week":
                    # ISO week key: YYYY-Www (e.g., 2025-W43)
                    key = f"{dt.isocalendar().year}-W{dt.isocalendar().week:02d}"
                else:
                    key = dt.date().isoformat()
            except Exception:
                key = created[:10]
        bucketed[key].append(payload)
        timeline.append(payload)

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

